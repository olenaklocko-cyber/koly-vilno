-- Тиждень 5: логи і моніторинг.
-- Таблиця подій: що сталося і коли. Це наш «Sentry» — власний ловець помилок.
-- Правило логів: у запис йдуть лише події і помилки — НІКОЛИ паролі,
-- ключі чи персональні дані.

create table if not exists podiyi (
  id            bigint generated always as identity primary key,
  typ           text not null check (typ in ('pomylka', 'podiya', 'metryka')),
  povitomlennya text not null check (char_length(povitomlennya) between 1 and 500),
  detal         text check (char_length(detal) <= 2000),  -- стек, URL, дрібниці
  storinka      text,                                      -- '#/analityka' тощо
  created_at    timestamptz not null default now()
);

create index if not exists podiyi_created_idx on podiyi (created_at desc);
create index if not exists podiyi_typ_created_idx on podiyi (typ, created_at desc);

alter table podiyi enable row level security;

-- Писати може будь-хто (застосунок має вміти повідомити про помилку навіть без логіну)
create policy podiyi_polityka_vstavyty on podiyi for insert with check (true);

-- Читати — лише власник (панель моніторингу)
create policy podiyi_polityka_chytaty on podiyi for select
  using ((auth.jwt() ->> 'email') = 'olenaklocko@gmail.com');
