create table public.contenders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  photo_path text,
  category text not null,
  specialty text check (char_length(specialty) <= 30),
  level text not null check (level in ('egypt', 'governorate', 'center', 'village')),
  governorate_id smallint references public.governorates (id) on delete cascade,
  center_id uuid references public.centers (id) on delete cascade,
  district_id uuid references public.districts (id) on delete cascade,
  duration_days smallint not null check (duration_days between 1 and 30),
  status text not null default 'active' check (status in ('active', 'out')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index contenders_user_idx on public.contenders (user_id);
create index contenders_group_idx on public.contenders (category, level, status);

create table public.contender_votes (
  id uuid primary key default gen_random_uuid(),
  contender_id uuid not null references public.contenders (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null,
  level text not null,
  created_at timestamptz not null default now(),
  unique (user_id, category, level)
);

create index contender_votes_contender_idx on public.contender_votes (contender_id);

create view public.contender_results as
select c.*, (select count(*)::int from public.contender_votes v where v.contender_id = c.id) as votes
from public.contenders c;

alter table public.contenders enable row level security;
alter table public.contender_votes enable row level security;
revoke all on public.contenders, public.contender_votes from anon, authenticated;
revoke all on public.contender_results from anon, authenticated;

-- At expiry the top 3 of each category and area stay for another period; the rest drop out.
create or replace function public.settle_contests() returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  with ranked as (
    select
      c.id,
      c.expires_at,
      c.duration_days,
      row_number() over (
        partition by c.category, c.level, c.governorate_id, c.center_id, c.district_id
        order by (select count(*) from public.contender_votes v where v.contender_id = c.id) desc, c.created_at asc
      ) as rn,
      (select count(*) from public.contender_votes v where v.contender_id = c.id) as votes
    from public.contenders c
    where c.status = 'active'
  ),
  renewed as (
    update public.contenders c
    set expires_at = now() + make_interval(days => c.duration_days)
    from ranked r
    where r.id = c.id and r.expires_at <= now() and r.rn <= 3 and r.votes > 0
    returning c.id
  )
  update public.contenders c
  set status = 'out'
  from ranked r
  where r.id = c.id and r.expires_at <= now() and not (r.rn <= 3 and r.votes > 0);
end;
$$;

revoke all on function public.settle_contests() from public, anon, authenticated;
grant execute on function public.settle_contests() to service_role;
