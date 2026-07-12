-- NextFem Supabase: buckets de archivos y categorias faltantes.
-- Ejecuta este archivo una sola vez en Supabase SQL Editor.

insert into public.categories (name, slug) values
  ('Electrónica', 'electronica'),
  ('Electrodomésticos', 'electrodomesticos')
on conflict (slug) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'nextfem-products',
    'nextfem-products',
    true,
    52428800,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']::text[]
  ),
  (
    'nextfem-avatars',
    'nextfem-avatars',
    true,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
  ),
  (
    'nextfem-chat',
    'nextfem-chat',
    true,
    52428800,
    array[
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'video/mp4',
      'video/webm',
      'audio/mpeg',
      'audio/mp4',
      'audio/webm',
      'audio/wav',
      'application/pdf'
    ]::text[]
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "nextfem storage public read" on storage.objects;
create policy "nextfem storage public read"
on storage.objects
for select
using (bucket_id in ('nextfem-products', 'nextfem-avatars', 'nextfem-chat'));

drop policy if exists "nextfem storage authenticated insert" on storage.objects;
create policy "nextfem storage authenticated insert"
on storage.objects
for insert
to authenticated
with check (bucket_id in ('nextfem-products', 'nextfem-avatars', 'nextfem-chat'));

drop policy if exists "nextfem storage authenticated update" on storage.objects;
create policy "nextfem storage authenticated update"
on storage.objects
for update
to authenticated
using (bucket_id in ('nextfem-products', 'nextfem-avatars', 'nextfem-chat'))
with check (bucket_id in ('nextfem-products', 'nextfem-avatars', 'nextfem-chat'));

drop policy if exists "nextfem storage authenticated delete" on storage.objects;
create policy "nextfem storage authenticated delete"
on storage.objects
for delete
to authenticated
using (bucket_id in ('nextfem-products', 'nextfem-avatars', 'nextfem-chat'));
