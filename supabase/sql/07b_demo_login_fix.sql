-- Фікс демо-входу: Supabase вимагає рядок у auth.identities для email-логіну.
-- Без нього вхід падає з "Database error querying schema".
-- Ідемпотентно.

insert into auth.identities (
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email',
  u.id::text,
  now(),
  now(),
  now()
from auth.users u
where u.email = 'demo-mayster@example.com'
  and not exists (
    select 1 from auth.identities i
    where i.user_id = u.id and i.provider = 'email'
  );
