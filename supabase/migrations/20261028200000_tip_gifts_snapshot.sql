-- تبقى الهدية في ملف الفائز بعد حذف الإعلان عبر نسخة من بياناته
alter table public.tip_gifts
  add column owner_id uuid,
  add column title text,
  add column body text,
  add column photo_path text,
  add column offer_qty integer;

update public.tip_gifts g
set owner_id = t.user_id, title = t.title, body = t.body, photo_path = t.photo_path, offer_qty = t.offer_qty
from public.tips t
where t.id = g.tip_id;

alter table public.tip_gifts drop constraint tip_gifts_tip_id_fkey;
alter table public.tip_gifts alter column tip_id drop not null;
alter table public.tip_gifts
  add constraint tip_gifts_tip_id_fkey foreign key (tip_id) references public.tips (id) on delete set null;

create or replace function public.tip_gifts_snapshot()
returns trigger
language plpgsql
as $$
begin
  select user_id, title, body, photo_path, offer_qty
    into new.owner_id, new.title, new.body, new.photo_path, new.offer_qty
    from public.tips where id = new.tip_id;
  return new;
end;
$$;

create trigger tip_gifts_snapshot
before insert on public.tip_gifts
for each row execute function public.tip_gifts_snapshot();

create index tip_gifts_owner_idx on public.tip_gifts (owner_id, winner_id);
