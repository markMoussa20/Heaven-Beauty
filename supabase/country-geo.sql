alter table public.countries
add column if not exists iso2 text;

create index if not exists countries_iso2_idx on public.countries (iso2);

update public.countries set iso2 = 'AE' where upper(code) = 'AE' or upper(name) in ('UAE', 'UNITED ARAB EMIRATES');
update public.countries set iso2 = 'EG' where upper(code) = 'EG' or upper(name) = 'EGYPT';
update public.countries set iso2 = 'JO' where upper(code) = 'JO' or upper(name) = 'JORDAN';
update public.countries set iso2 = 'LB' where upper(code) = 'LB' or upper(name) = 'LEBANON';
