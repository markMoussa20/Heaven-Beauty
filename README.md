# Heaven Beauty Storefront

Next.js 16 storefront and administration app for Heaven Beauty, backed by Supabase. The public site resolves UAE, Lebanon, Egypt, and Jordan by hostname, presents country-specific catalog/pricing/shipping/WhatsApp data, and places cash-on-delivery orders through one transactional PostgreSQL RPC.

## Architecture

- Next.js App Router server components for public/admin pages
- Supabase PostgreSQL, Auth, Row Level Security, and Storage
- `src/proxy.ts` for auth refresh, pathname propagation, and legacy admin redirects
- Server-only service-role client for checkout and admin operations
- Database-backed content, catalog, shipping, footer, FAQ, and notification settings
- Gmail SMTP and CallMeBot notifications after a successful order commit

## Local setup

1. Install Node.js 20+ and pnpm.
2. Run `pnpm install`.
3. Copy `.env.example` to `.env.local` and fill the values.
4. Apply every SQL file in `supabase/migrations` in filename order using the Supabase CLI or SQL editor.
5. Run `pnpm dev` and open `http://localhost:3000`.

Required variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_DEFAULT_COUNTRY_CODE=AE
CHECKOUT_RATE_LIMIT_SECRET=
```

The service-role key and rate-limit secret are server-only. Never prefix them with `NEXT_PUBLIC_`.

## Supabase

The ordered migration set creates/extends the full schema, RLS, public read policies, `product-images` bucket, idempotency constraint, database rate limiting, and `place_order` RPC. Legacy SQL files at the root of `supabase/` are retained for history and are superseded by `supabase/migrations/`.

Apply migrations with the CLI after linking the project:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

The storage bucket permits public reads; all writes are performed by authenticated server-side admin actions. Product/page image uploads accept AVIF, JPEG, PNG, or WebP up to 5 MB.

### First admin

Create the user in Supabase Authentication, then run (replace the email):

```sql
insert into public.admin_users (user_id, email)
select id, email from auth.users where email = 'admin@example.com'
on conflict do nothing;
```

## Country domains

Configure each active `countries.domain` value in Admin > Countries. A hostname or full URL is accepted. Production hostname matching always takes priority over a saved country cookie. Localhost continues to use cookie/local-storage switching.

In Vercel, add the four subdomains and point each DNS record to Vercel as instructed by its Domains screen (normally a CNAME to `cname.vercel-dns.com`). Configure the matching hostname on the correct country row. HTTPS is issued by Vercel.

## Checkout and stock

Checkout accepts only country-item IDs and integer quantities. PostgreSQL validates country, visibility, product status, shipping zone, price, and stock while rows are locked. `NULL` stock is unlimited; finite stock decreases inside the same transaction. Any error rolls back customer, order, items, and stock. An idempotency UUID prevents duplicate orders and duplicate stock reduction. Cash on delivery is the only payment method.

## Notifications

Admin > Notifications controls sender identity, Gmail app-password SMTP, internal recipients, CallMeBot, and templates. Credentials are protected by RLS and queried only through the server-only admin client. Email/WhatsApp delivery starts after order commit; notification failure is logged and never reverses the order.

## Quality commands

```bash
pnpm lint
pnpm build
```

## Vercel deployment checklist

- Add all environment variables for Production and Preview.
- Use a strong random `CHECKOUT_RATE_LIMIT_SECRET`.
- Apply migrations before deploying application code.
- Add and verify all four domains/subdomains in Vercel.
- Set every country domain, WhatsApp number, shipping mode, and fee/zone.
- Verify admin login and old `/admin/pages`, `/admin/site-content`, `/admin/footer` redirects.
- Place one low-risk order per country; verify totals, stock, admin order, email, and CallMeBot logs.
- Confirm database backups/PITR in Supabase and export storage assets regularly.

## Backup and recovery

Enable Supabase daily backups or Point-in-Time Recovery for production. Before schema changes, take a database backup and retain a copy of Storage objects. Recovery should restore the database first, then Storage, then redeploy the matching application version. Migrations are additive and must never be replaced by destructive reset scripts in production.
