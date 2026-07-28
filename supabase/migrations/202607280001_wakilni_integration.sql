alter table public.orders
  add column if not exists wakilni_bulk_id bigint,
  add column if not exists wakilni_order_id bigint,
  add column if not exists wakilni_tracking_id text,
  add column if not exists wakilni_tracking_url text,
  add column if not exists wakilni_status text,
  add column if not exists wakilni_status_code integer,
  add column if not exists wakilni_sync_status text not null default 'not_submitted',
  add column if not exists wakilni_last_error text,
  add column if not exists wakilni_last_attempt_at timestamptz,
  add column if not exists wakilni_submitted_at timestamptz,
  add column if not exists wakilni_updated_at timestamptz;

create index if not exists orders_wakilni_order_idx
  on public.orders(wakilni_order_id)
  where wakilni_order_id is not null;
create index if not exists orders_wakilni_tracking_idx
  on public.orders(wakilni_tracking_id)
  where wakilni_tracking_id is not null;

create table if not exists public.wakilni_sync_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null,
  message text,
  response jsonb,
  created_at timestamptz not null default now()
);
create index if not exists wakilni_sync_logs_order_idx
  on public.wakilni_sync_logs(order_id, created_at desc);

create table if not exists public.wakilni_webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  order_id uuid references public.orders(id) on delete set null,
  topic text not null,
  country_code text,
  delivery_id text,
  attempt_number integer,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.wakilni_webhook_events
  add column if not exists country_code text;
create index if not exists wakilni_webhook_events_order_idx
  on public.wakilni_webhook_events(order_id, created_at desc);

alter table public.wakilni_sync_logs enable row level security;
alter table public.wakilni_webhook_events enable row level security;
