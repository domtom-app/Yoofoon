alter table public.site_settings
  add column voting_heading text check (char_length(voting_heading) <= 32),
  add column parliament_heading text check (char_length(parliament_heading) <= 32);
