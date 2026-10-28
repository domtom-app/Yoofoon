alter table public.tip_gifts drop constraint tip_gifts_tip_id_winner_id_key;

create index tip_gifts_tip_winner_idx on public.tip_gifts (tip_id, winner_id);
