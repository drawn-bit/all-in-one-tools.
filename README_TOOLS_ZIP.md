# Tools dari ZIP — setup sekali (Firebase)

Owner menambah tools dengan: **upload ZIP + isi nama + upload icon**. ZIP dijalankan
langsung di dalam website (layar penuh) lewat service worker.

## Syarat isi ZIP
- Harus ada `index.html` (boleh di dalam satu folder; ZIP yang dibungkus folder tetap bisa).
- Semua file (css/js/gambar/font/audio/video) harus berada **di dalam ZIP** dan dipanggil
  dengan path relatif (`./app.js`, `img/a.png`). Link ke CDN luar tetap boleh.
- Maksimal 50 MB per ZIP dan 3000 file.
- Hanya upload ZIP dari sumber yang kamu percaya: kode di dalamnya berjalan di domain
  website yang sama.

## Langkah setup (sekali saja)
1. **Authentication**: aktifkan Email/Password (sudah dari langkah login).
2. **Firestore Database**: Build → Firestore Database → Create database.
3. **Storage**: Build → Storage → Get started (butuh paket Blaze; ada kuota gratis bulanan).
4. **Isi `config.js`**: blok `FIREBASE` (termasuk `storageBucket`) dan `OWNER_EMAILS`
   (akun owner: `username@vexora.local`, huruf kecil).
5. **Pasang Rules**:
   - Firestore → Rules → tempel isi `firestore.rules` → Publish.
   - Storage → Rules → tempel isi `storage.rules` → Publish.
   - Di kedua file, ganti `drawnstorejb@vexora.local` dengan `<usernameowner>@vexora.local`
     (sama persis dengan di `config.js`).
6. **Atur CORS bucket** (wajib, supaya ZIP bisa diunduh browser):
   1. Buka https://console.cloud.google.com → pilih project Firebase-mu.
   2. Klik ikon **Cloud Shell** (`>_`) di kanan atas.
   3. Buat file: `nano cors.json` → tempel isi `cors.json` dari paket ini → simpan.
   4. Jalankan (ganti nama bucket sesuai Firebase Console → Storage):
      `gsutil cors set cors.json gs://NAMA-BUCKET-KAMU`
   - Untuk lebih aman, ganti `"*"` di `cors.json` dengan domain websitemu.
7. Upload semua file paket ini ke root repository (termasuk `sw.js` dan `tool-runner.js`),
   deploy lewat Vercel. Situs harus dibuka lewat **https**.
8. Login sebagai owner (username owner) → Panel Owner → Manajemen Tools → isi
   nama, pilih kategori, pilih ZIP, pilih icon → Simpan.

## Troubleshooting
- "Akses ditolak": akun owner belum sama di `config.js`, `firestore.rules`, `storage.rules`,
  atau Rules belum di-Publish.
- "Gagal mengunduh ZIP ... CORS": ulangi langkah 6.
- "Firestore belum dibuat": lakukan langkah 2.
- Tools tampil tapi layar kosong: cek isi ZIP — `index.html` harus memanggil file dengan
  path relatif, bukan `/app.js` (diawali garis miring).
- Setelah mengganti ZIP, user otomatis mendapat versi baru saat membuka tools lagi.
- Maintenance/pengumuman (`vexora-owner-extras.js`) dimatikan karena memakai backend
  Supabase lama; file-nya masih ada jika nanti mau dipindahkan ke Firebase.
