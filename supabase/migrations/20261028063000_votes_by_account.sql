-- A signed-in voter has one vote per account; an anonymous voter has one per device.
alter table public.votes
  add column user_id uuid references auth.users (id) on delete cascade;
alter table public.votes drop constraint votes_device_id_key;
create unique index votes_device_anon_key on public.votes (device_id) where user_id is null;
create unique index votes_user_key on public.votes (user_id) where user_id is not null;

alter table public.member_votes
  add column user_id uuid references auth.users (id) on delete cascade;
alter table public.member_votes drop constraint member_votes_device_id_key;
create unique index member_votes_device_anon_key on public.member_votes (device_id) where user_id is null;
create unique index member_votes_user_key on public.member_votes (user_id) where user_id is not null;
