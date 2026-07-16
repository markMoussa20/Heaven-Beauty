alter table public.country_items
  add column if not exists show_in_home_shop_popup boolean not null default false;

comment on column public.country_items.show_in_home_shop_popup is
  'When true, this country-specific item is shown in the Choose your tint popup opened by the Shop button in the homepage Introducing PURE section, provided it is visible and featured.';

update public.country_items as ci
set show_in_home_shop_popup = true
from public.products as p
where p.id = ci.product_id
  and lower(coalesce(p.slug, '')) = 'heavenly-tint-kind';
