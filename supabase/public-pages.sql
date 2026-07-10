create table if not exists public.public_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  body text,
  cta_label text,
  cta_href text,
  image_url text,
  image_alt text,
  secondary_image_url text,
  secondary_image_alt text,
  sort_order integer default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.public_pages
add column if not exists secondary_image_url text;

alter table public.public_pages
add column if not exists secondary_image_alt text;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists public_pages_set_updated_at on public.public_pages;
create trigger public_pages_set_updated_at
before update on public.public_pages
for each row
execute function public.set_updated_at();

alter table public.public_pages enable row level security;

drop policy if exists "Public can read active public pages" on public.public_pages;
create policy "Public can read active public pages"
on public.public_pages
for select
using (is_active = true);

insert into public.public_pages (
  slug,
  title,
  subtitle,
  body,
  cta_label,
  cta_href,
  image_url,
  image_alt,
  secondary_image_url,
  secondary_image_alt,
  sort_order,
  is_active
)
values
  (
    'our-story',
    'Welcome To Heaven Beauty',
    'The story',
    'Founded by Lebanese beauty influencer Sarah Hammoud, the brand was born from years of testing, reviewing, and understanding what truly works - and what does not. With a deep connection to her audience, Sarah set out to create products that deliver flawless results while meeting the expectations of a modern, mindful generation.

The Heavenly Difference

Each product is designed as a one-step essential - simple, effective, and refined. From weightless textures to long-lasting, luminous shades, everything we create is made to elevate your everyday routine with ease.

The Beginning

We started with tints for lips and cheeks. Since then, we have crafted each formula to enhance your natural radiance effortlessly.',
    'Shop now',
    '/shop',
    null,
    'Heaven Beauty founder',
    null,
    'Heaven Beauty tint products',
    10,
    true
  ),
  (
    'contact',
    'Contact',
    'We are here to help',
    'For product questions, order updates, and support, contact service@myheavenbeauty.com or call +961 78 835 078.',
    'Email us',
    'mailto:service@myheavenbeauty.com',
    null,
    null,
    null,
    null,
    20,
    true
  ),
  (
    'return-cancellations',
    'Return & Cancellations',
    'Store policy',
    'Returns & Exchanges

For hygiene and safety reasons, we do not accept returns or exchanges on any products once purchased.

Order Cancellations

Orders may only be canceled within a short time after being placed. Once an order has been processed or shipped, it can no longer be canceled.

Damaged or Incorrect Orders

If you receive a damaged or incorrect item, please contact us within 48 hours of delivery. Our team will review your request and assist you accordingly.',
    null,
    null,
    null,
    null,
    null,
    null,
    30,
    true
  ),
  (
    'faq',
    'Faq',
    'Questions',
    'If you have other questions we weren''t able to address here, feel free to email.

info@myheavenbeauty.com',
    null,
    null,
    null,
    null,
    null,
    null,
    40,
    true
  ),
  (
    'privacy-policy',
    'Privacy Policy',
    'Privacy',
    'Who We Are

Heaven Beauty is an online beauty brand offering lip and cheek tints. Our website address is: https://aqua-clam-453674.hostingersite.com

Comments

When visitors leave comments on the site, we collect the data shown in the comments form, along with the visitor''s IP address and browser user agent to help detect spam.

An anonymized string (hash) created from your email address may be provided to the Gravatar service to check if you are using it. After approval, your profile picture may be visible publicly alongside your comment.

Media

If you upload images to the website, you should avoid uploading images with embedded location data (EXIF GPS). Visitors may be able to download and extract location data from images on the site.

Cookies

If you leave a comment, you may opt in to saving your name, email, and website in cookies for convenience. These cookies will last for one year.

If you visit our login page, a temporary cookie will be set to determine if your browser accepts cookies. This cookie contains no personal data and is deleted when you close your browser.

When you log in, we set cookies to save your login information and display preferences. Login cookies last for two days, and screen option cookies last for one year. Selecting Remember Me will keep you logged in for two weeks. Logging out removes these cookies.

If you edit or publish content, a cookie will be stored indicating the post ID. It contains no personal data and expires after one day.

Embedded Content from Other Websites

Articles on this site may include embedded content such as videos or images. Embedded content behaves the same as if you visited the external website directly.

These third-party websites may collect data, use cookies, and monitor your interaction with their content.

Who We Share Your Data With

We do not sell or trade your personal data. If you request a password reset, your IP address may be included in the reset email for security purposes.

How Long We Retain Your Data

If you leave a comment, the comment and its metadata are stored indefinitely to allow automatic approval of follow-ups.

For registered users (if applicable), we store the personal information provided in their profile. Users can view, edit, or delete their personal information at any time (except usernames).

What Rights You Have Over Your Data

If you have an account or have left comments, you may request a copy of the personal data we hold about you. You may also request that we delete your personal data, except for data we are required to retain for legal or security reasons.

Where Your Data Is Sent

Visitor comments may be checked through automated spam detection services to ensure site security and integrity.',
    null,
    null,
    null,
    null,
    null,
    null,
    50,
    true
  ),
  (
    'terms-conditions',
    'Terms & Conditions',
    'Store terms',
    'These terms describe the conditions for using Heaven Beauty, placing orders, and accessing customer support.',
    null,
    null,
    null,
    null,
    null,
    null,
    60,
    true
  ),
  (
    'shop',
    'Shop',
    'Heaven Beauty essentials',
    'Explore Heaven Beauty tints and glow essentials available for your selected country.',
    null,
    null,
    null,
    null,
    null,
    null,
    70,
    true
  )
on conflict (slug) do update set
  title = excluded.title,
  subtitle = excluded.subtitle,
  body = excluded.body,
  cta_label = excluded.cta_label,
  cta_href = excluded.cta_href,
  image_url = excluded.image_url,
  image_alt = excluded.image_alt,
  secondary_image_url = excluded.secondary_image_url,
  secondary_image_alt = excluded.secondary_image_alt,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;
