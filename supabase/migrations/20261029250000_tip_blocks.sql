create table public.tip_blocks (
  owner_id uuid not null references auth.users (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, user_id)
);

alter table public.tip_blocks enable row level security;
revoke all on public.tip_blocks from anon, authenticated;
