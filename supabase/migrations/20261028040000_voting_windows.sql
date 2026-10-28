alter table public.site_settings
  add column voting_starts_at timestamptz,
  add column parliament_starts_at timestamptz,
  add column parliament_ends_at timestamptz,
  add constraint voting_window_valid
    check (voting_starts_at is null or voting_ends_at is null or voting_starts_at < voting_ends_at),
  add constraint parliament_window_valid
    check (parliament_starts_at is null or parliament_ends_at is null or parliament_starts_at < parliament_ends_at);
