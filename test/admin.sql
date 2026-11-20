\set ON_ERROR_STOP 1
insert into auth.users(id,email) values ('11111111-1111-1111-1111-111111111111','justo@social.co'),('22222222-2222-2222-2222-222222222222','dino@launica.co');
set test.uid = '11111111-1111-1111-1111-111111111111';
set role authenticated;
select claim_first_admin() as first;
select my_tenants();
select (select id from tenants where slug='la-unica') as tid \gset
select a->>'members' m, a->>'visits_month' v, a->>'avg_ticket' t, a->'redeemed' r, jsonb_array_length(a->'dormant') d from admin_stats(:'tid') a;
select admin_save_staff(:'tid',null,'Carlos','4321',null);
select admin_save_staff(:'tid',null,'Carlos','4321',null)->>'error';
select name, active from staff order by name;
select code, name, stamps from members order by code;
select admin_create_tenant('manglar','Manglar','MG');
select admin_add_tenant_admin(:'tid','dino@launica.co');
update tenants set config = config || '{"min_amount":70000}' where slug='la-unica';
select count(*) from dishes;
reset role;
set test.uid = '22222222-2222-2222-2222-222222222222';
set role authenticated;
select claim_first_admin() as dino_claim;
select my_tenants();
select count(*) as dino_dishes from dishes;
select admin_create_tenant('x','X','XX');
