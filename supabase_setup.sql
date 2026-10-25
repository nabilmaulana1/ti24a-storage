-- ==============================================================
-- SQL SETUP UNTUK SUPABASE — REPOSITORI TEKNIK INFORMATIKA TI24A
-- v3: Database Tables + Storage Bucket Policies (ti24a-files)
-- Salin dan jalankan seluruh skrip ini di SQL Editor Supabase Anda
-- ==============================================================

-- 1. Tabel Folders (Folder Perkuliahan)
create table if not exists public.folders (
  id text primary key,
  name text not null,
  parent_id text default 'root',
  access_mode text default 'viewer',   -- 'viewer' | 'editor'
  created_at bigint not null
);

-- 2. Tabel Files (Metadata Berkas Materi & Tugas)
create table if not exists public.files (
  id text primary key,
  name text not null,
  folder_id text default 'root',
  size bigint default 0,
  extension text,
  storage_path text not null,
  public_url text not null,
  created_at bigint not null
);

-- Pastikan kolom access_mode ada jika tabel sudah dibuat sebelumnya
alter table public.folders add column if not exists access_mode text default 'viewer';

-- 3. Aktifkan Row Level Security (RLS) pada Tabel Database
alter table public.folders enable row level security;
alter table public.files enable row level security;

-- 4. Clean-up Policy Lama Database (Re-run Safe)
drop policy if exists "Akses Publik Folders" on public.folders;
drop policy if exists "Akses Publik Files" on public.files;
drop policy if exists "Publik Baca Folders" on public.folders;
drop policy if exists "Publik Baca Files" on public.files;
drop policy if exists "Publik Write Folders" on public.folders;
drop policy if exists "Publik Update Folders" on public.folders;
drop policy if exists "Publik Delete Folders" on public.folders;
drop policy if exists "Publik Write Files" on public.files;
drop policy if exists "Publik Delete Files" on public.files;

-- 5. Policy Database FOLDERS (Akses Penuh Publik & Anon)
create policy "Publik Baca Folders" on public.folders for select using (true);
create policy "Publik Write Folders" on public.folders for insert with check (true);
create policy "Publik Update Folders" on public.folders for update using (true) with check (true);
create policy "Publik Delete Folders" on public.folders for delete using (true);

-- 6. Policy Database FILES (Akses Penuh Publik & Anon)
create policy "Publik Baca Files" on public.files for select using (true);
create policy "Publik Write Files" on public.files for insert with check (true);
create policy "Publik Delete Files" on public.files for delete using (true);


-- ==============================================================
-- 7. KONFIGURASI AUTOMATIS RLS STORAGE BUCKET 'ti24a-files'
-- ==============================================================

-- Buat Bucket 'ti24a-files' secara otomatis jika belum ada (Public Bucket)
insert into storage.buckets (id, name, public)
values ('ti24a-files', 'ti24a-files', true)
on conflict (id) do update set public = true;

-- Drop Storage Policy Lama jika Ada
drop policy if exists "Publik Baca Storage ti24a-files" on storage.objects;
drop policy if exists "Publik Upload Storage ti24a-files" on storage.objects;
drop policy if exists "Publik Update Storage ti24a-files" on storage.objects;
drop policy if exists "Publik Delete Storage ti24a-files" on storage.objects;

-- Policy 1: BACA/DOWNLOAD (Siapa pun bisa lihat dan ambil link publik)
create policy "Publik Baca Storage ti24a-files"
  on storage.objects for select
  using ( bucket_id = 'ti24a-files' );

-- Policy 2: UNGGAH/UPLOAD (Siapa pun bisa upload file/buat folder via frontend Netlify)
create policy "Publik Upload Storage ti24a-files"
  on storage.objects for insert
  with check ( bucket_id = 'ti24a-files' );

-- Policy 3: UPDATE (Bisa memperbarui/menimpa file dengan nama sama)
create policy "Publik Update Storage ti24a-files"
  on storage.objects for update
  using ( bucket_id = 'ti24a-files' );

-- Policy 4: HAPUS/DELETE (Bisa menghapus file dari storage)
create policy "Publik Delete Storage ti24a-files"
  on storage.objects for delete
  using ( bucket_id = 'ti24a-files' );