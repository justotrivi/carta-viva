\set ON_ERROR_STOP 1
set role anon;
select register_member('la-unica','valentina ruiz','+57 300 123 4567',14,3,true) ->> 'code' as reg1;
select register_member('la-unica','Otra','3001234567',14,3,true) ->> 'error' as dup;
select register_member('la-unica','Mal','2001234567',14,3,true) ->> 'error' as badphone;
select register_member('la-unica','Sin','3111111111',14,3,false) ->> 'error' as noconsent;
select (staff_login('la-unica','prueba','0000'))->>'error' as badpin;
select (staff_login('la-unica','prueba','1234'))->>'session' as s \gset
select staff_lookup(:'s','3001234567')->'card'->>'code' as lookup_phone;
select staff_stamp(:'s','LU-0001',50000,'4',null)->>'error' as min;
select staff_stamp(:'s','LU-0001',185000,'4',null) as stamp1;
select staff_stamp(:'s','LU-0001',185000,'4',null)->>'error' as sameday;
reset role;
-- simular días anteriores
update visits set local_date = local_date - 1, created_at = created_at - interval '1 day';
set role anon;
select staff_stamp(:'s','LU-0001',90000,null,null)->'stamps' as st2;
reset role; update visits set local_date = local_date - 1, created_at = created_at - interval '1 day'; set role anon;
select staff_stamp(:'s','LU-0001',90000,null,null)->'unlocked' as unlocked3;
-- invitado nuevo hoy
reset role; update visits set local_date = local_date - 1, created_at = created_at - interval '1 day'; set role anon;
select register_member('la-unica','Invitado Uno','3109998877',1,11,true)->>'code' as guest;
select staff_stamp(:'s','LU-0001',90000,null,'3109998877')->>'added' as guest_double;
reset role; update visits set local_date = local_date - 1, created_at = created_at - interval '1 day'; set role anon;
select staff_stamp(:'s','LU-0001',90000,null,'3109998877')->>'error' as guest_reused;
-- cumpleaños: invitado cumple en noviembre
select staff_stamp(:'s','LU-0002',90000,null,null) as bday;
-- QR dinámico
reset role; select token as tok from members where code='LU-0001' \gset
set role anon;
select get_dynamic_code(:'tok')->>'code' as dc \gset
select staff_lookup(:'s',:'dc')->'card'->>'stamps' as qr_lookup;
select staff_lookup(:'s','LU-0001.deadbeef')->>'error' as qr_bad;
-- card
select jsonb_pretty(get_card(:'tok')->'rewards') as rewards;
select get_card(:'tok')->'level' as level;
-- canjear regalo 3
select staff_redeem(:'s', ((get_card(:'tok')->'rewards'->0)->>'id')::uuid) as redeem3;
select staff_redeem(:'s', ((get_card(:'tok')->'rewards'->0)->>'id')::uuid)->>'error' as redeem_again;
select jsonb_array_length(staff_recent(:'s')) as recent;
-- llenar a 10 y canjear 10
reset role; update members set stamps=9 where code='LU-0001'; update visits set local_date = local_date - 1, created_at = created_at - interval '1 day'; set role anon;
select staff_stamp(:'s','LU-0001',90000,null,null)->'unlocked' as unlocked10;
select staff_redeem(:'s', (select (r->>'id')::uuid from jsonb_array_elements(get_card(:'tok')->'rewards') r where (r->>'visit')='10')) as redeem10;
select get_card(:'tok')->>'stamps' as after10, get_card(:'tok')->>'card_number' as cardnum, jsonb_array_length(get_card(:'tok')->'pending_rewards') as pend;
-- anon no puede leer tablas
select count(*) from members;
