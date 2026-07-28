create extension if not exists supabase_vault with schema vault;

create table if not exists public.wakilni_country_settings (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null unique references public.countries(id) on delete cascade,
  enabled boolean not null default false,
  base_url text,
  pickup_location_id bigint,
  pickup_longitude numeric,
  pickup_latitude numeric,
  pickup_floor integer not null default 0,
  pickup_area text,
  currency_id integer,
  cash_collection_type_id integer not null default 52,
  package_type_id integer not null default 58,
  default_receiver_gender integer not null default 1,
  express boolean not null default false,
  api_key_secret_id uuid,
  api_secret_secret_id uuid,
  webhook_secret_id uuid,
  last_test_status text,
  last_test_message text,
  last_tested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.wakilni_country_settings enable row level security;
drop trigger if exists set_wakilni_country_settings_updated_at on public.wakilni_country_settings;
create trigger set_wakilni_country_settings_updated_at
before update on public.wakilni_country_settings
for each row execute function public.set_updated_at();

create or replace function public.save_wakilni_country_settings(
  p_country_id uuid,
  p_enabled boolean,
  p_base_url text,
  p_pickup_location_id bigint,
  p_pickup_longitude numeric,
  p_pickup_latitude numeric,
  p_pickup_floor integer,
  p_pickup_area text,
  p_currency_id integer,
  p_cash_collection_type_id integer,
  p_package_type_id integer,
  p_default_receiver_gender integer,
  p_express boolean,
  p_api_key text default null,
  p_api_secret text default null,
  p_webhook_secret text default null
) returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, vault
as $$
declare
  v_row public.wakilni_country_settings%rowtype;
  v_country_code text;
begin
  select code into v_country_code from public.countries where id = p_country_id;
  if v_country_code is null then raise exception 'Country not found'; end if;

  insert into public.wakilni_country_settings(country_id)
  values (p_country_id)
  on conflict (country_id) do nothing;

  select * into v_row
  from public.wakilni_country_settings
  where country_id = p_country_id
  for update;

  if nullif(p_api_key, '') is not null then
    if v_row.api_key_secret_id is null then
      v_row.api_key_secret_id := vault.create_secret(
        p_api_key,
        'wakilni_' || lower(v_country_code) || '_api_key',
        'Wakilni API key for ' || v_country_code
      );
    else
      perform vault.update_secret(v_row.api_key_secret_id, p_api_key);
    end if;
  end if;

  if nullif(p_api_secret, '') is not null then
    if v_row.api_secret_secret_id is null then
      v_row.api_secret_secret_id := vault.create_secret(
        p_api_secret,
        'wakilni_' || lower(v_country_code) || '_api_secret',
        'Wakilni API secret for ' || v_country_code
      );
    else
      perform vault.update_secret(v_row.api_secret_secret_id, p_api_secret);
    end if;
  end if;

  if nullif(p_webhook_secret, '') is not null then
    if v_row.webhook_secret_id is null then
      v_row.webhook_secret_id := vault.create_secret(
        p_webhook_secret,
        'wakilni_' || lower(v_country_code) || '_webhook_secret',
        'Wakilni webhook secret for ' || v_country_code
      );
    else
      perform vault.update_secret(v_row.webhook_secret_id, p_webhook_secret);
    end if;
  end if;

  update public.wakilni_country_settings
  set enabled = p_enabled,
      base_url = nullif(trim(p_base_url), ''),
      pickup_location_id = p_pickup_location_id,
      pickup_longitude = p_pickup_longitude,
      pickup_latitude = p_pickup_latitude,
      pickup_floor = coalesce(p_pickup_floor, 0),
      pickup_area = nullif(trim(p_pickup_area), ''),
      currency_id = p_currency_id,
      cash_collection_type_id = coalesce(p_cash_collection_type_id, 52),
      package_type_id = coalesce(p_package_type_id, 58),
      default_receiver_gender = coalesce(p_default_receiver_gender, 1),
      express = p_express,
      api_key_secret_id = v_row.api_key_secret_id,
      api_secret_secret_id = v_row.api_secret_secret_id,
      webhook_secret_id = v_row.webhook_secret_id
  where id = v_row.id;

  return v_row.id;
end
$$;

create or replace function public.get_wakilni_country_config(p_country_code text)
returns jsonb
language sql
security definer
set search_path = pg_catalog, public, vault
stable
as $$
  select jsonb_build_object(
    'countryCode', c.code,
    'enabled', s.enabled,
    'baseUrl', s.base_url,
    'key', k.decrypted_secret,
    'secret', a.decrypted_secret,
    'webhookSecret', w.decrypted_secret,
    'pickupLocationId', s.pickup_location_id,
    'pickupLongitude', s.pickup_longitude,
    'pickupLatitude', s.pickup_latitude,
    'pickupFloor', s.pickup_floor,
    'pickupArea', s.pickup_area,
    'currencyId', s.currency_id,
    'cashCollectionTypeId', s.cash_collection_type_id,
    'packageTypeId', s.package_type_id,
    'defaultReceiverGender', s.default_receiver_gender,
    'express', s.express
  )
  from public.wakilni_country_settings s
  join public.countries c on c.id = s.country_id
  left join vault.decrypted_secrets k on k.id = s.api_key_secret_id
  left join vault.decrypted_secrets a on a.id = s.api_secret_secret_id
  left join vault.decrypted_secrets w on w.id = s.webhook_secret_id
  where upper(c.code) = upper(p_country_code)
    and s.enabled = true
$$;

create or replace function public.get_wakilni_webhook_configs()
returns jsonb
language sql
security definer
set search_path = pg_catalog, public, vault
stable
as $$
  select coalesce(
    jsonb_agg(jsonb_build_object(
      'countryCode', c.code,
      'webhookSecret', w.decrypted_secret
    )),
    '[]'::jsonb
  )
  from public.wakilni_country_settings s
  join public.countries c on c.id = s.country_id
  join vault.decrypted_secrets w on w.id = s.webhook_secret_id
  where s.enabled = true
$$;

revoke all on function public.save_wakilni_country_settings(uuid,boolean,text,bigint,numeric,numeric,integer,text,integer,integer,integer,integer,boolean,text,text,text) from public, anon, authenticated;
revoke all on function public.get_wakilni_country_config(text) from public, anon, authenticated;
revoke all on function public.get_wakilni_webhook_configs() from public, anon, authenticated;
grant execute on function public.save_wakilni_country_settings(uuid,boolean,text,bigint,numeric,numeric,integer,text,integer,integer,integer,integer,boolean,text,text,text) to service_role;
grant execute on function public.get_wakilni_country_config(text) to service_role;
grant execute on function public.get_wakilni_webhook_configs() to service_role;

