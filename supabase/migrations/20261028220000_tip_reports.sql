create table public.tip_reports (
  id uuid primary key default gen_random_uuid(),
  tip_id uuid not null references public.tips (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  reason text not null check (reason in ('misleading', 'inappropriate', 'spam', 'other')),
  created_at timestamptz not null default now(),
  unique (tip_id, user_id)
);

alter table public.tip_reports enable row level security;
revoke all on public.tip_reports from anon, authenticated;
