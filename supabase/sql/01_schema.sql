-- ============================================================
-- «Коли вільно» — тиждень 1: проєктування бази даних
-- Ідемпотентний скрипт: можна виконувати повторно (IF NOT EXISTS)
-- Спочатку дані, потім екрани.
-- ============================================================

-- 1. ПРОФІЛІ -----------------------------------------------------------------
create table if not exists profili (
  id         uuid primary key references auth.users (id) on delete cascade,
  imya       text not null check (char_length(imya) between 1 and 80),
  rolya      text not null default 'klient'
             check (rolya in ('klient', 'mayster')),
  telefon    text,
  created_at timestamptz not null default now()
);

-- 2. МАЙСТРИ (1 профіль = 1 рядок, деталі репетитора/тренера) ----------------
create table if not exists maystry (
  id         bigint generated always as identity primary key,
  profili_id uuid not null unique references profili (id) on delete cascade,
  opys       text not null default '',
  misce      text not null default '',          -- напр. «онлайн» / «вул. Центральна, 5»
  chas_prynyatya tstzrange not null default tstzrange(
             (now() - interval '3 months'), (now() + interval '6 months'), '[)')
);

-- 3. СЛОТИ (один-до-багатьох: майстер → слоти) --------------------------------
create table if not exists sloty (
  id        bigint generated always as identity primary key,
  mayster_id bigint not null references maystry (id) on delete cascade,
  pochatok  timestamptz not null,
  kinec     timestamptz not null,
  status    text not null default 'vilnyi'
            check (status in ('vilnyi', 'zaianyi', 'zakrytyi')),
  check (pochatok < kinec)
);

-- 4. БРОНЮВАННЯ (один-до-багатьох: слот → броні; багато-до-одного: клієнт)
create table if not exists bronuvannya (
  id         bigint generated always as identity primary key,
  slot_id    bigint not null references sloty (id) on delete cascade,
  klient_id  uuid   not null references profili (id) on delete cascade,
  status     text not null default 'aktivne'
             check (status in ('aktivne', 'skasovane', 'chereza')),
  created_at timestamptz not null default now()
);

-- 5. ЧЕРГА ОЧІКУВАННЯ (майстер → багато клієнтів у черзі)
create table if not exists cherga (
  id           bigint generated always as identity primary key,
  mayster_id   bigint not null references maystry (id) on delete cascade,
  klient_id    uuid   not null references profili (id) on delete cascade,
  bazhanyy_chas tstzrange not null,             -- коли хотів би клієнт
  pozyciya     int not null,                    -- 1 = перший у черзі
  created_at   timestamptz not null default now()
);

-- ============================================================
-- ІНДЕКСИ — «оглядність» бази, щоб знаходити швидко
-- ============================================================

-- Головний запит продукту: «вільні слоти цього майстра» (і на мобільному, і на десктопі)
create index if not exists sloty_mayster_pochatok_idx
  on sloty (mayster_id, pochatok)
  where status = 'vilnyi';

-- Календар: «що відбувається цього дня» (діапазони часу)
create index if not exists sloty_pochatok_idx on sloty (pochatok);

-- Клієнт: «мої записи»
create index if not exists bronuvannya_klient_idx on bronuvannya (klient_id, created_at desc);

-- Майстер: «хто записаний на цей слот»
create index if not exists bronuvannya_slot_aktivne_idx
  on bronuvannya (slot_id)
  where status = 'aktivne';

-- Черга: «перший у черзі»
create index if not exists cherga_mayster_pozyciya_idx on cherga (mayster_id, pozyciya);

-- ============================================================
-- ОБМЕЖЕННЯ — щоб погані дані не потрапили в базу
-- ============================================================

-- КЛЮЧОВЕ: на один слот — лише одне активне бронювання.
-- Навіть якщо 10 людей одночасно натиснуть «Записатись» — база пропустить одного.
create unique index if not exists bronuvannya_uno_odne_aktyvne_idx
  on bronuvannya (slot_id)
  where status = 'aktivne';

-- Один клієнт не може стояти в черзі двічі до того самого майстра
create unique index if not exists cherga_uno_klient_mayster_idx
  on cherga (mayster_id, klient_id);

-- ============================================================
-- ВИГЛЯД (view) — зручний запит «вільні слоти» для екрана
-- ============================================================
create or replace view vilni_sloty as
select s.id, s.mayster_id, s.pochatok, s.kinec
from sloty s
where s.status = 'vilnyi'
  and not exists (
    select 1 from bronuvannya b
    where b.slot_id = s.id and b.status = 'aktivne'
  )
order by s.pochatok;

-- ============================================================
-- ПОЛІТИКИ (RLS) — базлайн безпеки з першого дня
-- ============================================================
alter table profili      enable row level security;
alter table maystry      enable row level security;
alter table sloty        enable row level security;
alter table bronuvannya  enable row level security;
alter table cherga       enable row level security;

-- Слоти бачать усі (розклад публічний), міняє — лише майстер
create policy sloty_polityka_chytaty on sloty for select using (true);
create policy sloty_polityka_zminyuvaty on sloty for update
  using (exists (
    select 1 from maystry m
    where m.id = sloty.mayster_id and m.profili_id = auth.uid()
  ));

-- Бронювання: бачить власник і майстер слота; створює — будь-хто з логіном
create policy bronuvannya_polityka_chytaty on bronuvannya for select
  using (
    klient_id = auth.uid()
    or exists (
      select 1 from sloty s join maystry m on m.id = s.mayster_id
      where s.id = bronuvannya.slot_id and m.profili_id = auth.uid()
    )
  );

create policy bronuvannya_polityka_stvoryty on bronuvannya for insert
  with check (klient_id = auth.uid());

-- Свої профіль/черга — лише свої
create policy profili_polityka on profili for all
  using (id = auth.uid()) with check (id = auth.uid());
create policy cherga_polityka on cherga for all
  using (klient_id = auth.uid()) with check (klient_id = auth.uid());
