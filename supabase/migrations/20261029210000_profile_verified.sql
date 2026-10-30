alter table public.profiles add column terms_accepted_at timestamptz;
alter table public.profiles add column verified boolean not null default false;
