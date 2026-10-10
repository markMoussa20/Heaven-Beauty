# Discounts — Design

Date: 2026-10-10
Status: Draft, awaiting review
Branch: `feat/discounts` (local only — not pushed or deployed until explicitly approved)

## Goal

Let admins run price discounts per country from the admin panel, enforced by the database at checkout and shown to shoppers on the storefront.

Admins can discount:

- **every item in a country** ("10% off everything in Lebanon"),
- **one or more categories** in a country ("15% off Skincare in UAE"),
- **specific items** in a country ("5% off item A, 10% off item B").

Any mix of these can be active at the same time.

## Decisions

| Topic | Decision |
|---|---|
| Overlap | Most specific wins: **item > category > country**. Within the same level, the largest saving wins. |
| Value types | **Percent** (0 < v ≤ 100) or **fixed amount** in the country's currency (v > 0). Final price never goes below 0. |
| Country targeting | One discount belongs to exactly one country (fixed amounts are currency-specific). Admins can duplicate a discount for another country. |
| Categories | A category discount also covers that category's subcategories (any depth). |
| Scheduling | Optional `starts_at` / `ends_at` as wall-clock times in the country's `timezone`, same convention as promo banners. |
| Free delivery | `countries.free_delivery_threshold` is compared against the **discounted** items subtotal. |
| Source of truth | One SQL function computes prices; storefront display and order placement both use it. |
| `country_items.sale_price` | No longer used by the new code path. Column kept (unused) to avoid breaking anything; removal is a later cleanup. |

Out of scope: coupon / promo codes, buy-X-get-Y, minimum-basket rules, dropping `sale_price`.

## 1. Data model

New migration `supabase/migrations/202610100001_discounts.sql`.

### `public.discounts`

| column | type | notes |
|---|---|---|
| `id` | uuid pk | `gen_random_uuid()` |
| `name` | text not null | admin-facing label, 1–120 chars |
| `country_id` | uuid not null → `countries(id)` on delete cascade | |
| `scope` | text not null | `'country' \| 'category' \| 'items'` |
| `value_type` | text not null | `'percent' \| 'amount'` |
| `value` | numeric(12,2) not null | percent: `> 0 and <= 100`; amount: `> 0` |
| `starts_at` | timestamp (no tz) null | wall-clock, interpreted in the country timezone; null = no start limit |
| `ends_at` | timestamp (no tz) null | exclusive; null = no end; check `ends_at > starts_at` when both set |
| `is_enabled` | boolean not null default true | |
| `created_at` / `updated_at` | timestamptz | `set_updated_at` trigger |

Indexes: `(country_id, is_enabled)`.

### `public.discount_categories`

`(discount_id → discounts on delete cascade, category_id → categories on delete cascade)`, primary key on both.

### `public.discount_items`

`(discount_id → discounts on delete cascade, country_item_id → country_items on delete cascade)`, primary key on both. The admin action only allows country items that belong to the discount's country; the pricing function also joins on country, so a mismatched row can never apply.

### Order columns

- `orders.discount_total numeric(12,2) not null default 0` (check `>= 0`).
- `order_items.original_unit_price numeric(12,2)` (null on historical rows).
- `order_items.discount_id uuid` → `discounts(id)` **on delete set null**.
- `order_items.discount_name text` (snapshot, survives rule edits/deletion).
- `order_items.discount_amount numeric(12,2) not null default 0` — per-unit saving.

`orders.subtotal` keeps its current meaning: what the customer pays for items (after discounts). `total = subtotal + shipping_fee` stays true, so exports, Wakilni payloads and notification templates are unaffected.

### Access

Like promo banners: RLS enabled on the three discount tables with no public policies, and `revoke all` from `anon, authenticated`. Admin reads/writes go through the service role. Scheduled or disabled rules never reach the browser.

## 2. Pricing function

### `public.country_item_prices(p_country_id uuid)`

`security definer`, `set search_path = pg_catalog, public`, `stable`. Granted to `anon, authenticated, service_role`.

Returns one row per **visible** country item (`is_visible`, product `is_active`, country `is_active`):

```
country_item_id uuid, original_price numeric, final_price numeric,
discount_id uuid, discount_type text, discount_value numeric, discount_amount numeric
```

`discount_amount` is the per-unit saving. Discount `name` is intentionally **not** returned (admin-facing).

Algorithm:

1. `v_now := (now() at time zone <country timezone>)::timestamp`.
2. Active rules for the country: `is_enabled and (starts_at is null or starts_at <= v_now) and (ends_at is null or ends_at > v_now)`.
3. Candidate (item, rule) pairs:
   - `scope = 'items'` via `discount_items` → level 3
   - `scope = 'category'` via `discount_categories`, expanded with a recursive CTE over `categories.parent_id` to all descendants, joined through `product_categories` → level 2
   - `scope = 'country'` → every item, level 1
4. Per pair, saving = `round(price * value / 100, 2)` for percent, `value` for amount, capped at `price`.
5. Pick one rule per item: `order by level desc, saving desc, created_at desc, id` (`distinct on (country_item_id)`).
6. `final_price = price - saving`.

Items with no matching rule return `final_price = original_price`, null discount fields, `discount_amount = 0`.

### `public.place_order_v2(...)`

Same parameters and return columns as `place_order`, plus `discount_total numeric` in the return table. Body is the current `place_order` (from `202609140001_free_delivery_threshold.sql`) with these changes:

- Unit price comes from `country_item_prices(p_country_id)` for that item instead of `sale_price`. The item still must exist, be visible and in-country (`ITEM_UNAVAILABLE` otherwise); the `for update` lock on `country_items` and stock handling are unchanged.
- Accumulates `v_discount_total += discount_amount * quantity`.
- Free-delivery threshold compares against the discounted subtotal (which is what `v_calculated_subtotal` already is).
- Inserts `orders.discount_total` and per-line `original_unit_price`, `discount_id`, `discount_name` (looked up from `discounts`), `discount_amount`.
- Prices are computed once per line in the first loop and reused for the `order_items` insert, so a rule can't change between the two loops.
- Grants: `revoke all … from public, anon, authenticated; grant execute … to service_role` (same as today).

### Why `place_order_v2` instead of replacing `place_order`

Local development uses the **same Supabase project as the live site**. Leaving `place_order` untouched means the live site's checkout keeps behaving exactly as today while the new code is tested locally — including while test discounts are enabled in the database. The live site never calls `country_item_prices` or `place_order_v2`.

### Release

Deploying the new code is the switch: from then on the live site calls `place_order_v2`. No migration is needed at release time. Once the deploy is confirmed healthy, a cleanup migration `202610100002_drop_legacy_place_order.sql` drops the old `place_order`. Written in the plan, **not applied** during local testing.

## 3. Storefront

### Loading prices

New `src/lib/discounts/storefront.ts`:

```ts
getCountryItemPrices(countryId: string): Promise<Map<string, ItemPricing>>
attachPricing(items: CountryItemWithProduct[], prices: Map<string, ItemPricing>): CountryItemWithProduct[]
```

Calls the RPC once per request. On any error (including the function not existing yet) it logs once and returns an empty map → items show their regular price. Used by `getFeaturedCountryItems`, `getVisibleCountryItems`, the product page loader, and the checkout page.

`CountryItemWithProduct` gains an optional `pricing?: ItemPricing`:

```ts
type ItemPricing = {
  originalPrice: number;
  finalPrice: number;
  discountType: "percent" | "amount" | null;
  discountValue: number | null;
  discountAmount: number;
};
```

### `src/lib/pricing.ts`

- `getDisplayPrice(item)` → `item.pricing?.finalPrice ?? price`. Shop sorting and Meta Pixel values follow automatically.
- New pure `getItemPricing(item, currencySymbol)` → `{ original, final, isDiscounted, badge }` where badge is `"-10%"` or `"-5 USD"` (symbol from the country). Unit tested.

### Product card / product detail

When discounted: original price struck through, final price, and the badge, using the existing palette. Undiscounted items render exactly as today.

### Cart

`CartItem` gains optional `originalUnitPrice?: number`. Added by `ProductCard` / `ProductDetail`. `CartDrawer` shows it struck through when greater than `unitPrice`. Carts saved before this change (no field) keep working.

New `repriceItems(prices: Record<countryItemId, { unitPrice, originalUnitPrice }>)` on the cart context: updates matching lines and returns whether anything changed.

### Checkout

- `src/app/checkout/page.tsx` loads `country_item_prices` for the country server-side and passes a plain `prices` record to `CheckoutClient`.
- On hydration, `CheckoutClient` calls `repriceItems`; if anything changed it shows: *"Some prices in your cart were updated."*
- Summary: **Subtotal** (original prices) → **Discount −X** (only when > 0) → Delivery → Total. Free-delivery quote (`quoteDelivery`) uses the discounted subtotal. Builds on the existing uncommitted `delivery.display` changes.
- `submitCheckout` calls `place_order_v2`. Error mapping unchanged; add a message for a missing `place_order_v2` ("Checkout database setup is out of date…").
- `place_order_v2` remains the authority on what is charged; the client re-pricing only keeps the screen honest.

## 4. Admin

### Discounts page — `/admin/discounts`

Sidebar entry "Discounts" (lucide `Percent`) between Banners and Shipping.

- Collapsible "Add discount" form, then a table: name, country, targets ("All items" / category names / "N items"), value ("10%" / "5 USD"), schedule, status badge (Live / Scheduled / Expired / Disabled), actions (Edit, Duplicate, Delete with confirm).
- Status is computed with the existing helpers in `src/lib/promo-banners/schedule.ts` (`normalizeWallClock`, `resolveCountryTimeZone`, wall-clock "now" per country) — reused, not copied. If those helpers are banner-specific, the shared parts are extracted into `src/lib/schedule/wall-clock.ts` and banners import from there.
- If the discount tables are missing, the page shows "Run migration 202610100001_discounts.sql" instead of failing.

### `DiscountForm` (client component)

Fields: name, country, scope (All items / Categories / Specific items), value type (Percent / Fixed amount — currency shown), value, starts at, ends at, enabled.

- Categories: checkbox list (with indentation for children).
- Specific items: searchable checklist of the selected country's items, filtered when the country changes.

### `src/lib/admin/discount-actions.ts`

`createDiscount`, `updateDiscount`, `duplicateDiscount`, `deleteDiscount` — `requireAdmin()`, zod validation mirroring the DB checks (percent 0–100, amount > 0, end after start, ≥ 1 category/item for those scopes, items belong to the chosen country). Writes the discount and replaces its link rows. Revalidates `/admin/discounts`, `/admin/country-items`, `/shop`, `/`, product pages.

### Country Items page

New "Price now" column from `country_item_prices`: final price, with the original struck through and the applied discount when there is one. Lets admins see the effect of their rules. Hidden items (not returned by the function) show "—".

### Orders

- Order detail: per line, original price, discount name and amount, paid price; totals gain a "Discount" line when `discount_total > 0`. Historical orders render as today.
- Exports: orders sheet gets "Discount"; items sheet gets "Original unit price", "Discount", "Discount name".

### Types

`src/types/database.ts`: `Discount`, `DiscountCategory`, `DiscountItem`, new columns on `Order` and `OrderItem`.

## 5. Testing and safe rollout

Constraint: local `.env.local` points at the live Supabase project; the code must not reach the public site until approved.

1. **Code isolation** — all work on local branch `feat/discounts`. No push, no deploy.
2. **Unit tests (vitest)** — `getItemPricing` badge/formatting, cart re-pricing, checkout summary math, admin zod schemas, shared schedule helpers.
3. **Migration** — the user applies `202610100001_discounts.sql` in the Supabase SQL editor. It is purely additive (new tables, columns with defaults, new functions); the live site's `place_order` is untouched.
4. **SQL tests in rolled-back transactions** — each case runs inside `begin; … rollback;` in the SQL editor (with the user's go-ahead), covering: item > category > country precedence, largest saving within a level, percent vs amount, floor at 0, schedule windows in the country timezone, subcategory coverage, invisible items excluded, `place_order_v2` totals / discount snapshot / free-delivery on discounted subtotal. Nothing persists and no notifications fire (notifications are sent by the app, not the DB).
5. **Browser end-to-end on the local dev server**, in a country **with no Wakilni configuration** (verified first in `wakilni_country_settings`):
   - Meta Pixel disabled locally (`NEXT_PUBLIC_META_PIXEL_ID` empty for the dev server) so no test purchases reach ads data.
   - Create test discounts named with a `[TEST]` prefix; check shop, product page, cart, checkout display and the admin "Price now" column.
   - Place one or two orders with no customer email. Internal order-notification emails will still be sent to the configured recipients for these orders.
6. **Cleanup** — delete `[TEST]` discounts (link rows cascade), the test orders (items cascade), the test customer created by checkout, and their `checkout_rate_limits` rows; restore any `stock_quantity` that was decremented. Verify with a final query that none remain.
7. **Release (later, separate approval)** — merge and deploy; after it is confirmed healthy, apply `202610100002_drop_legacy_place_order.sql`.
