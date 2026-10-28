drop view if exists public.member_results;

alter table public.members drop column if exists center_id;
drop table if exists public.centers cascade;

create table public.centers (
  id uuid primary key default gen_random_uuid(),
  governorate_id smallint not null references public.governorates (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  unique (governorate_id, name)
);

create index centers_governorate_id_idx on public.centers (governorate_id);

alter table public.centers enable row level security;
revoke all on public.centers from anon, authenticated;

alter table public.districts
  add column center_id uuid references public.centers (id) on delete cascade;

-- Existing districts get a center with the same name; rename it from the admin panel.
insert into public.centers (governorate_id, name)
select distinct governorate_id, name from public.districts;

update public.districts d
set center_id = c.id
from public.centers c
where c.governorate_id = d.governorate_id and c.name = d.name;

alter table public.districts alter column center_id set not null;

alter table public.districts drop constraint if exists districts_governorate_id_name_key;
alter table public.districts add constraint districts_center_id_name_key unique (center_id, name);

create index districts_center_id_idx on public.districts (center_id);

create view public.member_results
with (security_invoker = true) as
select
  m.id,
  m.name,
  m.photo_path,
  m.district_id,
  d.name as district,
  c.name as center,
  g.name as governorate,
  count(v.id)::integer as votes
from public.members m
join public.governorates g on g.id = m.governorate_id
left join public.districts d on d.id = m.district_id
left join public.centers c on c.id = d.center_id
left join public.member_votes v on v.member_id = m.id
group by m.id, g.name, c.name, d.name;

revoke all on public.member_results from anon, authenticated;
