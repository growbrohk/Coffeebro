-- Clue photo URL for hunt/map cards (optional); same semantics as treasures.clue_image.
alter table public.preset_offers
  add column if not exists clue_image text null;
