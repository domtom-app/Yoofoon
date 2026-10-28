create or replace function public.tip_gifts_quota_guard()
returns trigger
language plpgsql
as $$
declare
  qty integer;
  given integer;
begin
  -- قفل صف الإعلان لتسلسل عمليات المنح المتزامنة
  select offer_qty into qty from public.tips where id = new.tip_id for update;
  if qty is null then
    return new;
  end if;
  select count(*) into given from public.tip_gifts
    where tip_id = new.tip_id and status <> 'declined';
  if given >= qty then
    raise exception 'gift quota exceeded';
  end if;
  return new;
end;
$$;

create trigger tip_gifts_quota_guard
before insert on public.tip_gifts
for each row execute function public.tip_gifts_quota_guard();
