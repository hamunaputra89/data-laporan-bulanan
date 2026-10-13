# Laporan Bulanan Logistik & Pengiriman

Aplikasi dashboard analitik operasional gudang, fulfillment, dan laporan bulanan pengiriman logistik dengan sistem filter otomatis dari data Google Spreadsheet.

---

## Cara Publikasikan ke GitHub Pages (Gratis & Otomatis)

Aplikasi ini sudah dikonfigurasi lengkap dengan workflow **GitHub Actions** (`.github/workflows/deploy.yml`) dan `base: './'` sehingga dapat langsung di-deploy secara otomatis ke GitHub Pages.

### Langkah 1: Buat Repository Baru di GitHub
1. Buka [GitHub](https://github.com/) dan login ke akun Anda.
2. Klik tombol **New** (Buat repository baru).
3. Beri nama repository (contoh: `laporan-logistik-bulanan`).
4. Pilih **Public**.
5. Klik **Create repository** (jangan centang README/gitignore karena sudah ada di proyek ini).

---

### Langkah 2: Upload (Push) Kode ke GitHub
Jalankan perintah berikut di terminal komputer Anda pada folder proyek ini:

```bash
# 1. Inisialisasi git (jika belum)
git init

# 2. Tambahkan semua file proyek
git add .

# 3. Buat commit
git commit -m "Deploy Laporan Bulanan Logistik ke GitHub Pages"

# 4. Ubah nama branch utama ke main
git branch -M main

# 5. Hubungkan ke repository GitHub Anda (ganti USERNAME dan NAMA_REPO dengan milik Anda)
git remote add origin https://github.com/USERNAME/NAMA_REPO.git

# 6. Push kode ke GitHub
git push -u origin main
```

---

### Langkah 3: Aktifkan GitHub Pages di Pengaturan Repository
1. Di halaman repository GitHub Anda, klik tab **Settings** (Pengaturan di bagian atas).
2. Di menu sidebar kiri, klik **Pages**.
3. Pada bagian **Build and deployment** > **Source**, ganti pilihan menjadi **GitHub Actions**.
4. Selesai! Tab **Actions** di GitHub akan otomatis membangun (*build*) dan mempublikasikan web Anda dalam 1-2 menit.
5. URL website publik Anda akan langsung aktif di:
   ```
   https://<username>.github.io/<nama-repo>/
   ```

---

## Fitur Utama
- **Filter Otomatis Cepat**: Pilihan bulan (Maret - Oktober 2026), rentang tanggal, status pesanan, kurir, packer, dan SLOC.
- **Dukungan Handover**: Filter dokumen serah terima ekspedisi (*handover_no*).
- **Pratinjau Cetak / PDF**: Format formal laporan bulanan siap cetak atau simpan ke PDF.
- **Ekspor CSV**: Unduh data terfilter ke format spreadsheet CSV.
- **Dua Mode Eksekusi**:
  - **Mode Static (GitHub Pages)**: Berjalan mandiri tanpa perlu server backend.
  - **Mode Fullstack (Node.js/Cloud Run)**: Berjalan dengan SQLite database berkecepatan tinggi untuk query skala besar.
