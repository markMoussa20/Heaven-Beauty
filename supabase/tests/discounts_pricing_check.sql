-- Discount pricing checks. Run in the Supabase SQL editor AFTER applying
-- supabase/migrations/202610100001_discounts.sql.
--
-- Everything happens inside ONE DO block that ALWAYS ends by raising an
-- exception, so every row it creates is rolled back automatically:
--   "PASS: ..."  -> all checks passed, nothing was saved
--                   (expected: "PASS: all 22 discount checks passed. ...")
--   "FAIL: ..."  -> a check failed (the message says which), nothing was saved
-- No app code runs, so no emails, Wakilni submissions or Meta events happen.
do $$
declare
  v_suffix text := replace(gen_random_uuid()::text, '-', '');
  v_fingerprint text := 'discount-check-' || replace(gen_random_uuid()::text, '-', '');
  v_country uuid;
  v_parent uuid;
  v_child uuid;
  v_product uuid;
  v_id uuid;
  v_rule uuid;
  v_rule_a uuid;
  v_key uuid := gen_random_uuid();
  v_ci jsonb := '{}'::jsonb;
  v_local_now timestamp;
  v_name text;
  v_price numeric;
  v_got numeric;
  v_count integer;
  v_order record;
  v_again record;
  v_line record;
  v_checks integer := 0;
begin
  insert into public.countries(code, name, currency_code, currency_symbol, is_active, global_delivery_fee, free_delivery_threshold, timezone)
  values ('ZT' || upper(substr(v_suffix, 1, 6)), '[TEST] Discountland', 'USD', '$', true, 3, 45, 'Asia/Beirut')
  returning id into v_country;

  insert into public.categories(name, slug) values ('[TEST] Parent', 'test-parent-' || v_suffix) returning id into v_parent;
  insert into public.categories(name, slug, parent_id) values ('[TEST] Child', 'test-child-' || v_suffix, v_parent) returning id into v_child;

  -- A..G and I visible, H hidden. A and I are in the CHILD category, B in the PARENT.
  for v_name, v_price in
    select * from (values ('A', 100::numeric), ('B', 50), ('C', 30), ('D', 4), ('E', 20), ('F', 60), ('G', 10), ('H', 25), ('I', 10)) as t(n, p)
  loop
    insert into public.products(name, slug)
    values ('[TEST] Product ' || v_name, 'test-' || lower(v_name) || '-' || v_suffix)
    returning id into v_product;
    insert into public.country_items(country_id, product_id, price, is_visible)
    values (v_country, v_product, v_price, v_name <> 'H')
    returning id into v_id;
    v_ci := v_ci || jsonb_build_object(v_name, v_id);
    if v_name = 'A' then insert into public.product_categories(product_id, category_id) values (v_product, v_child); end if;
    if v_name = 'I' then insert into public.product_categories(product_id, category_id) values (v_product, v_child); end if;
    if v_name = 'B' then insert into public.product_categories(product_id, category_id) values (v_product, v_parent); end if;
  end loop;

  v_local_now := (now() at time zone 'Asia/Beirut')::timestamp;

  -- Country level: 10% and $5 -> the bigger saving per item wins.
  insert into public.discounts(name, country_id, scope, value_type, value) values ('[TEST] country 10%', v_country, 'country', 'percent', 10);
  insert into public.discounts(name, country_id, scope, value_type, value) values ('[TEST] country $5', v_country, 'country', 'amount', 5);

  -- Category rule on the PARENT covers B directly and I through the child (A is overridden by its item rule).
  insert into public.discounts(name, country_id, scope, value_type, value)
  values ('[TEST] parent 20%', v_country, 'category', 'percent', 20) returning id into v_rule;
  insert into public.discount_categories(discount_id, category_id) values (v_rule, v_parent);

  -- Item rule on A beats the category rule even though it saves less.
  insert into public.discounts(name, country_id, scope, value_type, value)
  values ('[TEST] item A 5%', v_country, 'items', 'percent', 5) returning id into v_rule_a;
  insert into public.discount_items(discount_id, country_item_id) values (v_rule_a, (v_ci->>'A')::uuid);

  -- Fixed amount bigger than the price floors at 0.
  insert into public.discounts(name, country_id, scope, value_type, value)
  values ('[TEST] item D $10', v_country, 'items', 'amount', 10) returning id into v_rule;
  insert into public.discount_items(discount_id, country_item_id) values (v_rule, (v_ci->>'D')::uuid);

  -- Disabled rule is ignored.
  insert into public.discounts(name, country_id, scope, value_type, value, is_enabled)
  values ('[TEST] item E disabled', v_country, 'items', 'percent', 50, false) returning id into v_rule;
  insert into public.discount_items(discount_id, country_item_id) values (v_rule, (v_ci->>'E')::uuid);

  -- Future and expired rules are ignored.
  insert into public.discounts(name, country_id, scope, value_type, value, starts_at)
  values ('[TEST] item F future', v_country, 'items', 'percent', 50, v_local_now + interval '1 day') returning id into v_rule;
  insert into public.discount_items(discount_id, country_item_id) values (v_rule, (v_ci->>'F')::uuid);
  insert into public.discounts(name, country_id, scope, value_type, value, starts_at, ends_at)
  values ('[TEST] item F expired', v_country, 'items', 'percent', 50, v_local_now - interval '2 days', v_local_now - interval '1 day') returning id into v_rule;
  insert into public.discount_items(discount_id, country_item_id) values (v_rule, (v_ci->>'F')::uuid);

  -- Window evaluated in the COUNTRY's timezone. Beirut is ahead of UTC, so a
  -- function that used UTC would see this start as still in the future.
  insert into public.discounts(name, country_id, scope, value_type, value, starts_at, ends_at)
  values ('[TEST] item G window', v_country, 'items', 'percent', 30, v_local_now - interval '1 minute', v_local_now + interval '1 hour') returning id into v_rule;
  insert into public.discount_items(discount_id, country_item_id) values (v_rule, (v_ci->>'G')::uuid);

  -- Expected final prices. I (child category, no item rule): the parent
  -- category 20% saves 2 and must beat the country $5 rule, proving the rule
  -- reaches subcategories and that category outranks country.
  for v_name, v_price in
    select * from (values ('A', 95::numeric), ('B', 40), ('C', 25), ('D', 0), ('E', 15), ('F', 54), ('G', 7), ('I', 8)) as t(n, p)
  loop
    v_got := null;
    select p.final_price into v_got
    from public.country_item_prices(v_country) p
    where p.country_item_id = (v_ci->>v_name)::uuid;
    if v_got is distinct from v_price then
      raise exception 'FAIL: item % expected final price %, got %', v_name, v_price, v_got;
    end if;
    v_checks := v_checks + 1;
  end loop;

  select count(*) into v_count from public.country_item_prices(v_country) p where p.country_item_id = (v_ci->>'H')::uuid;
  if v_count <> 0 then raise exception 'FAIL: hidden item H was priced'; end if;
  v_checks := v_checks + 1;

  select count(*) into v_count
  from public.country_item_prices(v_country) p
  where p.country_item_id = (v_ci->>'A')::uuid
    and p.discount_id = v_rule_a and p.discount_type = 'percent' and p.discount_value = 5
    and p.discount_amount = 5 and p.original_price = 100;
  if v_count <> 1 then raise exception 'FAIL: item A discount details are wrong'; end if;
  v_checks := v_checks + 1;

  -- place_order_v2: A x1 (95) + C x2 (25) = 145 >= 45 -> free delivery; savings 5 + 10 = 15.
  select * into v_order from public.place_order_v2(
    v_country,
    jsonb_build_array(
      jsonb_build_object('countryItemId', v_ci->>'A', 'quantity', 1),
      jsonb_build_object('countryItemId', v_ci->>'C', 'quantity', 2)
    ),
    null, '000-TEST-0001', '', 'Test', 'Discount', 'Test street 1', '', 'Test city', '', '',
    v_key, v_fingerprint
  );
  -- "is distinct from" so a NULL can never slip through as a pass.
  if v_order.subtotal is distinct from 145::numeric or v_order.shipping_fee is distinct from 0::numeric
     or v_order.total is distinct from 145::numeric or v_order.discount_total is distinct from 15::numeric then
    raise exception 'FAIL: order 1 totals wrong: subtotal %, shipping %, total %, discount %',
      v_order.subtotal, v_order.shipping_fee, v_order.total, v_order.discount_total;
  end if;
  v_checks := v_checks + 1;

  select oi.* into v_line from public.order_items oi
  where oi.order_id = v_order.order_id and oi.country_item_id = (v_ci->>'A')::uuid;
  if not found then raise exception 'FAIL: order 1 line A missing'; end if;
  if v_line.original_unit_price is distinct from 100::numeric or v_line.unit_price is distinct from 95::numeric
     or v_line.discount_amount is distinct from 5::numeric or v_line.discount_name is distinct from '[TEST] item A 5%'
     or v_line.discount_id is distinct from v_rule_a or v_line.total is distinct from 95::numeric then
    raise exception 'FAIL: order 1 line A snapshot wrong';
  end if;
  v_checks := v_checks + 1;

  select oi.* into v_line from public.order_items oi
  where oi.order_id = v_order.order_id and oi.country_item_id = (v_ci->>'C')::uuid;
  if not found then raise exception 'FAIL: order 1 line C missing'; end if;
  if v_line.original_unit_price is distinct from 30::numeric or v_line.unit_price is distinct from 25::numeric
     or v_line.discount_amount is distinct from 5::numeric or v_line.discount_name is distinct from '[TEST] country $5'
     or v_line.total is distinct from 50::numeric or v_line.quantity is distinct from 2 then
    raise exception 'FAIL: order 1 line C snapshot wrong';
  end if;
  v_checks := v_checks + 1;

  select count(*) into v_count from public.orders o where o.id = v_order.order_id and o.discount_total = 15;
  if v_count <> 1 then raise exception 'FAIL: orders.discount_total not stored'; end if;
  v_checks := v_checks + 1;

  -- Idempotency: the same key returns the same order.
  select * into v_again from public.place_order_v2(
    v_country, jsonb_build_array(jsonb_build_object('countryItemId', v_ci->>'A', 'quantity', 1)),
    null, '000-TEST-0001', '', 'Test', 'Discount', 'Test street 1', '', 'Test city', '', '',
    v_key, v_fingerprint
  );
  if v_again.order_id is distinct from v_order.order_id or v_again.discount_total is distinct from 15::numeric then
    raise exception 'FAIL: idempotent retry returned a different order';
  end if;
  v_checks := v_checks + 1;

  -- Free delivery uses the DISCOUNTED subtotal: B is 50 before, 40 after; threshold 45 -> delivery charged.
  select * into v_order from public.place_order_v2(
    v_country, jsonb_build_array(jsonb_build_object('countryItemId', v_ci->>'B', 'quantity', 1)),
    null, '000-TEST-0001', '', 'Test', 'Discount', 'Test street 1', '', 'Test city', '', '',
    gen_random_uuid(), v_fingerprint
  );
  if v_order.subtotal is distinct from 40::numeric or v_order.shipping_fee is distinct from 3::numeric
     or v_order.total is distinct from 43::numeric or v_order.discount_total is distinct from 10::numeric then
    raise exception 'FAIL: free delivery must use the discounted subtotal (got subtotal %, shipping %)', v_order.subtotal, v_order.shipping_fee;
  end if;
  v_checks := v_checks + 1;

  -- A 100%-off line (D) costs 0 and is orderable.
  select * into v_order from public.place_order_v2(
    v_country, jsonb_build_array(jsonb_build_object('countryItemId', v_ci->>'D', 'quantity', 1)),
    null, '000-TEST-0001', '', 'Test', 'Discount', 'Test street 1', '', 'Test city', '', '',
    gen_random_uuid(), v_fingerprint
  );
  if v_order.subtotal is distinct from 0::numeric or v_order.total is distinct from 3::numeric
     or v_order.discount_total is distinct from 4::numeric then
    raise exception 'FAIL: free item D order wrong';
  end if;
  v_checks := v_checks + 1;

  -- The shopper's confirmed subtotal must match: C x1 costs 25 now, so an
  -- expected subtotal of 30 (C's original price) is refused ...
  begin
    perform * from public.place_order_v2(
      v_country, jsonb_build_array(jsonb_build_object('countryItemId', v_ci->>'C', 'quantity', 1)),
      null, '000-TEST-0001', '', 'Test', 'Discount', 'Test street 1', '', 'Test city', '', '',
      gen_random_uuid(), v_fingerprint, 30
    );
    raise exception 'FAIL: a stale expected subtotal was accepted';
  exception when others then
    if sqlerrm not like '%PRICE_CHANGED%' then raise; end if;
  end;
  v_checks := v_checks + 1;

  -- ... and the matching one (25; 25 < 45 so delivery 3 is charged) is accepted.
  select * into v_order from public.place_order_v2(
    v_country, jsonb_build_array(jsonb_build_object('countryItemId', v_ci->>'C', 'quantity', 1)),
    null, '000-TEST-0001', '', 'Test', 'Discount', 'Test street 1', '', 'Test city', '', '',
    gen_random_uuid(), v_fingerprint, 25
  );
  if v_order.subtotal is distinct from 25::numeric or v_order.shipping_fee is distinct from 3::numeric
     or v_order.total is distinct from 28::numeric or v_order.discount_total is distinct from 5::numeric then
    raise exception 'FAIL: matching expected subtotal order wrong: subtotal %, total %', v_order.subtotal, v_order.total;
  end if;
  v_checks := v_checks + 1;

  -- Hidden item is rejected.
  begin
    perform * from public.place_order_v2(
      v_country, jsonb_build_array(jsonb_build_object('countryItemId', v_ci->>'H', 'quantity', 1)),
      null, '000-TEST-0001', '', 'Test', 'Discount', 'Test street 1', '', 'Test city', '', '',
      gen_random_uuid(), v_fingerprint
    );
    raise exception 'FAIL: hidden item H was accepted';
  exception when others then
    if sqlerrm not like '%ITEM_UNAVAILABLE%' then raise; end if;
  end;
  v_checks := v_checks + 1;

  -- Timezone names match case-insensitively (like the admin's Intl check):
  -- 'asia/beirut' still evaluates G's window in Beirut time, so G stays 7
  -- (in UTC the window would not have started yet and G would fall back to
  -- the country $5 rule and cost 5).
  update public.countries set timezone = 'asia/beirut' where id = v_country;
  v_got := null;
  select p.final_price into v_got
  from public.country_item_prices(v_country) p
  where p.country_item_id = (v_ci->>'G')::uuid;
  if v_got is distinct from 7::numeric then
    raise exception 'FAIL: lowercase timezone: item G expected final price 7, got %', v_got;
  end if;
  v_checks := v_checks + 1;

  -- An invalid timezone falls back to UTC instead of erroring.
  update public.countries set timezone = 'Not/AZone' where id = v_country;
  select count(*) into v_count from public.country_item_prices(v_country);
  if v_count <> 8 then raise exception 'FAIL: bad timezone returned % rows, expected 8', v_count; end if;
  v_checks := v_checks + 1;

  raise exception 'PASS: all % discount checks passed. Nothing was saved (this message is how the script rolls itself back).', v_checks;
end $$;
