-- Lets admins choose whether visitors can close a promo banner.
alter table public.promo_banners
  add column if not exists is_dismissible boolean not null default true;

comment on column public.promo_banners.is_dismissible is
  'When false, the storefront hides the close button and ignores earlier dismissals.';
