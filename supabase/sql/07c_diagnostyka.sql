-- Один запит: все, що треба для відновлення демо-майстра.
-- Виконати і надіслати скріншот Results.

select 'auth_user' as tip, u.email::text as znachennya
from auth.users u
union all
select 'profili', p.imya || ' (' || p.rolya || ')'
from profili p
union all
select 'mayster_misce', m.misce
from maystry m
order by tip, znachennya;
