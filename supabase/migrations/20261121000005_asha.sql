-- Asha Panadería (segunda marca) + opciones por marca: unidad (visita/compra), cumpleaños y referido opcionales
create or replace function public.default_config() returns jsonb
language sql immutable as $$
select jsonb_build_object(
  'colors', jsonb_build_object('bg','#000000','fg','#FFFFFF','muted','#8A8A8A','line','#2A2A2A','accent','#FFFFFF'),
  'fonts',  jsonb_build_object('title','Cormorant Garamond','body','Montserrat'),
  'logo_url', null, 'logo_top', '', 'logo_bottom', '',
  'address', '', 'instagram', '', 'reservations_url', '',
  'menu_note', 'Precios en pesos colombianos. No incluyen impuesto al consumo. Servicio voluntario.',
  'min_amount', 80000, 'double_days', jsonb_build_array(1,2,3),
  'reward_days', 60, 'dormant_days', 45, 'reset_months', 12, 'card_size', 10,
  'birthday_bonus', true, 'referral_bonus', true,
  'unit_singular', 'visita', 'unit_plural', 'visitas',
  'rewards', jsonb_build_array(
     jsonb_build_object('visit',3,'title','Regalo de la visita 3','desc',''),
     jsonb_build_object('visit',5,'title','Regalo de la visita 5','desc',''),
     jsonb_build_object('visit',7,'title','Regalo de la visita 7','desc',''),
     jsonb_build_object('visit',10,'title','Regalo de la visita 10','desc','Tarjeta completa.')),
  'tiers', jsonb_build_array(
     jsonb_build_object('name','Amigo','min',0,'benefits',jsonb_build_array('Tarjeta de 10 sellos','Regalo de cumpleaños','Doble sello lunes a miércoles')),
     jsonb_build_object('name','Compadre','min',10,'benefits',jsonb_build_array('Todo lo de Amigo','Reserva prioritaria en fin de semana','Primero en probar platos nuevos')),
     jsonb_build_object('name','Familia','min',25,'benefits',jsonb_build_array('Todo lo de Compadre','Mesa garantizada con aviso de 24 h','Evento anual solo para Familia'))),
  'birthday_gift', 'Cortesía de cumpleaños de la casa',
  'card_name', 'Tarjeta de la casa')
$$;

create or replace function public.staff_stamp(p_session text, p_member_code text, p_amount int, p_table text, p_guest_phone text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s staff; t tenants; c jsonb; m members; g members; today date; dow int;
        v_add int := 1; v_reasons text[] := '{}'; bday boolean := false; v_old int; nw int; r jsonb; unlocked jsonb := '[]'::jsonb;
        v_size int; full_card boolean;
begin
  s := staff_from_session(p_session);
  select * into t from tenants where id = s.tenant_id;
  c := cfg(t);
  v_size := (c->>'card_size')::int;
  select * into m from members where tenant_id = t.id and code = upper(trim(p_member_code)) for update;
  if m.id is null then return jsonb_build_object('ok',false,'error','Cliente no encontrado.'); end if;
  perform apply_reset(m.id);
  select * into m from members where id = m.id;

  today := bogota_now()::date;
  dow := extract(isodow from today)::int;

  if coalesce(p_amount,0) < (c->>'min_amount')::int then
    return jsonb_build_object('ok',false,'error', format('La compra no llega al mínimo de $%s. No suma sello.',
      replace(to_char((c->>'min_amount')::int, 'FM999,999,999'), ',', '.')));
  end if;
  if exists(select 1 from visits vv where vv.member_id = m.id and vv.local_date = today) then
    return jsonb_build_object('ok',false,'error','Este cliente ya sumó sello hoy. Máximo uno por día.');
  end if;

  -- Doble sello por día de la semana
  if c->'double_days' @> to_jsonb(dow) then v_add := 2; v_reasons := v_reasons || 'dia_doble'::text; end if;

  -- Doble sello por invitado nuevo registrado hoy
  if nullif(trim(coalesce(p_guest_phone,'')),'') is not null and coalesce((c->>'referral_bonus')::boolean, true) then
    select * into g from members where tenant_id = t.id and phone = norm_phone(p_guest_phone) for update;
    if g.id is null then
      return jsonb_build_object('ok',false,'error','El invitado todavía no está registrado. Que se registre en la mesa y vuelve a intentar.');
    elsif g.id = m.id then
      return jsonb_build_object('ok',false,'error','El invitado no puede ser el mismo cliente.');
    elsif (g.created_at at time zone 'America/Bogota')::date <> today then
      return jsonb_build_object('ok',false,'error','El invitado no es nuevo: no se registró hoy.');
    elsif g.referral_used then
      return jsonb_build_object('ok',false,'error','Ese invitado ya se usó para otro doble sello.');
    end if;
    update members set referral_used = true where id = g.id;
    v_add := 2; v_reasons := v_reasons || 'invitado_nuevo'::text;
  end if;
  if v_add = 1 then v_reasons := v_reasons || 'normal'::text; end if;

  -- Cumpleaños: +1 en la primera visita del mes de cumpleaños
  if coalesce((c->>'birthday_bonus')::boolean, true) and m.bday_month = extract(month from today)::int and not exists(
      select 1 from visits vv where vv.member_id = m.id and 'cumpleanos' = any(vv.reasons)
        and date_trunc('month', vv.local_date) = date_trunc('month', today)) then
    v_add := v_add + 1; v_reasons := v_reasons || 'cumpleanos'::text; bday := true;
  end if;

  v_old := m.stamps;
  full_card := v_old >= v_size;
  nw := least(v_size, v_old + v_add);

  insert into visits(tenant_id, member_id, staff_id, amount, table_no, stamps_added, reasons, local_date)
    values (t.id, m.id, s.id, p_amount, nullif(trim(coalesce(p_table,'')),''), nw - v_old, v_reasons, today);

  for r in select * from jsonb_array_elements(c->'rewards') loop
    if (r->>'visit')::int > v_old and (r->>'visit')::int <= nw then
      insert into rewards(tenant_id, member_id, card_number, visit_no, title, expires_at)
        values (t.id, m.id, m.card_number, (r->>'visit')::int, r->>'title', now() + make_interval(days => (c->>'reward_days')::int))
        on conflict do nothing;
      unlocked := unlocked || jsonb_build_object('visit', (r->>'visit')::int, 'title', r->>'title');
    end if;
  end loop;

  update members set stamps = nw, total_visits = total_visits + 1, last_visit_at = now() where id = m.id;

  return jsonb_build_object('ok',true,'added', nw - v_old, 'stamps', nw, 'card_size', v_size, 'reasons', v_reasons,
    'unlocked', unlocked, 'birthday', bday, 'birthday_gift', case when bday then c->>'birthday_gift' end,
    'full_card', full_card, 'name', m.name);
end $$;


-- (card_json lee birthday_bonus para no anunciar cumpleaños donde no aplica)
create or replace function public.card_json(mid uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare m members; t tenants; c jsonb; r jsonb; rw jsonb := '[]'::jsonb; rec rewards; hist jsonb; pend jsonb; is_bday boolean; bday_used boolean;
begin
  perform apply_reset(mid);
  select * into m from members where id = mid;
  select * into t from tenants where id = m.tenant_id;
  c := cfg(t);
  for r in select * from jsonb_array_elements(c->'rewards') order by (value->>'visit')::int loop
    select * into rec from rewards where member_id = m.id and card_number = m.card_number and visit_no = (r->>'visit')::int;
    rw := rw || jsonb_build_object(
      'visit', (r->>'visit')::int, 'title', r->>'title', 'desc', r->>'desc',
      'id', rec.id,
      'status', case when rec.id is null then 'bloqueado'
                     when rec.redeemed_at is not null then 'canjeado'
                     when rec.expires_at < now() then 'vencido'
                     else 'listo' end,
      'expires_at', rec.expires_at, 'redeemed_at', rec.redeemed_at);
  end loop;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'visit',visit_no,'title',title,'expires_at',expires_at) order by unlocked_at),'[]')
    into pend from rewards
    where member_id = m.id and card_number < m.card_number and redeemed_at is null and expires_at > now();
  select coalesce(jsonb_agg(jsonb_build_object('at',created_at,'stamps',stamps_added,'reasons',reasons) order by created_at desc),'[]')
    into hist from (select * from visits where member_id = m.id order by created_at desc limit 30) v;
  is_bday := m.bday_month = extract(month from bogota_now())::int;
  select exists(select 1 from visits where member_id = m.id and 'cumpleanos' = any(reasons)
                and date_trunc('month', local_date) = date_trunc('month', bogota_now()::date)) into bday_used;
  return jsonb_build_object(
    'id', m.id, 'code', m.code, 'name', m.name, 'phone', m.phone,
    'stamps', m.stamps, 'card_size', (c->>'card_size')::int, 'card_number', m.card_number,
    'total_visits', m.total_visits, 'last_visit_at', m.last_visit_at, 'created_at', m.created_at,
    'bday_day', m.bday_day, 'bday_month', m.bday_month,
    'birthday_month', is_bday, 'birthday_pending', coalesce((c->>'birthday_bonus')::boolean, true) and is_bday and not bday_used,
    'level', member_level(m, c), 'rewards', rw, 'pending_rewards', pend, 'history', hist);
end $$;


do $$
declare tid uuid;
begin
  insert into public.tenants(slug, name, code_prefix, config)
    values ('asha', 'Asha Panadería', 'AS', '{"colors": {"bg": "#27190A", "fg": "#F5EEE3", "muted": "#B8A58C", "line": "#4A3523", "accent": "#D7B07A"}, "fonts": {"title": "Josefin Sans", "body": "Montserrat"}, "logo_url": "https://ashapanaderia.co/cdn/shop/files/LOGO_ASHA.png", "logo_width": 130, "mode": "tienda", "search_hint": "Buscar: masa madre, croissant, café…", "logo_text": "ASHA", "logo_top": "", "logo_bottom": "PAN ARTE.SANO", "address": "Manga: Calle de la Asamblea, Cra. 22 # 28-07 · Bocagrande: Edificio Centro de Negocios, Cra. 3 # 6-14", "instagram": "ashapanaderia", "reservations_url": "https://wa.me/573042100140", "reservations_label": "Pedir por WhatsApp", "menu_note": "Precios en pesos colombianos, tomados de la tienda en línea de Asha.", "card_name": "Tarjeta Asha", "unit_singular": "compra", "unit_plural": "compras", "min_amount": 0, "double_days": [], "birthday_bonus": false, "referral_bonus": false, "reward_days": 60, "dormant_days": 21, "reset_months": 12, "card_size": 10, "rewards": [{"visit": 10, "title": "El pan que quieras", "desc": "Escoge cualquier pan de la vitrina, de regalo. Tarjeta completa."}], "tiers": [{"name": "De la casa", "min": 0, "benefits": ["10 compras = el pan que quieras"]}], "birthday_gift": "", "intro_title": "Agua + sal + harina + amor", "intro_text": "Panadería artesanal cartagenera. Cada compra suma en tu Tarjeta Asha.", "intro_tag": "Pan arte sano", "today": [{"tag": "Tarjeta Asha", "title": "10 compras, el pan que quieras", "text": "Cada compra suma un sello. En la décima escoges cualquier pan de la vitrina, de regalo."}, {"tag": "Servicios", "title": "Bar de café para eventos", "text": "Baristas, café de especialidad colombiano y maridajes con nuestra panadería y pastelería."}, {"tag": "Servicios", "title": "Catas de café y té", "text": "Perfiles y orígenes del café, infusiones de té y maridajes con nuestros productos."}], "google_review_url": "https://www.google.com/maps/search/Asha+Panader%C3%ADa+Cartagena"}'::jsonb)
    on conflict (slug) do update set config = excluded.config, name = excluded.name
    returning id into tid;
  perform public.import_menu_internal(tid, '{"categorias": [{"nombre": "Panes", "nota": "Masa madre y fermentación lenta", "platos": [{"n": "Masa madre de la casa", "p": 14500, "fotos": ["https://cdn.shopify.com/s/files/1/0739/4138/5464/files/Masamadredelacasa.png?width=900"]}, {"n": "Pan pueblo", "p": 15200, "fotos": ["https://cdn.shopify.com/s/files/1/0739/4138/5464/files/PanPueblo.png?width=900"]}, {"n": "Pan costeño", "p": 21900, "fotos": ["https://cdn.shopify.com/s/files/1/0739/4138/5464/files/PanCosteno.png?width=900"]}, {"n": "Pan Muesli", "p": 26100, "fotos": ["https://cdn.shopify.com/s/files/1/0739/4138/5464/files/Muesli.jpg?width=900"]}, {"n": "Piñitas cartageneras", "p": 15300, "fotos": ["https://cdn.shopify.com/s/files/1/0739/4138/5464/files/PinitasCartageneras.png?width=900"], "g": "x 8 unidades"}, {"n": "Brioche de queso 40%", "p": 16500, "fotos": ["https://cdn.shopify.com/s/files/1/0739/4138/5464/files/Briochedequeso.png?width=900"]}, {"n": "Molde brioche 40%", "p": 29000, "fotos": ["https://cdn.shopify.com/s/files/1/0739/4138/5464/files/PanMoldeBrioche40.png?width=900"]}, {"n": "Barra de queso paipa y mozarella", "p": 12000, "fotos": ["https://cdn.shopify.com/s/files/1/0739/4138/5464/files/BarradeQuesoPaipayMozarella.png?width=900"]}, {"n": "Pan piedra", "p": 13200, "fotos": ["https://cdn.shopify.com/s/files/1/0739/4138/5464/files/PanPiedra.png?width=900"], "g": "x 3"}, {"n": "Ciabattas", "p": 12000, "fotos": ["https://cdn.shopify.com/s/files/1/0739/4138/5464/files/Ciabatta.png?width=900"], "g": "x 4 unidades"}, {"n": "Hamburguesas de papa", "p": 17400, "fotos": ["https://cdn.shopify.com/s/files/1/0739/4138/5464/files/PanHamburguesa.png?width=900"], "g": "x 6 unidades"}]}, {"nombre": "Bollería", "nota": null, "platos": [{"n": "Croissant de mantequilla", "p": 11000, "fotos": ["https://cdn.shopify.com/s/files/1/0739/4138/5464/files/CroissantdeMantequilla.png?width=900"]}, {"n": "Croissant de almendras", "p": 16500, "fotos": ["https://cdn.shopify.com/s/files/1/0739/4138/5464/files/CroissantdeAlmendras.png?width=900"]}, {"n": "Croissant de chocolate", "p": 16500, "fotos": ["https://cdn.shopify.com/s/files/1/0739/4138/5464/files/CROISSAND-DE-CHOCOLATE.png?width=900"]}]}, {"nombre": "Salado", "nota": null, "platos": [{"n": "Empanada de la casa", "p": 13500, "fotos": ["https://cdn.shopify.com/s/files/1/0739/4138/5464/files/EmpanadadelaCasa.png?width=900"]}, {"n": "Dedito integral semillas", "p": 8000, "fotos": ["https://cdn.shopify.com/s/files/1/0739/4138/5464/files/DeditoIntegralSemillas.png?width=900"]}]}, {"nombre": "Pastelería", "nota": null, "platos": [{"n": "Torta de la abuela · porción", "p": 11000, "fotos": ["https://cdn.shopify.com/s/files/1/0739/4138/5464/files/Tortadelaabuelaporcion.jpg?width=900"]}, {"n": "Torta de la abuela · entera", "p": 124000, "fotos": ["https://cdn.shopify.com/s/files/1/0739/4138/5464/files/Tortadelaabuela.jpg?width=900"]}, {"n": "Cheesecake de chocolate blanco y uva Isabella · porción", "p": 19800, "fotos": ["https://cdn.shopify.com/s/files/1/0739/4138/5464/files/CheesecakedeChocolateBlancoyUvaIsabellaPorcion.png?width=900"]}, {"n": "Cheesecake de chocolate blanco y uva Isabella · entero", "p": 140800, "fotos": ["https://cdn.shopify.com/s/files/1/0739/4138/5464/files/CheesecakedeChocolateBlancoyUvaIsabellaEntera.png?width=900"]}, {"n": "Torta de banano integral · porción", "p": 9300, "fotos": ["https://cdn.shopify.com/s/files/1/0739/4138/5464/files/Torta-de-Banana_porcion.jpg?width=900"]}, {"n": "Torta de banano integral · entera", "p": 60000, "fotos": ["https://cdn.shopify.com/s/files/1/0739/4138/5464/files/TortadeBanana.jpg?width=900"]}, {"n": "Financier de arándanos", "p": 11000, "fotos": ["https://cdn.shopify.com/s/files/1/0739/4138/5464/files/FinancieredeArandanos.png?width=900"]}, {"n": "Brownie de centeno", "p": 9000, "fotos": ["https://cdn.shopify.com/s/files/1/0739/4138/5464/files/BrowniedeCenteno.png?width=900"]}, {"n": "Galleta de avena y pasas rubias", "p": 9000, "fotos": ["https://cdn.shopify.com/s/files/1/0739/4138/5464/files/GalletadeAvenayPasasRubias.png?width=900"]}, {"n": "Galleta de chips de chocolate 80%", "p": 9900, "fotos": ["https://cdn.shopify.com/s/files/1/0739/4138/5464/files/DSC_9069.jpg?width=900"]}]}, {"nombre": "Despensa", "nota": "Para llevar a casa", "platos": [{"n": "Café origen Planadas honey rojo", "p": 49500, "fotos": ["https://cdn.shopify.com/s/files/1/0739/4138/5464/files/CAFE_HONEY_ROJO.png?width=900"], "g": "340 g"}, {"n": "Café origen Sierra Nevada lavado", "p": 42300, "fotos": ["https://cdn.shopify.com/s/files/1/0739/4138/5464/files/CAFE_SIERRA_NEVADA.png?width=900"], "g": "340 g"}, {"n": "Queso paipa", "p": 46200, "fotos": ["https://cdn.shopify.com/s/files/1/0739/4138/5464/files/QUESO_PAIPA.jpg?width=900"], "g": "x libra"}, {"n": "Confituras", "p": 29000, "fotos": ["https://cdn.shopify.com/s/files/1/0739/4138/5464/files/MERMELADAS.jpg?width=900"]}, {"n": "Confituras con stevia", "p": 38500, "fotos": ["https://cdn.shopify.com/s/files/1/0739/4138/5464/files/MERMELADAS_2.jpg?width=900"]}, {"n": "Infusión de frutas deshidratadas", "p": 38500, "fotos": ["https://cdn.shopify.com/s/files/1/0739/4138/5464/files/INFUSION_2.jpg?width=900"], "g": "x 8 unidades"}]}]}'::jsonb, true);
  insert into public.staff(tenant_id, name, pin_hash)
    values (tid, 'Prueba', extensions.crypt('1234', extensions.gen_salt('bf'))) on conflict do nothing;
end $$;
