alter table public.orders
  add column if not exists public_tracking_token uuid default gen_random_uuid(),
  add column if not exists wakilni_tracking_notified_at timestamptz;

update public.orders
set public_tracking_token = gen_random_uuid()
where public_tracking_token is null;

alter table public.orders
  alter column public_tracking_token set default gen_random_uuid(),
  alter column public_tracking_token set not null;

create unique index if not exists orders_public_tracking_token_key
  on public.orders (public_tracking_token);

insert into public.footer_links (
  group_key,
  label,
  href,
  sort_order,
  is_active,
  is_external
)
values (
  'care',
  'Track Order',
  '/track-order',
  30,
  true,
  false
)
on conflict (group_key, label, href) do update
set
  sort_order = excluded.sort_order,
  is_active = true,
  is_external = false;

insert into public.order_notification_templates (
  key,
  subject,
  body,
  is_active
)
values (
  'customer_delivery_tracking',
  'Delivery tracking is ready for order {orderNumber}',
  E'Hi {customerName},\n\nDelivery tracking is now available for your Heaven Beauty order {orderNumber}.\n\nTrack the courier:\n{wakilniTrackingUrl}\n\nYou can also view your complete order details here:\n{orderTrackingUrl}\n\nWith love,\nHeaven Beauty',
  true
)
on conflict (key) do nothing;
