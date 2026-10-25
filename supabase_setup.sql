-- ==============================================================
-- SQL SETUP UNTUK SUPABASE — REPOSITORI TEKNIK INFORMATIKA TI24A
-- Salin dan jalankan seluruh skrip ini di SQL Editor Supabase Anda
-- ==============================================================

-- 1. Tabel Folders (Folder Perkuliahan)
create table if not exists public.folders (
  id text primary key,
  name text not null,
  parent_id text default 'root',
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

-- 3. Aktifkan Row Level Security (RLS)
alter table public.folders enable row level security;
alter table public.files enable row level security;

-- 4. Berikan Hak Akses Publik (Semua Mahasiswa TI24A & Dosen Bisa Baca dan Tulis)
create policy "Akses Publik Folders" on public.folders
  for all using (true) with check (true);

create policy "Akses Publik Files" on public.files
  for all using (true) with check (true);

-- 5. Konfigurasi Bucket Storage (Pastikan Bucket 'ti24a-files' sudah dibuat di menu Storage -> Create new bucket -> Public)
