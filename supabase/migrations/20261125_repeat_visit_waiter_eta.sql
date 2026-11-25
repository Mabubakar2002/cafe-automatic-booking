alter table orders add column if not exists eta_note text;
alter table bell_calls add column if not exists note text;

alter table table_sessions add column if not exists customer_key text;

update table_sessions
set customer_key =
  (case
    when regexp_replace(phone, '\D', '', 'g') like '0%'
      then '92' || substring(regexp_replace(phone, '\D', '', 'g') from 2)
    else regexp_replace(phone, '\D', '', 'g')
  end) || ':' || lower(regexp_replace(btrim(customer_name), '\s+', ' ', 'g'))
where customer_key is null
  and nullif(regexp_replace(phone, '\D', '', 'g'), '') is not null
  and nullif(btrim(customer_name), '') is not null;

create index if not exists table_sessions_customer_key_idx
  on table_sessions (customer_key)
  where customer_key is not null;

alter table customer_loyalty add column if not exists customer_key text;
alter table customer_loyalty drop constraint if exists customer_loyalty_phone_key;

update customer_loyalty
set customer_key =
  (case
    when regexp_replace(phone, '\D', '', 'g') like '0%'
      then '92' || substring(regexp_replace(phone, '\D', '', 'g') from 2)
    else regexp_replace(phone, '\D', '', 'g')
  end) || ':' || lower(regexp_replace(btrim(coalesce(customer_name, '')), '\s+', ' ', 'g'))
where customer_key is null
  and nullif(regexp_replace(phone, '\D', '', 'g'), '') is not null;

alter table customer_loyalty alter column customer_key set not null;
create unique index if not exists customer_loyalty_customer_key_key
  on customer_loyalty (customer_key);
