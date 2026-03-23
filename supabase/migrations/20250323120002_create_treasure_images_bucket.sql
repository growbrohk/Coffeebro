-- Create treasure-images bucket for clue photos (public)
-- File size and MIME restrictions enforced client-side (5MB, images only)
insert into storage.buckets (id, name, public)
values ('treasure-images', 'treasure-images', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload (drop first for idempotency)
drop policy if exists "Allow authenticated uploads to treasure-images" on storage.objects;
create policy "Allow authenticated uploads to treasure-images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'treasure-images');

-- Allow public read (bucket is public)
drop policy if exists "Allow public read for treasure-images" on storage.objects;
create policy "Allow public read for treasure-images"
  on storage.objects for select to public
  using (bucket_id = 'treasure-images');
