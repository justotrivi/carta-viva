-- Carta Viva · instalación completa (pegar entera en Supabase > SQL Editor > Run)

-- ===== supabase/migrations/20261120000001_carta_viva.sql =====
-- Carta Viva · by SOCIAL
-- Plataforma multi-marca: carta QR + Tarjeta de la casa (fidelización)
-- Todas las reglas de sellos corren aquí, en el servidor.

create extension if not exists pgcrypto with schema extensions;

-- ============================================================
-- TABLAS
-- ============================================================

create table public.tenants (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null check (slug ~ '^[a-z0-9-]{2,40}$'),
  name        text not null,
  code_prefix text not null default 'CV' check (code_prefix ~ '^[A-Z]{2,4}$'),
  active      boolean not null default true,
  -- marca, textos y reglas (ver default_config())
  config      jsonb not null default '{}'::jsonb,
  secret      text not null default encode(extensions.gen_random_bytes(24), 'hex'),
  created_at  timestamptz not null default now()
);

create table public.categories (
  id        uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name      text not null,
  note      text,
  sort      int not null default 0
);
create index on public.categories(tenant_id, sort);

create table public.dishes (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  name        text not null,
  portion     text,
  description text,
  price       int,
  price2      int,
  sort        int not null default 0,
  available   boolean not null default true,
  star        boolean not null default false,
  show        boolean not null default false,
  media_url   text,
  media_type  text check (media_type in ('image','video'))
);
create index on public.dishes(tenant_id, category_id, sort);

create table public.members (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  code            text not null,
  token           text not null unique default encode(extensions.gen_random_bytes(18), 'hex'),
  name            text not null,
  phone           text not null,               -- 10 dígitos, sin +57
  bday_day        int not null check (bday_day between 1 and 31),
  bday_month      int not null check (bday_month between 1 and 12),
  consent_at      timestamptz not null default now(),
  stamps          int not null default 0 check (stamps between 0 and 10),
  card_number     int not null default 1,
  total_visits    int not null default 0,
  last_visit_at   timestamptz,
  referral_used   boolean not null default false, -- ya sirvió como invitado nuevo
  created_at      timestamptz not null default now(),
  unique (tenant_id, phone),
  unique (tenant_id, code)
);

create table public.staff (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  name       text not null,
  pin_hash   text not null,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create table public.staff_sessions (
  token      text primary key default encode(extensions.gen_random_bytes(24), 'hex'),
  staff_id   uuid not null references public.staff(id) on delete cascade,
  expires_at timestamptz not null default now() + interval '12 hours'
);

create table public.visits (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  member_id    uuid not null references public.members(id) on delete cascade,
  staff_id     uuid references public.staff(id) on delete set null,
  amount       int not null,
  table_no     text,
  stamps_added int not null,
  reasons      text[] not null default '{}',
  local_date   date not null,
  created_at   timestamptz not null default now()
);
create index on public.visits(tenant_id, created_at);
create index on public.visits(member_id, local_date);

create table public.rewards (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  member_id   uuid not null references public.members(id) on delete cascade,
  card_number int not null,
  visit_no    int not null,
  title       text not null,
  unlocked_at timestamptz not null default now(),
  expires_at  timestamptz not null,
  redeemed_at timestamptz,
  redeemed_by uuid references public.staff(id) on delete set null,
  unique (member_id, card_number, visit_no)
);

create table public.super_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create table public.tenant_admins (
  user_id   uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  primary key (user_id, tenant_id)
);

-- ============================================================
-- UTILIDADES
-- ============================================================

create or replace function public.default_config() returns jsonb
language sql immutable as $$
select jsonb_build_object(
  'colors', jsonb_build_object('bg','#000000','fg','#FFFFFF','muted','#8A8A8A','line','#2A2A2A','accent','#FFFFFF'),
  'fonts',  jsonb_build_object('title','Cormorant Garamond','body','Montserrat'),
  'logo_url', null,
  'logo_top', '', 'logo_bottom', '',
  'address', '', 'instagram', '',
  'reservations_url', '',
  'menu_note', 'Precios en pesos colombianos. No incluyen impuesto al consumo. Servicio voluntario.',
  'min_amount', 80000,
  'double_days', jsonb_build_array(1,2,3),          -- ISO: 1 = lunes
  'reward_days', 60,
  'dormant_days', 45,
  'reset_months', 12,
  'card_size', 10,
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
  'card_name', 'Tarjeta de la casa'
)
$$;

create or replace function public.cfg(t public.tenants) returns jsonb
language sql stable as $$ select public.default_config() || coalesce(t.config,'{}'::jsonb) $$;

create or replace function public.bogota_now() returns timestamp
language sql stable as $$ select (now() at time zone 'America/Bogota') $$;

create or replace function public.norm_phone(p text) returns text
language sql immutable as $$
  select right(regexp_replace(coalesce(p,''), '\D', '', 'g'), 10)
$$;

create or replace function public.is_tenant_admin(tid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from super_admins where user_id = auth.uid())
      or exists(select 1 from tenant_admins where user_id = auth.uid() and tenant_id = tid)
$$;

create or replace function public.is_super_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from super_admins where user_id = auth.uid())
$$;

-- Nivel por visitas de los últimos 365 días
create or replace function public.member_level(m public.members, c jsonb) returns jsonb
language plpgsql stable as $$
declare n int; tier jsonb; best jsonb := null; nxt jsonb := null;
begin
  select count(*) into n from visits where member_id = m.id and created_at > now() - interval '365 days';
  for tier in select * from jsonb_array_elements(c->'tiers') loop
    if (tier->>'min')::int <= n then best := tier;
    elsif nxt is null then nxt := tier; end if;
  end loop;
  return jsonb_build_object('visits_year', n, 'tier', best, 'next', nxt);
end $$;

-- Aplica vencimientos: tarjeta en 0 tras N meses sin visita
create or replace function public.apply_reset(mid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare m members; c jsonb;
begin
  select * into m from members where id = mid for update;
  if m.id is null then return; end if;
  select cfg(t) into c from tenants t where t.id = m.tenant_id;
  if m.last_visit_at is not null and m.stamps > 0
     and m.last_visit_at < now() - make_interval(months => (c->>'reset_months')::int) then
    update members set stamps = 0, card_number = card_number + 1 where id = mid;
  end if;
end $$;

-- Estado completo de una tarjeta (lo usa el comensal y el mesero)
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
    'birthday_month', is_bday, 'birthday_pending', is_bday and not bday_used,
    'level', member_level(m, c), 'rewards', rw, 'pending_rewards', pend, 'history', hist);
end $$;

-- ============================================================
-- PÚBLICO (comensal, sin login)
-- ============================================================

create or replace function public.get_menu(p_slug text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare t tenants;
begin
  select * into t from tenants where slug = lower(p_slug) and active;
  if t.id is null then return null; end if;
  return jsonb_build_object(
    'tenant', jsonb_build_object('id', t.id, 'slug', t.slug, 'name', t.name, 'config', cfg(t) - 'secret'),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('id', ca.id, 'name', ca.name, 'note', ca.note,
        'dishes', coalesce((select jsonb_agg(jsonb_build_object(
            'id', d.id, 'name', d.name, 'portion', d.portion, 'description', d.description,
            'price', d.price, 'price2', d.price2, 'star', d.star, 'show', d.show,
            'media_url', d.media_url, 'media_type', d.media_type) order by d.sort)
          from dishes d where d.category_id = ca.id and d.available), '[]'::jsonb)) order by ca.sort)
      from categories ca where ca.tenant_id = t.id), '[]'::jsonb));
end $$;

create or replace function public.register_member(p_slug text, p_name text, p_phone text, p_day int, p_month int, p_consent boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare t tenants; ph text; m members; n int; cde text;
begin
  select * into t from tenants where slug = lower(p_slug) and active;
  if t.id is null then return jsonb_build_object('ok',false,'error','Marca no encontrada.'); end if;
  if not coalesce(p_consent,false) then return jsonb_build_object('ok',false,'error','Debes aceptar el tratamiento de datos.'); end if;
  if length(trim(coalesce(p_name,''))) < 2 then return jsonb_build_object('ok',false,'error','Escribe tu nombre.'); end if;
  ph := norm_phone(p_phone);
  if ph !~ '^3\d{9}$' then return jsonb_build_object('ok',false,'error','El WhatsApp debe ser un celular colombiano de 10 dígitos que empiece por 3.'); end if;
  if p_month not between 1 and 12 or p_day not between 1 and 31
     or (p_month = 2 and p_day > 29) or (p_month in (4,6,9,11) and p_day > 30) then
    return jsonb_build_object('ok',false,'error','Revisa la fecha de cumpleaños.'); end if;
  if exists(select 1 from members where tenant_id = t.id and phone = ph) then
    return jsonb_build_object('ok',false,'error','Ese WhatsApp ya tiene tarjeta. Usa "Ya tengo tarjeta" para recuperarla.','exists',true); end if;
  perform pg_advisory_xact_lock(hashtext('code:'||t.id::text));
  select count(*) + 1 into n from members where tenant_id = t.id;
  loop
    cde := t.code_prefix || '-' || lpad(n::text, 4, '0');
    exit when not exists(select 1 from members where tenant_id = t.id and code = cde);
    n := n + 1;
  end loop;
  insert into members(tenant_id, code, name, phone, bday_day, bday_month)
    values (t.id, cde, initcap(trim(p_name)), ph, p_day, p_month) returning * into m;
  return jsonb_build_object('ok',true,'token',m.token,'code',m.code);
end $$;

create or replace function public.recover_member(p_slug text, p_phone text, p_day int, p_month int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare m members;
begin
  select mb.* into m from members mb join tenants t on t.id = mb.tenant_id
   where t.slug = lower(p_slug) and mb.phone = norm_phone(p_phone) and mb.bday_day = p_day and mb.bday_month = p_month;
  if m.id is null then return jsonb_build_object('ok',false,'error','No encontramos una tarjeta con esos datos.'); end if;
  return jsonb_build_object('ok',true,'token',m.token);
end $$;

create or replace function public.get_card(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare m members;
begin
  select * into m from members where token = p_token;
  if m.id is null then return null; end if;
  return card_json(m.id);
end $$;

-- Código dinámico para el QR: cambia cada 60 s
create or replace function public.dyn_code(m public.members, t public.tenants, win bigint) returns text
language sql stable as $$
  select m.code || '.' || substr(encode(extensions.hmac(m.id::text || ':' || win::text, t.secret, 'sha256'), 'hex'), 1, 8)
$$;

create or replace function public.get_dynamic_code(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare m members; t tenants; ep bigint;
begin
  select * into m from members where token = p_token;
  if m.id is null then return null; end if;
  select * into t from tenants where id = m.tenant_id;
  ep := floor(extract(epoch from now()))::bigint;
  return jsonb_build_object('code', dyn_code(m, t, ep / 60), 'seconds_left', 60 - (ep % 60));
end $$;

create or replace function public.leave_program(p_token text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  delete from members where token = p_token;
  return found;
end $$;

-- ============================================================
-- MESERO (PIN)
-- ============================================================

create or replace function public.staff_login(p_slug text, p_name text, p_pin text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s staff; tok text;
begin
  select st.* into s from staff st join tenants t on t.id = st.tenant_id
   where t.slug = lower(p_slug) and lower(st.name) = lower(trim(p_name)) and st.active;
  if s.id is null or s.pin_hash <> extensions.crypt(p_pin, s.pin_hash) then
    perform pg_sleep(0.6);
    return jsonb_build_object('ok',false,'error','Nombre o PIN incorrecto.');
  end if;
  delete from staff_sessions where expires_at < now();
  insert into staff_sessions(staff_id) values (s.id) returning token into tok;
  return jsonb_build_object('ok',true,'session',tok,'name',s.name);
end $$;

create or replace function public.staff_from_session(p_session text) returns public.staff
language plpgsql stable security definer set search_path = public as $$
declare s staff;
begin
  select st.* into s from staff_sessions ss join staff st on st.id = ss.staff_id
   where ss.token = p_session and ss.expires_at > now() and st.active;
  if s.id is null then raise exception 'SESION_INVALIDA'; end if;
  return s;
end $$;

-- Busca por código dinámico del QR, código corto o WhatsApp
create or replace function public.find_member(tid uuid, q text) returns public.members
language plpgsql stable security definer set search_path = public as $$
declare m members; t tenants; ep bigint; base text; qq text := upper(trim(coalesce(q,'')));
begin
  select * into t from tenants where id = tid;
  if position('.' in qq) > 0 then
    base := split_part(qq, '.', 1);
    select * into m from members where tenant_id = tid and code = base;
    if m.id is null then return null; end if;
    ep := floor(extract(epoch from now()))::bigint / 60;
    if upper(dyn_code(m, t, ep)) = qq or upper(dyn_code(m, t, ep - 1)) = qq then return m; end if;
    raise exception 'QR_VENCIDO';
  end if;
  select * into m from members where tenant_id = tid and code = qq;
  if m.id is not null then return m; end if;
  select * into m from members where tenant_id = tid and phone = norm_phone(qq) and length(norm_phone(qq)) = 10;
  return m;
end $$;

create or replace function public.staff_lookup(p_session text, p_query text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s staff; m members;
begin
  s := staff_from_session(p_session);
  begin
    m := find_member(s.tenant_id, p_query);
  exception when others then
    if sqlerrm = 'QR_VENCIDO' then return jsonb_build_object('ok',false,'error','Ese código QR ya venció. Pídele al cliente que lo vuelva a mostrar.'); end if;
    raise;
  end;
  if m.id is null then return jsonb_build_object('ok',false,'error','No encontramos ese cliente.'); end if;
  return jsonb_build_object('ok',true,'card',card_json(m.id),
    'stamped_today', exists(select 1 from visits where member_id = m.id and local_date = bogota_now()::date));
end $$;

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
    return jsonb_build_object('ok',false,'error', format('La cuenta no llega al mínimo de $%s (sin impuesto al consumo). No suma sello.',
      replace(to_char((c->>'min_amount')::int, 'FM999,999,999'), ',', '.')));
  end if;
  if exists(select 1 from visits vv where vv.member_id = m.id and vv.local_date = today) then
    return jsonb_build_object('ok',false,'error','Este cliente ya sumó sello hoy. Máximo uno por día.');
  end if;

  -- Doble sello por día de la semana
  if c->'double_days' @> to_jsonb(dow) then v_add := 2; v_reasons := v_reasons || 'dia_doble'::text; end if;

  -- Doble sello por invitado nuevo registrado hoy
  if nullif(trim(coalesce(p_guest_phone,'')),'') is not null then
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
  if m.bday_month = extract(month from today)::int and not exists(
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

create or replace function public.staff_redeem(p_session text, p_reward_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s staff; rw rewards; c jsonb; maxv int;
begin
  s := staff_from_session(p_session);
  select * into rw from rewards where id = p_reward_id and tenant_id = s.tenant_id for update;
  if rw.id is null then return jsonb_build_object('ok',false,'error','Regalo no encontrado.'); end if;
  if rw.redeemed_at is not null then return jsonb_build_object('ok',false,'error','Este regalo ya se canjeó.'); end if;
  if rw.expires_at < now() then return jsonb_build_object('ok',false,'error','Este regalo ya venció.'); end if;
  update rewards set redeemed_at = now(), redeemed_by = s.id where id = rw.id;
  select cfg(t) into c from tenants t where t.id = s.tenant_id;
  select max((value->>'visit')::int) into maxv from jsonb_array_elements(c->'rewards');
  if rw.visit_no = maxv then
    update members set stamps = 0, card_number = card_number + 1
     where id = rw.member_id and card_number = rw.card_number;
  end if;
  return jsonb_build_object('ok',true,'title',rw.title,'card_restarted', rw.visit_no = maxv);
end $$;

create or replace function public.staff_recent(p_session text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s staff;
begin
  s := staff_from_session(p_session);
  return coalesce((select jsonb_agg(x order by x->>'at' desc) from (
    select jsonb_build_object('at', v.created_at, 'name', m.name, 'code', m.code, 'amount', v.amount,
                              'stamps', v.stamps_added, 'staff', st.name, 'table', v.table_no) x
      from visits v join members m on m.id = v.member_id left join staff st on st.id = v.staff_id
     where v.tenant_id = s.tenant_id and v.created_at > now() - interval '14 hours'
     order by v.created_at desc limit 30) q), '[]'::jsonb);
end $$;

-- ============================================================
-- PANEL (dueño y SOCIAL, con login)
-- ============================================================

create or replace function public.claim_first_admin() returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return false; end if;
  if exists(select 1 from super_admins) then return is_super_admin(); end if;
  insert into super_admins(user_id) values (auth.uid());
  return true;
end $$;

create or replace function public.my_tenants() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'slug',t.slug,'name',t.name,'active',t.active) order by t.name),'[]'::jsonb)
    from tenants t where is_tenant_admin(t.id)
$$;

create or replace function public.admin_stats(p_tenant uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare c jsonb; mstart timestamptz; tot int; newm int; back int; avg_t int; vmonth int; rew jsonb; dow jsonb; dormant jsonb;
begin
  if not is_tenant_admin(p_tenant) then raise exception 'NO_AUTORIZADO'; end if;
  select cfg(t) into c from tenants t where t.id = p_tenant;
  mstart := (date_trunc('month', bogota_now())) at time zone 'America/Bogota';
  select count(*) into tot from members where tenant_id = p_tenant;
  select count(*) into newm from members where tenant_id = p_tenant and created_at >= mstart;
  select count(distinct member_id) into back from visits v where v.tenant_id = p_tenant and v.created_at >= mstart
     and exists(select 1 from visits v2 where v2.member_id = v.member_id and v2.created_at < v.created_at);
  select count(*), coalesce(round(avg(amount)),0) into vmonth, avg_t from visits where tenant_id = p_tenant and created_at >= mstart;
  select coalesce(jsonb_agg(jsonb_build_object('title', title, 'count', n) order by n desc),'[]') into rew from (
     select title, count(*) n from rewards where tenant_id = p_tenant and redeemed_at >= mstart group by title) q;
  select coalesce(jsonb_agg(jsonb_build_object('dow', d, 'count', n) order by d),'[]') into dow from (
     select extract(isodow from local_date)::int d, count(*) n from visits
      where tenant_id = p_tenant and created_at > now() - interval '90 days' group by 1) q;
  select coalesce(jsonb_agg(x order by (x->>'days')::int desc),'[]') into dormant from (
     select jsonb_build_object('id', m.id, 'name', m.name, 'phone', m.phone, 'code', m.code, 'stamps', m.stamps,
        'visits', m.total_visits, 'last', m.last_visit_at,
        'days', extract(day from now() - m.last_visit_at)::int) x
       from members m where m.tenant_id = p_tenant and m.total_visits > 0
        and m.last_visit_at < now() - make_interval(days => (c->>'dormant_days')::int)) q;
  return jsonb_build_object('members', tot, 'new_members', newm, 'returned', back,
    'visits_month', vmonth, 'avg_ticket', avg_t, 'redeemed', rew, 'by_dow', dow, 'dormant', dormant,
    'config', c);
end $$;

create or replace function public.admin_member_detail(p_member uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare tid uuid;
begin
  select tenant_id into tid from members where id = p_member;
  if not is_tenant_admin(tid) then raise exception 'NO_AUTORIZADO'; end if;
  return card_json(p_member);
end $$;

create or replace function public.admin_save_staff(p_tenant uuid, p_id uuid, p_name text, p_pin text, p_active boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare sid uuid;
begin
  if not is_tenant_admin(p_tenant) then raise exception 'NO_AUTORIZADO'; end if;
  if p_pin is not null and p_pin !~ '^\d{4}$' then return jsonb_build_object('ok',false,'error','El PIN debe tener 4 números.'); end if;
  if p_id is null then
    if p_pin is null then return jsonb_build_object('ok',false,'error','Pon un PIN.'); end if;
    insert into staff(tenant_id, name, pin_hash) values (p_tenant, trim(p_name), extensions.crypt(p_pin, extensions.gen_salt('bf'))) returning id into sid;
  else
    update staff set name = coalesce(nullif(trim(p_name),''), name),
                     active = coalesce(p_active, active),
                     pin_hash = case when p_pin is null then pin_hash else extensions.crypt(p_pin, extensions.gen_salt('bf')) end
     where id = p_id and tenant_id = p_tenant returning id into sid;
    if p_active = false then delete from staff_sessions where staff_id = p_id; end if;
  end if;
  return jsonb_build_object('ok',true,'id',sid);
exception when unique_violation then
  return jsonb_build_object('ok',false,'error','Ya hay un mesero con ese nombre.');
end $$;

-- Carga una carta completa desde JSON (formato SOCIAL: categorias[].platos[] con n,g,p,p2,d,estrella,show)
create or replace function public.import_menu_internal(p_tenant uuid, p_menu jsonb, p_replace boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare cat jsonb; dish jsonb; cid uuid; ci int := 0; di int; nd int := 0;
begin
  if p_replace then delete from categories where tenant_id = p_tenant; end if;
  for cat in select * from jsonb_array_elements(coalesce(p_menu->'categorias', p_menu)) loop
    ci := ci + 1;
    insert into categories(tenant_id, name, note, sort)
      values (p_tenant, cat->>'nombre', cat->>'nota', ci) returning id into cid;
    di := 0;
    for dish in select * from jsonb_array_elements(cat->'platos') loop
      di := di + 1; nd := nd + 1;
      insert into dishes(tenant_id, category_id, name, portion, description, price, price2, sort, star, show)
        values (p_tenant, cid, dish->>'n', dish->>'g', nullif(dish->>'d',''), (dish->>'p')::int, (dish->>'p2')::int, di,
                coalesce((dish->>'estrella')::boolean,false), coalesce((dish->>'show')::boolean,false));
    end loop;
  end loop;
  return jsonb_build_object('ok',true,'categories',ci,'dishes',nd);
end $$;

create or replace function public.admin_import_menu(p_tenant uuid, p_menu jsonb, p_replace boolean default true)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not is_tenant_admin(p_tenant) then raise exception 'NO_AUTORIZADO'; end if;
  return import_menu_internal(p_tenant, p_menu, p_replace);
end $$;

create or replace function public.admin_create_tenant(p_slug text, p_name text, p_prefix text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare tid uuid;
begin
  if not is_super_admin() then raise exception 'NO_AUTORIZADO'; end if;
  insert into tenants(slug, name, code_prefix) values (lower(trim(p_slug)), trim(p_name), upper(trim(p_prefix))) returning id into tid;
  return jsonb_build_object('ok',true,'id',tid);
exception when unique_violation then
  return jsonb_build_object('ok',false,'error','Ya existe una marca con ese link.');
  when check_violation then
  return jsonb_build_object('ok',false,'error','Revisa el link (solo minúsculas, números y guiones) y el prefijo (2 a 4 letras).');
end $$;

create or replace function public.admin_add_tenant_admin(p_tenant uuid, p_email text) returns jsonb
language plpgsql security definer set search_path = public, auth as $$
declare uid uuid;
begin
  if not is_super_admin() then raise exception 'NO_AUTORIZADO'; end if;
  select id into uid from auth.users where lower(email) = lower(trim(p_email));
  if uid is null then return jsonb_build_object('ok',false,'error','Esa persona primero debe crear su cuenta en /panel.'); end if;
  insert into tenant_admins(user_id, tenant_id) values (uid, p_tenant) on conflict do nothing;
  return jsonb_build_object('ok',true);
end $$;

-- ============================================================
-- SEGURIDAD (RLS)
-- ============================================================

alter table public.tenants        enable row level security;
alter table public.categories     enable row level security;
alter table public.dishes         enable row level security;
alter table public.members        enable row level security;
alter table public.staff          enable row level security;
alter table public.staff_sessions enable row level security;
alter table public.visits         enable row level security;
alter table public.rewards        enable row level security;
alter table public.super_admins   enable row level security;
alter table public.tenant_admins  enable row level security;

-- Comensales y meseros NO tocan tablas: solo funciones. Admins sí, por su marca.
create policy admin_tenants_sel on public.tenants for select to authenticated using (is_tenant_admin(id));
create policy admin_tenants_upd on public.tenants for update to authenticated using (is_tenant_admin(id)) with check (is_tenant_admin(id));
create policy admin_cat on public.categories for all to authenticated using (is_tenant_admin(tenant_id)) with check (is_tenant_admin(tenant_id));
create policy admin_dish on public.dishes for all to authenticated using (is_tenant_admin(tenant_id)) with check (is_tenant_admin(tenant_id));
create policy admin_members on public.members for select to authenticated using (is_tenant_admin(tenant_id));
create policy admin_members_del on public.members for delete to authenticated using (is_tenant_admin(tenant_id));
create policy admin_staff on public.staff for select to authenticated using (is_tenant_admin(tenant_id));
create policy admin_visits on public.visits for select to authenticated using (is_tenant_admin(tenant_id));
create policy admin_rewards on public.rewards for select to authenticated using (is_tenant_admin(tenant_id));
create policy own_super on public.super_admins for select to authenticated using (user_id = auth.uid());
create policy own_tadmin on public.tenant_admins for select to authenticated using (user_id = auth.uid() or is_super_admin());

-- Permisos de tabla: el público no toca tablas; los admins solo columnas seguras
revoke all on all tables in schema public from anon;
revoke all on public.tenants, public.members, public.staff, public.staff_sessions, public.visits,
              public.rewards, public.super_admins, public.tenant_admins from authenticated;
grant select (id, slug, name, code_prefix, active, config, created_at) on public.tenants to authenticated;
grant update (name, active, config) on public.tenants to authenticated;
grant select (id, tenant_id, code, name, phone, bday_day, bday_month, consent_at, stamps, card_number,
              total_visits, last_visit_at, created_at) on public.members to authenticated;
grant delete on public.members to authenticated;
grant select (id, tenant_id, name, active, created_at) on public.staff to authenticated;
grant select on public.visits, public.rewards, public.super_admins, public.tenant_admins to authenticated;
grant select, insert, update, delete on public.categories, public.dishes to authenticated;

-- Funciones: el público solo ve las del comensal y el mesero
revoke execute on all functions in schema public from public, anon;
grant execute on function public.get_menu(text), public.register_member(text,text,text,int,int,boolean),
  public.recover_member(text,text,int,int), public.get_card(text), public.get_dynamic_code(text),
  public.leave_program(text), public.staff_login(text,text,text), public.staff_lookup(text,text),
  public.staff_stamp(text,text,int,text,text), public.staff_redeem(text,uuid), public.staff_recent(text)
  to anon, authenticated;
grant execute on function public.claim_first_admin(), public.my_tenants(), public.admin_stats(uuid),
  public.admin_member_detail(uuid), public.admin_save_staff(uuid,uuid,text,text,boolean),
  public.admin_import_menu(uuid,jsonb,boolean), public.admin_create_tenant(text,text,text),
  public.admin_add_tenant_admin(uuid,text), public.is_tenant_admin(uuid), public.is_super_admin(),
  public.default_config(), public.cfg(public.tenants)
  to authenticated;

-- ===== supabase/migrations/20261120000002_storage.sql =====
-- Fotos y videos de la carta: carpeta por marca (tenant_id/archivo)
insert into storage.buckets (id, name, public) values ('media', 'media', true)
  on conflict (id) do nothing;

create policy media_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.is_tenant_admin(((storage.foldername(name))[1])::uuid));
create policy media_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'media' and public.is_tenant_admin(((storage.foldername(name))[1])::uuid));
create policy media_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.is_tenant_admin(((storage.foldername(name))[1])::uuid));

-- ===== supabase/migrations/20261120000003_seed_la_unica.sql =====
-- Semilla: La Única (primer cliente). Mesero de prueba: Prueba / 1234
do $$
declare tid uuid;
begin
  insert into public.tenants(slug, name, code_prefix, config)
    values ('la-unica', 'La Única', 'LU', '{"colors": {"bg": "#000000", "fg": "#FFFFFF", "muted": "#8A8A8A", "line": "#2A2A2A", "accent": "#FFFFFF"}, "fonts": {"title": "Cormorant Garamond", "body": "Montserrat"}, "logo_top": "MAR Y TIERRA", "logo_bottom": "ASADOR MEXICANO · MX · CTG", "logo_text": "LA ÚNICA", "address": "Cra. 8 #38-47, San Diego, Cartagena", "instagram": "launica.ctg", "reservations_url": "https://wa.link/mmljx1", "min_amount": 80000, "double_days": [1, 2, 3], "reward_days": 60, "dormant_days": 45, "reset_months": 12, "card_size": 10, "rewards": [{"visit": 3, "title": "Esquites asados con chicharrón norteño", "desc": "Para la mesa, de la casa."}, {"visit": 5, "title": "Un cóctel de autor", "desc": "Mezcalita, San Mike o La Catrina."}, {"visit": 7, "title": "Taco carabinero", "desc": "Langostinos, costra de queso y piña asada."}, {"visit": 10, "title": "Caña de lomo para 2", "desc": "Flameada con tequila en tu mesa. Tarjeta completa."}], "tiers": [{"name": "Amigo", "min": 0, "benefits": ["Tarjeta de 10 sellos", "Regalo de cumpleaños", "Doble sello lunes a miércoles"]}, {"name": "Compadre", "min": 10, "benefits": ["Todo lo de Amigo", "Reserva prioritaria en fin de semana", "Primero en probar platos nuevos"]}, {"name": "Familia", "min": 25, "benefits": ["Todo lo de Compadre", "Mesa garantizada con aviso de 24 h", "Invitación a la cata anual de tequila y mezcal"]}], "birthday_gift": "Margarita La Única y postre de cortesía", "card_name": "Tarjeta de la casa"}'::jsonb)
    on conflict (slug) do update set config = excluded.config
    returning id into tid;
  perform public.import_menu_internal(tid, '{"categorias": [{"id": "antojitos", "nombre": "Antojitos", "nota": "Para compartir", "platos": [{"n": "Aguachile de lomo", "g": "250 g", "p": 70000, "d": "Lomo, relish de aguacate, rábano y cebolla roja, bañado en salsa ponzu."}, {"n": "Chicharrón de ribeye", "g": "300 g", "p": 130000, "d": "Crujiente sobre guacamole con salsa piquín limón, con tortilla de maíz."}, {"n": "Chicharrón de pulpo tatemado", "g": "180 g", "p": 120000, "d": "Asado y crujiente sobre guacamole, ensaladilla de rúgula y tortilla de maíz."}, {"n": "Chicharrón de lomo", "g": "300 g", "p": 88000, "d": "Lomo fino crujiente sobre guacamole con salsa piquín limón y tortilla de maíz."}, {"n": "Chicharrón norteño", "g": "240 g", "p": 48000, "d": "Chicharrón de cerdo crujiente sobre cremoso de aguacate y pico de gallo."}, {"n": "Croquetas short ribs", "g": "6 und", "p": 50000, "d": "Rellenas de short ribs, con mayonesa de habanero."}, {"n": "Mini burger", "g": "2 und", "p": 24000, "d": "Carne Angus, queso cheddar y cebolla caramelizada."}, {"n": "Picada caribeña", "g": "x2 / x4 personas", "p": 35000, "p2": 45000, "d": "Carimañolas, empanada, arepa de huevo, suero y picante."}, {"n": "Empanada regia mexicana", "g": "2 und", "p": 25000, "d": "Rellena de guiso de lomo fino, brotes de cilantro y salsa de chile morita."}, {"n": "Esquites asados con chicharrón norteño", "p": 25000, "d": "Chicharrón de cerdo, mayonesa tajín, queso costeño y cilantro criollo."}, {"n": "Guacamole recién machacado", "g": "con queso / con chicharrón", "p": 34000, "p2": 37000, "d": "Guacamole hecho al momento."}, {"n": "Queso fundido", "g": "natural / con lomo fino", "p": 38000, "p2": 51000, "d": "Queso fundido al carbón."}, {"n": "Tuétanos al carbón", "p": 45000, "d": "Con chile japonés y perejil frito, con tortilla de maíz."}]}, {"id": "mar", "nombre": "Del mar", "nota": "Para compartir", "platos": [{"n": "Ceviche de tigre", "p": 59000, "d": "Róbalo, pepino, cebolla morada, rocoto, brote de cilantro, leche de tigre y salsa macha."}, {"n": "Ceviche La Única", "p": 62000, "d": "Camarón, róbalo, cebolla morada, tomate, jalapeño y cilantro en leche de tigre."}, {"n": "Tartar de atún", "p": 55000, "d": "Atún en cubos, mango, pepino, cebolla morada, jalapeño rojo, aguacate, masago y leche de tigre de rocoto."}, {"n": "Cóctel Don Dino", "p": 52000, "d": "Pulpo y camarón, cebolla morada, tomate, aguacate, cilantro y salsa coctelera.", "estrella": true}, {"n": "Tostada de atún", "g": "2 und", "p": 48000, "d": "Atún aleta amarilla, mayo-chipotle, chile pasilla, cebolla puerro y aguacate."}, {"n": "Tiradito de atún", "p": 55000, "d": "Atún aleta amarilla, cebolla morada, jalapeño rojo, rúgula y aguacate en salsa ponzu."}, {"n": "Tiradito de salmón curado", "p": 60000, "d": "En leche de tigre de maracuyá, rábano, pepino, habanero, rúgula y chips de batata."}, {"n": "Aguachile de mango y chile habanero", "p": 38000, "d": "Camarones encurtidos en limón, mango, rábano, pepino, cebolla roja y tostadas de maíz tatemadas."}]}, {"id": "huerta", "nombre": "De la huerta", "platos": [{"n": "Ensalada César", "p": 38000, "d": "Lechuga cogollo, aderezo césar, crotones y parmesano."}, {"n": "Ensalada del huerto", "p": 42000, "d": "Lechugas orgánicas, espárragos, maíz baby, tomate, cebolla morada, aguacate y vinagreta de jerez."}, {"n": "Coliflor a las brasas", "p": 48000, "d": "Marinada en oliva limón, sal parrilla y aderezo de jalapeño."}, {"n": "Espárragos a las brasas", "p": 27000, "d": "Con aderezo de jalapeño y parmesano."}, {"n": "Tabla de verduras a las brasas", "p": 30000, "d": "Espárragos, champiñones, mazorca, pimiento, cebolla morada, brócoli, calabaza y papa."}, {"n": "Alcachofas al carbón", "g": "2 und", "p": 55000, "d": "Asadas a la brasa con aderezo de jalapeño."}]}, {"id": "tacos", "nombre": "Tacos", "nota": "Orden de 2", "platos": [{"n": "Pulpo zarandeado", "g": "2", "p": 55000, "d": "Pulpo a las brasas en salsa de chile guajillo, tortilla crocante, aguacate y chutney de mango, piña y habanero."}, {"n": "Baja California", "g": "2", "p": 52000, "d": "Pescado en tempura, guacamole, repollo morado encurtido, mayonesa chipotle y pico de gallo en tortilla de maíz."}, {"n": "Sinaloa", "g": "2", "p": 48000, "d": "Camarón con costra de queso en tortilla de harina, pico de gallo, aguacate y cilantro."}, {"n": "Arrachera", "g": "2", "p": 52000, "d": "Arrachera con cremoso de aguacate, pico de gallo y crujiente de papa en tortilla de maíz."}, {"n": "Gaoneras de filete", "g": "2", "p": 48000, "d": "Láminas de lomo sobre costra de queso, ensaladilla de rúgula y aguacate en tortilla de maíz."}, {"n": "Tuétano y lomo", "g": "2", "p": 56000, "d": "Lomo sellado a la parrilla, cebolla blanca, cilantro y tuétano en tortilla de harina."}, {"n": "Taco carabinero", "g": "1", "p": 50000, "d": "Langostinos en tortilla de trigo, costra de queso, salsa ahumada de chiles, piña asada y pico de gallo."}, {"n": "Pirata", "g": "2", "p": 45000, "d": "Trozos de lomo fino, cebolla blanca y salsa taquera."}, {"n": "De pollo", "g": "2", "p": 40000, "d": "Pollo en salsa chipotle en tortilla de trigo con costra de queso, pico de gallo, aguacate y cilantro."}]}, {"id": "especialidades", "nombre": "Especialidades", "platos": [{"n": "Caña de lomo", "g": "500 g · 2 personas", "p": 138000, "d": "Con mantequilla de hongos de temporada, flameada con tequila en la mesa y papas a la francesa.", "show": true}, {"n": "Lomo pimienta", "g": "250 g", "p": 90000, "d": "Lomo en costra de pimienta, mantequilla clarificada de pimienta y papas a la francesa.", "estrella": true}, {"n": "Lomo chemita", "g": "250 g", "p": 88000, "d": "Lomo de res en demi-glace, cebolla crispy y puré de papa."}, {"n": "Barbacoa norteña de res", "g": "350 g", "p": 140000, "d": "Short rib cocinado por 12 horas y flameado con mezcal.", "show": true}, {"n": "Costillas baby back", "p": 96000, "d": "En salsa barbecue, con papa rubs y parmesano."}, {"n": "Arroz cremoso de mariscos", "p": 90000, "d": "Camarón, pulpo y langostinos con arroz de coco frito, crujiente de puerro, cremoso de aguacate y suero costeño."}, {"n": "Arroz meloso con lomo fino", "p": 60000, "d": "Arroz de coco frito con vegetales, chile habanero, ajo y jengibre, cremoso de aguacate y lomo a la brasa."}, {"n": "Pesca del día", "g": "200 g", "p": 92000, "d": "En salsa verde o roja, con arroz cremoso y ensaladilla."}, {"n": "Langostinos al ajillo", "g": "200 g", "p": 105000, "d": "Con ajo y chile guajillo y puré de papa."}, {"n": "Salmón a las brasas", "g": "200 g", "p": 88000, "d": "Con aceite de romero, puré de batata con parmesano, crujiente de tocineta, espárrago y rúgula agridulce."}, {"n": "Atún a las brasas", "g": "200 g", "p": 85000, "d": "Marinado en oliva limón, sobre cremoso de pimientos ahumados, vegetales a las brasas y reducción balsámica."}, {"n": "Ossobuco de cerdo", "p": 65000, "d": "Terminado al horno, con frijol matón y tortillas mixtas."}, {"n": "Medio pollo asado", "p": 65000, "d": "Marinado, con papas confitadas y ensalada fresca."}]}, {"id": "carbon", "nombre": "Al carbón", "nota": "Cortes con acompañamiento a elección", "platos": [{"n": "Hamburguesa La Única", "g": "180 g", "p": 60000, "d": "Carne wagyu, queso cheddar, tomate, lechuga, cebolla caramelizada y salsa de la casa.", "estrella": true}, {"n": "New York Wagyu", "g": "300 g", "p": 237600, "d": "Corte wagyu."}, {"n": "New York Prime", "g": "300 g", "p": 189000, "d": "Certified Angus Prime."}, {"n": "Rib eye Prime", "g": "350 g", "p": 210600, "d": "Certified Angus Prime."}, {"n": "Top sirloin Prime", "g": "900 g", "p": 390000, "d": "Certified Angus Prime."}, {"n": "Entraña", "g": "300 g", "p": 168480, "d": "Certified Angus Beef."}, {"n": "Picanha", "g": "300 g", "p": 124200, "d": "Certified Angus Beef."}, {"n": "Arrachera", "p": 130000, "d": "Certified Angus Beef."}, {"n": "New York", "g": "300 g", "p": 156600, "d": "Certified Angus Beef."}, {"n": "Asado de tira", "g": "300 g", "p": 136000, "d": "Certified Angus Beef."}, {"n": "Rib eye", "g": "350 g", "p": 199800, "d": "Certified Angus Beef."}, {"n": "Picanha", "g": "1 kg", "p": 360000, "d": "Certified Angus Beef. Con papas trufadas o papa criolla al ajillo."}, {"n": "Tomahawk", "g": "1 kg", "p": 534600, "d": "Certified Angus Beef. Con papas trufadas o papa criolla al ajillo."}]}, {"id": "sopas", "nombre": "Sopas y guarniciones", "platos": [{"n": "Sopa de tortilla", "p": 42000, "d": "Caldillo de tomate, chile guajillo, aguacate y queso mozzarella."}, {"n": "Bite de papas francesas", "p": 40000, "d": "Con cheddar y tocineta."}, {"n": "Totopos con salsa", "p": 21000, "d": ""}, {"n": "Papas a la francesa", "p": 18000, "d": ""}, {"n": "Frijol matón", "p": 18000, "d": ""}, {"n": "Puré de batata con tocino", "p": 15000, "d": ""}, {"n": "Puré de papa", "p": 13000, "d": ""}, {"n": "Arroz de coco", "p": 9000, "d": ""}, {"n": "Arroz blanco", "p": 8000, "d": ""}]}, {"id": "coctelesAutor", "nombre": "Cócteles de autor", "platos": [{"n": "Margarita La Única", "p": 60000, "d": "Tequila 1800, Grand Marnier y zumo de naranja."}, {"n": "La Catrina", "p": 48000, "d": "Maracuyá, limón, vodka Ketel One, sirope y jalapeño verde."}, {"n": "Cosmopolitan La Única", "p": 45000, "d": "Vodka Ketel One, naranja, limón, flor de jamaica y triple sec."}, {"n": "San Mike", "p": 48000, "d": "Mezcal Unión, flor de jamaica, zumo de naranja y sirope."}, {"n": "Corralejo Spicy", "p": 55000, "d": "Tequila Corralejo Blanco, limón, jalapeño verde macerado y triple sec."}, {"n": "La Bamba", "p": 52000, "d": "Aperol, Jack Daniel''s, piña, naranja, limón y sirope."}, {"n": "Carnal", "p": 55000, "d": "Patrón reposado, piña, naranja y jengibre."}, {"n": "Mezcalita", "p": 40000, "d": "Mezcal, licor de naranja y limón."}, {"n": "Mezcalito", "p": 48000, "d": "Mezcal Unión, Aperol, naranja y sirope."}, {"n": "Paloma Dos Almas", "p": 43000, "d": "Buchanan''s Two Souls, soda de toronja y limón."}, {"n": "El Cantinero", "p": 45000, "d": "Mezcal Ojo de Tigre, naranja, limón, ginger ale y sirope."}, {"n": "Oaxaca Negroni", "p": 40000, "d": "Mezcal, Campari y vermouth rojo."}, {"n": "Penicilina", "p": 40000, "d": "The Glenlivet Caribbean y sirope de jengibre."}, {"n": "Pasión Caribe", "p": 45000, "d": "Ron La Hechicera, maracuyá y limón."}, {"n": "Caribe", "p": 45000, "d": "Glenmorangie macerado con arroz, piña fresca y azúcar."}]}, {"id": "coctelesClasicos", "nombre": "Cócteles clásicos", "platos": [{"n": "Margarita", "p": 45000, "d": "Tequila José Cuervo, triple sec y limón, escarchada con sal y tajín."}, {"n": "Margarita Premium", "p": 70000, "d": "Tequila Don Julio 70, Cointreau y limón, escarchada con sal y tajín."}, {"n": "Paloma", "p": 47000, "d": "Tequila Olmeca Altos Reposado, limón, sirope y soda de toronja."}, {"n": "Gin tonic Tanqueray Ten", "p": 60000, "d": "Naranja y toronja fresca con tónica 1976."}, {"n": "Gin tonic Tanqueray Rangpur", "p": 50000, "d": "Limón y naranja deshidratados con tónica 1976."}, {"n": "Gin tonic Tanqueray Dry", "p": 45000, "d": "Limón y naranja fresca con tónica 1976."}, {"n": "Aperol Spritz", "p": 50000, "d": "Aperol, Prosecco Riccadonna y soda."}, {"n": "Old Fashioned", "p": 50000, "d": "Bulleit Bourbon, bitters de angostura y sirope."}, {"n": "Negroni", "p": 50000, "d": "Tanqueray London Dry, Campari y vermouth rojo."}, {"n": "Martini", "p": 50000, "d": "Tanqueray London Dry, vermouth dry y aceitunas."}, {"n": "Guadalajara", "p": 50000, "d": "Tequila 1800 Reposado, limón, sirope, triple sec y albahaca."}, {"n": "Moscow Mule", "p": 48000, "d": "Vodka Ketel One, ginger beer, limón y sirope."}, {"n": "Mojito", "p": 48000, "d": "Ron Viejo de Caldas 15 años, limón, sirope, hierbabuena y soda."}, {"n": "Carajillo", "p": 48000, "d": "Licor 43 y espresso."}, {"n": "Whisky Tonic", "p": 45000, "d": "Buchanan''s 12 años, tónica y toronja."}]}]}'::jsonb, true);
  insert into public.staff(tenant_id, name, pin_hash)
    values (tid, 'Prueba', extensions.crypt('1234', extensions.gen_salt('bf')))
    on conflict do nothing;
end $$;
