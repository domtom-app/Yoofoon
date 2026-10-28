alter table public.site_settings
  add column voting_published boolean not null default true,
  add column parliament_published boolean not null default true;
