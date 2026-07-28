-- Heaven Beauty does not currently track inventory quantities. A NULL stock
-- quantity means unlimited/not tracked; zero remains available for a genuine
-- out-of-stock item if inventory tracking is enabled later.
alter table public.country_items
  alter column stock_quantity drop not null,
  alter column stock_quantity drop default;

update public.country_items
set stock_quantity = null;

comment on column public.country_items.stock_quantity is
  'Optional inventory quantity. NULL means inventory is not tracked; 0 means out of stock.';
