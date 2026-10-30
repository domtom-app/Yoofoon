alter table public.tips add column approved_at timestamptz;
update public.tips set approved_at = created_at where approved;

alter table public.profiles add column tips_seen_at timestamptz;
