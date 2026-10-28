-- Lifetime: offers last 15 days. Ads without an offer last 7 days, or 3 when the governorate holds more than 100 ads.
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
  t.link,
  t.offer,
  t.created_at + case
    when t.offer <> 'none' then interval '15 days'
    when count(*) filter (where t.approved) over (partition by t.governorate_id) > 100 then interval '3 days'
    else interval '7 days'
  end as expires_at
from public.tips t
left join public.tip_nominations n on n.tip_id = t.id
group by t.id;
