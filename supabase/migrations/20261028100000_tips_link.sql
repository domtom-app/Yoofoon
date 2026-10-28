alter table public.tips
  add column link text check (link is null or (char_length(link) <= 300 and link ~* '^https?://'));

create or replace view public.tip_results
with (security_invoker = true) as
select
  t.id,
  t.title,
  t.body,
  t.photo_path,
  t.approved,
  t.created_at,
  count(n.id)::integer as votes,
  t.governorate_id,
  t.center_id,
  t.district_id,
  t.link
from public.tips t
left join public.tip_nominations n on n.tip_id = t.id
group by t.id;
