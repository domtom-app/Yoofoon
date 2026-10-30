alter table public.profiles
  add column name_with_phone boolean not null default false,
  add column social_public boolean not null default false,
  add column social_links jsonb not null default '{}'::jsonb;
