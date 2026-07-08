create table if not exists public.public_page_faq_items (
  id uuid primary key default gen_random_uuid(),
  page_slug text not null references public.public_pages(slug) on delete cascade,
  group_title text,
  question text not null,
  answer text not null,
  sort_order integer default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (page_slug, question)
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

drop trigger if exists public_page_faq_items_set_updated_at on public.public_page_faq_items;
create trigger public_page_faq_items_set_updated_at
before update on public.public_page_faq_items
for each row
execute function public.set_updated_at();

alter table public.public_page_faq_items enable row level security;

drop policy if exists "Public can read active FAQ items" on public.public_page_faq_items;
create policy "Public can read active FAQ items"
on public.public_page_faq_items
for select
using (is_active = true);

insert into public.public_page_faq_items (
  page_slug,
  group_title,
  question,
  answer,
  sort_order,
  is_active
)
values
  (
    'faq',
    'Orders',
    'What if the item I want is out of stock?',
    'During our sale, products sell out fast! But don''t despair. If the item you''re looking for is out of stock, keep checking back. We''re always updating and restocking our site with your faves!',
    10,
    true
  ),
  (
    'faq',
    'Orders',
    'How do I track my order?',
    'When your order is shipped from our warehouse, we will send you an email to confirm your shipment.',
    20,
    true
  ),
  (
    'faq',
    'Orders',
    'How do I change or cancel my order?',
    'We do not normally accept order cancellations or changes once an order has been processed.',
    30,
    true
  ),
  (
    'faq',
    'Products',
    'Are your products vegan and cruelty-free?',
    'Yes, all Heaven Beauty products are 100% vegan and cruelty-free. We never test on animals and are committed to conscious beauty.',
    40,
    true
  ),
  (
    'faq',
    'Products',
    'Can I use the tints on both lips and cheeks?',
    'Absolutely. Our tints are designed as multi-use essentials, perfect for both lips and cheeks for an effortless, natural glow.',
    50,
    true
  ),
  (
    'faq',
    'Products',
    'Are your tints long-lasting?',
    'Yes, our formulas are lightweight yet long-wearing, designed to stay fresh and radiant throughout the day.',
    60,
    true
  ),
  (
    'faq',
    'Products',
    'Are your products suitable for all skin types?',
    'Our tints are created to suit all skin types, offering buildable color that blends seamlessly into your natural complexion.',
    70,
    true
  )
on conflict (page_slug, question) do update set
  group_title = excluded.group_title,
  answer = excluded.answer,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;
