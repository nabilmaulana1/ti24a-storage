# 🎓 Repositori Berkas — Teknik Informatika TI24A

Web repositori penyimpanan materi perkuliahan dan tugas praktikum mahasiswa **Teknik Informatika Kelas TI24A**, siap di-deploy ke **Netlify** dengan penyimpanan cloud bersama **Supabase**.

---

## 🚀 Cara 1: Deploy Instan ke Netlify (Paling Mudah — 15 Detik)

1. Buka browser: **[app.netlify.com/drop](https://app.netlify.com/drop)** (Login / Daftar gratis di Netlify).
2. Tarik (Drag & Drop) seluruh folder proyek ini ke area unggah Netlify.
3. Web Anda langsung aktif dan memiliki link permanen, misalnya:
   👉 `https://ti24a-informatika.netlify.app`
4. Anda bisa mengganti nama domain sesuka hati di: **Site configuration > Change site name**.

---

## 🌐 Cara 2: Deploy Otomatis via GitHub ke Netlify

1. Buat repositori baru di [github.com/new](https://github.com/new) (misal: `ti24a-storage`).
2. Jalankan perintah ini di terminal:
   ```bash
   git remote add origin https://github.com/USERNAME-ANDA/ti24a-storage.git
   git branch -M main
   git push -u origin main
   ```
3. Buka [app.netlify.com](https://app.netlify.com) > Klik **Add new site** > **Import an existing project** > Pilih **GitHub**.
4. Pilih repositori `ti24a-storage`. Netlify akan otomatis mendeteksi konfigurasi [netlify.toml](netlify.toml). Klik **Deploy**.

---

## ☁️ Menghubungkan Cloud Storage Supabase (Agar Berkas Tersinkron ke Semua Orang)

Agar berkas yang diunggah dapat dilihat dan diunduh oleh seluruh teman kelas & dosen dari HP/laptop masing-masing:

1. Buka **[supabase.com](https://supabase.com)** > Buat Project Baru (Gratis).
2. Di menu **Storage**: Klik **New Bucket** > Beri nama `ti24a-files` dan centang **Public bucket**.
3. Di menu **SQL Editor**: Salin isi berkas [supabase_setup.sql](supabase_setup.sql) lalu klik **Run**.
4. Di menu **Project Settings > API**: Salin **Project URL** dan **anon/public key**.
5. Buka web Netlify Anda, klik tombol **Setup Cloud** di pojok kanan atas, lalu tempelkan URL dan Key tersebut!

> [!NOTE]
> *Jika Supabase belum disetup*, web tetap bisa langsung digunakan untuk upload file dan folder di browser secara lokal tanpa error!
