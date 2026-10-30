alter table public.notifications
  add column group_key text,
  add column count integer not null default 1;

create index notifications_group_idx on public.notifications (user_id, group_key) where read_at is null;
