create or replace function place_order(p_session uuid, p_note text, p_items jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare new_id uuid; i jsonb; iid uuid; queue int; subtotal numeric;
begin
  select count(*) into queue from orders where status in ('new', 'preparing');
  insert into orders (session_id, status, note, est_wait_min)
  values (p_session, 'pending', p_note, least(10 + queue * 4, 60)) returning id into new_id;

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

create or replace function refresh_unpaid_bill_after_cancel() returns trigger language plpgsql security definer set search_path = public as $$
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

drop policy if exists staff_read_bills on bills;
create policy staff_read_bills on bills for select using (is_staff());
