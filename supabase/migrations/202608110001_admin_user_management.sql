-- Admin accounts are backed by Supabase Auth. This table stores dashboard
-- authorization and the small amount of profile data the dashboard needs.
alter table public.admin_users
  add column if not exists full_name text,
  add column if not exists is_active boolean not null default true;

create index if not exists admin_users_active_idx
  on public.admin_users(is_active);

