-- Add clue_image to treasures (stores URL or Supabase Storage public URL)
alter table public.treasures
  add column if not exists clue_image text null;
