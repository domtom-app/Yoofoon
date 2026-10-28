create table public.tips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  title text not null check (char_length(title) between 1 and 120),
  body text not null default '' check (char_length(body) <= 2000),
  photo_path text,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create index tips_approved_created_idx on public.tips (approved, created_at desc);
create index tips_user_id_idx on public.tips (user_id);

create table public.tip_nominations (
  id uuid primary key default gen_random_uuid(),
  tip_id uuid not null references public.tips (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, tip_id)
);

create index tip_nominations_tip_id_idx on public.tip_nominations (tip_id);

alter table public.tips enable row level security;
alter table public.tip_nominations enable row level security;
revoke all on public.tips, public.tip_nominations from anon, authenticated;

create view public.tip_results
with (security_invoker = true) as
select
  t.id,
  t.title,
  t.body,
  t.photo_path,
  t.approved,
  t.created_at,
  count(n.id)::integer as votes
from public.tips t
left join public.tip_nominations n on n.tip_id = t.id
group by t.id;

revoke all on public.tip_results from anon, authenticated;
