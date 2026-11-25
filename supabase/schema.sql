-- Cafe QR ordering. Run once in the Supabase SQL editor.

-- Menu -----------------------------------------------------------------
create table cafe_tables (
  id uuid primary key default gen_random_uuid(),
  number int unique not null
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort int default 0
);

create table menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories on delete set null,
  name text not null,
  description text,
  price numeric(10,2) not null,
  image_url text,
  is_available boolean default true
);

-- Stock ----------------------------------------------------------------
create table ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unit text not null,                       -- pcs, g, ml
  stock numeric(12,2) not null default 0,
  low_stock_level numeric(12,2) default 0
);

create table recipes (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references menu_items on delete cascade,
  ingredient_id uuid not null references ingredients on delete cascade,
  qty numeric(10,2) not null,
  unique (menu_item_id, ingredient_id)
);

-- Add-ons: extra cheese, sauces, toppings
create table modifiers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(10,2) default 0,
  ingredient_id uuid references ingredients on delete set null,
  ingredient_qty numeric(10,2) default 0
);

create table menu_item_modifiers (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references menu_items on delete cascade,
  modifier_id uuid not null references modifiers on delete cascade,
  unique (menu_item_id, modifier_id)
);

-- Visits and orders ----------------------------------------------------
create table table_sessions (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references cafe_tables,
  customer_name text,
  phone text,                               -- digits with country code, for the WhatsApp thank-you
  customer_key text,
  started_at timestamptz default now(),
  closed_at timestamptz
);
create index if not exists table_sessions_customer_key_idx
  on table_sessions (customer_key)
  where customer_key is not null;

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_no int generated always as identity,
  session_id uuid not null references table_sessions,
  status text not null default 'pending'
    check (status in ('pending','new','preparing','ready','served','cancelled')),
  note text,
  eta_note text,
  est_wait_min int,
  created_at timestamptz default now(),
  started_at timestamptz,
  ready_at timestamptz
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders on delete cascade,
  menu_item_id uuid not null references menu_items,
  qty int not null check (qty > 0),
  unit_price numeric(10,2) not null,
  note text
);

create table order_item_modifiers (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references order_items on delete cascade,
  modifier_id uuid not null references modifiers,
  price numeric(10,2) default 0
);

-- What the chef actually used for an order
create table order_usage (
  order_id uuid references orders on delete cascade,
  ingredient_id uuid references ingredients,
  expected_qty numeric(12,2) not null,
  used_qty numeric(12,2) not null,
  primary key (order_id, ingredient_id)
);

create table stock_movements (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references ingredients,
  qty numeric(12,2) not null,               -- + purchase/adjust, - usage
  reason text not null check (reason in ('purchase','usage','adjust')),
  order_id uuid references orders,
  created_at timestamptz default now()
);

-- Bell, bill, feedback, expenses ---------------------------------------
create table bell_calls (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references table_sessions,
  status text default 'open' check (status in ('open','done')),
  note text,
  created_at timestamptz default now(),
  handled_at timestamptz
);

create table bills (
  id uuid primary key default gen_random_uuid(),
  session_id uuid unique not null references table_sessions,
  subtotal numeric(10,2) not null default 0,
  tip numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  method text check (method in ('cash','jazzcash','easypaisa','card')),
  status text not null default 'unpaid' check (status in ('unpaid','paid')),
  created_at timestamptz default now(),
  paid_at timestamptz
);

alter table bills add column if not exists subtotal numeric(10,2) not null default 0;
alter table bills add column if not exists tip numeric(10,2) not null default 0;

create table feedback (
  id uuid primary key default gen_random_uuid(),
  session_id uuid unique not null references table_sessions,
  rating int check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now()
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  title text,
  amount numeric(12,2) not null,
  spent_on date not null default (now() at time zone 'Asia/Karachi')::date
);

-- Staff logins ---------------------------------------------------------
create table staff (
  user_id uuid primary key references auth.users on delete cascade,
  role text not null check (role in ('admin','kitchen'))
);

create table staff_activity (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  actor_role text,
  action text not null check (action in ('create','update','delete','approve','cancel')),
  table_name text not null,
  record_id text,
  details jsonb,
  created_at timestamptz default now()
);

create table customer_loyalty (
  id uuid primary key default gen_random_uuid(),
  customer_key text unique not null,
  phone text not null,
  customer_name text,
  visit_dates jsonb not null default '[]'::jsonb,
  visit_count int not null default 0,
  completed boolean not null default false,
  reward_percent int not null default 20,
  updated_at timestamptz default now()
);

create function is_staff() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from staff where user_id = auth.uid())
$$;

create function is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from staff where user_id = auth.uid() and role = 'admin')
$$;

-- Row level security ---------------------------------------------------
-- Customers never touch the database directly: the Next.js API routes use the
-- service key. Only the menu is public; everything else needs a staff login.
do $$
declare t text;
begin
  foreach t in array array['cafe_tables','categories','menu_items','ingredients','recipes','modifiers',
    'menu_item_modifiers','table_sessions','orders','order_items','order_item_modifiers','order_usage',
    'stock_movements','bell_calls','bills','feedback','expenses','staff','staff_activity','customer_loyalty'] loop
    execute format('alter table %I enable row level security', t);
  end loop;

  foreach t in array array['cafe_tables','categories','menu_items','modifiers','menu_item_modifiers'] loop
    execute format('create policy public_read on %I for select using (true)', t);
  end loop;

  foreach t in array array['cafe_tables','categories','menu_items','ingredients','recipes','modifiers',
    'menu_item_modifiers','table_sessions','orders','order_items','order_item_modifiers','order_usage',
    'stock_movements','bell_calls','bills','feedback','expenses'] loop
    execute format('create policy admin_all on %I for all using (is_admin()) with check (is_admin())', t);
  end loop;

  foreach t in array array['ingredients','recipes','table_sessions','orders','order_items','bills',
    'order_item_modifiers','order_usage','bell_calls'] loop
    execute format('create policy staff_read on %I for select using (is_staff())', t);
  end loop;
end $$;

create policy kitchen_update on orders for update using (is_staff()) with check (is_staff());
create policy staff_self on staff for select using (user_id = auth.uid());

-- Audit staff changes across shared admin data.
create function record_staff_activity() returns trigger language plpgsql security definer set search_path = public as $$
declare actor_email text;
declare actor_role text;
declare record_id text;
begin
  actor_email := coalesce(auth.jwt()->>'email', '');
  select role into actor_role from staff where user_id = auth.uid();
  record_id := coalesce(old.id::text, new.id::text);
  insert into staff_activity (actor_id, actor_email, actor_role, action, table_name, record_id, details)
  values (
    auth.uid(),
    actor_email,
    actor_role,
    case tg_op when 'INSERT' then 'create' when 'UPDATE' then 'update' else 'delete' end,
    TG_TABLE_NAME,
    record_id,
    case tg_op
      when 'DELETE' then to_jsonb(old)
      when 'UPDATE' then jsonb_build_object('before', to_jsonb(old), 'after', to_jsonb(new))
      else to_jsonb(new)
    end
  );
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['cafe_tables','categories','menu_items','ingredients','recipes','modifiers',
    'menu_item_modifiers','orders','order_items','order_usage','stock_movements','bell_calls','bills','expenses'] loop
    execute format('drop trigger if exists trg_staff_activity_%I on %I', t, t);
    execute format('create trigger trg_staff_activity_%I after insert or update or delete on %I for each row execute function record_staff_activity()', t, t);
  end loop;
end $$;

-- Stock follows movements ----------------------------------------------
create function apply_stock_movement() returns trigger language plpgsql security definer set search_path = public as $$
begin
  update ingredients set stock = stock + new.qty where id = new.ingredient_id;
  return new;
end $$;

create trigger trg_stock_movement after insert on stock_movements
  for each row execute function apply_stock_movement();

-- Order flow -----------------------------------------------------------
-- Called by the API (service key). p_items = [{"id": menu_item_id, "qty": 2, "mods": [modifier_id], "note": ""}]
-- Prices come from the database, never from the browser.
create function place_order(p_session uuid, p_note text, p_items jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare new_id uuid; i jsonb; iid uuid; queue int; subtotal numeric;
begin
  select count(*) into queue from orders where status in ('new', 'preparing');
  insert into orders (session_id, status, note, est_wait_min)
  values (p_session, 'new', p_note, least(10 + queue * 4, 60)) returning id into new_id;

  for i in select value from jsonb_array_elements(p_items) loop
    iid := null;
    insert into order_items (order_id, menu_item_id, qty, unit_price, note)
    select new_id, mi.id, (i->>'qty')::int, mi.price, nullif(i->>'note', '')
    from menu_items mi where mi.id = (i->>'id')::uuid and mi.is_available
    returning id into iid;
    if iid is null then raise exception 'An item in your cart is no longer available'; end if;

    insert into order_item_modifiers (order_item_id, modifier_id, price)
    select iid, mo.id, mo.price
    from modifiers mo join menu_item_modifiers mim on mim.modifier_id = mo.id
    where mim.menu_item_id = (i->>'id')::uuid
      and mo.id::text in (select jsonb_array_elements_text(coalesce(i->'mods', '[]'::jsonb)));
  end loop;

  subtotal := session_total(p_session);
  insert into bills (session_id, subtotal, tip, total)
  values (p_session, subtotal, 0, subtotal)
  on conflict (session_id) do update set
    subtotal = excluded.subtotal,
    total = excluded.subtotal + bills.tip
    where bills.status = 'unpaid';

  return new_id;
end $$;

create function session_total(p_session uuid) returns numeric language sql stable as $$
  select coalesce(sum(
    (oi.unit_price + coalesce((select sum(price) from order_item_modifiers where order_item_id = oi.id), 0)) * oi.qty
  ), 0)
  from order_items oi join orders o on o.id = oi.order_id
  where o.session_id = p_session and o.status <> 'cancelled'
$$;

drop function if exists request_bill(uuid);

create function request_bill(p_session uuid, p_tip numeric default 0) returns bills language plpgsql security definer set search_path = public as $$
declare b bills;
begin
  insert into bills (session_id, subtotal, tip, total)
  values (p_session, session_total(p_session), greatest(coalesce(p_tip, 0), 0), session_total(p_session) + greatest(coalesce(p_tip, 0), 0))
  on conflict (session_id) do update set
    subtotal = session_total(p_session),
    tip = greatest(coalesce(p_tip, 0), 0),
    total = session_total(p_session) + greatest(coalesce(p_tip, 0), 0)
    where bills.status = 'unpaid'
  returning * into b;
  if b.id is null then select * into b from bills where session_id = p_session; end if;
  return b;
end $$;

create function refresh_unpaid_bill_after_cancel() returns trigger language plpgsql security definer set search_path = public as $$
declare v_subtotal numeric;
begin
  if new.status = 'cancelled' and old.status is distinct from new.status then
    v_subtotal := session_total(new.session_id);
    if v_subtotal > 0 then
      update bills set subtotal = v_subtotal, total = v_subtotal + tip
      where session_id = new.session_id and status = 'unpaid';
    else
      delete from bills where session_id = new.session_id and status = 'unpaid';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_refresh_unpaid_bill_after_cancel on orders;
create trigger trg_refresh_unpaid_bill_after_cancel
  after update of status on orders
  for each row execute function refresh_unpaid_bill_after_cancel();

revoke execute on function place_order(uuid, text, jsonb), request_bill(uuid, numeric), session_total(uuid)
  from public, anon, authenticated;

-- Kitchen form defaults: recipe + add-ons for each order
create view order_expected_usage with (security_invoker = true) as
select order_id, ingredient_id, sum(qty) as qty from (
  select oi.order_id, r.ingredient_id, r.qty * oi.qty as qty
  from order_items oi join recipes r on r.menu_item_id = oi.menu_item_id
  union all
  select oi.order_id, m.ingredient_id, m.ingredient_qty * oi.qty
  from order_item_modifiers om
  join order_items oi on oi.id = om.order_item_id
  join modifiers m on m.id = om.modifier_id
  where m.ingredient_id is not null
) t group by order_id, ingredient_id;

-- Chef taps Done: save usage, cut stock, mark ready.
-- p_usage = [{"ingredient_id": "...", "expected_qty": 2, "used_qty": 2}]
create function complete_order(p_order uuid, p_usage jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare u jsonb;
begin
  if not is_staff() then raise exception 'Not allowed'; end if;
  if not exists (select 1 from orders where id = p_order and status in ('new', 'preparing')) then
    raise exception 'This order is already closed';
  end if;
  for u in select value from jsonb_array_elements(p_usage) loop
    insert into order_usage values (
      p_order, (u->>'ingredient_id')::uuid, (u->>'expected_qty')::numeric, (u->>'used_qty')::numeric);
    insert into stock_movements (ingredient_id, qty, reason, order_id)
    values ((u->>'ingredient_id')::uuid, -(u->>'used_qty')::numeric, 'usage', p_order);
  end loop;
  update orders set status = 'ready', ready_at = now() where id = p_order;
end $$;

-- Reports (Pakistan time) ----------------------------------------------
create view daily_report with (security_invoker = true) as
select (paid_at at time zone 'Asia/Karachi')::date as day,
       count(*) as bills, sum(total) as sales, count(distinct session_id) as customers
from bills where status = 'paid' group by 1;

create view monthly_report with (security_invoker = true) as
select coalesce(s.month, e.month) as month,
       coalesce(s.sales, 0) as sales,
       coalesce(e.expenses, 0) as expenses,
       coalesce(s.sales, 0) - coalesce(e.expenses, 0) as profit
from (select date_trunc('month', paid_at at time zone 'Asia/Karachi')::date as month, sum(total) as sales
      from bills where status = 'paid' group by 1) s
full join (select date_trunc('month', spent_on)::date as month, sum(amount) as expenses
           from expenses group by 1) e on e.month = s.month;

create view top_items with (security_invoker = true) as
select mi.name, sum(oi.qty) as qty, sum(oi.qty * oi.unit_price) as revenue
from order_items oi
join menu_items mi on mi.id = oi.menu_item_id
join orders o on o.id = oi.order_id
where o.status <> 'cancelled' group by mi.name order by qty desc;

create view usage_report with (security_invoker = true) as
select (o.created_at at time zone 'Asia/Karachi')::date as day, i.name as ingredient, i.unit,
       sum(u.expected_qty) as expected, sum(u.used_qty) as used
from order_usage u
join orders o on o.id = u.order_id
join ingredients i on i.id = u.ingredient_id
group by 1, 2, 3;

-- Realtime for kitchen, admin alerts and stock
alter publication supabase_realtime add table orders, bell_calls, feedback, bills, ingredients, staff_activity, customer_loyalty;

-- Starter tables 1-10 (edit in Admin > Tables & QR)
insert into cafe_tables (number) select generate_series(1, 10);

-- After creating your users in Authentication > Users, give them a role:
-- insert into staff (user_id, role) select id, 'admin'   from auth.users where email = 'owner@example.com';
-- insert into staff (user_id, role) select id, 'kitchen' from auth.users where email = 'chef@example.com';
