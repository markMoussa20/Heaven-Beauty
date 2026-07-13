create extension if not exists pgcrypto;

create table if not exists public.site_content (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  title text,
  subtitle text,
  body text,
  cta_label text,
  cta_href text,
  image_url text,
  image_alt text,
  secondary_image_url text,
  secondary_image_alt text,
  marquee_text text,
  sort_order integer default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.footer_links (
  id uuid primary key default gen_random_uuid(),
  group_key text not null,
  label text not null,
  href text not null,
  sort_order integer default 0,
  is_active boolean default true,
  is_external boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (group_key, label, href)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists site_content_set_updated_at on public.site_content;
create trigger site_content_set_updated_at
before update on public.site_content
for each row execute function public.set_updated_at();

drop trigger if exists footer_links_set_updated_at on public.footer_links;
create trigger footer_links_set_updated_at
before update on public.footer_links
for each row execute function public.set_updated_at();

alter table public.site_content enable row level security;
alter table public.footer_links enable row level security;

drop policy if exists "Public can read active site content" on public.site_content;
create policy "Public can read active site content"
on public.site_content
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Public can read active footer links" on public.footer_links;
create policy "Public can read active footer links"
on public.footer_links
for select
to anon, authenticated
using (is_active = true);

insert into public.site_content (
  key,
  title,
  subtitle,
  body,
  cta_label,
  cta_href,
  image_url,
  image_alt,
  secondary_image_url,
  secondary_image_alt,
  marquee_text,
  sort_order,
  is_active
)
values
  (
    'home_hero',
    'Effortless Glow',
    null,
    null,
    'Shop All',
    '#featured-products',
    null,
    'Heaven Beauty hero image',
    null,
    'Heaven Beauty hero image',
    null,
    5,
    true
  ),
  (
    'home_tint_radiance',
    'Where Tint Meets Radiance',
    null,
    'A touch of color designed to enhance your natural glow - soft, radiant, and effortlessly you.',
    'Our Story',
    '#our-story',
    null,
    null,
    null,
    null,
    null,
    10,
    true
  ),
  (
    'home_image_showcase',
    'Your glow speaks for itself we simply enhance it',
    null,
    null,
    null,
    null,
    null,
    'Heaven Beauty product glow image',
    null,
    'Heaven Beauty skin tint image',
    null,
    20,
    true
  ),
  (
    'home_pure_intro',
    'The first of its kind',
    'Introducing PURE',
    'A soft, light pink created to enhance your natural beauty, blending seamlessly into your skin for a fresh, radiant glow that feels effortless and true to you.',
    'Shop',
    '#featured-products',
    null,
    null,
    null,
    null,
    null,
    30,
    true
  ),
  (
    'home_story',
    'Our Story',
    null,
    'Heaven Beauty was created to redefine beauty as something effortless, intentional, and true to you. We design products that enhance your natural features, not mask them - starting with our signature tints and evolving into a full range of skin-friendly essentials that feel as good as they look.',
    'Discover more',
    '/our-story',
    '/images/original-home-story.jpeg',
    'Heaven Beauty model smiling against a pink background',
    null,
    null,
    null,
    40,
    true
  ),
  (
    'home_difference',
    'Our Difference',
    null,
    'Designed with good intention, made to feel like nothing on your skin. Our long-lasting, blendable tints adapt to every tone, leaving a soft, radiant glow - gentle even for sensitive skin.',
    null,
    null,
    '/images/original-home-difference.jpg',
    'Heaven Beauty model holding a tint',
    null,
    null,
    null,
    50,
    true
  ),
  (
    'home_marquee',
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    '~ For a natural glow ~ Its organic ~ For a natural glow ~ Its organic ~ For a natural glow ~ Its organic ~',
    60,
    true
  ),
  (
    'footer_settings',
    'Heaven Beauty',
    'Beauty Store',
    'Effortless beauty essentials made to enhance your natural glow.',
    'service@myheavenbeauty.com',
    'WhatsApp: +961 78 835 078',
    null,
    null,
    null,
    null,
    'Copyright 2026 Heaven Beauty. All rights reserved.',
    100,
    true
  )
on conflict (key) do update
set
  title = excluded.title,
  subtitle = excluded.subtitle,
  body = excluded.body,
  cta_label = excluded.cta_label,
  cta_href = excluded.cta_href,
  image_url = excluded.image_url,
  image_alt = excluded.image_alt,
  secondary_image_url = excluded.secondary_image_url,
  secondary_image_alt = excluded.secondary_image_alt,
  marquee_text = excluded.marquee_text,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

insert into public.footer_links (
  group_key,
  label,
  href,
  sort_order,
  is_active,
  is_external
)
values
  ('about', 'Our Story', '/our-story', 10, true, false),
  ('about', 'Contact', '/contact', 20, true, false),
  ('shop', 'Home', '/', 10, true, false),
  ('shop', 'Shop', '/shop', 20, true, false),
  ('shop', 'Heavenly Tints', '#featured-products', 30, true, false),
  ('care', 'Return', '/return-cancellations', 10, true, false),
  ('care', 'FAQ', '/faq', 20, true, false),
  ('care', 'Terms & Conditions', '/terms-conditions', 30, true, false),
  ('care', 'Privacy Policy', '/privacy-policy', 40, true, false),
  ('social', 'Facebook', 'https://www.facebook.com/profile.php?id=61580848234817', 10, true, true),
  ('social', 'Instagram', 'https://www.instagram.com/heavenbeauty.lb', 20, true, true)
on conflict (group_key, label, href) do update
set
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  is_external = excluded.is_external;
