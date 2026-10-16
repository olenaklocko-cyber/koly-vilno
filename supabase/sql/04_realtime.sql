-- Тиждень 4: реальний час.
-- Supabase Realtime — «прямий ефір»: зміни в таблицях самі летять
-- до всіх відкритих сторінок (websockets під капотом), без перезавантаження.
-- Додаємо наші таблиці в публікацію realtime.

alter publication supabase_realtime add table sloty;
alter publication supabase_realtime add table bronuvannya;
alter publication supabase_realtime add table cherga;

-- Повідомляти про INSERT, UPDATE і DELETE (скасування = DELETE/UPDATE)
alter table sloty replica identity full;
alter table bronuvannya replica identity full;
