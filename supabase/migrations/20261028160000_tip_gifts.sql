create table public.tip_gifts (
  id uuid primary key default gen_random_uuid(),
  tip_id uuid not null references public.tips (id) on delete cascade,
  winner_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (tip_id, winner_id)
);

create index tip_gifts_winner_id_idx on public.tip_gifts (winner_id);

alter table public.tip_gifts enable row level security;
revoke all on public.tip_gifts from anon, authenticated;
