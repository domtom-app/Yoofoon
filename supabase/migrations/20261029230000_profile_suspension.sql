alter table public.profiles add column if not exists suspended boolean not null default false;
alter table public.profiles add column suspend_kind text check (suspend_kind in ('post', 'hide', 'full'));
alter table public.profiles add column suspend_reason text;
alter table public.profiles add column suspend_until timestamptz;
update public.profiles set suspend_kind = 'full' where suspended;
alter table public.profiles drop column suspended;
