create table public.contender_reports (
  id uuid primary key default gen_random_uuid(),
  contender_id uuid not null references public.contenders (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  reason text not null check (reason in ('misleading', 'inappropriate', 'spam', 'other')),
  created_at timestamptz not null default now(),
  unique (contender_id, user_id)
);

alter table public.contender_reports enable row level security;
revoke all on public.contender_reports from anon, authenticated;
