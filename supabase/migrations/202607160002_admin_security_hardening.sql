-- Sensitive tables must never be readable or writable through the public API.
-- The application accesses these tables only from authenticated server actions
-- using the server-only service role after requireAdmin() succeeds.

alter table public.admin_users enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.exchange_rates enable row level security;
alter table public.order_notification_settings enable row level security;
alter table public.order_notification_recipients enable row level security;
alter table public.order_notification_templates enable row level security;
alter table public.order_notification_logs enable row level security;
alter table public.checkout_rate_limits enable row level security;

revoke all on table public.admin_users from anon, authenticated;
revoke all on table public.customers from anon, authenticated;
revoke all on table public.orders from anon, authenticated;
revoke all on table public.order_items from anon, authenticated;
revoke all on table public.exchange_rates from anon, authenticated;
revoke all on table public.order_notification_settings from anon, authenticated;
revoke all on table public.order_notification_recipients from anon, authenticated;
revoke all on table public.order_notification_templates from anon, authenticated;
revoke all on table public.order_notification_logs from anon, authenticated;
revoke all on table public.checkout_rate_limits from anon, authenticated;

-- Remove any accidentally created public policies on sensitive data.
drop policy if exists public_read on public.admin_users;
drop policy if exists public_read on public.customers;
drop policy if exists public_read on public.orders;
drop policy if exists public_read on public.order_items;
drop policy if exists public_read on public.exchange_rates;
drop policy if exists public_read on public.order_notification_settings;
drop policy if exists public_read on public.order_notification_recipients;
drop policy if exists public_read on public.order_notification_templates;
drop policy if exists public_read on public.order_notification_logs;
drop policy if exists public_read on public.checkout_rate_limits;

create unique index if not exists admin_users_user_id_unique
  on public.admin_users(user_id)
  where user_id is not null;
