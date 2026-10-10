-- Discounts: per-country rules that apply to the whole country, to categories
-- (including their subcategories) or to specific country items, as a percent
-- or a fixed amount in the country's currency, optionally scheduled in the
-- country's local time.
--
-- Precedence: item > category > country. Within a level the largest saving
-- wins; ties go to the newest rule, then the lowest id.
--
-- Purely additive. The live site keeps calling public.place_order, which is
-- NOT changed here. Only the new code calls public.country_item_prices and
-- public.place_order_v2, so rules created while testing locally cannot change
-- what the live site shows or charges.

create table if not exists public.discounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country_id uuid not null references public.countries(id) on delete cascade,
  scope text not null,
  value_type text not null,
  value numeric(12,2) not null,
  starts_at timestamp without time zone,
  ends_at timestamp without time zone,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discounts_name_length check (char_length(name) between 1 and 120),
  constraint discounts_scope check (scope in ('country', 'category', 'items')),
  constraint discounts_value_type check (value_type in ('percent', 'amount')),
  constraint discounts_value_range check (value > 0 and (value_type <> 'percent' or value <= 100)),
  constraint discounts_schedule_order check (starts_at is null or ends_at is null or ends_at > starts_at)
);

comment on column public.discounts.starts_at is
  'Wall-clock start, interpreted in countries.timezone of the discount''s country. Null = no start limit.';
comment on column public.discounts.ends_at is
  'Wall-clock end (exclusive), interpreted in countries.timezone. Null = no end.';

create table if not exists public.discount_categories (
  discount_id uuid not null references public.discounts(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key (discount_id, category_id)
);

create table if not exists public.discount_items (
  discount_id uuid not null references public.discounts(id) on delete cascade,
  country_item_id uuid not null references public.country_items(id) on delete cascade,
  primary key (discount_id, country_item_id)
);

create index if not exists discounts_country_enabled_idx on public.discounts (country_id, is_enabled);
create index if not exists discount_categories_category_idx on public.discount_categories (category_id);
create index if not exists discount_items_country_item_idx on public.discount_items (country_item_id);

drop trigger if exists set_discounts_updated_at on public.discounts;
create trigger set_discounts_updated_at
before update on public.discounts
for each row execute function public.set_updated_at();

-- Scheduled or disabled rules must not leak: no public policies. The admin
-- uses the service role; shoppers only see prices via country_item_prices.
alter table public.discounts enable row level security;
alter table public.discount_categories enable row level security;
alter table public.discount_items enable row level security;
revoke all on table public.discounts from anon, authenticated;
revoke all on table public.discount_categories from anon, authenticated;
revoke all on table public.discount_items from anon, authenticated;

alter table public.orders
  add column if not exists discount_total numeric(12,2) not null default 0
  check (discount_total >= 0);

alter table public.order_items
  add column if not exists original_unit_price numeric(12,2),
  add column if not exists discount_id uuid references public.discounts(id) on delete set null,
  add column if not exists discount_name text,
  add column if not exists discount_amount numeric(12,2) not null default 0;

comment on column public.order_items.discount_amount is 'Per-unit saving applied when the order was placed.';
comment on column public.order_items.discount_name is 'Snapshot of the discount name; survives edits and deletion of the rule.';

-- Returns p_tz when Postgres accepts it as a timezone (case-insensitively, like
-- the admin's Intl check), else 'UTC', so a bad timezone can never break
-- pricing. Cheap: no scan of pg_timezone_names on the storefront's hot path.
-- Stable, not immutable: the answer depends on the server's timezone data.
create or replace function public.discount_safe_timezone(p_tz text)
returns text
language plpgsql
stable
set search_path = pg_catalog, public
as $$
begin
  if p_tz is null or btrim(p_tz) = '' then
    return 'UTC';
  end if;
  perform now() at time zone p_tz;
  return p_tz;
exception when others then
  return 'UTC';
end $$;

revoke all on function public.discount_safe_timezone(text) from public;
grant execute on function public.discount_safe_timezone(text) to anon, authenticated, service_role;

-- Current price of every visible item in an active country. Returns only the
-- effect of rules that are live right now; never names or future rules.
create or replace function public.country_item_prices(p_country_id uuid)
returns table(
  country_item_id uuid,
  original_price numeric,
  final_price numeric,
  discount_id uuid,
  discount_type text,
  discount_value numeric,
  discount_amount numeric
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with recursive
  country as (
    select
      c.id,
      -- An invalid timezone must not break pricing for the whole country.
      (now() at time zone public.discount_safe_timezone(c.timezone))::timestamp as local_now
    from public.countries c
    where c.id = p_country_id
      and c.is_active
  ),
  items as (
    select ci.id, ci.product_id, ci.price::numeric(12,2) as price
    from public.country_items ci
    join country on country.id = ci.country_id
    join public.products p on p.id = ci.product_id
    where ci.is_visible
      and p.is_active
  ),
  rules as (
    select d.id, d.scope, d.value_type, d.value, d.created_at
    from public.discounts d
    join country on country.id = d.country_id
    where d.is_enabled
      and (d.starts_at is null or d.starts_at <= country.local_now)
      and (d.ends_at is null or d.ends_at > country.local_now)
  ),
  -- Each category rule's categories plus all of their descendants.
  -- UNION (not UNION ALL) stops on cycles in parent_id.
  category_tree(discount_id, category_id) as (
    select dc.discount_id, dc.category_id
    from public.discount_categories dc
    join rules r on r.id = dc.discount_id and r.scope = 'category'
    union
    select tree.discount_id, child.id
    from category_tree tree
    join public.categories child on child.parent_id = tree.category_id
  ),
  candidates(item_id, rule_id, level) as (
    select di.country_item_id, r.id, 3
    from public.discount_items di
    join rules r on r.id = di.discount_id and r.scope = 'items'
    union
    select i.id, tree.discount_id, 2
    from items i
    join public.product_categories pc on pc.product_id = i.product_id
    join category_tree tree on tree.category_id = pc.category_id
    union
    select i.id, r.id, 1
    from items i
    cross join rules r
    where r.scope = 'country'
  ),
  scored as (
    select
      i.id as item_id,
      c.level,
      r.id as rule_id,
      r.value_type,
      r.value,
      r.created_at,
      least(
        i.price,
        case when r.value_type = 'percent' then round(i.price * r.value / 100, 2) else r.value end
      ) as saving
    from candidates c
    join items i on i.id = c.item_id
    join rules r on r.id = c.rule_id
  ),
  best as (
    select distinct on (item_id) item_id, rule_id, value_type, value, saving
    from scored
    order by item_id, level desc, saving desc, created_at desc, rule_id
  )
  select
    i.id,
    i.price,
    i.price - coalesce(b.saving, 0),
    b.rule_id,
    b.value_type,
    b.value,
    coalesce(b.saving, 0)
  from items i
  left join best b on b.item_id = i.id
$$;

revoke all on function public.country_item_prices(uuid) from public;
grant execute on function public.country_item_prices(uuid) to anon, authenticated, service_role;

-- Same contract as public.place_order (202609140001) plus discount_total, with
-- prices taken from country_item_prices. Kept separate so the live site's
-- place_order is untouched until this code is deployed.
create or replace function public.place_order_v2(
  p_country_id uuid, p_items jsonb, p_shipping_zone_id uuid,
  p_phone text, p_email text, p_first_name text, p_last_name text,
  p_address text, p_apartment text, p_city text, p_postal_code text,
  p_notes text, p_idempotency_key uuid, p_rate_limit_fingerprint text
) returns table(order_id uuid, order_number text, subtotal numeric, shipping_fee numeric, total numeric, discount_total numeric)
language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_country public.countries%rowtype;
  v_zone public.shipping_zones%rowtype;
  v_customer_id uuid;
  v_order_id uuid;
  v_order_number text;
  v_calculated_subtotal numeric(12,2) := 0;
  v_calculated_shipping numeric(12,2) := 0;
  v_calculated_total numeric(12,2) := 0;
  v_discount_total numeric(12,2) := 0;
  v_item jsonb;
  v_line jsonb;
  v_lines jsonb := '[]'::jsonb;
  v_prices jsonb;
  v_price jsonb;
  v_row record;
  v_quantity integer;
  v_unit_price numeric(12,2);
  v_original_price numeric(12,2);
  v_discount_amount numeric(12,2);
  v_country_item_id uuid;
  v_full_name text := trim(p_first_name || ' ' || p_last_name);
  v_area_name text;
begin
  select o.id, o.order_number, o.subtotal, o.shipping_fee, o.total, o.discount_total
    into v_order_id, v_order_number, v_calculated_subtotal, v_calculated_shipping, v_calculated_total, v_discount_total
  from public.orders o
  where o.idempotency_key = p_idempotency_key;

  if found then
    return query select v_order_id, v_order_number, v_calculated_subtotal, v_calculated_shipping, v_calculated_total, v_discount_total;
    return;
  end if;

  -- SELECT INTO with no row nulls its targets; reset the accumulators.
  v_calculated_subtotal := 0;
  v_discount_total := 0;

  insert into public.checkout_rate_limits(fingerprint, window_started_at, attempts)
  values (p_rate_limit_fingerprint, now(), 1)
  on conflict (fingerprint) do update set
    attempts = case
      when public.checkout_rate_limits.window_started_at < now() - interval '1 minute' then 1
      else public.checkout_rate_limits.attempts + 1
    end,
    window_started_at = case
      when public.checkout_rate_limits.window_started_at < now() - interval '1 minute' then now()
      else public.checkout_rate_limits.window_started_at
    end
  returning attempts into v_quantity;

  if v_quantity > 8 then
    raise exception using errcode='P0001', message='RATE_LIMITED';
  end if;

  select * into v_country
  from public.countries
  where id = p_country_id
    and is_active = true;

  if not found then
    raise exception using errcode='P0001', message='COUNTRY_UNAVAILABLE';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then
    raise exception using errcode='P0001', message='INVALID_CART';
  end if;

  if v_country.use_shipping_zones then
    select * into v_zone
    from public.shipping_zones
    where id = p_shipping_zone_id
      and country_id = p_country_id
      and is_active = true;

    if not found then
      raise exception using errcode='P0001', message='INVALID_SHIPPING_ZONE';
    end if;

    v_calculated_shipping := coalesce(v_zone.fee, 0);
    v_area_name := v_zone.name;
  else
    if p_shipping_zone_id is not null then
      raise exception using errcode='P0001', message='INVALID_SHIPPING_ZONE';
    end if;

    v_calculated_shipping := coalesce(v_country.global_delivery_fee, 0);
    v_area_name := p_city;
  end if;

  -- Price every line from one snapshot so both loops agree.
  select coalesce(jsonb_object_agg(
      p.country_item_id::text,
      jsonb_build_object(
        'original', p.original_price,
        'final', p.final_price,
        'discount_id', p.discount_id,
        'discount_amount', p.discount_amount
      )
    ), '{}'::jsonb)
    into v_prices
  from public.country_item_prices(p_country_id) p;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_country_item_id := nullif(coalesce(v_item->>'countryItemId', v_item->>'country_item_id', v_item->>'country_itemId'), '')::uuid;
    v_quantity := nullif(coalesce(v_item->>'quantity', v_item->>'qty'), '')::integer;

    if v_country_item_id is null then
      raise exception using errcode='P0001', message='INVALID_CART';
    end if;

    if v_quantity is null or v_quantity < 1 or v_quantity > 10 then
      raise exception using errcode='P0001', message='INVALID_QUANTITY';
    end if;

    select ci.id, ci.product_id, ci.stock_quantity, p.name
      into v_row
    from public.country_items ci
    join public.products p on p.id = ci.product_id
    where ci.id = v_country_item_id
      and ci.country_id = p_country_id
      and ci.is_visible = true
      and p.is_active = true
    for update of ci;

    if not found then
      raise exception using errcode='P0001', message='ITEM_UNAVAILABLE';
    end if;

    v_price := v_prices -> v_country_item_id::text;
    if v_price is null then
      raise exception using errcode='P0001', message='ITEM_UNAVAILABLE';
    end if;

    v_unit_price := (v_price->>'final')::numeric;
    v_original_price := (v_price->>'original')::numeric;
    v_discount_amount := coalesce((v_price->>'discount_amount')::numeric, 0);

    if v_unit_price is null or v_unit_price < 0 then
      raise exception using errcode='P0001', message='INVALID_PRICE';
    end if;

    if v_row.stock_quantity is not null then
      if v_row.stock_quantity < v_quantity then
        raise exception using errcode='P0001', message='INSUFFICIENT_STOCK';
      end if;

      update public.country_items
      set stock_quantity = stock_quantity - v_quantity
      where id = v_row.id;
    end if;

    v_calculated_subtotal := v_calculated_subtotal + (v_unit_price * v_quantity);
    v_discount_total := v_discount_total + (v_discount_amount * v_quantity);
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'country_item_id', v_country_item_id,
      'product_id', v_row.product_id,
      'name', v_row.name,
      'quantity', v_quantity,
      'unit_price', v_unit_price,
      'original_price', v_original_price,
      'discount_id', v_price->'discount_id',
      'discount_amount', v_discount_amount
    ));
  end loop;

  select c.id into v_customer_id
  from public.customers c
  where (c.country_id = p_country_id and c.phone = p_phone)
     or (nullif(p_email, '') is not null and lower(c.email) = lower(p_email))
  order by case when c.country_id = p_country_id and c.phone = p_phone then 0 else 1 end
  limit 1
  for update;

  if found then
    update public.customers
    set country_id = p_country_id,
        full_name = v_full_name,
        phone = p_phone,
        email = nullif(p_email, ''),
        updated_at = now()
    where id = v_customer_id;
  else
    insert into public.customers(country_id, full_name, phone, email)
    values(p_country_id, v_full_name, p_phone, nullif(p_email, ''))
    returning id into v_customer_id;
  end if;

  -- v_calculated_subtotal is already after discounts.
  if v_country.free_delivery_threshold is not null
     and v_calculated_subtotal >= v_country.free_delivery_threshold then
    v_calculated_shipping := 0;
  end if;

  v_calculated_total := v_calculated_subtotal + v_calculated_shipping;
  v_order_number := 'HB-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 5));

  insert into public.orders(
    order_number, idempotency_key, country_id, customer_id, customer_name,
    customer_phone, customer_email, currency_code, shipping_zone_id,
    shipping_area_name, shipping_area, address, address_line, apartment,
    city, postal_code, notes, subtotal, shipping_fee, total, discount_total, status
  )
  values(
    v_order_number,
    p_idempotency_key,
    p_country_id,
    v_customer_id,
    v_full_name,
    p_phone,
    nullif(p_email, ''),
    v_country.currency_code,
    case when v_country.use_shipping_zones then v_zone.id else null end,
    v_area_name,
    v_area_name,
    p_address,
    p_address,
    nullif(p_apartment, ''),
    p_city,
    nullif(p_postal_code, ''),
    nullif(p_notes, ''),
    v_calculated_subtotal,
    v_calculated_shipping,
    v_calculated_total,
    v_discount_total,
    'pending'
  )
  returning id into v_order_id;

  for v_line in select value from jsonb_array_elements(v_lines) loop
    insert into public.order_items(
      order_id, country_item_id, product_id, product_name, quantity, unit_price, total,
      original_unit_price, discount_id, discount_name, discount_amount
    )
    values(
      v_order_id,
      (v_line->>'country_item_id')::uuid,
      (v_line->>'product_id')::uuid,
      v_line->>'name',
      (v_line->>'quantity')::integer,
      (v_line->>'unit_price')::numeric,
      (v_line->>'unit_price')::numeric * (v_line->>'quantity')::integer,
      (v_line->>'original_price')::numeric,
      (v_line->>'discount_id')::uuid,
      (select d.name from public.discounts d where d.id = (v_line->>'discount_id')::uuid),
      (v_line->>'discount_amount')::numeric
    );
  end loop;

  return query select v_order_id, v_order_number, v_calculated_subtotal, v_calculated_shipping, v_calculated_total, v_discount_total;
exception when unique_violation then
  return query
  select o.id, o.order_number, o.subtotal, o.shipping_fee, o.total, o.discount_total
  from public.orders o
  where o.idempotency_key = p_idempotency_key;

  if not found then
    raise;
  end if;
end $$;

revoke all on function public.place_order_v2(uuid,jsonb,uuid,text,text,text,text,text,text,text,text,text,uuid,text) from public, anon, authenticated;
grant execute on function public.place_order_v2(uuid,jsonb,uuid,text,text,text,text,text,text,text,text,text,uuid,text) to service_role;

notify pgrst, 'reload schema';
