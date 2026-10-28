create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  photo_path text,
  position integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.votes (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  device_id uuid not null unique,
  created_at timestamptz not null default now()
);

create index votes_candidate_id_idx on public.votes (candidate_id);

alter table public.candidates enable row level security;
alter table public.votes enable row level security;

-- Voting data is reached only from the server with the service role key.
revoke all on public.candidates from anon, authenticated;
revoke all on public.votes from anon, authenticated;

create view public.candidate_results
with (security_invoker = true) as
select
  c.id,
  c.name,
  c.photo_path,
  c.position,
  count(v.id)::integer as votes
from public.candidates c
left join public.votes v on v.candidate_id = c.id
where c.active
group by c.id;

revoke all on public.candidate_results from anon, authenticated;

insert into storage.buckets (id, name, public)
values ('candidates', 'candidates', true)
on conflict (id) do nothing;
