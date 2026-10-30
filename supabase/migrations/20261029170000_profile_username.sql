alter table public.profiles
  add column username text check (username is null or char_length(username) between 2 and 40);
