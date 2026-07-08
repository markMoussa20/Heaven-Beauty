alter table public.shipping_zones enable row level security;

drop policy if exists "Public can read active shipping zones" on public.shipping_zones;
create policy "Public can read active shipping zones"
on public.shipping_zones
for select
to anon, authenticated
using (is_active = true);
