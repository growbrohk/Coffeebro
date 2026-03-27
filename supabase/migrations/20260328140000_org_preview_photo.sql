alter table public.orgs
  add column if not exists preview_photo_url text;

comment on column public.orgs.preview_photo_url is 'Public URL for org listing/card preview image';
