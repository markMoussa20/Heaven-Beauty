# Discounts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Per-country discounts (whole country, categories incl. subcategories, or specific items; percent or fixed amount; optional schedule) managed in the admin panel, priced by one SQL function, shown on the storefront, and charged by a new `place_order_v2`.

**Architecture:** One Postgres function `country_item_prices(country)` picks the winning rule per item (item > category > country, largest saving within a level) and returns original/final prices. The storefront attaches those prices to items; checkout re-prices the cart from the server; `place_order_v2` (a copy of today's `place_order` using the same function) is the authority on what is charged. The live site keeps calling the untouched `place_order`, so nothing changes for it until this branch is deployed.

**Tech Stack:** Next.js 16 (App Router, server actions), React 19, Supabase (Postgres + PostgREST via `@supabase/ssr` / `supabase-js`), zod 4, Tailwind 4, vitest 3.

**Spec:** `docs/superpowers/specs/2026-10-10-discounts-design.md`

## Global Constraints

- Work only on local branch `feat/discounts`. **Never push, deploy, or open a PR** without the user's explicit go-ahead.
- Local `.env.local` points at the **live** Supabase project. Never run SQL that writes to it without asking the user first (each batch). Read-only `select`s are fine.
- The user applies migrations; do not assume one is applied until they confirm.
- Do not modify or replace `public.place_order`. New code calls `public.place_order_v2`.
- Run tools via npx (pnpm scripts fail on ignored builds): `npx vitest run <file>`, `npx tsc --noEmit`, `npx eslint <files>`. If a package manager is needed: `npx -y pnpm@11`, never bare `npx pnpm`.
- Overlap rule: **item > category > country**; same level → largest saving; tie → newest `created_at`, then `id`.
- Value types: `percent` (0 < v ≤ 100) or `amount` (> 0, country currency). Final price never below 0. Values have at most 2 decimals.
- Schedules are wall-clock `timestamp without time zone`, evaluated in `countries.timezone`; start inclusive, end exclusive.
- Free delivery threshold compares against the **discounted** items subtotal.
- `orders.subtotal` = items after discounts; `total = subtotal + shipping_fee`.
- Discount names are admin-only: never returned by `country_item_prices`.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- The working tree has the user's **uncommitted** `delivery.display` changes in `src/lib/checkout/delivery.ts`, `src/lib/checkout/delivery.test.ts`, `src/components/checkout/CheckoutClient.tsx`. Never discard or overwrite them. Task 7 builds on them; resolve how they are committed with the user before Task 7 (see Task 7 Step 0).

## Review Focus

1. **100%-off item (final price 0):** must stay in the cart across reloads (today `readStoredCart` drops lines with `unitPrice <= 0`) and be orderable. → Task 5 test `isValidStoredCartLine accepts a free line`; Task 2 SQL check "D costs 0 and is orderable".
2. **Admin item picker search hides selected items:** filtered-out items must still be submitted, or editing a discount silently drops its items. → Task 10 keeps them rendered with `hidden`; Task 12 E2E step 5 checks it.
3. **Cart priced before a discount started/ended:** checkout must show the current price, not the stored one. → Task 5 `repriceCartItems` tests; Task 12 E2E step 7.
4. **Country with an invalid `timezone` value:** pricing must not error (that would break every product page and checkout for the country); fall back to UTC. → Task 2 SQL check "bad timezone".
5. **Fixed amount larger than the price / more than 2 decimals:** floors at 0; `12.345` is rejected in the admin, not silently rounded by the DB. → Task 2 SQL check D; Task 8 test `rejects more than 2 decimals`.

---

## File Structure

| File | Responsibility |
|---|---|
| `supabase/migrations/202610100001_discounts.sql` (new) | Tables, order columns, `country_item_prices`, `place_order_v2`, grants |
| `supabase/tests/discounts_pricing_check.sql` (new) | Self-rolling-back SQL checks for pricing + `place_order_v2` |
| `src/types/database.ts` | `Discount*` types, `ItemPricing`, new order columns, `pricing` on `CountryItemWithProduct` |
| `src/lib/pricing.ts` (+ `pricing.test.ts` new) | Display price, RPC row → `ItemPricing`, badge text |
| `src/lib/discounts/storefront.ts` (new) | Server-side RPC call + attaching pricing to items (fail-soft) |
| `src/lib/products.ts` | Use `withPricing` |
| `src/lib/cart/pricing.ts` (+ test, new) | Pure cart math: summary, re-pricing, stored-line validation |
| `src/components/cart/CartProvider.tsx` | `originalUnitPrice`, `originalSubtotal`, `discountTotal`, `repriceItems` |
| `src/components/cart/CartDrawer.tsx` | Struck-through original line price |
| `src/components/products/ProductCard.tsx`, `ProductDetail.tsx` | Original/final price + badge; pass `originalUnitPrice` to cart |
| `src/app/checkout/page.tsx`, `src/components/checkout/CheckoutClient.tsx` | Server prices → cart re-pricing, notice, discount line |
| `src/lib/checkout/actions.ts` | Call `place_order_v2` |
| `src/lib/discounts/rules.ts` (+ test, new) | zod schema, form parsing, status, value formatting, category ordering |
| `src/lib/admin/data.ts` | `listDiscounts()` |
| `src/lib/admin/discount-actions.ts` (new) | save / duplicate / delete server actions |
| `src/components/admin/forms/DiscountForm.tsx` (new) | Admin form |
| `src/app/(admin)/admin/discounts/page.tsx` (new) | Admin page |
| `src/components/admin/AdminSidebar.tsx`, `AdminMobileNav.tsx` | Nav entry |
| `src/app/(admin)/admin/country-items/page.tsx` | "Price now" metric |
| `src/app/(admin)/admin/orders/[id]/page.tsx` | Discount columns/lines |
| `src/lib/admin/export-data.ts`, `export-workbook.ts` | Discount export columns |

---

### Task 1: Migration — tables, pricing function, `place_order_v2`

**Files:**
- Create: `supabase/migrations/202610100001_discounts.sql`

**Interfaces:**
- Produces (SQL):
  - `public.country_item_prices(p_country_id uuid) returns table(country_item_id uuid, original_price numeric, final_price numeric, discount_id uuid, discount_type text, discount_value numeric, discount_amount numeric)` — executable by `anon, authenticated, service_role`.
  - `public.place_order_v2(<same 14 params as place_order>) returns table(order_id uuid, order_number text, subtotal numeric, shipping_fee numeric, total numeric, discount_total numeric)` — `service_role` only.
  - Tables `discounts`, `discount_categories(discount_id, category_id)`, `discount_items(discount_id, country_item_id)`; columns `orders.discount_total`, `order_items.original_unit_price|discount_id|discount_name|discount_amount`.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/202610100001_discounts.sql`:

```sql
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
      (now() at time zone case
        when exists (select 1 from pg_timezone_names tz where tz.name = c.timezone) then c.timezone
        else 'UTC'
      end)::timestamp as local_now
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
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/202610100001_discounts.sql
git commit -m "feat(discounts): schema, pricing function and place_order_v2

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: SQL checks + apply migration (user checkpoint)

**Files:**
- Create: `supabase/tests/discounts_pricing_check.sql`

**Interfaces:**
- Consumes: everything Task 1 produces.

- [ ] **Step 1: Write the self-rolling-back check script**

Create `supabase/tests/discounts_pricing_check.sql`:

```sql
-- Discount pricing checks. Run in the Supabase SQL editor AFTER applying
-- supabase/migrations/202610100001_discounts.sql.
--
-- Everything happens inside ONE DO block that ALWAYS ends by raising an
-- exception, so every row it creates is rolled back automatically:
--   "PASS: ..."  -> all checks passed, nothing was saved
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

  -- A..G visible, H hidden. A is in the CHILD category, B in the PARENT.
  for v_name, v_price in
    select * from (values ('A', 100::numeric), ('B', 50), ('C', 30), ('D', 4), ('E', 20), ('F', 60), ('G', 10), ('H', 25)) as t(n, p)
  loop
    insert into public.products(name, slug)
    values ('[TEST] Product ' || v_name, 'test-' || lower(v_name) || '-' || v_suffix)
    returning id into v_product;
    insert into public.country_items(country_id, product_id, price, is_visible)
    values (v_country, v_product, v_price, v_name <> 'H')
    returning id into v_id;
    v_ci := v_ci || jsonb_build_object(v_name, v_id);
    if v_name = 'A' then insert into public.product_categories(product_id, category_id) values (v_product, v_child); end if;
    if v_name = 'B' then insert into public.product_categories(product_id, category_id) values (v_product, v_parent); end if;
  end loop;

  v_local_now := (now() at time zone 'Asia/Beirut')::timestamp;

  -- Country level: 10% and $5 -> the bigger saving per item wins.
  insert into public.discounts(name, country_id, scope, value_type, value) values ('[TEST] country 10%', v_country, 'country', 'percent', 10);
  insert into public.discounts(name, country_id, scope, value_type, value) values ('[TEST] country $5', v_country, 'country', 'amount', 5);

  -- Category rule on the PARENT covers B directly and A through the child.
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

  -- Expected final prices.
  for v_name, v_price in
    select * from (values ('A', 95::numeric), ('B', 40), ('C', 25), ('D', 0), ('E', 15), ('F', 54), ('G', 7)) as t(n, p)
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

  -- An invalid timezone falls back to UTC instead of erroring.
  update public.countries set timezone = 'Not/AZone' where id = v_country;
  select count(*) into v_count from public.country_item_prices(v_country);
  if v_count <> 7 then raise exception 'FAIL: bad timezone returned % rows, expected 7', v_count; end if;
  v_checks := v_checks + 1;

  raise exception 'PASS: all % discount checks passed. Nothing was saved (this message is how the script rolls itself back).', v_checks;
end $$;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/tests/discounts_pricing_check.sql
git commit -m "test(discounts): self-rolling-back SQL checks for pricing and place_order_v2

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 3: Ask the user to apply the migration**

Tell the user: "Please run `supabase/migrations/202610100001_discounts.sql` in the Supabase SQL editor (or tell me to paste and run it in the browser pane). It only adds tables, columns and two new functions; the live site's `place_order` is not touched." Wait for confirmation. If they want you to run it, get an explicit yes first, then paste the file content into a new SQL editor query in the browser pane and click Run. Expected: "Success. No rows returned".

- [ ] **Step 4: Run the checks (ask first)**

Ask: "OK to run the SQL check script? It creates test rows inside one statement and always rolls them back." On yes, paste `supabase/tests/discounts_pricing_check.sql` into a new SQL editor query and Run.

Expected: an error banner reading `PASS: all 19 discount checks passed. Nothing was saved ...`.
If it says `FAIL: ...`, fix the function in `202610100001_discounts.sql` (its statements are `create or replace` / `if not exists`, so it is safe to re-run), ask the user to re-run the migration, re-run the checks, and commit the fix as a new commit.

- [ ] **Step 5: Verify nothing persisted (read-only)**

Run: `select count(*) from public.countries where name = '[TEST] Discountland';`
Expected: `0`.

---

### Task 3: Types and display pricing helpers

**Files:**
- Modify: `src/types/database.ts`
- Modify: `src/lib/pricing.ts`
- Test: `src/lib/pricing.test.ts` (new)

**Interfaces:**
- Produces (types, `@/types/database`):
  ```ts
  export type DiscountScope = "country" | "category" | "items";
  export type DiscountValueType = "percent" | "amount";
  export type Discount = { id: string; name: string; country_id: string; scope: DiscountScope; value_type: DiscountValueType; value: number | string; starts_at: string | null; ends_at: string | null; is_enabled: boolean; created_at: string | null; updated_at: string | null };
  export type DiscountCategory = { discount_id: string; category_id: string };
  export type DiscountItem = { discount_id: string; country_item_id: string };
  export type ItemPricing = { originalPrice: number; finalPrice: number; discountType: DiscountValueType | null; discountValue: number | null; discountAmount: number };
  // CountryItemWithProduct gains: pricing?: ItemPricing
  ```
- Produces (`@/lib/pricing`):
  ```ts
  export type CountryItemPriceRow = { country_item_id: string; original_price: number | string; final_price: number | string; discount_id: string | null; discount_type: string | null; discount_value: number | string | null; discount_amount: number | string | null };
  export function getDisplayPrice(item: { price: number | string | null; pricing?: ItemPricing }): number;
  export function resolveItemPrice(item: { price: number | string | null } | null | undefined): number;
  export function toItemPricing(row: CountryItemPriceRow): ItemPricing;
  export function formatDiscountBadge(type: DiscountValueType | null, value: number | null, currencySymbol: string): string | null;
  export function getItemPricing(item: { price: number | string | null; pricing?: ItemPricing }, currencySymbol: string): { original: number; final: number; isDiscounted: boolean; badge: string | null };
  ```

- [ ] **Step 1: Add the types**

In `src/types/database.ts`, add after the `PromoBannerCountry` type:

```ts
export type DiscountScope = "country" | "category" | "items";
export type DiscountValueType = "percent" | "amount";

export type Discount = {
  id: string;
  name: string;
  country_id: string;
  scope: DiscountScope;
  value_type: DiscountValueType;
  value: number | string;
  /** Wall-clock time, evaluated in the discount country's timezone. */
  starts_at: string | null;
  ends_at: string | null;
  is_enabled: boolean;
  created_at: string | null;
  updated_at: string | null;
};

export type DiscountCategory = {
  discount_id: string;
  category_id: string;
};

export type DiscountItem = {
  discount_id: string;
  country_item_id: string;
};

/** A country item's current price as computed by public.country_item_prices. */
export type ItemPricing = {
  originalPrice: number;
  finalPrice: number;
  discountType: DiscountValueType | null;
  discountValue: number | null;
  /** Per-unit saving. */
  discountAmount: number;
};
```

In the `Database["public"]["Tables"]` object, after `promo_banner_countries`, add:

```ts
      discounts: {
        Row: Discount;
        Insert: Partial<Discount>;
        Update: Partial<Discount>;
      };
      discount_categories: {
        Row: DiscountCategory;
        Insert: DiscountCategory;
        Update: Partial<DiscountCategory>;
      };
      discount_items: {
        Row: DiscountItem;
        Insert: DiscountItem;
        Update: Partial<DiscountItem>;
      };
```

In `Order`, after `total?: number | string | null;` add:

```ts
  /** Total saved by discounts on this order (subtotal is already after discounts). */
  discount_total?: number | string | null;
```

In `OrderItem`, after `total?: number | string | null;` add:

```ts
  /** Price before discounts; null on orders placed before discounts existed. */
  original_unit_price?: number | string | null;
  discount_id?: string | null;
  discount_name?: string | null;
  /** Per-unit saving. */
  discount_amount?: number | string | null;
```

Change `CountryItemWithProduct` to:

```ts
export type CountryItemWithProduct = CountryItem & {
  products: ProductWithImages;
  countries: Country;
  /** Attached by withPricing(); absent when prices could not be loaded. */
  pricing?: ItemPricing;
};
```

- [ ] **Step 2: Write the failing tests**

Create `src/lib/pricing.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  formatDiscountBadge,
  getDisplayPrice,
  getItemPricing,
  resolveItemPrice,
  toItemPricing,
} from "@/lib/pricing";
import type { ItemPricing } from "@/types/database";

const discounted: ItemPricing = {
  originalPrice: 100,
  finalPrice: 90,
  discountType: "percent",
  discountValue: 10,
  discountAmount: 10,
};

describe("getDisplayPrice", () => {
  it("uses the regular price when no pricing is attached", () => {
    expect(getDisplayPrice({ price: "25.50" })).toBe(25.5);
  });

  it("uses the discounted final price when pricing is attached", () => {
    expect(getDisplayPrice({ price: 100, pricing: discounted })).toBe(90);
  });

  it("keeps a free (0) final price instead of falling back", () => {
    expect(getDisplayPrice({ price: 4, pricing: { ...discounted, originalPrice: 4, finalPrice: 0 } })).toBe(0);
  });
});

describe("resolveItemPrice", () => {
  it("returns 0 for missing or invalid prices", () => {
    expect(resolveItemPrice(null)).toBe(0);
    expect(resolveItemPrice({ price: "abc" })).toBe(0);
  });
});

describe("toItemPricing", () => {
  it("parses numeric strings from PostgREST", () => {
    expect(
      toItemPricing({
        country_item_id: "x",
        original_price: "30.00",
        final_price: "25.00",
        discount_id: "d",
        discount_type: "amount",
        discount_value: "5.00",
        discount_amount: "5.00",
      }),
    ).toEqual({ originalPrice: 30, finalPrice: 25, discountType: "amount", discountValue: 5, discountAmount: 5 });
  });

  it("returns no discount fields for undiscounted rows", () => {
    expect(
      toItemPricing({
        country_item_id: "x",
        original_price: 12,
        final_price: 12,
        discount_id: null,
        discount_type: null,
        discount_value: null,
        discount_amount: 0,
      }),
    ).toEqual({ originalPrice: 12, finalPrice: 12, discountType: null, discountValue: null, discountAmount: 0 });
  });
});

describe("formatDiscountBadge", () => {
  it("formats percent and amount discounts", () => {
    expect(formatDiscountBadge("percent", 10, "$")).toBe("-10%");
    expect(formatDiscountBadge("percent", 12.5, "$")).toBe("-12.5%");
    expect(formatDiscountBadge("amount", 5, "$")).toBe("-$5");
    expect(formatDiscountBadge("amount", 1500, "E£")).toBe("-E£1,500");
  });

  it("returns null without a usable discount", () => {
    expect(formatDiscountBadge(null, 10, "$")).toBeNull();
    expect(formatDiscountBadge("percent", null, "$")).toBeNull();
    expect(formatDiscountBadge("percent", 0, "$")).toBeNull();
  });
});

describe("getItemPricing", () => {
  it("reports a discounted item with its badge", () => {
    expect(getItemPricing({ price: 100, pricing: discounted }, "$")).toEqual({
      original: 100,
      final: 90,
      isDiscounted: true,
      badge: "-10%",
    });
  });

  it("reports an undiscounted item without a badge", () => {
    expect(getItemPricing({ price: 40 }, "$")).toEqual({
      original: 40,
      final: 40,
      isDiscounted: false,
      badge: null,
    });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/lib/pricing.test.ts`
Expected: FAIL — `toItemPricing`, `formatDiscountBadge`, `getItemPricing` are not exported.

- [ ] **Step 4: Implement**

Replace `src/lib/pricing.ts` with:

```ts
import type { DiscountValueType, ItemPricing } from "@/types/database";

type PriceSource = {
  price: number | string | null;
};

type PricedSource = PriceSource & {
  pricing?: ItemPricing;
};

/** A row returned by the public.country_item_prices RPC. */
export type CountryItemPriceRow = {
  country_item_id: string;
  original_price: number | string;
  final_price: number | string;
  discount_id: string | null;
  discount_type: string | null;
  discount_value: number | string | null;
  discount_amount: number | string | null;
};

/** What the shopper pays per unit: the discounted price when one is attached. */
export function getDisplayPrice(item: PricedSource) {
  return item.pricing?.finalPrice ?? resolveItemPrice(item);
}

export function resolveItemPrice(item: PriceSource | null | undefined) {
  return toFiniteNumber(item?.price) ?? 0;
}

export function toItemPricing(row: CountryItemPriceRow): ItemPricing {
  const originalPrice = toFiniteNumber(row.original_price) ?? 0;
  const finalPrice = toFiniteNumber(row.final_price) ?? originalPrice;
  const discountType: DiscountValueType | null =
    row.discount_type === "percent" || row.discount_type === "amount" ? row.discount_type : null;

  return {
    originalPrice,
    finalPrice,
    discountType,
    discountValue: discountType ? toFiniteNumber(row.discount_value) : null,
    discountAmount: discountType ? toFiniteNumber(row.discount_amount) ?? 0 : 0,
  };
}

/** "-10%" or "-$5"; null when there is nothing to show. */
export function formatDiscountBadge(
  type: DiscountValueType | null,
  value: number | null,
  currencySymbol: string,
) {
  if (!type || value === null || !(value > 0)) return null;
  const amount = value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return type === "percent" ? `-${amount}%` : `-${currencySymbol}${amount}`;
}

export function getItemPricing(item: PricedSource, currencySymbol: string) {
  const final = getDisplayPrice(item);
  const original = item.pricing?.originalPrice ?? final;
  const isDiscounted = Math.round(original * 100) > Math.round(final * 100);

  return {
    original,
    final,
    isDiscounted,
    badge: isDiscounted
      ? formatDiscountBadge(item.pricing?.discountType ?? null, item.pricing?.discountValue ?? null, currencySymbol)
      : null,
  };
}

function toFiniteNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
```

- [ ] **Step 5: Run tests and typecheck**

Run: `npx vitest run src/lib/pricing.test.ts` → Expected: PASS.
Run: `npx tsc --noEmit` → Expected: no errors (existing callers pass `CountryItemWithProduct`, which satisfies `PricedSource`).

- [ ] **Step 6: Commit**

```bash
git add src/types/database.ts src/lib/pricing.ts src/lib/pricing.test.ts
git commit -m "feat(discounts): pricing types and display helpers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Load discounted prices on the storefront

**Files:**
- Create: `src/lib/discounts/storefront.ts`
- Modify: `src/lib/products.ts`

**Interfaces:**
- Consumes: `toItemPricing`, `CountryItemPriceRow` (Task 3).
- Produces:
  ```ts
  export async function getCountryItemPrices(countryId: string): Promise<Map<string, ItemPricing>>; // empty map on any error
  export async function withPricing(items: CountryItemWithProduct[]): Promise<CountryItemWithProduct[]>;
  ```

- [ ] **Step 1: Create the loader**

Create `src/lib/discounts/storefront.ts`:

```ts
import "server-only";

import { toItemPricing, type CountryItemPriceRow } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";
import type { CountryItemWithProduct, ItemPricing } from "@/types/database";

type PricesRpcClient = {
  rpc: (
    name: "country_item_prices",
    args: { p_country_id: string },
  ) => PromiseLike<{
    data: CountryItemPriceRow[] | null;
    error: { code?: string; message: string } | null;
  }>;
};

/**
 * Current prices for every visible item in a country, keyed by country item id.
 * Fails soft: on any error (including the discounts migration not being applied
 * yet) it returns an empty map and items show their regular price.
 */
export async function getCountryItemPrices(countryId: string): Promise<Map<string, ItemPricing>> {
  // The hand-written Database type has no Functions entry for this RPC.
  const supabase = (await createClient()) as unknown as PricesRpcClient;
  const { data, error } = await supabase.rpc("country_item_prices", { p_country_id: countryId });

  if (error) {
    console.error("Failed to load country item prices; showing regular prices", {
      code: error.code,
      message: error.message,
    });
    return new Map();
  }

  return new Map((data ?? []).map((row) => [row.country_item_id, toItemPricing(row)]));
}

/** Attaches current pricing to items that all belong to the same country. */
export async function withPricing(items: CountryItemWithProduct[]) {
  const countryId = items[0]?.country_id;
  if (!countryId) return items;

  const prices = await getCountryItemPrices(countryId);
  if (prices.size === 0) return items;

  return items.map((item) => {
    const pricing = prices.get(item.id);
    return pricing ? { ...item, pricing } : item;
  });
}
```

- [ ] **Step 2: Use it in the item loaders**

In `src/lib/products.ts`, add the import:

```ts
import { withPricing } from "@/lib/discounts/storefront";
```

In both `getFeaturedCountryItems` and `getVisibleCountryItems`, replace the final

```ts
  return (data ?? []) as CountryItemWithProduct[];
```

with

```ts
  return withPricing((data ?? []) as CountryItemWithProduct[]);
```

(The home page, shop, product page and featured popup all load through these two functions.)

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit` → Expected: no errors.
Run: `npx eslint src/lib/discounts/storefront.ts src/lib/products.ts` → Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/discounts/storefront.ts src/lib/products.ts
git commit -m "feat(discounts): attach current prices to storefront items

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Cart pricing math and provider

**Files:**
- Create: `src/lib/cart/pricing.ts`
- Test: `src/lib/cart/pricing.test.ts` (new)
- Modify: `src/components/cart/CartProvider.tsx`

**Interfaces:**
- Produces (`@/lib/cart/pricing`):
  ```ts
  export type PricedLine = { countryItemId: string; unitPrice: number; originalUnitPrice?: number; quantity: number };
  export type CartPrice = { unitPrice: number; originalUnitPrice: number };
  export function lineOriginalUnitPrice(line: PricedLine): number;
  export function summarizeCart(lines: PricedLine[]): { subtotal: number; originalSubtotal: number; discountTotal: number };
  export function repriceCartItems<T extends PricedLine>(items: T[], prices: Record<string, CartPrice>): { items: T[]; changed: boolean };
  export function isValidStoredCartLine(item: unknown): boolean;
  ```
- Produces (cart context): `CartItem.originalUnitPrice?: number`; context fields `originalSubtotal: number`, `discountTotal: number`, `repriceItems(prices: Record<string, CartPrice>): boolean` (true when a line's paid price changed).

- [ ] **Step 1: Write the failing tests**

Create `src/lib/cart/pricing.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  isValidStoredCartLine,
  lineOriginalUnitPrice,
  repriceCartItems,
  summarizeCart,
} from "@/lib/cart/pricing";

const line = (overrides: Partial<{ countryItemId: string; unitPrice: number; originalUnitPrice?: number; quantity: number }> = {}) => ({
  countryItemId: "a",
  unitPrice: 90,
  originalUnitPrice: 100,
  quantity: 1,
  ...overrides,
});

describe("lineOriginalUnitPrice", () => {
  it("falls back to the paid price when no original is stored", () => {
    expect(lineOriginalUnitPrice(line({ originalUnitPrice: undefined }))).toBe(90);
  });

  it("never reports an original below the paid price", () => {
    expect(lineOriginalUnitPrice(line({ originalUnitPrice: 50 }))).toBe(90);
  });
});

describe("summarizeCart", () => {
  it("adds subtotal, original subtotal and discount in cents", () => {
    expect(
      summarizeCart([
        line({ quantity: 2 }),
        line({ countryItemId: "b", unitPrice: 0.1, originalUnitPrice: 0.2, quantity: 3 }),
      ]),
    ).toEqual({ subtotal: 180.3, originalSubtotal: 200.6, discountTotal: 20.3 });
  });

  it("reports no discount for full-price carts", () => {
    expect(summarizeCart([line({ unitPrice: 40, originalUnitPrice: undefined })])).toEqual({
      subtotal: 40,
      originalSubtotal: 40,
      discountTotal: 0,
    });
  });
});

describe("repriceCartItems", () => {
  it("updates a line whose discount ended and reports the change", () => {
    const items = [line()];
    const result = repriceCartItems(items, { a: { unitPrice: 100, originalUnitPrice: 100 } });
    expect(result.changed).toBe(true);
    expect(result.items[0]).toMatchObject({ unitPrice: 100, originalUnitPrice: 100 });
  });

  it("applies a discount that started after the item was added", () => {
    const result = repriceCartItems([line({ unitPrice: 100, originalUnitPrice: undefined })], {
      a: { unitPrice: 80, originalUnitPrice: 100 },
    });
    expect(result.changed).toBe(true);
    expect(result.items[0]).toMatchObject({ unitPrice: 80, originalUnitPrice: 100 });
  });

  it("fills in a missing original silently when the paid price is unchanged", () => {
    const result = repriceCartItems([line({ unitPrice: 90, originalUnitPrice: undefined })], {
      a: { unitPrice: 90, originalUnitPrice: 100 },
    });
    expect(result.changed).toBe(false);
    expect(result.items[0].originalUnitPrice).toBe(100);
  });

  it("returns the same array when nothing differs", () => {
    const items = [line()];
    const result = repriceCartItems(items, { a: { unitPrice: 90, originalUnitPrice: 100 } });
    expect(result).toEqual({ items, changed: false });
    expect(result.items).toBe(items);
  });

  it("leaves lines without a current price untouched", () => {
    const items = [line()];
    expect(repriceCartItems(items, {}).items).toBe(items);
  });
});

describe("isValidStoredCartLine", () => {
  const stored = { countryItemId: "a", productId: "p", quantity: 1, unitPrice: 10 };

  it("accepts a normal line", () => {
    expect(isValidStoredCartLine(stored)).toBe(true);
  });

  it("accepts a free line (100% discount)", () => {
    expect(isValidStoredCartLine({ ...stored, unitPrice: 0 })).toBe(true);
  });

  it("rejects broken lines", () => {
    expect(isValidStoredCartLine(null)).toBe(false);
    expect(isValidStoredCartLine({ ...stored, unitPrice: -1 })).toBe(false);
    expect(isValidStoredCartLine({ ...stored, unitPrice: "abc" })).toBe(false);
    expect(isValidStoredCartLine({ ...stored, quantity: 0 })).toBe(false);
    expect(isValidStoredCartLine({ ...stored, countryItemId: "" })).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/cart/pricing.test.ts`
Expected: FAIL — cannot resolve `@/lib/cart/pricing`.

- [ ] **Step 3: Implement the pure module**

Create `src/lib/cart/pricing.ts`:

```ts
/**
 * Pure cart price math. Amounts are summed in cents so totals match the
 * numeric(12,2) values place_order_v2 saves.
 */
export type PricedLine = {
  countryItemId: string;
  unitPrice: number;
  /** Price before discounts; missing on carts saved before discounts existed. */
  originalUnitPrice?: number;
  quantity: number;
};

export type CartPrice = {
  unitPrice: number;
  originalUnitPrice: number;
};

const toCents = (value: number) => Math.round(value * 100);

export function lineOriginalUnitPrice(line: PricedLine) {
  return line.originalUnitPrice !== undefined && line.originalUnitPrice > line.unitPrice
    ? line.originalUnitPrice
    : line.unitPrice;
}

export function summarizeCart(lines: PricedLine[]) {
  let subtotalCents = 0;
  let originalCents = 0;

  for (const line of lines) {
    subtotalCents += toCents(line.unitPrice) * line.quantity;
    originalCents += toCents(lineOriginalUnitPrice(line)) * line.quantity;
  }

  return {
    subtotal: subtotalCents / 100,
    originalSubtotal: originalCents / 100,
    discountTotal: (originalCents - subtotalCents) / 100,
  };
}

/**
 * Brings stored cart lines up to the server's current prices. `changed` is true
 * only when what the customer pays for a line changed.
 */
export function repriceCartItems<T extends PricedLine>(
  items: T[],
  prices: Record<string, CartPrice>,
): { items: T[]; changed: boolean } {
  let changed = false;
  let touched = false;

  const next = items.map((item) => {
    const current = prices[item.countryItemId];
    if (!current) return item;

    const paidChanged = toCents(current.unitPrice) !== toCents(item.unitPrice);
    const originalChanged =
      item.originalUnitPrice === undefined ||
      toCents(current.originalUnitPrice) !== toCents(item.originalUnitPrice);
    if (!paidChanged && !originalChanged) return item;

    changed ||= paidChanged;
    touched = true;
    return { ...item, unitPrice: current.unitPrice, originalUnitPrice: current.originalUnitPrice };
  });

  return { items: touched ? next : items, changed };
}

/** Lines read back from localStorage. A free (0) line is valid: 100% discounts exist. */
export function isValidStoredCartLine(item: unknown) {
  if (!item || typeof item !== "object") return false;
  const line = item as Record<string, unknown>;
  const unitPrice = Number(line.unitPrice);

  return (
    Boolean(line.countryItemId) &&
    Boolean(line.productId) &&
    Number(line.quantity) > 0 &&
    Number.isFinite(unitPrice) &&
    unitPrice >= 0
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/cart/pricing.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire it into the provider**

In `src/components/cart/CartProvider.tsx`:

1. Add the import below the React import:

```ts
import {
  isValidStoredCartLine,
  repriceCartItems,
  summarizeCart,
  type CartPrice,
} from "@/lib/cart/pricing";
```

2. In `CartItem`, after `unitPrice: number;` add:

```ts
  /** Price before discounts; missing on carts saved before discounts existed. */
  originalUnitPrice?: number;
```

3. In `CartContextValue`, after `subtotal: number;` add:

```ts
  /** Subtotal at original prices. */
  originalSubtotal: number;
  discountTotal: number;
  /** Applies current server prices; returns true when a paid price changed. */
  repriceItems: (prices: Record<string, CartPrice>) => boolean;
```

4. In `serverCartFallback`, after `subtotal: 0,` add:

```ts
  originalSubtotal: 0,
  discountTotal: 0,
  repriceItems: () => false,
```

5. In `addItem`, in the existing-item branch, replace `unitPrice: item.unitPrice,` with:

```ts
                  unitPrice: item.unitPrice,
                  originalUnitPrice: item.originalUnitPrice,
```

6. After the `closeCart` callback, add:

```ts
  const repriceItems = useCallback(
    (prices: Record<string, CartPrice>) => {
      const result = repriceCartItems(items, prices);
      if (result.items !== items) {
        setItems(result.items);
        setCartVersion((version) => version + 1);
      }
      return result.changed;
    },
    [items],
  );
```

7. In the `useMemo`, replace

```ts
    const subtotal = items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );
```

with

```ts
    const { subtotal, originalSubtotal, discountTotal } = summarizeCart(items);
```

then add `originalSubtotal,`, `discountTotal,` after `subtotal,` and `repriceItems,` after `removeItem,` in the returned object, and add `repriceItems` to the dependency array.

8. In `readStoredCart`, replace the `parsed.filter(...)` call with:

```ts
    const parsed = JSON.parse(storedCart) as unknown[];
    return parsed.filter(isValidStoredCartLine) as CartItem[];
```

- [ ] **Step 6: Typecheck, lint, test**

Run: `npx tsc --noEmit` → Expected: no errors.
Run: `npx eslint src/components/cart/CartProvider.tsx src/lib/cart/pricing.ts` → Expected: no errors.
Run: `npx vitest run` → Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/cart/pricing.ts src/lib/cart/pricing.test.ts src/components/cart/CartProvider.tsx
git commit -m "feat(discounts): cart tracks original prices and can re-price lines

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Show discounts on product cards, product page and cart drawer

**Files:**
- Modify: `src/components/products/ProductCard.tsx`
- Modify: `src/components/products/ProductDetail.tsx`
- Modify: `src/components/cart/CartDrawer.tsx`

**Interfaces:**
- Consumes: `getItemPricing` (Task 3), `CartItem.originalUnitPrice`, `lineOriginalUnitPrice` (Task 5).

- [ ] **Step 1: Product card**

In `src/components/products/ProductCard.tsx`:

Replace the import `import { getDisplayPrice } from "@/lib/pricing";` with `import { getItemPricing } from "@/lib/pricing";`.

Replace

```ts
  const price = getDisplayPrice(item);
  const unitPrice = Number(price);
  const product = item.products;
  const country = item.countries;
```

with

```ts
  const product = item.products;
  const country = item.countries;
  const pricing = getItemPricing(item, country.currency_symbol);
  const unitPrice = pricing.final;
```

In `handleAddToCart`, after `unitPrice,` add `originalUnitPrice: pricing.original,`.

Replace the price paragraph contents (the `<p className={\`font-normal text-[#6c93c4] ...\`}>` block) with:

```tsx
            <p
              className={`flex flex-wrap items-center gap-x-2 gap-y-1 font-normal text-[#6c93c4] ${
                isDialog ? "text-sm" : "text-xs sm:text-sm"
              }`}
            >
              {pricing.isDiscounted ? (
                <span className="text-[#6c93c4]/60 line-through">
                  {country.currency_symbol}
                  {pricing.original}
                </span>
              ) : null}
              <span>
                {country.currency_symbol}
                {pricing.final}
                {showCurrencyCode ? (
                  <span className={`ml-1 uppercase ${isDialog ? "text-xs" : "text-[10px] sm:text-xs"}`}>
                    {country.currency_code}
                  </span>
                ) : null}
              </span>
              {pricing.badge ? (
                <span className="rounded-[3px] bg-[#d48a8a] px-1.5 py-0.5 text-[10px] font-medium text-white sm:text-xs">
                  {pricing.badge}
                </span>
              ) : null}
            </p>
```

- [ ] **Step 2: Product detail**

In `src/components/products/ProductDetail.tsx`:

Replace the import `import { getDisplayPrice } from "@/lib/pricing";` with `import { getItemPricing } from "@/lib/pricing";`.

Replace `const price = Number(getDisplayPrice(item));` with:

```ts
  const pricing = getItemPricing(item, country.currency_symbol);
  const price = pricing.final;
```

In `addToCart`, after `unitPrice: price,` add `originalUnitPrice: pricing.original,`.

Replace the price paragraph (`<p className="mt-6 text-lg font-normal text-[#6c93c4]">…</p>`) with:

```tsx
        <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-lg font-normal text-[#6c93c4]">
          {pricing.isDiscounted ? (
            <span className="text-base text-[#6c93c4]/60 line-through">
              {country.currency_symbol}
              {pricing.original.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          ) : null}
          <span>
            {country.currency_symbol}
            {price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            {showCurrencyCode ? (
              <span className="ml-2 text-sm uppercase">{country.currency_code}</span>
            ) : null}
          </span>
          {pricing.badge ? (
            <span className="rounded-[3px] bg-[#d48a8a] px-2 py-0.5 text-sm font-medium text-white">
              {pricing.badge}
            </span>
          ) : null}
        </p>
```

- [ ] **Step 3: Cart drawer**

In `src/components/cart/CartDrawer.tsx`, add the import:

```ts
import { lineOriginalUnitPrice } from "@/lib/cart/pricing";
```

Replace

```tsx
                    <p className="text-sm font-medium">
                      {money(item.unitPrice * item.quantity)}
                    </p>
```

with

```tsx
                    <p className="text-right text-sm font-medium">
                      {lineOriginalUnitPrice(item) > item.unitPrice ? (
                        <span className="block text-xs font-normal line-through opacity-60">
                          {money(lineOriginalUnitPrice(item) * item.quantity)}
                        </span>
                      ) : null}
                      {money(item.unitPrice * item.quantity)}
                    </p>
```

- [ ] **Step 4: Typecheck and lint**

Run: `npx tsc --noEmit` → Expected: no errors.
Run: `npx eslint src/components/products/ProductCard.tsx src/components/products/ProductDetail.tsx src/components/cart/CartDrawer.tsx` → Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/products/ProductCard.tsx src/components/products/ProductDetail.tsx src/components/cart/CartDrawer.tsx
git commit -m "feat(discounts): show original price and badge on the storefront

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Checkout — re-price from the server and order through `place_order_v2`

**Files:**
- Modify: `src/app/checkout/page.tsx`
- Modify: `src/components/checkout/CheckoutClient.tsx` (contains the user's uncommitted changes)
- Modify: `src/lib/checkout/actions.ts`

**Interfaces:**
- Consumes: `getCountryItemPrices` (Task 4), `CartPrice`, cart context `originalSubtotal`, `discountTotal`, `repriceItems` (Task 5).
- Produces: `CheckoutClient` prop `prices: Record<string, CartPrice>`.

- [ ] **Step 0: Resolve the uncommitted delivery changes**

`git status` shows the user's uncommitted edits in `delivery.ts`, `delivery.test.ts`, `CheckoutClient.tsx`. Follow what the user decided before execution started:
- **Commit them first (preferred):** `git add src/lib/checkout/delivery.ts src/lib/checkout/delivery.test.ts src/components/checkout/CheckoutClient.tsx` and commit as `fix(checkout): hide zero delivery fee, show Free only for the threshold offer` before touching the file.
- **Keep them uncommitted:** interactive `git add -p` isn't available here, so leave `CheckoutClient.tsx` out of Step 5's commit and tell the user it holds both their edits and the discount edits.

Never revert them.

- [ ] **Step 1: Pass server prices from the page**

In `src/app/checkout/page.tsx`, add the imports:

```ts
import { getCountryItemPrices } from "@/lib/discounts/storefront";
import type { CartPrice } from "@/lib/cart/pricing";
```

Replace

```ts
  const shippingZones = country.use_shipping_zones
    ? await getShippingZones(country.id)
    : [];

  return <CheckoutClient country={country} idempotencyKey={randomUUID()} shippingZones={shippingZones} />;
```

with

```ts
  const [shippingZones, itemPrices] = await Promise.all([
    country.use_shipping_zones ? getShippingZones(country.id) : Promise.resolve([] as ShippingZone[]),
    getCountryItemPrices(country.id),
  ]);
  const prices: Record<string, CartPrice> = Object.fromEntries(
    [...itemPrices].map(([countryItemId, pricing]) => [
      countryItemId,
      { unitPrice: pricing.finalPrice, originalUnitPrice: pricing.originalPrice },
    ]),
  );

  return (
    <CheckoutClient
      country={country}
      idempotencyKey={randomUUID()}
      prices={prices}
      shippingZones={shippingZones}
    />
  );
```

- [ ] **Step 2: Re-price and show the discount in `CheckoutClient`**

In `src/components/checkout/CheckoutClient.tsx`:

1. Add the import `import type { CartPrice } from "@/lib/cart/pricing";` and the new prop:

```ts
type CheckoutClientProps = {
  country: Country;
  idempotencyKey: string;
  /** Current server prices for the checkout country, keyed by country item id. */
  prices: Record<string, CartPrice>;
  shippingZones: ShippingZone[];
};

export function CheckoutClient({ country, idempotencyKey, prices, shippingZones }: CheckoutClientProps) {
  const {
    count,
    hydrated,
    items,
    subtotal,
    originalSubtotal,
    discountTotal,
    repriceItems,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCart();
```

2. After `const [confirmOpen, setConfirmOpen] = useState(false);` add:

```ts
  const [pricesUpdated, setPricesUpdated] = useState(false);
```

3. Before the `useEffect` that sends `InitiateCheckout`, add:

```ts
  // The cart keeps the price from when an item was added; a discount may have
  // started or ended since. Bring it in line with what place_order_v2 charges.
  useEffect(() => {
    if (!hydrated) return;
    const timeoutId = window.setTimeout(() => {
      if (repriceItems(prices)) setPricesUpdated(true);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [hydrated, prices, repriceItems]);
```

4. In the alerts `<section className="space-y-4">` (right after the `state && !state.ok` block), add:

```tsx
            {pricesUpdated ? (
              <div
                className="border border-[#6c93c4]/20 bg-white px-4 py-3 text-sm leading-6"
                role="status"
              >
                Some prices in your cart were updated.
              </div>
            ) : null}
```

5. In the order-summary line items, replace

```tsx
                    <p className="mt-1 text-sm text-[#6c93c4]">
                      {money(item.unitPrice)} each
                    </p>
```

with

```tsx
                    <p className="mt-1 text-sm text-[#6c93c4]">
                      {lineOriginalUnitPrice(item) > item.unitPrice ? (
                        <span className="mr-2 line-through opacity-60">
                          {money(lineOriginalUnitPrice(item))}
                        </span>
                      ) : null}
                      {money(item.unitPrice)} each
                    </p>
```

and add `import { lineOriginalUnitPrice, type CartPrice } from "@/lib/cart/pricing";` (merge with the type import from step 1).

6. In the summary totals, replace

```tsx
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{money(subtotal)}</span>
            </div>
```

with

```tsx
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{money(originalSubtotal)}</span>
            </div>
            {discountTotal > 0 ? (
              <div className="flex justify-between text-[#d48a8a]">
                <span>Discount</span>
                <span>-{money(discountTotal)}</span>
              </div>
            ) : null}
```

7. In the `ConfirmDialog` body, after the "Items" row add:

```tsx
          {discountTotal > 0 ? (
            <div className="flex justify-between text-[#d48a8a]">
              <span>Discount</span>
              <span>-{money(discountTotal)}</span>
            </div>
          ) : null}
```

`subtotal` (already discounted) keeps feeding `quoteDelivery` and `total`, so free delivery uses the discounted subtotal.

- [ ] **Step 3: Call `place_order_v2`**

In `src/lib/checkout/actions.ts`, change the RPC client type and call:

```ts
  const rpcClient = supabase as unknown as {
    rpc: (name: "place_order_v2", args: Record<string, unknown>) => Promise<{
      data: Array<{
        order_id: string;
        order_number: string;
        subtotal: number;
        shipping_fee: number;
        total: number;
        discount_total: number;
      }> | null;
      error: { code?: string; details?: string; message: string } | null;
    }>;
  };
  const { data, error } = await rpcClient.rpc("place_order_v2", {
```

(arguments unchanged). Update the log line `place_order RPC failed` → `place_order_v2 RPC failed`.

In `checkoutErrorMessage`, replace

```ts
  if (message?.includes("subtotal") || message?.includes("orders")) {
```

with

```ts
  if (message?.includes("subtotal") || message?.includes("orders") || message?.includes("place_order_v2")) {
```

- [ ] **Step 4: Typecheck, lint, test**

Run: `npx tsc --noEmit` → Expected: no errors.
Run: `npx eslint src/app/checkout/page.tsx src/components/checkout/CheckoutClient.tsx src/lib/checkout/actions.ts` → Expected: no errors.
Run: `npx vitest run` → Expected: all PASS (including the user's `delivery.test.ts`).

- [ ] **Step 5: Commit**

```bash
git add src/app/checkout/page.tsx src/lib/checkout/actions.ts src/components/checkout/CheckoutClient.tsx
git commit -m "feat(discounts): checkout re-prices the cart and orders via place_order_v2

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(Omit `CheckoutClient.tsx` from `git add` if the user chose to keep their delivery edits uncommitted — see Step 0.)

---

### Task 8: Discount rules module (validation, status, formatting)

**Files:**
- Create: `src/lib/discounts/rules.ts`
- Test: `src/lib/discounts/rules.test.ts` (new)

**Interfaces:**
- Consumes: `normalizeWallClock`, `isWithinSchedule`, `resolveCountryTimeZone`, `wallClockIn`, `ScheduleCountry` from `@/lib/promo-banners/schedule`; `asBoolean`, `asNumber` from `@/lib/utils`.
- Produces:
  ```ts
  export const discountSchema: z.ZodType<DiscountInput>;
  export type DiscountInput = { name: string; country_id: string; scope: DiscountScope; value_type: DiscountValueType; value: number; starts_at: string | null; ends_at: string | null; is_enabled: boolean; category_ids: string[]; country_item_ids: string[] };
  export function readDiscountForm(formData: FormData): unknown; // raw object for discountSchema.safeParse
  export type DiscountStatus = "disabled" | "live" | "scheduled" | "expired";
  export function getDiscountStatus(discount: { is_enabled: boolean; starts_at: string | null; ends_at: string | null }, country: ScheduleCountry, now: Date): DiscountStatus;
  export function formatDiscountValue(type: DiscountValueType, value: number | string, currencySymbol: string): string;
  export function orderCategoriesForPicker<T extends { id: string; parent_id?: string | null }>(categories: T[]): Array<{ category: T; depth: number }>;
  ```

- [ ] **Step 1: Write the failing tests**

Create `src/lib/discounts/rules.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  discountSchema,
  formatDiscountValue,
  getDiscountStatus,
  orderCategoriesForPicker,
  readDiscountForm,
} from "@/lib/discounts/rules";

const COUNTRY = "11111111-1111-4111-8111-111111111111";
const CATEGORY = "22222222-2222-4222-8222-222222222222";
const ITEM = "33333333-3333-4333-8333-333333333333";

const valid = {
  name: "Summer sale",
  country_id: COUNTRY,
  scope: "country",
  value_type: "percent",
  value: 10,
  starts_at: null,
  ends_at: null,
  is_enabled: true,
  category_ids: [],
  country_item_ids: [],
};

const firstMessage = (input: unknown) => {
  const result = discountSchema.safeParse(input);
  return result.success ? null : result.error.issues[0]?.message;
};

describe("discountSchema", () => {
  it("accepts a country-wide percent discount", () => {
    expect(discountSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects percent above 100 and non-positive values", () => {
    expect(firstMessage({ ...valid, value: 101 })).toBe("A percent discount can't be more than 100.");
    expect(firstMessage({ ...valid, value: 0 })).toBe("The discount must be more than 0.");
  });

  it("allows fixed amounts above 100", () => {
    expect(discountSchema.safeParse({ ...valid, value_type: "amount", value: 250 }).success).toBe(true);
  });

  it("rejects more than 2 decimals", () => {
    expect(firstMessage({ ...valid, value: 12.345 })).toBe("Use at most 2 decimal places.");
  });

  it("rejects a missing value", () => {
    expect(discountSchema.safeParse({ ...valid, value: Number.NaN }).success).toBe(false);
  });

  it("requires categories or items for those scopes", () => {
    expect(firstMessage({ ...valid, scope: "category" })).toBe("Choose at least one category.");
    expect(firstMessage({ ...valid, scope: "items" })).toBe("Choose at least one item.");
    expect(discountSchema.safeParse({ ...valid, scope: "category", category_ids: [CATEGORY] }).success).toBe(true);
    expect(discountSchema.safeParse({ ...valid, scope: "items", country_item_ids: [ITEM] }).success).toBe(true);
  });

  it("requires the end after the start", () => {
    expect(
      firstMessage({ ...valid, starts_at: "2026-11-01T10:00", ends_at: "2026-11-01T10:00" }),
    ).toBe("The end time must be after the start time.");
  });
});

describe("readDiscountForm", () => {
  it("reads only the target list that matches the scope", () => {
    const formData = new FormData();
    formData.set("name", " Eid ");
    formData.set("country_id", COUNTRY);
    formData.set("scope", "items");
    formData.set("value_type", "amount");
    formData.set("value", "5");
    formData.set("starts_at", "");
    formData.set("is_enabled", "on");
    formData.append("category_ids", CATEGORY);
    formData.append("country_item_ids", ITEM);

    expect(readDiscountForm(formData)).toEqual({
      name: " Eid ",
      country_id: COUNTRY,
      scope: "items",
      value_type: "amount",
      value: 5,
      starts_at: null,
      ends_at: null,
      is_enabled: true,
      category_ids: [],
      country_item_ids: [ITEM],
    });
  });
});

describe("getDiscountStatus", () => {
  const beirut = { id: COUNTRY, code: "LB", timezone: "Asia/Beirut" };
  // 2026-10-10 09:00 UTC = 12:00 in Beirut.
  const now = new Date("2026-10-10T09:00:00Z");

  it("is disabled when switched off", () => {
    expect(getDiscountStatus({ is_enabled: false, starts_at: null, ends_at: null }, beirut, now)).toBe("disabled");
  });

  it("evaluates the window in the country's timezone", () => {
    const window = { is_enabled: true, starts_at: "2026-10-10T11:30:00", ends_at: "2026-10-10T13:00:00" };
    expect(getDiscountStatus(window, beirut, now)).toBe("live");
    expect(getDiscountStatus(window, { ...beirut, timezone: "UTC" }, now)).toBe("scheduled");
  });

  it("is expired after the end", () => {
    expect(
      getDiscountStatus({ is_enabled: true, starts_at: null, ends_at: "2026-10-10T11:00:00" }, beirut, now),
    ).toBe("expired");
  });
});

describe("formatDiscountValue", () => {
  it("formats percent and amount values", () => {
    expect(formatDiscountValue("percent", "10.00", "$")).toBe("10%");
    expect(formatDiscountValue("amount", 5.5, "$")).toBe("$5.5");
  });
});

describe("orderCategoriesForPicker", () => {
  it("lists children under their parent with depth", () => {
    const categories = [
      { id: "lips", parent_id: "makeup" },
      { id: "makeup", parent_id: null },
      { id: "skincare", parent_id: null },
    ];
    expect(orderCategoriesForPicker(categories).map(({ category, depth }) => [category.id, depth])).toEqual([
      ["makeup", 0],
      ["lips", 1],
      ["skincare", 0],
    ]);
  });

  it("still lists categories caught in a parent cycle", () => {
    const categories = [
      { id: "a", parent_id: "b" },
      { id: "b", parent_id: "a" },
    ];
    expect(orderCategoriesForPicker(categories)).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/discounts/rules.test.ts`
Expected: FAIL — cannot resolve `@/lib/discounts/rules`.

- [ ] **Step 3: Implement**

Create `src/lib/discounts/rules.ts`:

```ts
import { z } from "zod";

import {
  isWithinSchedule,
  normalizeWallClock,
  resolveCountryTimeZone,
  wallClockIn,
  type ScheduleCountry,
} from "@/lib/promo-banners/schedule";
import { asBoolean, asNumber } from "@/lib/utils";
import type { DiscountValueType } from "@/types/database";

export const DISCOUNT_SCOPES = ["country", "category", "items"] as const;
export const DISCOUNT_VALUE_TYPES = ["percent", "amount"] as const;

const wallClock = z
  .string()
  .nullable()
  .refine((value) => value === null || normalizeWallClock(value) !== null, "Enter a valid date and time.");

// Mirrors the CHECK constraints on public.discounts.
export const discountSchema = z
  .object({
    name: z.string().trim().min(1, "Enter an internal name.").max(120, "Keep the name under 120 characters."),
    country_id: z.string().uuid("Choose a country."),
    scope: z.enum(DISCOUNT_SCOPES),
    value_type: z.enum(DISCOUNT_VALUE_TYPES),
    value: z
      .number({ error: "Enter the discount value." })
      .gt(0, "The discount must be more than 0.")
      .max(9_999_999_999.99, "That discount is too large."),
    starts_at: wallClock,
    ends_at: wallClock,
    is_enabled: z.boolean(),
    category_ids: z.array(z.string().uuid()),
    country_item_ids: z.array(z.string().uuid()),
  })
  .superRefine((value, context) => {
    if (value.value_type === "percent" && value.value > 100) {
      context.addIssue({ code: "custom", path: ["value"], message: "A percent discount can't be more than 100." });
    }

    if (Math.abs(value.value * 100 - Math.round(value.value * 100)) > 1e-6) {
      context.addIssue({ code: "custom", path: ["value"], message: "Use at most 2 decimal places." });
    }

    if (value.scope === "category" && value.category_ids.length === 0) {
      context.addIssue({ code: "custom", path: ["category_ids"], message: "Choose at least one category." });
    }

    if (value.scope === "items" && value.country_item_ids.length === 0) {
      context.addIssue({ code: "custom", path: ["country_item_ids"], message: "Choose at least one item." });
    }

    const start = normalizeWallClock(value.starts_at);
    const end = normalizeWallClock(value.ends_at);
    if (start && end && end <= start) {
      context.addIssue({ code: "custom", path: ["ends_at"], message: "The end time must be after the start time." });
    }
  });

export type DiscountInput = z.infer<typeof discountSchema>;

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return value === null || String(value).trim() === "" ? null : String(value);
}

/** Raw values for discountSchema; only the target list matching the scope is kept. */
export function readDiscountForm(formData: FormData) {
  const scope = String(formData.get("scope") ?? "");
  const ids = (key: string) => [...new Set(formData.getAll(key).map(String).filter(Boolean))];

  return {
    name: String(formData.get("name") ?? ""),
    country_id: String(formData.get("country_id") ?? ""),
    scope,
    value_type: String(formData.get("value_type") ?? ""),
    value: asNumber(formData.get("value")),
    starts_at: text(formData, "starts_at"),
    ends_at: text(formData, "ends_at"),
    is_enabled: asBoolean(formData.get("is_enabled")),
    category_ids: scope === "category" ? ids("category_ids") : [],
    country_item_ids: scope === "items" ? ids("country_item_ids") : [],
  };
}

export type DiscountStatus = "disabled" | "live" | "scheduled" | "expired";

export function getDiscountStatus(
  discount: { is_enabled: boolean; starts_at: string | null; ends_at: string | null },
  country: ScheduleCountry,
  now: Date,
): DiscountStatus {
  if (!discount.is_enabled) return "disabled";

  const timeZone = resolveCountryTimeZone(country);
  if (isWithinSchedule(discount, now, timeZone)) return "live";

  const start = normalizeWallClock(discount.starts_at);
  return start !== null && wallClockIn(now, timeZone) < start ? "scheduled" : "expired";
}

export function formatDiscountValue(type: DiscountValueType, value: number | string, currencySymbol: string) {
  const amount = Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 });
  return type === "percent" ? `${amount}%` : `${currencySymbol}${amount}`;
}

/** Parents first, each followed by its children (depth-first), for an indented checklist. */
export function orderCategoriesForPicker<T extends { id: string; parent_id?: string | null }>(categories: T[]) {
  const ids = new Set(categories.map((category) => category.id));
  const children = new Map<string | null, T[]>();
  for (const category of categories) {
    const parent = category.parent_id && ids.has(category.parent_id) ? category.parent_id : null;
    children.set(parent, [...(children.get(parent) ?? []), category]);
  }

  const ordered: Array<{ category: T; depth: number }> = [];
  const seen = new Set<string>();
  const visit = (parent: string | null, depth: number) => {
    for (const category of children.get(parent) ?? []) {
      if (seen.has(category.id)) continue;
      seen.add(category.id);
      ordered.push({ category, depth });
      visit(category.id, depth + 1);
    }
  };
  visit(null, 0);

  // Categories stuck in a parent cycle are never reached from a root; list them flat.
  for (const category of categories) {
    if (!seen.has(category.id)) ordered.push({ category, depth: 0 });
  }

  return ordered;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/discounts/rules.test.ts`
Expected: PASS. (If zod 4 rejects `{ error: ... }` on `z.number`, use `z.number({ message: "Enter the discount value." })` instead and re-run.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/discounts/rules.ts src/lib/discounts/rules.test.ts
git commit -m "feat(discounts): validation, status and formatting rules

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Admin data loader and server actions

**Files:**
- Modify: `src/lib/admin/data.ts`
- Create: `src/lib/admin/discount-actions.ts`

**Interfaces:**
- Consumes: `discountSchema`, `readDiscountForm`, `normalizeWallClock` (Task 8); `AdminActionState` from `@/lib/admin/actions`; `requireAdmin`; `createAdminClient`.
- Produces:
  ```ts
  // data.ts
  export type AdminDiscount = Discount & { category_ids: string[]; country_item_ids: string[] };
  export type DiscountItemOption = { id: string; country_id: string; label: string };
  export type DiscountCategoryOption = { id: string; name: string; parent_id: string | null };
  export async function listDiscounts(): Promise<{ discounts: AdminDiscount[]; countries: Country[]; categories: DiscountCategoryOption[]; countryItems: DiscountItemOption[]; error: string | null; missingMigration: boolean }>;
  // discount-actions.ts ("use server")
  export async function saveDiscount(id: string | null, _: AdminActionState, formData: FormData): Promise<AdminActionState>;
  export async function duplicateDiscount(id: string): Promise<void>;
  export async function deleteDiscount(id: string): Promise<void>;
  ```

- [ ] **Step 1: Add the loader**

In `src/lib/admin/data.ts`, extend the type import to include `Discount` and add below `listPromoBanners`:

```ts
export type AdminDiscount = Discount & { category_ids: string[]; country_item_ids: string[] };
export type DiscountItemOption = { id: string; country_id: string; label: string };
export type DiscountCategoryOption = { id: string; name: string; parent_id: string | null };

const MISSING_TABLE_CODES = new Set(["42P01", "PGRST205"]);

export async function listDiscounts() {
  const supabase = createAdminClient();
  const [discounts, countries, categories, countryItems] = await Promise.all([
    supabase
      .from("discounts")
      .select("*, discount_categories(category_id), discount_items(country_item_id)")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("countries").select("*").order("name"),
    supabase.from("categories").select("id,name,parent_id").order("sort_order").order("name"),
    supabase
      .from("country_items")
      .select("id,country_id,country_sku,products!inner(name,base_sku)")
      .order("sort_order"),
  ]);

  const rows = (discounts.data ?? []) as unknown as (Discount & {
    discount_categories: { category_id: string }[] | null;
    discount_items: { country_item_id: string }[] | null;
  })[];
  const itemRows = (countryItems.data ?? []) as unknown as {
    id: string;
    country_id: string;
    country_sku: string | null;
    products: { name: string; base_sku: string | null } | null;
  }[];

  return {
    discounts: rows.map(({ discount_categories: categoryLinks, discount_items: itemLinks, ...discount }) => ({
      ...discount,
      category_ids: (categoryLinks ?? []).map((link) => link.category_id),
      country_item_ids: (itemLinks ?? []).map((link) => link.country_item_id),
    })) as AdminDiscount[],
    countries: (countries.data ?? []) as Country[],
    categories: (categories.data ?? []) as DiscountCategoryOption[],
    countryItems: itemRows.map((item) => {
      const sku = item.country_sku || item.products?.base_sku;
      return {
        id: item.id,
        country_id: item.country_id,
        label: `${item.products?.name ?? item.id}${sku ? ` · ${sku}` : ""}`,
      };
    }) as DiscountItemOption[],
    error:
      discounts.error?.message ?? countries.error?.message ?? categories.error?.message ?? countryItems.error?.message ?? null,
    missingMigration: Boolean(discounts.error?.code && MISSING_TABLE_CODES.has(discounts.error.code)),
  };
}
```

- [ ] **Step 2: Create the actions**

Create `src/lib/admin/discount-actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { AdminActionState } from "@/lib/admin/actions";
import { requireAdmin } from "@/lib/admin/auth";
import { discountSchema, readDiscountForm } from "@/lib/discounts/rules";
import { normalizeWallClock } from "@/lib/promo-banners/schedule";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Discount } from "@/types/database";

const DISCOUNTS_PATH = "/admin/discounts";

type MutationResult = { error: { code?: string; message: string } | null };
type LooseWriteClient = {
  from: (table: string) => {
    insert: (payload: unknown) => PromiseLike<MutationResult> & {
      select: (columns: string) => { single: () => PromiseLike<MutationResult & { data: unknown }> };
    };
    update: (payload: unknown) => { eq: (column: string, value: unknown) => PromiseLike<MutationResult> };
  };
};

function failed(message = "The discount could not be saved. Please try again."): AdminActionState {
  return { ok: false, message };
}

function revalidateDiscountViews() {
  // Prices show on every storefront page and on the admin country items list.
  revalidatePath("/", "layout");
  revalidatePath(DISCOUNTS_PATH);
  revalidatePath("/admin/country-items");
}

async function replaceLinks(
  discountId: string,
  categoryIds: string[],
  countryItemIds: string[],
): Promise<string | null> {
  // Hand-written Database types don't satisfy supabase-js' mutation generics,
  // so writes go through a loosely typed client like promo-banner-actions.ts.
  const supabase = createAdminClient();
  const writes = supabase as unknown as LooseWriteClient;

  const [clearCategories, clearItems] = await Promise.all([
    supabase.from("discount_categories").delete().eq("discount_id", discountId),
    supabase.from("discount_items").delete().eq("discount_id", discountId),
  ]);
  const clearError = clearCategories.error ?? clearItems.error;
  if (clearError) return clearError.message;

  if (categoryIds.length > 0) {
    const { error } = await writes
      .from("discount_categories")
      .insert(categoryIds.map((categoryId) => ({ discount_id: discountId, category_id: categoryId })));
    if (error) return error.message;
  }

  if (countryItemIds.length > 0) {
    const { error } = await writes
      .from("discount_items")
      .insert(countryItemIds.map((countryItemId) => ({ discount_id: discountId, country_item_id: countryItemId })));
    if (error) return error.message;
  }

  return null;
}

export async function saveDiscount(
  id: string | null,
  _: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  if (id && !z.string().uuid().safeParse(id).success) return failed("The discount identifier is invalid.");

  const parsed = discountSchema.safeParse(readDiscountForm(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check the discount fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const { category_ids: categoryIds, country_item_ids: countryItemIds, ...fields } = parsed.data;
  const supabase = createAdminClient();
  const writes = supabase as unknown as LooseWriteClient;

  if (countryItemIds.length > 0) {
    const { data, error } = await supabase
      .from("country_items")
      .select("id")
      .eq("country_id", fields.country_id)
      .in("id", countryItemIds);
    if (error) {
      console.error("Failed to check discount items", { code: error.code, message: error.message });
      return failed();
    }
    if ((data ?? []).length !== countryItemIds.length) {
      return failed("Some selected items don't belong to that country. Re-select the items and save again.");
    }
  }

  const payload = {
    ...fields,
    starts_at: normalizeWallClock(fields.starts_at),
    ends_at: normalizeWallClock(fields.ends_at),
  };

  let discountId = id;
  if (id) {
    const { error } = await writes.from("discounts").update(payload).eq("id", id);
    if (error) {
      console.error("Failed to update discount", { code: error.code, message: error.message });
      return failed();
    }
  } else {
    const { data, error } = await writes.from("discounts").insert(payload).select("id").single();
    if (error || !data) {
      console.error("Failed to insert discount", { code: error?.code, message: error?.message });
      return failed();
    }
    discountId = (data as { id: string }).id;
  }

  const linkError = await replaceLinks(discountId!, categoryIds, countryItemIds);
  if (linkError) {
    console.error("Failed to save discount targets", { message: linkError });
    return failed("The discount was saved, but its categories or items could not be updated. Please save it again.");
  }

  revalidateDiscountViews();
  redirect(DISCOUNTS_PATH);
}

/** Copies a discount (switched off, so the copy never goes live by accident). */
export async function duplicateDiscount(id: string) {
  await requireAdmin();
  if (!z.string().uuid().safeParse(id).success) return;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("discounts")
    .select("*, discount_categories(category_id), discount_items(country_item_id)")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) {
    console.error("Failed to load discount to duplicate", { code: error?.code, message: error?.message });
    return;
  }

  const source = data as unknown as Discount & {
    discount_categories: { category_id: string }[] | null;
    discount_items: { country_item_id: string }[] | null;
  };
  const writes = supabase as unknown as LooseWriteClient;
  const { data: inserted, error: insertError } = await writes
    .from("discounts")
    .insert({
      name: `Copy of ${source.name}`.slice(0, 120),
      country_id: source.country_id,
      scope: source.scope,
      value_type: source.value_type,
      value: source.value,
      starts_at: source.starts_at,
      ends_at: source.ends_at,
      is_enabled: false,
    })
    .select("id")
    .single();
  if (insertError || !inserted) {
    console.error("Failed to duplicate discount", { code: insertError?.code, message: insertError?.message });
    return;
  }

  const linkError = await replaceLinks(
    (inserted as { id: string }).id,
    (source.discount_categories ?? []).map((link) => link.category_id),
    (source.discount_items ?? []).map((link) => link.country_item_id),
  );
  if (linkError) console.error("Failed to copy discount targets", { message: linkError });

  revalidateDiscountViews();
}

export async function deleteDiscount(id: string) {
  await requireAdmin();
  if (!z.string().uuid().safeParse(id).success) return;

  const supabase = createAdminClient();
  // Link rows cascade; past order lines keep discount_name and amounts (discount_id becomes null).
  const { error } = await supabase.from("discounts").delete().eq("id", id);
  if (error) {
    console.error("Failed to delete discount", { code: error.code, message: error.message });
    return;
  }

  revalidateDiscountViews();
}
```

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit` → Expected: no errors. (If `supabase.from("discount_categories").delete()` has a typing error, cast through the same pattern used for `promo_banner_countries` in `promo-banner-actions.ts`.)
Run: `npx eslint src/lib/admin/data.ts src/lib/admin/discount-actions.ts` → Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/admin/data.ts src/lib/admin/discount-actions.ts
git commit -m "feat(discounts): admin loader and save/duplicate/delete actions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Admin Discounts page, form and navigation

**Files:**
- Create: `src/components/admin/forms/DiscountForm.tsx`
- Create: `src/app/(admin)/admin/discounts/page.tsx`
- Modify: `src/components/admin/AdminSidebar.tsx`
- Modify: `src/components/admin/AdminMobileNav.tsx`

**Interfaces:**
- Consumes: `saveDiscount`, `duplicateDiscount`, `deleteDiscount` (Task 9); `listDiscounts`, `AdminDiscount`, `DiscountItemOption`, `DiscountCategoryOption` (Task 9); `getDiscountStatus`, `formatDiscountValue`, `orderCategoriesForPicker` (Task 8); `normalizeWallClock`, `resolveCountryTimeZone` (promo-banners/schedule).

- [ ] **Step 1: Create the form**

Create `src/components/admin/forms/DiscountForm.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";

import { AdminActionForm } from "@/components/admin/AdminActionForm";
import { AdminFormField } from "@/components/admin/AdminFormField";
import { InlineCheckbox } from "@/components/admin/InlineCheckbox";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { AdminDiscount, DiscountCategoryOption, DiscountItemOption } from "@/lib/admin/data";
import { saveDiscount } from "@/lib/admin/discount-actions";
import { orderCategoriesForPicker } from "@/lib/discounts/rules";
import { resolveCountryTimeZone } from "@/lib/promo-banners/schedule";
import type { Country, DiscountScope, DiscountValueType } from "@/types/database";

const inputClassName = "h-10 rounded-md border border-zinc-300 px-3";

function toDateTimeLocal(value: string | null | undefined) {
  return value ? value.replace(" ", "T").slice(0, 16) : "";
}

export function DiscountForm({
  categories,
  countries,
  countryItems,
  discount,
}: {
  categories: DiscountCategoryOption[];
  countries: Country[];
  countryItems: DiscountItemOption[];
  discount?: AdminDiscount;
}) {
  const action = saveDiscount.bind(null, discount?.id ?? null);
  const [countryId, setCountryId] = useState(discount?.country_id ?? countries[0]?.id ?? "");
  const [scope, setScope] = useState<DiscountScope>(discount?.scope ?? "country");
  const [valueType, setValueType] = useState<DiscountValueType>(discount?.value_type ?? "percent");
  const [itemSearch, setItemSearch] = useState("");
  const country = countries.find((candidate) => candidate.id === countryId);
  const itemsForCountry = useMemo(
    () => countryItems.filter((item) => item.country_id === countryId),
    [countryId, countryItems],
  );
  const orderedCategories = useMemo(() => orderCategoriesForPicker(categories), [categories]);
  const fieldPrefix = discount?.id ?? "new";
  const search = itemSearch.trim().toLowerCase();

  return (
    <AdminActionForm action={action} className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-4 md:grid-cols-2">
      <AdminFormField hint="Only visible to admins, e.g. Ramadan 2026 – LB." label="Internal name">
        <input className={inputClassName} defaultValue={discount?.name ?? ""} maxLength={120} name="name" required />
      </AdminFormField>
      <AdminFormField hint="Each discount applies to one country. Use Duplicate to reuse it elsewhere." label="Country">
        <select
          className={inputClassName}
          name="country_id"
          onChange={(event) => setCountryId(event.target.value)}
          required
          value={countryId}
        >
          {countries.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name} ({option.currency_code}){option.is_active ? "" : " – inactive"}
            </option>
          ))}
        </select>
      </AdminFormField>

      <AdminFormField label="Discount type">
        <select
          className={inputClassName}
          name="value_type"
          onChange={(event) => setValueType(event.target.value as DiscountValueType)}
          value={valueType}
        >
          <option value="percent">Percent off</option>
          <option value="amount">Fixed amount off</option>
        </select>
      </AdminFormField>
      <AdminFormField
        hint={
          valueType === "percent"
            ? "Between 0 and 100."
            : `In ${country?.currency_code ?? "the country's currency"}. Prices never go below 0.`
        }
        label={valueType === "percent" ? "Percent" : `Amount (${country?.currency_symbol ?? ""})`}
      >
        <input
          className={inputClassName}
          defaultValue={discount ? String(Number(discount.value)) : ""}
          inputMode="decimal"
          max={valueType === "percent" ? 100 : undefined}
          min={0.01}
          name="value"
          required
          step={0.01}
          type="number"
        />
      </AdminFormField>

      <fieldset className="grid gap-3 md:col-span-2">
        <legend className="mb-2 text-sm font-medium text-zinc-700">Applies to</legend>
        <div className="flex flex-wrap gap-4">
          {(
            [
              ["country", "All items in the country"],
              ["category", "Categories"],
              ["items", "Specific items"],
            ] as const
          ).map(([value, label]) => (
            <label className="flex items-center gap-2 text-sm text-zinc-700" key={value}>
              <input checked={scope === value} name="scope" onChange={() => setScope(value)} type="radio" value={value} />
              {label}
            </label>
          ))}
        </div>
        <p className="text-xs text-zinc-500">
          When several discounts apply to an item, an item discount beats a category discount, which beats a
          country-wide one. Within the same level the biggest saving wins.
        </p>

        {scope === "category" ? (
          <div className="grid max-h-72 gap-2 overflow-y-auto rounded-md border border-zinc-200 p-3">
            {orderedCategories.map(({ category, depth }) => (
              <label
                className="flex items-center gap-2 text-sm text-zinc-700"
                htmlFor={`${fieldPrefix}-category-${category.id}`}
                key={category.id}
                style={{ paddingLeft: `${depth * 1.25}rem` }}
              >
                <input
                  defaultChecked={discount?.category_ids.includes(category.id) ?? false}
                  id={`${fieldPrefix}-category-${category.id}`}
                  name="category_ids"
                  type="checkbox"
                  value={category.id}
                />
                {category.name}
              </label>
            ))}
            <span className="text-xs text-zinc-500">Subcategories are included automatically.</span>
          </div>
        ) : null}

        {scope === "items" ? (
          <div className="grid gap-2 rounded-md border border-zinc-200 p-3">
            <input
              className={inputClassName}
              onChange={(event) => setItemSearch(event.target.value)}
              placeholder="Search items"
              type="search"
              value={itemSearch}
            />
            <div className="grid max-h-72 gap-2 overflow-y-auto">
              {itemsForCountry.length === 0 ? (
                <p className="text-sm text-zinc-500">This country has no items yet.</p>
              ) : null}
              {itemsForCountry.map((item) => (
                // Filtered-out items stay rendered (hidden) so their checkbox is still submitted.
                <label
                  className={
                    search && !item.label.toLowerCase().includes(search)
                      ? "hidden"
                      : "flex items-center gap-2 text-sm text-zinc-700"
                  }
                  htmlFor={`${fieldPrefix}-item-${item.id}`}
                  key={item.id}
                >
                  <input
                    defaultChecked={discount?.country_item_ids.includes(item.id) ?? false}
                    id={`${fieldPrefix}-item-${item.id}`}
                    name="country_item_ids"
                    type="checkbox"
                    value={item.id}
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </div>
        ) : null}
      </fieldset>

      <AdminFormField
        hint={`In ${country ? resolveCountryTimeZone(country) : "the country's"} local time. Leave empty to start immediately.`}
        label="Starts at"
      >
        <input className={inputClassName} defaultValue={toDateTimeLocal(discount?.starts_at)} name="starts_at" type="datetime-local" />
      </AdminFormField>
      <AdminFormField hint="The discount stops at this moment. Leave empty to never end." label="Ends at">
        <input className={inputClassName} defaultValue={toDateTimeLocal(discount?.ends_at)} name="ends_at" type="datetime-local" />
      </AdminFormField>

      <div className="md:col-span-2">
        <InlineCheckbox defaultChecked={discount?.is_enabled ?? true} label="Enabled" name="is_enabled" />
      </div>
      <div className="md:col-span-2">
        <SubmitButton className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white">
          Save discount
        </SubmitButton>
      </div>
    </AdminActionForm>
  );
}
```

- [ ] **Step 2: Create the page**

Create `src/app/(admin)/admin/discounts/page.tsx`:

```tsx
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTable } from "@/components/admin/AdminTable";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmDialog";
import { ErrorMessage } from "@/components/admin/ErrorMessage";
import { DiscountForm } from "@/components/admin/forms/DiscountForm";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { requireAdmin } from "@/lib/admin/auth";
import { listDiscounts, type AdminDiscount, type DiscountCategoryOption, type DiscountItemOption } from "@/lib/admin/data";
import { deleteDiscount, duplicateDiscount } from "@/lib/admin/discount-actions";
import { formatDiscountValue, getDiscountStatus } from "@/lib/discounts/rules";
import { normalizeWallClock } from "@/lib/promo-banners/schedule";
import type { Country } from "@/types/database";

export const metadata = { title: "Discounts" };

function formatWallClock(value: string | null) {
  const normalized = normalizeWallClock(value);
  if (!normalized) return null;
  const [date, time] = normalized.split("T");
  return `${date} ${time.slice(0, 5)}`;
}

function targetsLabel(
  discount: AdminDiscount,
  categories: DiscountCategoryOption[],
  countryItems: DiscountItemOption[],
) {
  if (discount.scope === "country") return "All items";
  if (discount.scope === "category") {
    return discount.category_ids
      .map((id) => categories.find((category) => category.id === id)?.name)
      .filter(Boolean)
      .join(", ") || "No categories";
  }
  const names = discount.country_item_ids
    .map((id) => countryItems.find((item) => item.id === id)?.label)
    .filter(Boolean);
  return names.length <= 2 ? names.join(", ") || "No items" : `${names.length} items`;
}

function StatusCell({ discount, country }: { discount: AdminDiscount; country: Country | undefined }) {
  if (!country) return <StatusBadge tone="red">No country</StatusBadge>;

  switch (getDiscountStatus(discount, country, new Date())) {
    case "live":
      return <StatusBadge tone="green">Live</StatusBadge>;
    case "scheduled":
      return <StatusBadge tone="blue">Scheduled</StatusBadge>;
    case "expired":
      return <StatusBadge>Expired</StatusBadge>;
    case "disabled":
      return <StatusBadge tone="yellow">Disabled</StatusBadge>;
  }
}

export default async function DiscountsPage() {
  await requireAdmin();
  const { discounts, countries, categories, countryItems, error, missingMigration } = await listDiscounts();
  const countryById = new Map(countries.map((country) => [country.id, country]));

  if (missingMigration) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="Discounts" description="Price discounts per country, category or item." />
        <ErrorMessage message="The discounts tables don't exist yet. Run supabase/migrations/202610100001_discounts.sql in the Supabase SQL editor, then reload this page." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Discounts"
        description="Discount a whole country, some categories or specific items. Schedules run in each country's local time. An item discount beats a category discount, which beats a country-wide one."
      />
      <details className="rounded-lg border border-zinc-200 bg-white p-4">
        <summary className="cursor-pointer font-semibold text-zinc-950">Add discount</summary>
        <div className="mt-4">
          <DiscountForm categories={categories} countries={countries} countryItems={countryItems} />
        </div>
      </details>
      <ErrorMessage message={error} />
      <AdminTable
        columns={[
          { key: "name", header: "Discount", render: (row) => <span className="font-medium text-zinc-950">{row.name}</span> },
          { key: "status", header: "Status", render: (row) => <StatusCell country={countryById.get(row.country_id)} discount={row} /> },
          { key: "country", header: "Country", render: (row) => countryById.get(row.country_id)?.name ?? "-" },
          { key: "targets", header: "Applies to", render: (row) => targetsLabel(row, categories, countryItems) },
          {
            key: "value",
            header: "Value",
            render: (row) =>
              formatDiscountValue(row.value_type, row.value, countryById.get(row.country_id)?.currency_symbol ?? ""),
          },
          {
            key: "schedule",
            header: "Schedule (local time)",
            render: (row) => (
              <div className="grid gap-1 text-sm">
                <span>From {formatWallClock(row.starts_at) ?? "now"}</span>
                <span>Until {formatWallClock(row.ends_at) ?? "no end"}</span>
              </div>
            ),
          },
          {
            key: "actions",
            header: "Actions",
            render: (row) => (
              <div className="flex flex-wrap gap-3">
                <form action={duplicateDiscount.bind(null, row.id)}>
                  <button className="text-sm underline underline-offset-4" type="submit">
                    Duplicate
                  </button>
                </form>
                <form action={deleteDiscount.bind(null, row.id)}>
                  <ConfirmSubmitButton
                    className="text-sm text-red-600 underline underline-offset-4"
                    message={`Permanently delete the "${row.name}" discount? Past orders keep their discount details.`}
                  >
                    Delete
                  </ConfirmSubmitButton>
                </form>
              </div>
            ),
          },
        ]}
        rows={discounts}
      />
      <div className="grid gap-4">
        {discounts.map((discount) => (
          <details className="rounded-lg border border-zinc-200 bg-white p-4" key={discount.id}>
            <summary className="cursor-pointer font-medium">Edit {discount.name}</summary>
            <div className="mt-4">
              <DiscountForm categories={categories} countries={countries} countryItems={countryItems} discount={discount} />
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add navigation**

In `src/components/admin/AdminSidebar.tsx`, add `Percent,` to the lucide import (alphabetical, after `Package,`) and insert after the Banners entry:

```ts
  { href: "/admin/discounts", label: "Discounts", icon: Percent },
```

In `src/components/admin/AdminMobileNav.tsx`, insert after `{ href: "/admin/banners", label: "Banners" },`:

```ts
  { href: "/admin/discounts", label: "Discounts" },
```

- [ ] **Step 4: Typecheck and lint**

Run: `npx tsc --noEmit` → Expected: no errors. (If `AdminTable`'s `render` or `ErrorMessage`'s `message` prop types differ, match them to `src/app/(admin)/admin/banners/page.tsx`, which uses both the same way.)
Run: `npx eslint "src/app/(admin)/admin/discounts/page.tsx" src/components/admin/forms/DiscountForm.tsx src/components/admin/AdminSidebar.tsx src/components/admin/AdminMobileNav.tsx` → Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(admin)/admin/discounts/page.tsx" src/components/admin/forms/DiscountForm.tsx src/components/admin/AdminSidebar.tsx src/components/admin/AdminMobileNav.tsx
git commit -m "feat(discounts): admin discounts page and form

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: "Price now" on Country Items, order details, exports

**Files:**
- Modify: `src/app/(admin)/admin/country-items/page.tsx`
- Modify: `src/app/(admin)/admin/orders/[id]/page.tsx`
- Modify: `src/lib/admin/export-data.ts`
- Modify: `src/lib/admin/export-workbook.ts`

**Interfaces:**
- Consumes: `getCountryItemPrices` (Task 4), `getItemPricing` (Task 3), new `Order`/`OrderItem` columns (Task 3).

- [ ] **Step 1: Country Items "Price now"**

In `src/app/(admin)/admin/country-items/page.tsx`:

Add imports:

```ts
import { getCountryItemPrices } from "@/lib/discounts/storefront";
import { getItemPricing } from "@/lib/pricing";
import type { CountryItem, ItemPricing } from "@/types/database";
```

(replace the existing `import type { CountryItem } from "@/types/database";`; keep the `resolveItemPrice` import).

After `const rows = filterCountryItems(...)`, add:

```ts
  const countryIds = [...new Set(rows.map((row) => row.country_id))];
  const priceMaps = await Promise.all(countryIds.map((countryId) => getCountryItemPrices(countryId)));
  const pricesByItem = new Map(priceMaps.flatMap((prices) => [...prices]));
```

Pass `pricing={pricesByItem.get(item.id)}` where `<CountryItemCard` is rendered, and add `pricing?: ItemPricing;` to its props type and `pricing,` to its destructured props.

Inside `CountryItemCard`, after `const price = ...`, add:

```ts
  const current = pricing ? getItemPricing({ price: item.price, pricing }, currencySymbol) : null;
  const priceNow = !current
    ? "—"
    : current.isDiscounted
      ? `${currencySymbol}${current.final} (${current.badge ?? "discounted"})`
      : `${currencySymbol}${current.final}`;
```

Change the summary metrics grid `className="grid grid-cols-3 gap-3 text-sm"` to `className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4"` and add after `<Metric label="Current price" value={price} />`:

```tsx
            <Metric label="Price now" value={priceNow} />
```

- [ ] **Step 2: Order detail**

In `src/app/(admin)/admin/orders/[id]/page.tsx`, replace the totals block

```tsx
              <p className="font-medium">Subtotal: {typedOrder.subtotal ?? "-"}</p>
```

with

```tsx
              {Number(typedOrder.discount_total ?? 0) > 0 ? (
                <>
                  <p className="font-medium">
                    Before discounts: {(Number(typedOrder.subtotal ?? 0) + Number(typedOrder.discount_total)).toFixed(2)}
                  </p>
                  <p className="font-medium text-emerald-700">Discount: -{typedOrder.discount_total}</p>
                </>
              ) : null}
              <p className="font-medium">Subtotal: {typedOrder.subtotal ?? "-"}</p>
```

Replace the items table header row with:

```tsx
                  <tr><th className="py-2">Product</th><th>Qty</th><th>Original</th><th>Discount</th><th>Unit</th><th>Total</th></tr>
```

and add two cells after `<td>{item.quantity}</td>`:

```tsx
                      <td>{item.original_unit_price ?? item.unit_price}</td>
                      <td>
                        {Number(item.discount_amount ?? 0) > 0
                          ? `-${item.discount_amount} each${item.discount_name ? ` (${item.discount_name})` : ""}`
                          : "-"}
                      </td>
```

- [ ] **Step 3: Exports**

In `src/lib/admin/export-data.ts`:

- `OrderExportRow`: add `discount: number;` after `currency: string;`.
- `OrderItemExportRow`: add `originalUnitPrice: number;` before `unitPrice: number;`, and `discount: number;` and `discountName: string;` after `lineTotal: number;`.
- In the `orderRows` mapper, after `currency,` add `discount: toNumber(order.discount_total),`.
- In the `itemRows` mapper, after `unitPrice,` add:

```ts
        originalUnitPrice: item.original_unit_price == null ? unitPrice : toNumber(item.original_unit_price),
```

and after `lineTotal: ...,` add:

```ts
        discount: toNumber(item.discount_amount) * quantity,
        discountName: text(item.discount_name),
```

In `src/lib/admin/export-workbook.ts`:

- Orders sheet: insert before the `Subtotal` column:

```ts
      { header: "Discount", key: "discount", width: 12, format: "money", total: true, value: (r) => r.discount },
```

- Items sheet: insert before `Unit price`:

```ts
      { header: "Original unit price", key: "originalUnitPrice", width: 16, format: "money", value: (r) => r.originalUnitPrice },
```

and after `Line total`:

```ts
      { header: "Discount", key: "discount", width: 12, format: "money", total: true, value: (r) => r.discount },
      { header: "Discount name", key: "discountName", width: 26, value: (r) => r.discountName },
```

- [ ] **Step 4: Typecheck, lint, test**

Run: `npx tsc --noEmit` → Expected: no errors. (`toNumber(null)`/`toNumber(undefined)` must return 0; if it doesn't, wrap with `?? 0`.)
Run: `npx eslint "src/app/(admin)/admin/country-items/page.tsx" "src/app/(admin)/admin/orders/[id]/page.tsx" src/lib/admin/export-data.ts src/lib/admin/export-workbook.ts` → Expected: no errors.
Run: `npx vitest run` → Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(admin)/admin/country-items/page.tsx" "src/app/(admin)/admin/orders/[id]/page.tsx" src/lib/admin/export-data.ts src/lib/admin/export-workbook.ts
git commit -m "feat(discounts): price now, order discount details and export columns

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: End-to-end check on the local dev server, then cleanup

**Files:**
- Create (temporary, gitignored, deleted at the end): `.env.development.local`

Requires: the migration applied (Task 2). Every DB write below needs the user's yes first.

- [ ] **Step 1: Full static checks**

Run: `npx vitest run` → all PASS.
Run: `npx tsc --noEmit` → no errors.
Run: `npx eslint` → no errors.

- [ ] **Step 2: Turn the Meta Pixel off for local dev only**

Create `.env.development.local` containing exactly:

```
NEXT_PUBLIC_META_PIXEL_ID=
```

(`.env*` is gitignored; `.env.development.local` takes precedence over `.env.local` in `next dev` only.) Start the dev server with `preview_start` name `heaven-beauty-dev`. In the browser pane run `typeof window.fbq` → Expected: `"undefined"`. Also check `read_network_requests` with `urlPattern: "facebook.com"` → Expected: none.

- [ ] **Step 3: Pick a test country without Wakilni (read-only)**

In the Supabase SQL editor:

```sql
select c.code, c.name, c.is_active, coalesce(w.enabled, false) as wakilni_enabled
from public.countries c
left join public.wakilni_country_settings w on w.country_id = c.id
order by c.name;
```

Pick an **active** country with `wakilni_enabled = false`. If none exists, stop and ask the user. Record the test start time: `select now();`.

- [ ] **Step 4: Create test discounts in the admin (ask first)**

Ask the user before saving. In `/admin/discounts` for the chosen country, create (all names start with `[TEST]`):
1. `[TEST] country 10%` — All items, percent 10.
2. `[TEST] category 20%` — one category that has items in this country, percent 20.
3. `[TEST] item 5%` — one item from that category, percent 5.

Expected: all three show **Live**. `/admin/country-items` filtered to the country shows "Price now" with `-5%` for the item, `-20%` for the rest of the category, `-10%` elsewhere.

- [ ] **Step 5: Item search keeps hidden selections (Review Focus 2)**

Edit `[TEST] item 5%`, select a second item, type a search that hides both selected items, Save. Expected: after save the discount still lists both items ("2 items" or both names). Then edit it back to one item.

- [ ] **Step 6: Storefront display**

Switch the site to the test country (country selector). Check home featured items, `/shop` (sort by price uses discounted prices), a product page, and the cart drawer: struck-through original, final price, correct badge. Screenshot each.

- [ ] **Step 7: Stale cart is re-priced (Review Focus 3)**

Add the `[TEST] item 5%` product to the cart. In the admin, disable `[TEST] item 5%` (ask first). Reload `/checkout`. Expected: notice "Some prices in your cart were updated.", the line now shows the category discount (20%), Subtotal/Discount/Total updated. Re-enable the rule.

- [ ] **Step 8: Place one test order (ask first, explicitly)**

Tell the user: "Placing one test order in <country> (no Wakilni). Your internal order-notification recipients will get one email. OK?" On yes, check out with phone `000-TEST-0001`, **no email**, name `Test Discount`, address `Test street 1`, city `Test city`. Expected: success screen. In `/admin/orders/<id>`: Original/Discount/Unit columns, "Discount" line in totals, total = shown checkout total. Export orders to Excel and confirm the Discount columns. Note the order number.

- [ ] **Step 9: Cleanup (ask first)**

Run in the SQL editor (replace placeholders with the recorded values):

```sql
begin;
-- Stock is only touched when stock_quantity is tracked; inventory tracking is disabled, verify:
select ci.id, ci.stock_quantity from public.order_items oi join public.country_items ci on ci.id = oi.country_item_id
where oi.order_id in (select id from public.orders where order_number in ('<ORDER_NUMBER>'));

delete from public.order_notification_logs where order_id in (select id from public.orders where order_number in ('<ORDER_NUMBER>'));
delete from public.wakilni_sync_logs where order_id in (select id from public.orders where order_number in ('<ORDER_NUMBER>'));
delete from public.orders where order_number in ('<ORDER_NUMBER>');  -- order_items cascade
delete from public.customers c
where c.phone = '000-TEST-0001'
  and not exists (select 1 from public.orders o where o.customer_id = c.id);
delete from public.discounts where name like '[TEST]%';               -- link rows cascade
delete from public.checkout_rate_limits where window_started_at >= '<TEST_START>';
commit;
```

If the stock query shows non-null `stock_quantity`, add the ordered quantity back before `commit`. If any delete fails on a foreign key, `rollback;`, report the table to the user, and add a delete for it.

- [ ] **Step 10: Verify cleanup (read-only)**

```sql
select
  (select count(*) from public.orders where order_number in ('<ORDER_NUMBER>')) as orders_left,
  (select count(*) from public.customers where phone = '000-TEST-0001') as customers_left,
  (select count(*) from public.discounts where name like '[TEST]%') as discounts_left;
```

Expected: `0, 0, 0`.

- [ ] **Step 11: Restore local config**

Delete `.env.development.local`, stop the dev server (`preview_stop`), and confirm `git status` shows no unintended changes. Do **not** push.

---

## Release (not part of this execution — needs the user's go-ahead)

1. Merge `feat/discounts` and deploy. Deploying switches the live site to `country_item_prices` + `place_order_v2`; no migration is needed at that moment.
2. After the deploy is confirmed healthy, add and apply `supabase/migrations/202610100002_drop_legacy_place_order.sql`:

```sql
drop function if exists public.place_order(uuid,jsonb,uuid,text,text,text,text,text,text,text,text,text,uuid,text);
notify pgrst, 'reload schema';
```
