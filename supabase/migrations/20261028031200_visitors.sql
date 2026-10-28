create table public.visitors (
  device_id uuid primary key,
  created_at timestamptz not null default now()
);

alter table public.visitors enable row level security;
revoke all on public.visitors from anon, authenticated;
