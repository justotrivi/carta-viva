-- Carta inmersiva: fotos por plato, patrocinadores, reseñas privadas
alter table public.dishes add column if not exists photos text[] not null default '{}';
alter table public.dishes add column if not exists sponsor text;

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  stars int not null check (stars between 1 and 5),
  comment text,
  table_no text,
  member_id uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.feedback enable row level security;
drop policy if exists admin_feedback on public.feedback;
create policy admin_feedback on public.feedback for select to authenticated using (is_tenant_admin(tenant_id));
revoke all on public.feedback from anon, authenticated;
grant select on public.feedback to authenticated;

create or replace function public.send_feedback(p_slug text, p_stars int, p_comment text, p_table text, p_token text)
returns boolean language plpgsql security definer set search_path = public as $$
declare t tenants; mid uuid;
begin
  select * into t from tenants where slug = lower(p_slug) and active;
  if t.id is null or p_stars not between 1 and 5 then return false; end if;
  if p_token is not null then select id into mid from members where token = p_token and tenant_id = t.id; end if;
  insert into feedback(tenant_id, stars, comment, table_no, member_id)
    values (t.id, p_stars, left(nullif(trim(coalesce(p_comment,'')),''), 2000), left(nullif(trim(coalesce(p_table,'')),''), 20), mid);
  return true;
end $$;
revoke execute on function public.send_feedback(text,int,text,text,text) from public;
grant execute on function public.send_feedback(text,int,text,text,text) to anon, authenticated;

create or replace function public.get_menu(p_slug text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare t tenants;
begin
  select * into t from tenants where slug = lower(p_slug) and active;
  if t.id is null then return null; end if;
  return jsonb_build_object(
    'tenant', jsonb_build_object('id', t.id, 'slug', t.slug, 'name', t.name, 'config', cfg(t)),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('id', ca.id, 'name', ca.name, 'note', ca.note,
        'dishes', coalesce((select jsonb_agg(jsonb_build_object(
            'id', d.id, 'name', d.name, 'portion', d.portion, 'description', d.description,
            'price', d.price, 'price2', d.price2, 'star', d.star, 'show', d.show, 'sponsor', d.sponsor,
            'photos', d.photos, 'media_url', d.media_url, 'media_type', d.media_type) order by d.sort)
          from dishes d where d.category_id = ca.id and d.available), '[]'::jsonb)) order by ca.sort)
      from categories ca where ca.tenant_id = t.id), '[]'::jsonb));
end $$;

do $$
declare tid uuid;
begin
  select id into tid from public.tenants where slug = 'la-unica';
  if tid is null then return; end if;
  update public.tenants set config = config || '{"logo_url": "/m/la-unica/logo.png", "intro_video": "/m/la-unica/manos.mp4", "intro_poster": "/m/la-unica/manos-poster.jpg", "intro_title": "Manos que dan forma a cada plato", "intro_text": "Todo lo que ves en esta carta se hace a mano en la cocina de La Única Cartagena.", "intro_tag": "La cocina", "star_icon": "/m/la-unica/estrella.png", "sponsors": {"angus": {"icon": "/m/la-unica/cab.png", "label": "Certified Angus Beef", "note": "Nuestros cortes Angus y Prime son Certified Angus Beef®."}}, "category_sponsor": {"Al carbón": "angus"}, "star_note": "Los platos con la estrella son los recomendados de la casa. Van perfecto con una Stella Artois.", "pairings": {"Baja California": "Margarita", "Gaoneras de filete": "Paloma", "Pirata": "Paloma", "Picada caribeña": "Margarita", "Caña de lomo": "Margarita La Única", "Margarita": "Baja California", "Ceviche La Única": "Margarita", "Cóctel Don Dino": "Margarita", "Lomo pimienta": "Old Fashioned", "Hamburguesa La Única": "Paloma", "Sopa de tortilla": "Paloma"}, "today": [{"img": "/m/la-unica/DSC09345.jpg", "tag": "El show de la casa", "title": "Caña de lomo flameada con tequila", "text": "500 g para dos, con mantequilla de hongos de temporada. Se flamea en tu mesa.", "dish": "Caña de lomo"}, {"tag": "Almuerzo · 12:30 a 3:30 p. m.", "title": "Menú corporativo", "text": "Entrada, plato fuerte y postre por $120.000. Ceviche La Única, Lomo Chemita, Arroz cremoso de mariscos, Flan de coco y más."}, {"img": "/m/la-unica/DSC09581.jpg", "tag": "Para llevar", "title": "La salsa de La Única", "text": "Nuestra salsa picante, embotellada. Pregúntale a tu mesero por ella."}], "google_review_url": "https://www.google.com/maps/search/La+%C3%9Anica+Cartagena+San+Diego", "phone": "+57 5678 7949", "legal": "Los precios no incluyen el impuesto al consumo. Servicio voluntario. El exceso de alcohol es perjudicial para la salud. Ley 30 de 1986. Prohíbase el expendio de bebidas embriagantes a menores de edad."}'::jsonb where id = tid;
  update public.dishes d set photos = array['/m/la-unica/DSC09579.jpg','/m/la-unica/DSC09581.jpg','/m/la-unica/DSC09619.jpg','/m/la-unica/DSC09624.jpg'], media_url = '/m/la-unica/DSC09579.jpg', media_type = 'image' from public.categories c where c.id = d.category_id and c.tenant_id = tid and c.name = 'Antojitos' and d.name = 'Picada caribeña';
  update public.dishes d set photos = array['/m/la-unica/DSC09622.jpg','/m/la-unica/DSC08888-2.jpg','/m/la-unica/DSC08890.jpg','/m/la-unica/DSC08895.jpg','/m/la-unica/DSC08896.jpg'], media_url = '/m/la-unica/DSC09622.jpg', media_type = 'image' from public.categories c where c.id = d.category_id and c.tenant_id = tid and c.name = 'Tacos' and d.name = 'Baja California';
  update public.dishes d set photos = array['/m/la-unica/DSC08881.jpg','/m/la-unica/DSC08876.jpg','/m/la-unica/DSC08884.jpg'], media_url = '/m/la-unica/DSC08881.jpg', media_type = 'image' from public.categories c where c.id = d.category_id and c.tenant_id = tid and c.name = 'Tacos' and d.name = 'Gaoneras de filete';
  update public.dishes d set photos = array['/m/la-unica/DSC08992.jpg','/m/la-unica/DSC08891.jpg'], media_url = '/m/la-unica/DSC08992.jpg', media_type = 'image' from public.categories c where c.id = d.category_id and c.tenant_id = tid and c.name = 'Tacos' and d.name = 'Pirata';
  update public.dishes d set photos = array['/m/la-unica/DSC09345.jpg','/m/la-unica/DSC09365.jpg'], media_url = '/m/la-unica/DSC09345.jpg', media_type = 'image' from public.categories c where c.id = d.category_id and c.tenant_id = tid and c.name = 'Especialidades' and d.name = 'Caña de lomo';
  update public.dishes d set photos = array['/m/la-unica/DSC09629.jpg'], media_url = '/m/la-unica/DSC09629.jpg', media_type = 'image' from public.categories c where c.id = d.category_id and c.tenant_id = tid and c.name = 'Sopas y guarniciones' and d.name = 'Sopa de tortilla';
  update public.dishes d set photos = array['/m/la-unica/DSC08911.jpg'], media_url = '/m/la-unica/DSC08911.jpg', media_type = 'image' from public.categories c where c.id = d.category_id and c.tenant_id = tid and c.name = 'Cócteles clásicos' and d.name = 'Margarita';
  update public.dishes d set sponsor = 'angus' from public.categories c where c.id = d.category_id and c.tenant_id = tid and c.name = 'Al carbón' and d.description ilike 'Certified Angus%';
  update public.dishes d set sponsor = 'angus' from public.categories c where c.id = d.category_id and c.tenant_id = tid and d.name = 'Mini burger';
end $$;

-- Importar carta ahora también trae fotos y patrocinador
create or replace function public.import_menu_internal(p_tenant uuid, p_menu jsonb, p_replace boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare cat jsonb; dish jsonb; cid uuid; ci int := 0; di int; nd int := 0; sl text; ph text[];
begin
  select slug into sl from tenants where id = p_tenant;
  if p_replace then delete from categories where tenant_id = p_tenant; end if;
  for cat in select * from jsonb_array_elements(coalesce(p_menu->'categorias', p_menu)) loop
    ci := ci + 1;
    insert into categories(tenant_id, name, note, sort) values (p_tenant, cat->>'nombre', cat->>'nota', ci) returning id into cid;
    di := 0;
    for dish in select * from jsonb_array_elements(cat->'platos') loop
      di := di + 1; nd := nd + 1;
      select coalesce(array_agg(case when f like '%/%' then f else '/m/' || sl || '/' || f || '.jpg' end), '{}')
        into ph from jsonb_array_elements_text(coalesce(dish->'fotos','[]'::jsonb)) f;
      insert into dishes(tenant_id, category_id, name, portion, description, price, price2, sort, star, show, sponsor, photos, media_url, media_type)
        values (p_tenant, cid, dish->>'n', dish->>'g', nullif(dish->>'d',''), (dish->>'p')::int, (dish->>'p2')::int, di,
                coalesce((dish->>'estrella')::boolean,false), coalesce((dish->>'show')::boolean,false), dish->>'sponsor',
                ph, ph[1], case when ph[1] is null then null else 'image' end);
    end loop;
  end loop;
  return jsonb_build_object('ok',true,'categories',ci,'dishes',nd);
end $$;
revoke execute on function public.import_menu_internal(uuid,jsonb,boolean) from public, anon, authenticated;
