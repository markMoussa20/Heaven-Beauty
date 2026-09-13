-- Promotional announcement bar banners, scheduled in each country's local time.

alter table public.countries add column if not exists timezone text;

update public.countries
set timezone = case upper(code)
  when 'AE' then 'Asia/Dubai'
  when 'LB' then 'Asia/Beirut'
  when 'EG' then 'Africa/Cairo'
  when 'JO' then 'Asia/Amman'
  else 'UTC'
end
where timezone is null;

alter table public.countries alter column timezone set default 'UTC';
alter table public.countries alter column timezone set not null;

comment on column public.countries.timezone is
  'IANA timezone (e.g. Asia/Dubai) used to evaluate country-local schedules such as promo banners.';

create table if not exists public.promo_banners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  message text not null,
  cta_label text,
  cta_href text,
  image_url text,
  image_path text,
  background_color text not null default '#6c93c4',
  text_color text not null default '#ffffff',
  button_background_color text not null default '#ffffff',
  button_text_color text not null default '#6c93c4',
  starts_at timestamp without time zone,
  ends_at timestamp without time zone,
  all_countries boolean not null default true,
  is_enabled boolean not null default true,
  priority integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint promo_banners_schedule_order check (starts_at is null or ends_at is null or ends_at > starts_at),
  constraint promo_banners_message_length check (char_length(message) between 1 and 200),
  constraint promo_banners_colors check (
    background_color ~* '^#[0-9a-f]{6}$'
    and text_color ~* '^#[0-9a-f]{6}$'
    and button_background_color ~* '^#[0-9a-f]{6}$'
    and button_text_color ~* '^#[0-9a-f]{6}$'
  )
);

comment on column public.promo_banners.starts_at is
  'Wall-clock start, interpreted in each target country''s countries.timezone. Null = no start limit.';
comment on column public.promo_banners.ends_at is
  'Wall-clock end (exclusive), interpreted in each target country''s countries.timezone. Null = no end.';

create table if not exists public.promo_banner_countries (
  banner_id uuid not null references public.promo_banners(id) on delete cascade,
  country_id uuid not null references public.countries(id) on delete cascade,
  primary key (banner_id, country_id)
);

create index if not exists promo_banners_enabled_ends_idx on public.promo_banners (is_enabled, ends_at);
create index if not exists promo_banner_countries_country_idx on public.promo_banner_countries (country_id);

drop trigger if exists set_promo_banners_updated_at on public.promo_banners;
create trigger set_promo_banners_updated_at
before update on public.promo_banners
for each row execute function public.set_updated_at();

-- Scheduled promos must not leak before launch: no public read policy.
-- The storefront reads banners server-side with the service role.
alter table public.promo_banners enable row level security;
alter table public.promo_banner_countries enable row level security;
revoke all on table public.promo_banners from anon, authenticated;
revoke all on table public.promo_banner_countries from anon, authenticated;
