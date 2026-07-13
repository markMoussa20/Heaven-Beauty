-- Preserve any legacy column/data, but remove the COD-only validation introduced
-- by the recent checkout migration and replace the RPC with a payment-free version.
alter table if exists public.orders
  drop constraint if exists orders_payment_method_check;

create or replace function public.place_order(
  p_country_id uuid, p_items jsonb, p_shipping_zone_id uuid,
  p_phone text, p_email text, p_first_name text, p_last_name text,
  p_address text, p_apartment text, p_city text, p_postal_code text,
  p_notes text, p_idempotency_key uuid, p_rate_limit_fingerprint text
) returns table(order_id uuid, order_number text, subtotal numeric, shipping_fee numeric, total numeric)
language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_country public.countries%rowtype; v_zone public.shipping_zones%rowtype;
  v_customer_id uuid; v_order_id uuid; v_order_number text;
  v_subtotal numeric(12,2) := 0; v_shipping numeric(12,2) := 0; v_total numeric(12,2) := 0;
  v_item jsonb; v_row record; v_qty integer; v_price numeric(12,2);
  v_full_name text := trim(p_first_name || ' ' || p_last_name);
begin
  select o.id, o.order_number, o.subtotal, o.shipping_fee, o.total
    into v_order_id, v_order_number, v_subtotal, v_shipping, v_total
  from public.orders o where o.idempotency_key = p_idempotency_key;
  if found then return query select v_order_id, v_order_number, v_subtotal, v_shipping, v_total; return; end if;

  insert into public.checkout_rate_limits(fingerprint, window_started_at, attempts)
  values (p_rate_limit_fingerprint, now(), 1)
  on conflict (fingerprint) do update set
    attempts = case when public.checkout_rate_limits.window_started_at < now() - interval '1 minute' then 1 else public.checkout_rate_limits.attempts + 1 end,
    window_started_at = case when public.checkout_rate_limits.window_started_at < now() - interval '1 minute' then now() else public.checkout_rate_limits.window_started_at end
  returning attempts into v_qty;
  if v_qty > 8 then raise exception using errcode='P0001', message='RATE_LIMITED'; end if;

  select * into v_country from public.countries where id=p_country_id and is_active=true;
  if not found then raise exception using errcode='P0001', message='COUNTRY_UNAVAILABLE'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then
    raise exception using errcode='P0001', message='INVALID_CART';
  end if;

  if v_country.use_shipping_zones then
    select * into v_zone from public.shipping_zones where id=p_shipping_zone_id and country_id=p_country_id and is_active=true;
    if not found then raise exception using errcode='P0001', message='INVALID_SHIPPING_ZONE'; end if;
    v_shipping := v_zone.fee;
  else
    if p_shipping_zone_id is not null then raise exception using errcode='P0001', message='INVALID_SHIPPING_ZONE'; end if;
    v_shipping := coalesce(v_country.global_delivery_fee,0);
  end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::integer;
    if v_qty < 1 or v_qty > 10 then raise exception using errcode='P0001', message='INVALID_QUANTITY'; end if;
    select ci.id, ci.product_id, ci.stock_quantity, ci.price, ci.sale_price, p.name
      into v_row from public.country_items ci join public.products p on p.id=ci.product_id
      where ci.id=(v_item->>'countryItemId')::uuid and ci.country_id=p_country_id
        and ci.is_visible=true and p.is_active=true for update of ci;
    if not found then raise exception using errcode='P0001', message='ITEM_UNAVAILABLE'; end if;
    v_price := case when v_row.sale_price is not null and v_row.sale_price > 0 then v_row.sale_price else v_row.price end;
    if v_price is null or v_price < 0 then raise exception using errcode='P0001', message='INVALID_PRICE'; end if;
    if v_row.stock_quantity is not null then
      if v_row.stock_quantity < v_qty then raise exception using errcode='P0001', message='INSUFFICIENT_STOCK'; end if;
      update public.country_items set stock_quantity=stock_quantity-v_qty where id=v_row.id;
    end if;
    v_subtotal := v_subtotal + v_price*v_qty;
  end loop;

  select c.id into v_customer_id
  from public.customers c
  where (c.country_id=p_country_id and c.phone=p_phone)
     or (nullif(p_email,'') is not null and lower(c.email)=lower(p_email))
  order by case when c.country_id=p_country_id and c.phone=p_phone then 0 else 1 end
  limit 1 for update;
  if found then
    update public.customers set country_id=p_country_id,full_name=v_full_name,phone=p_phone,
      email=nullif(p_email,''),updated_at=now() where id=v_customer_id;
  else
    insert into public.customers(country_id,full_name,phone,email)
    values(p_country_id,v_full_name,p_phone,nullif(p_email,'')) returning id into v_customer_id;
  end if;
  v_order_number := 'HB-' || to_char(now(),'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,5));
  insert into public.orders(order_number,idempotency_key,country_id,customer_id,customer_name,customer_phone,customer_email,currency_code,shipping_zone_id,shipping_area_name,address_line,apartment,city,postal_code,notes,subtotal,shipping_fee,total,status)
  values(v_order_number,p_idempotency_key,p_country_id,v_customer_id,v_full_name,p_phone,nullif(p_email,''),v_country.currency_code,
    case when v_country.use_shipping_zones then v_zone.id else null end,
    case when v_country.use_shipping_zones then v_zone.name else p_city end,p_address,nullif(p_apartment,''),p_city,nullif(p_postal_code,''),nullif(p_notes,''),v_subtotal,v_shipping,v_subtotal+v_shipping,'pending')
  returning id into v_order_id;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::integer;
    select ci.product_id, ci.price, ci.sale_price, p.name into v_row
    from public.country_items ci join public.products p on p.id=ci.product_id where ci.id=(v_item->>'countryItemId')::uuid;
    v_price := case when v_row.sale_price is not null and v_row.sale_price > 0 then v_row.sale_price else v_row.price end;
    insert into public.order_items(order_id,country_item_id,product_id,product_name,quantity,unit_price,total)
    values(v_order_id,(v_item->>'countryItemId')::uuid,v_row.product_id,v_row.name,v_qty,v_price,v_price*v_qty);
  end loop;
  return query select v_order_id,v_order_number,v_subtotal,v_shipping,v_subtotal+v_shipping;
exception when unique_violation then
  return query select o.id,o.order_number,o.subtotal,o.shipping_fee,o.total from public.orders o where o.idempotency_key=p_idempotency_key;
  if not found then raise; end if;
end $$;

revoke all on function public.place_order(uuid,jsonb,uuid,text,text,text,text,text,text,text,text,text,uuid,text) from public, anon, authenticated;
grant execute on function public.place_order(uuid,jsonb,uuid,text,text,text,text,text,text,text,text,text,uuid,text) to service_role;
