-- Тиждень 7: безпека по-дорослому. Аудит знайшов 5 дір — закриваємо.
-- Правило: «безпека — не наприкінці, а на кожному кроці».

-- ============================================================
-- ДІРА 1: черга. Клієнт міг вписати pozyciya=1 і стрибнути першим.
-- ФІКС: позицію рахує сама база — клієнту вона не потрібна.
-- ============================================================
create or replace function cherga_nadati_pozyciyu()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select coalesce(max(pozyciya), 0) + 1
  into new.pozyciya
  from cherga
  where mayster_id = new.mayster_id;
  return new;
end;
$$;

drop trigger if exists cherga_pozyciya_trg on cherga;
create trigger cherga_pozyciya_trg
before insert on cherga
for each row execute function cherga_nadati_pozyciyu();

-- ============================================================
-- ДІРА 2: профіль. Можна було зареєструватися «майстром».
-- ФІКС: при реєстрації роль завжди 'klient'.
--       (майстрів призначає власник вручну в дашборді)
-- ============================================================
create or replace function profili_primusovo_klient()
returns trigger
language plpgsql
as $$
begin
  new.rolya := 'klient';
  return new;
end;
$$;

drop trigger if exists profili_rolya_trg on profili;
create trigger profili_rolya_trg
before insert on profili
for each row execute function profili_primusovo_klient();

-- ============================================================
-- ДІРА 3: бронювання на закритий/зайнятий слот.
-- ФІКС: база перевіряє статус слота перед записом.
-- ============================================================
create or replace function bronuvannya_perevirity_slot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  select status into v_status from sloty where id = new.slot_id;
  if v_status is distinct from 'vilnyi' then
    raise exception 'Слот недоступний для запису';
  end if;
  return new;
end;
$$;

drop trigger if exists bronuvannya_slot_trg on bronuvannya;
create trigger bronuvannya_slot_trg
before insert on bronuvannya
for each row execute function bronuvannya_perevirity_slot();

-- ============================================================
-- ДІРА 4: логи. Можна заливати таблицю (DoS).
-- ФІКС: не більше 300 записів за 5 хвилин (глобально).
-- ============================================================
create or replace function podiyi_ohorona()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    select count(*) from podiyi
    where created_at > now() - interval '5 minutes'
  ) > 300 then
    raise exception 'Забагато логів зараз — спробуйте пізніше';
  end if;
  return new;
end;
$$;

drop trigger if exists podiyi_trg on podiyi;
create trigger podiyi_trg
before insert on podiyi
for each row execute function podiyi_ohorona();

-- ============================================================
-- ДІРА 5: зведення без UNIQUE — крон можна кликати нескінченно.
-- ФІКС: один рядок на (майстер, день); функція ідемпотентна.
-- ============================================================
create unique index if not exists zvedennya_uno_mayster_den
  on zvedennya (mayster_id, den);

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
    )
    on conflict (mayster_id, den)
    do update set tekst = excluded.tekst, created_at = now();

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

grant execute on function zrobyty_zvedennya() to anon, authenticated;
