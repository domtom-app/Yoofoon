create table public.governorates (
  id smallint primary key generated always as identity,
  name text not null unique
);

insert into public.governorates (name) values
  ('القاهرة'), ('الجيزة'), ('الإسكندرية'), ('القليوبية'), ('الشرقية'),
  ('الدقهلية'), ('الغربية'), ('المنوفية'), ('البحيرة'), ('كفر الشيخ'),
  ('دمياط'), ('بورسعيد'), ('الإسماعيلية'), ('السويس'), ('شمال سيناء'),
  ('جنوب سيناء'), ('الفيوم'), ('بني سويف'), ('المنيا'), ('أسيوط'),
  ('سوهاج'), ('قنا'), ('الأقصر'), ('أسوان'), ('البحر الأحمر'),
  ('الوادي الجديد'), ('مطروح');

create table public.centers (
  id uuid primary key default gen_random_uuid(),
  governorate_id smallint not null references public.governorates (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  unique (governorate_id, name)
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  photo_path text,
  governorate_id smallint not null references public.governorates (id),
  center_id uuid references public.centers (id) on delete set null,
  district text check (char_length(district) <= 80),
  created_at timestamptz not null default now()
);

create table public.member_votes (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  device_id uuid not null unique,
  created_at timestamptz not null default now()
);

create index member_votes_member_id_idx on public.member_votes (member_id);
create index members_governorate_id_idx on public.members (governorate_id);
create index members_center_id_idx on public.members (center_id);
create index centers_governorate_id_idx on public.centers (governorate_id);

create table public.site_settings (
  id smallint primary key default 1 check (id = 1),
  voting_ends_at timestamptz,
  announcement_title text check (char_length(announcement_title) <= 120),
  announcement_body text check (char_length(announcement_body) <= 2000),
  announcement_photo_path text
);

insert into public.site_settings (id) values (1);

alter table public.governorates enable row level security;
alter table public.centers enable row level security;
alter table public.members enable row level security;
alter table public.member_votes enable row level security;
alter table public.site_settings enable row level security;

revoke all on public.governorates from anon, authenticated;
revoke all on public.centers from anon, authenticated;
revoke all on public.members from anon, authenticated;
revoke all on public.member_votes from anon, authenticated;
revoke all on public.site_settings from anon, authenticated;

create view public.member_results
with (security_invoker = true) as
select
  m.id,
  m.name,
  m.photo_path,
  m.district,
  g.name as governorate,
  c.name as center,
  count(v.id)::integer as votes
from public.members m
join public.governorates g on g.id = m.governorate_id
left join public.centers c on c.id = m.center_id
left join public.member_votes v on v.member_id = m.id
group by m.id, g.name, c.name;

revoke all on public.member_results from anon, authenticated;
