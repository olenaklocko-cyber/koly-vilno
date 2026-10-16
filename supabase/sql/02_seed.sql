-- Тиждень 2: тестові дані для вимірювання швидкості.
-- Створює демо-майстра і близько 730 слотів на пів року вперед.
-- Ідемпотентно: якщо демо-користувач уже є — нічого не ламається.

-- 1. Демо-користувач (входить потім як mayster)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
)
select
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated', 'authenticated',
  'demo-mayster@example.com',
  crypt('demo1234', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(), now()
where not exists (
  select 1 from auth.users where id = '11111111-1111-1111-1111-111111111111'
);

-- 2. Профіль
insert into profili (id, imya, rolya, telefon)
values ('11111111-1111-1111-1111-111111111111', 'Демо-тренер', 'mayster', '+380501112233')
on conflict (id) do nothing;

-- 3. Майстер
insert into maystry (profili_id, opys, misce)
select '11111111-1111-1111-1111-111111111111',
       'Тренер з плавання (демо-дані для бенчмарку)', 'Басейн «Хвиля», Київ'
where not exists (
  select 1 from maystry where profili_id = '11111111-1111-1111-1111-111111111111'
);

-- 4. Слоти: щодня по 2 заняття (10:00 і 18:00) на 365 днів уперед
insert into sloty (mayster_id, pochatok, kinec)
select m.id,
       (d.den + interval '10 hours') as pochatok,
       (d.den + interval '11 hours') as kinec
from maystry m
cross join generate_series(
  date_trunc('day', now())::timestamptz,
  now() + interval '365 days',
  interval '1 day'
) as d(den)
where m.profili_id = '11111111-1111-1111-1111-111111111111'
  and not exists (select 1 from sloty s where s.mayster_id = m.id limit 1);

insert into sloty (mayster_id, pochatok, kinec)
select m.id,
       (d.den + interval '18 hours'),
       (d.den + interval '19 hours')
from maystry m
cross join generate_series(
  date_trunc('day', now())::timestamptz,
  now() + interval '365 days',
  interval '1 day'
) as d(den)
where m.profili_id = '11111111-1111-1111-1111-111111111111'
  and (select count(*) from sloty s where s.mayster_id = m.id) < 400;

-- Підсумок
select (select count(*) from sloty) as vsoho_slotiv,
       (select id from maystry where profili_id = '11111111-1111-1111-1111-111111111111') as mayster_id;
