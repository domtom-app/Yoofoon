create table public.districts (
  id uuid primary key default gen_random_uuid(),
  governorate_id smallint not null references public.governorates (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  unique (governorate_id, name)
);

create index districts_governorate_id_idx on public.districts (governorate_id);

alter table public.districts enable row level security;
revoke all on public.districts from anon, authenticated;

alter table public.members
  add column district_id uuid references public.districts (id) on delete restrict;

create index members_district_id_idx on public.members (district_id);

insert into public.districts (governorate_id, name)
select distinct governorate_id, btrim(district)
from public.members
where btrim(coalesce(district, '')) <> '';

update public.members m
set district_id = d.id
from public.districts d
where d.governorate_id = m.governorate_id
  and d.name = btrim(m.district);

drop view public.member_results;

alter table public.members drop column district;
alter table public.members drop column center_id;
drop table public.centers;

create view public.member_results
with (security_invoker = true) as
select
  m.id,
  m.name,
  m.photo_path,
  m.district_id,
  d.name as district,
  g.name as governorate,
  count(v.id)::integer as votes
from public.members m
join public.governorates g on g.id = m.governorate_id
left join public.districts d on d.id = m.district_id
left join public.member_votes v on v.member_id = m.id
group by m.id, g.name, d.name;

revoke all on public.member_results from anon, authenticated;
