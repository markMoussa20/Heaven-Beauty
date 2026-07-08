update public.footer_links
set href = 'https://www.facebook.com/profile.php?id=61580848234817',
    is_external = true
where group_key = 'social'
  and lower(label) = 'facebook';

update public.footer_links
set href = 'https://www.instagram.com/heavenbeauty.lb',
    is_external = true
where group_key = 'social'
  and lower(label) = 'instagram';

with ranked_footer_links as (
  select
    id,
    row_number() over (
      partition by group_key, lower(label)
      order by sort_order desc nulls last, updated_at desc nulls last, created_at desc nulls last, id desc
    ) as duplicate_rank
  from public.footer_links
)
update public.footer_links link
set is_active = false
from ranked_footer_links ranked
where link.id = ranked.id
  and ranked.duplicate_rank > 1;
