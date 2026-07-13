-- Non-destructive baseline for the Heaven Beauty storefront.
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

create table if not exists public.countries (
  id uuid primary key default gen_random_uuid(), code text not null, iso2 text,
  name text not null, currency_code text not null, currency_symbol text not null,
  phone text, whatsapp text, domain text, is_active boolean not null default true,
  use_shipping_zones boolean not null default false,
  global_delivery_fee numeric(12,2) not null default 0,
  delivery_label text, price_conversion_enabled boolean not null default false,
  price_conversion_base_currency text, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.countries add column if not exists iso2 text;
alter table public.countries add column if not exists domain text;
alter table public.countries add column if not exists whatsapp text;
alter table public.countries add column if not exists updated_at timestamptz not null default now();
create unique index if not exists countries_code_unique on public.countries (upper(code));
create index if not exists countries_active_domain_idx on public.countries (is_active, domain);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(), name text not null, slug text not null,
  parent_id uuid references public.categories(id) on delete set null, image_url text,
  image_path text, sort_order integer not null default 0, is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.categories add column if not exists updated_at timestamptz not null default now();
create unique index if not exists categories_slug_unique on public.categories (lower(slug));

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(), name text not null, slug text not null,
  short_description text, description text, brand text, base_sku text,
  main_image_url text, main_image_path text, gallery_image_paths text[],
  is_active boolean not null default true, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.products add column if not exists updated_at timestamptz not null default now();
create unique index if not exists products_slug_unique on public.products (lower(slug));

create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  created_at timestamptz not null default now(), unique(product_id, category_id)
);
create index if not exists product_categories_category_idx on public.product_categories(category_id);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null, alt_text text, sort_order integer not null default 0,
  is_primary boolean not null default false, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.product_images add column if not exists updated_at timestamptz not null default now();
create index if not exists product_images_product_sort_idx on public.product_images(product_id, sort_order);

create table if not exists public.country_items (
  id uuid primary key default gen_random_uuid(), country_id uuid not null references public.countries(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade, country_sku text,
  price numeric(12,2) not null, sale_price numeric(12,2), stock_quantity integer,
  is_visible boolean not null default true, is_featured boolean not null default false,
  sort_order integer not null default 0, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), unique(country_id, product_id),
  check (price >= 0), check (sale_price is null or sale_price >= 0),
  check (stock_quantity is null or stock_quantity >= 0)
);
alter table public.country_items add column if not exists stock_quantity integer;
alter table public.country_items add column if not exists updated_at timestamptz not null default now();
create index if not exists country_items_storefront_idx on public.country_items(country_id, is_visible, sort_order);

create table if not exists public.shipping_zones (
  id uuid primary key default gen_random_uuid(), country_id uuid not null references public.countries(id) on delete cascade,
  name text not null, code text, fee numeric(12,2) not null default 0,
  is_active boolean not null default true, sort_order integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (fee >= 0)
);
alter table public.shipping_zones add column if not exists updated_at timestamptz not null default now();
create index if not exists shipping_zones_country_idx on public.shipping_zones(country_id, is_active, sort_order);

create table if not exists public.exchange_rates (
  id uuid primary key default gen_random_uuid(), base_currency_code text not null,
  target_currency_code text not null, rate numeric(18,8) not null check(rate > 0),
  source text, rate_date date, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), unique(base_currency_code, target_currency_code)
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(), country_id uuid not null references public.countries(id),
  full_name text not null, phone text not null, email text, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), unique(country_id, phone)
);
alter table public.customers add column if not exists updated_at timestamptz not null default now();
create unique index if not exists customers_country_phone_unique on public.customers(country_id, phone);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(), order_number text not null,
  idempotency_key uuid, country_id uuid not null references public.countries(id),
  customer_id uuid references public.customers(id), customer_name text not null,
  customer_phone text not null, customer_email text, currency_code text not null,
  shipping_zone_id uuid references public.shipping_zones(id), shipping_area_name text,
  address_line text not null, apartment text, city text, postal_code text,
  notes text, subtotal numeric(12,2) not null,
  shipping_fee numeric(12,2) not null, total numeric(12,2) not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (subtotal >= 0 and shipping_fee >= 0 and total >= 0),
  check (status in ('pending','confirmed','processing','shipped','delivered','cancelled'))
);
alter table public.orders add column if not exists idempotency_key uuid;
alter table public.orders add column if not exists apartment text;
alter table public.orders add column if not exists city text;
alter table public.orders add column if not exists postal_code text;
alter table public.orders add column if not exists updated_at timestamptz not null default now();
create unique index if not exists orders_order_number_unique on public.orders(order_number);
create unique index if not exists orders_idempotency_unique on public.orders(idempotency_key) where idempotency_key is not null;
create index if not exists orders_country_created_idx on public.orders(country_id, created_at desc);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
  country_item_id uuid not null references public.country_items(id), product_id uuid references public.products(id),
  product_name text not null, quantity integer not null check(quantity between 1 and 10),
  unit_price numeric(12,2) not null check(unit_price >= 0), total numeric(12,2) not null check(total >= 0),
  created_at timestamptz not null default now()
);
create index if not exists order_items_order_idx on public.order_items(order_id);

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(), user_id uuid unique references auth.users(id) on delete cascade,
  email text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists admin_users_email_unique on public.admin_users(lower(email)) where email is not null;

create table if not exists public.site_content (
  id uuid primary key default gen_random_uuid(), key text not null unique, title text, subtitle text, body text,
  cta_label text, cta_href text, image_url text, image_alt text, secondary_image_url text,
  secondary_image_alt text, marquee_text text, sort_order integer not null default 0,
  is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.footer_links (
  id uuid primary key default gen_random_uuid(), group_key text not null, label text not null, href text not null,
  sort_order integer not null default 0, is_active boolean not null default true,
  is_external boolean not null default false, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), unique(group_key, label, href)
);

create table if not exists public.public_pages (
  id uuid primary key default gen_random_uuid(), slug text not null unique, title text not null, subtitle text,
  body text, cta_label text, cta_href text, image_url text, image_alt text,
  secondary_image_url text, secondary_image_alt text, sort_order integer not null default 0,
  is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.public_page_faq_items (
  id uuid primary key default gen_random_uuid(), page_slug text not null, group_title text,
  question text not null, answer text not null, sort_order integer not null default 0,
  is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists public_page_faq_items_page_idx on public.public_page_faq_items(page_slug, sort_order);

create table if not exists public.order_notification_settings (
  id uuid primary key default gen_random_uuid(), key text not null unique default 'default', is_active boolean not null default true,
  customer_email_enabled boolean not null default false, internal_email_enabled boolean not null default false,
  sms_enabled boolean not null default false, sender_name text, sender_email text, reply_to_email text,
  gmail_user text, gmail_app_password text, smtp_host text, smtp_port integer, smtp_secure boolean not null default true,
  callmebot_api_key text, callmebot_phone text, callmebot_endpoint_template text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.order_notification_recipients (
  id uuid primary key default gen_random_uuid(), name text, email text not null,
  is_active boolean not null default true, receive_order_email boolean not null default true,
  sort_order integer not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.order_notification_templates (
  id uuid primary key default gen_random_uuid(), key text not null unique, subject text, body text,
  is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.order_notification_logs (
  id uuid primary key default gen_random_uuid(), order_id uuid references public.orders(id) on delete set null,
  channel text not null, recipient text, status text not null, message text,
  created_at timestamptz not null default now()
);

create table if not exists public.checkout_rate_limits (
  fingerprint text primary key, window_started_at timestamptz not null default now(), attempts integer not null default 0
);

do $$ declare t text; begin
  foreach t in array array['countries','categories','products','product_images','country_items','shipping_zones','exchange_rates','customers','orders','admin_users','site_content','footer_links','public_pages','public_page_faq_items','order_notification_settings','order_notification_recipients','order_notification_templates']
  loop execute format('drop trigger if exists set_%I_updated_at on public.%I', t, t);
       execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

insert into public.countries(code, iso2, name, currency_code, currency_symbol)
values ('AE','AE','UAE','AED','AED'),('LB','LB','Lebanon','USD','$'),('EG','EG','Egypt','EGP','E£'),('JO','JO','Jordan','JOD','JOD')
on conflict do nothing;

do $$ declare t text; begin
  foreach t in array array['countries','categories','products','product_categories','product_images','country_items','shipping_zones','exchange_rates','customers','orders','order_items','admin_users','site_content','footer_links','public_pages','public_page_faq_items','order_notification_settings','order_notification_recipients','order_notification_templates','order_notification_logs','checkout_rate_limits']
  loop execute format('alter table public.%I enable row level security', t); end loop;
end $$;

do $$ declare t text; begin
  foreach t in array array['countries','categories','products','product_categories','product_images','country_items','shipping_zones','site_content','footer_links','public_pages','public_page_faq_items']
  loop execute format('drop policy if exists public_read on public.%I', t);
       execute format('create policy public_read on public.%I for select to anon, authenticated using (true)', t);
  end loop;
end $$;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('product-images','product-images',true,5242880,array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists product_images_public_read on storage.objects;
create policy product_images_public_read on storage.objects for select to public using (bucket_id = 'product-images');

comment on schema public is 'Legacy root SQL files are superseded by ordered files in supabase/migrations.';
