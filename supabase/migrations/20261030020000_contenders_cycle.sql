alter table public.contenders alter column expires_at drop not null;

-- At the end of the 30 days only the first of each category and area waits (no end date) for new contenders; the rest drop out.
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
      row_number() over (
        partition by c.category, c.level, c.governorate_id, c.center_id, c.district_id
        order by (select count(*) from public.contender_votes v where v.contender_id = c.id) desc, c.created_at asc
      ) as rn,
      (select count(*) from public.contender_votes v where v.contender_id = c.id) as votes
    from public.contenders c
    where c.status = 'active'
  ),
  waiting as (
    update public.contenders c
    set expires_at = null
    from ranked r
    where r.id = c.id and r.expires_at <= now()     and r.rn = 1 and r.votes > 0
    returning c.id
  )
  update public.contenders c
  set status = 'out'
  from ranked r
  where r.id = c.id and r.expires_at <= now() and not (r.rn = 1 and r.votes > 0);
end;
$$;
