-- Тиждень 3: фонові задачі.
-- 1) Нічне зведення майстру (завтра скільки занять / скільки вільних).
-- 2) Автоматичне просування черги: звільнився слот → перший із черги отримує його.
-- Обидві функції SECURITY DEFINER: «робот» виконує роботу в базі,
-- а ззовні бачить лише результат. Викликаються через PostgREST (rpc).

-- Таблиця для зведень (щоб майстер бачив їх в історії)
create table if not exists zvedennya (
  id         bigint generated always as identity primary key,
  mayster_id bigint not null references maystry (id) on delete cascade,
  den        date not null,
  tekst      text not null,
  created_at timestamptz not null default now()
);

create index if not exists zvedennya_mayster_den_idx
  on zvedennya (mayster_id, den desc);

alter table zvedennya enable row level security;

create policy zvedennya_polityka_chytaty on zvedennya for select
  using (exists (
    select 1 from maystry m
    where m.id = zvedennya.mayster_id and m.profili_id = auth.uid()
  ));

-- Функція 1: зведення на завтра для всіх майстрів
create or replace function zrobyty_zvedennya()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mayster   record;
  v_zainyati  integer;
  v_vilni     integer;
  v_den       date := current_date + 1;
  v_pochatok  timestamptz;
  v_kinec     timestamptz;
  v_count     integer := 0;
begin
  v_pochatok := v_den::timestamptz;
  v_kinec    := v_pochatok + interval '1 day';

  for v_mayster in select id from maystry loop
    select count(*) into v_zainyati
    from bronuvannya b
    join sloty s on s.id = b.slot_id
    where s.mayster_id = v_mayster.id
      and b.status = 'aktivne'
      and s.pochatok >= v_pochatok and s.pochatok < v_kinec;

    select count(*) into v_vilni
    from sloty s
    where s.mayster_id = v_mayster.id
      and s.status = 'vilnyi'
      and s.pochatok >= v_pochatok and s.pochatok < v_kinec
      and not exists (
        select 1 from bronuvannya b
        where b.slot_id = s.id and b.status = 'aktivne'
      );

    insert into zvedennya (mayster_id, den, tekst)
    values (
      v_mayster.id,
      v_den,
      format('Завтра %s: %s занять, %s вільних слотів',
             to_char(v_den, 'DD.MM'), v_zainyati, v_vilni)
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- Функція 2: слот звільнився → перший із черги отримує його
create or replace function peremkynuty_slot(p_slot_id bigint)
returns bigint -- id клієнта, якому дістався слот, або null
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mayster_id bigint;
  v_klient_id  uuid;
  v_cherga_id  bigint;
  v_pozyciya   integer;
begin
  -- слот має бути вільним і без активного бронювання
  select mayster_id into v_mayster_id
  from sloty
  where id = p_slot_id and status = 'vilnyi';

  if v_mayster_id is null then
    return null;
  end if;

  if exists (
    select 1 from bronuvannya
    where slot_id = p_slot_id and status = 'aktivne'
  ) then
    return null;
  end if;

  -- перший у черзі цього майстра
  select id, klient_id, pozyciya into v_cherga_id, v_klient_id, v_pozyciya
  from cherga
  where mayster_id = v_mayster_id
  order by pozyciya
  limit 1;

  if v_klient_id is null then
    return null; -- черга порожня — нікому давати слот
  end if;

  insert into bronuvannya (slot_id, klient_id, status)
  values (p_slot_id, v_klient_id, 'aktivne');

  delete from cherga where id = v_cherga_id;

  -- решті черги зсуваємо позиції вгору
  update cherga
  set pozyciya = pozyciya - 1
  where mayster_id = v_mayster_id and pozyciya > v_pozyciya;

  return v_klient_id;
end;
$$;

-- Викликати можуть усі (робот запускається без логіну — це безпечно:
-- функції самі перевіряють умови і повертають лише підсумок)
grant execute on function zrobyty_zvedennya() to anon, authenticated;
grant execute on function peremkynuty_slot(bigint) to anon, authenticated;
