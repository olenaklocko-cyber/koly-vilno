-- Фікс: maystry не мав SELECT-політики, тому RLS ховав майстра від самого себе.
-- Через це не працювало оновлення слотів (UPDATE sloty → exists maystry → false).

-- Майстер бачить свій запис (і всі інші — для вибору репетитора)
drop policy if exists maystry_polityka_chytaty on maystry;
create policy maystry_polityka_chytaty on maystry for select using (true);

-- Майстер оновлює лише свій запис
drop policy if exists maystry_polityka_zminyuvaty on maystry;
create policy maystry_polityka_zminyuvaty on maystry for update
  using (profili_id = auth.uid())
  with check (profili_id = auth.uid());
