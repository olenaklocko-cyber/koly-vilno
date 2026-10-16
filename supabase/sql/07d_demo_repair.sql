-- Ремонт демо-користувача на місці (слоти не чіпаємо).
-- GoTrue вимагає порожні рядки ('') для токенів, а не NULL,
-- і повний jsonb у meta_data. Плюс гарантуємо identity.

-- 1. Доробляємо auth.users
update auth.users
set
  email_confirmed_at            = coalesce(email_confirmed_at, now()),
  raw_app_meta_data             = '{"provider":"email","providers":["email"]}'::jsonb,
  raw_user_meta_data            = jsonb_build_object(
                                   'sub', id::text,
                                   'email', email,
                                   'email_verified', true
                                 ),
  confirmation_token            = '',
  recovery_token                = '',
  email_change_token_new        = '',
  email_change_token_current    = '',
  email_change                  = '',
  phone_change                  = '',
  phone_change_token            = '',
  reauthentication_token        = '',
  last_sign_in_at               = coalesce(last_sign_in_at, now()),
  updated_at                    = now()
where email = 'demo-mayster@example.com';

-- 2. Гарантуємо identity (provider_id = email — типово для GoTrue)
insert into auth.identities (
  user_id, identity_data, provider, provider_id,
  last_sign_in_at, created_at, updated_at
)
select
  u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email',
  u.email,
  now(), now(), now()
from auth.users u
where u.email = 'demo-mayster@example.com'
  and not exists (
    select 1 from auth.identities i
    where i.user_id = u.id and i.provider = 'email'
  );

-- 3. Перевірка: має бути 1 користувач і 1 identity
select u.email, i.provider, i.provider_id
from auth.users u
left join auth.identities i on i.user_id = u.id and i.provider = 'email'
where u.email = 'demo-mayster@example.com';
