-- Run this in Supabase Dashboard > SQL Editor.
create table if not exists public.wardrobe_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) <= 100),
  category text not null check (category in ('Tops','Bottoms','Dresses','Shoes','Accessories','Outerwear')),
  color text default '',
  image_path text,
  created_at timestamptz not null default now()
);

alter table public.wardrobe_items enable row level security;
drop policy if exists "Users read their wardrobe" on public.wardrobe_items;
create policy "Users read their wardrobe" on public.wardrobe_items for select to authenticated using (auth.uid() = owner_id);
drop policy if exists "Users add to their wardrobe" on public.wardrobe_items;
create policy "Users add to their wardrobe" on public.wardrobe_items for insert to authenticated with check (auth.uid() = owner_id);
drop policy if exists "Users update their wardrobe" on public.wardrobe_items;
create policy "Users update their wardrobe" on public.wardrobe_items for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
drop policy if exists "Users delete from their wardrobe" on public.wardrobe_items;
create policy "Users delete from their wardrobe" on public.wardrobe_items for delete to authenticated using (auth.uid() = owner_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wardrobe-photos', 'wardrobe-photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "Users read own wardrobe photos" on storage.objects;
create policy "Users read own wardrobe photos" on storage.objects for select to authenticated using (bucket_id = 'wardrobe-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "Users upload own wardrobe photos" on storage.objects;
create policy "Users upload own wardrobe photos" on storage.objects for insert to authenticated with check (bucket_id = 'wardrobe-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "Users update own wardrobe photos" on storage.objects;
create policy "Users update own wardrobe photos" on storage.objects for update to authenticated using (bucket_id = 'wardrobe-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "Users delete own wardrobe photos" on storage.objects;
create policy "Users delete own wardrobe photos" on storage.objects for delete to authenticated using (bucket_id = 'wardrobe-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
