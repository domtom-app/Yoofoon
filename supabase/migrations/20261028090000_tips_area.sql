alter table public.tips
  add column governorate_id smallint references public.governorates (id) on delete cascade,
  add column center_id uuid references public.centers (id) on delete cascade,
  add column district_id uuid references public.districts (id) on delete cascade;

create index tips_governorate_id_idx on public.tips (governorate_id);
create index tips_center_id_idx on public.tips (center_id);
create index tips_district_id_idx on public.tips (district_id);

create index tip_nominations_user_created_idx on public.tip_nominations (user_id, created_at desc);

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
  t.district_id
from public.tips t
left join public.tip_nominations n on n.tip_id = t.id
group by t.id;
