# 🎓 Repositori Berkas — Teknik Informatika TI24A

Web aplikasi repositori penyimpanan materi perkuliahan dan berkas tugas mahasiswa Teknik Informatika Kelas **TI24A**.

## ✨ Fitur Utama
- **Upload File & Drag-and-Drop**: Unggah berbagai tipe file (PDF, Dokumen, Source Code, ZIP, Gambar, dll).
- **Struktur Folder Terorganisir**: Buat folder per mata kuliah atau per pertemuan.
- **Pratinjau Berkas Cepat (Preview)**: Buka PDF, gambar, dan kode langsung di browser tanpa harus mengunduh dulu.
- **Pencarian Cepat**: Cari berkas dan modul tugas dalam hitungan detik.
- **Desain Modern & Elegan**: Menggunakan tema 2-warna bersih yang berwibawa, dirancang khusus untuk Teknik Informatika TI24A.

---

## 🚀 Panduan Deploy Gratis ke Render.com (Domain Tetap 24 Jam)

Agar web ini selalu aktif dan punya link permanen (misal: `https://ti24a-informatika.onrender.com`):

### Langkah 1: Buat Repositori Baru di GitHub
1. Buka [github.com/new](https://github.com/new)
2. Beri nama repositori (misal: `ti24a-storage` atau `repositori-ti24a`).
3. Pilih **Public** lalu klik **Create repository**.
4. Di terminal folder ini, jalankan:
   ```bash
   git remote add origin https://github.com/USERNAME-ANDA/NAMA-REPO.git
   git branch -M main
   git push -u origin main
   ```

### Langkah 2: Hubungkan ke Render.com (Gratis)
1. Buka [dashboard.render.com](https://dashboard.render.com/) (Daftar / Login gratis dengan akun GitHub).
2. Klik tombol **New +** > Pilih **Web Service**.
3. Pilih repositori GitHub Anda yang baru dibuat tadi (`ti24a-storage`).
4. Atur pengaturannya:
   - **Name**: `ti24a-informatika` (atau nama pilihan Anda)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan Type**: `Free`
5. Klik **Create Web Service**.

🎉 Selesai! Dalam 1-2 menit, Anda akan mendapatkan domain permanen seperti:
👉 **`https://ti24a-informatika.onrender.com`** yang bisa diakses dosen dan seluruh teman kelas TI24A kapan saja tanpa perlu laptop Anda dinyalakan!

---

## 💻 Menjalankan di Komputer Lokal
```bash
npm install
node server.js
```
Akses di browser: `http://localhost:3000`
