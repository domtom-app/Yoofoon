create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  district_id uuid references public.districts (id) on delete set null,
  district_changed_at timestamptz,
  avatar_path text
);

alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
