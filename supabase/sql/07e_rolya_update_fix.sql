-- Фікс діри: тригер захисту ролі працював лише для INSERT,
-- але атакувальник міг змінити роль через UPDATE.

create or replace function profili_primusovo_klient()
returns trigger
language plpgsql
as $$
begin
  new.rolya := 'klient';
  return new;
end;
$$;

-- Тепер ловимо І INSERT, і UPDATE
drop trigger if exists profili_rolya_trg on profili;
create trigger profili_rolya_trg
before insert or update on profili
for each row execute function profili_primusovo_klient();
