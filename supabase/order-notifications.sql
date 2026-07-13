create table if not exists public.order_notification_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique default 'default',
  is_active boolean not null default true,
  customer_email_enabled boolean not null default true,
  internal_email_enabled boolean not null default true,
  sms_enabled boolean not null default false,
  sender_name text not null default 'Heaven Beauty',
  sender_email text,
  reply_to_email text,
  gmail_user text,
  gmail_app_password text,
  smtp_host text not null default 'smtp.gmail.com',
  smtp_port integer not null default 465,
  smtp_secure boolean not null default true,
  callmebot_api_key text,
  callmebot_phone text,
  callmebot_endpoint_template text not null default 'https://api.callmebot.com/whatsapp.php?phone={phone}&text={message}&apikey={apiKey}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_notification_recipients (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text not null,
  is_active boolean not null default true,
  receive_order_email boolean not null default true,
  sort_order integer not null default 10,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_notification_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  subject text,
  body text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_notification_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  channel text not null,
  recipient text,
  status text not null,
  message text,
  created_at timestamptz not null default now()
);

alter table public.order_notification_settings enable row level security;
alter table public.order_notification_recipients enable row level security;
alter table public.order_notification_templates enable row level security;
alter table public.order_notification_logs enable row level security;

drop policy if exists "Admin service role manages notification settings" on public.order_notification_settings;
drop policy if exists "Admin service role manages notification recipients" on public.order_notification_recipients;
drop policy if exists "Admin service role manages notification templates" on public.order_notification_templates;
drop policy if exists "Admin service role manages notification logs" on public.order_notification_logs;

create policy "Admin service role manages notification settings"
on public.order_notification_settings
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "Admin service role manages notification recipients"
on public.order_notification_recipients
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "Admin service role manages notification templates"
on public.order_notification_templates
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "Admin service role manages notification logs"
on public.order_notification_logs
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

insert into public.order_notification_settings (
  key,
  sender_name,
  sender_email,
  reply_to_email,
  gmail_user,
  customer_email_enabled,
  internal_email_enabled,
  sms_enabled
)
values (
  'default',
  'Heaven Beauty',
  'service@myheavenbeauty.com',
  'service@myheavenbeauty.com',
  'service@myheavenbeauty.com',
  true,
  true,
  false
)
on conflict (key) do nothing;

insert into public.order_notification_templates (key, subject, body, is_active)
values
(
  'customer_order_confirmation',
  'Your Heaven Beauty order {orderNumber} is confirmed',
  'Hi {customerName},

Thank you for shopping with Heaven Beauty. Your order {orderNumber} is confirmed, and our team is preparing it with care.

Order summary:
{itemsText}

Subtotal: {subtotal}
Delivery: {shippingFee}
Total: {total}

Delivery address:
{addressLine}
{shippingAreaName}

We will contact you if we need any extra delivery details.

With love,
Heaven Beauty',
  true
),
(
  'internal_order_alert',
  '[Heaven Beauty] New order {orderNumber} - {customerName}',
  'New order {orderNumber}

Customer:
{customerName}
{customerPhone}
{customerEmail}

Order summary:
{itemsText}

Subtotal: {subtotal}
Shipping: {shippingFee}
Total: {total}

Delivery method:
{shippingAreaName}

Delivery address:
{customerName}
{addressLine}
{shippingAreaName}
{customerPhone}
{customerEmail}

Notes:
{notes}',
  true
),
(
  'sms_order_alert',
  'New Heaven Beauty order {orderNumber}',
  'New order {orderNumber}
{customerName} - {customerPhone}
{itemsCompactText}
Delivery: {shippingAreaName}
Total: {total}',
  true
)
on conflict (key) do update
set
  subject = excluded.subject,
  body = excluded.body,
  is_active = excluded.is_active,
  updated_at = now();
