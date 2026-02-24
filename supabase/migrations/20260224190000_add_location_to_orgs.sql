-- Add nullable location column to orgs (default location for coffee offers)
alter table public.orgs
add column if not exists location text;
