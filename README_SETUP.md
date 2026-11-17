# VEXORA starter — panduan setup HP Android

Nama website: VEXORA  
Developer: Z4M OFFICIAL

## File
- `index.html`: intro, halaman login/register, dan desain.
- `style.css`: tampilan dark neon responsif.
- `script.js`: animasi loading intro.
- `auth.js`: login/register Firebase Authentication.
- `firebase-init.js`: menyiapkan Firebase dan membaca role dari custom claim.
- `dashboard.html` dan `dashboard.js`: dashboard awal setelah login.
- `config.js`: konfigurasi publik Firebase dan daftar email owner.
- `tool-runner.js` + `sw.js`: membuka tools dari ZIP di dalam website.
- `firestore.rules`, `storage.rules`, `cors.json`: aturan keamanan Firebase.
- `README_TOOLS_ZIP.md`: panduan tools dari ZIP.

## 1. Upload ke GitHub lewat HP
1. Buka repository `all-in-one-tools`.
2. Buka `index.html` lama, tekan Edit (ikon pensil), ganti isinya dengan file `index.html` dari paket ini, lalu Commit changes.
3. Buat file baru untuk setiap file lain dalam paket ini dan tempel isi file yang sesuai.
4. Pastikan semua file berada di root repository, sejajar dengan `index.html`.
5. Jangan menghapus repository atau endpoint downloader lama. Kita baru menghubungkannya setelah login diuji.

## 2. Buat project Firebase (login/daftar)
1. Buka https://console.firebase.google.com lalu buat project.
2. Authentication → Sign-in method → aktifkan **Email/Password**.
3. Authentication → Settings → Authorized domains → tambahkan domain website kamu (domain Vercel dan domain sendiri bila ada).
4. Project settings → General → Your apps → tambah **Web app**, lalu salin `apiKey`, `authDomain`, `projectId`, `appId`.
5. Buka `config.js` dan isi blok `FIREBASE` dengan nilai tersebut.
6. Opsional: Authentication → Templates → ubah bahasa/isi email verifikasi.

Catatan: pendaftaran mengirim email verifikasi, dan user baru bisa masuk dashboard setelah email diverifikasi.

## 3. Tools dari ZIP (Firestore + Storage)
Daftar tools disimpan di Firestore dan file ZIP + icon di Firebase Storage. Ikuti panduan lengkap di `README_TOOLS_ZIP.md` (Rules, CORS bucket, email owner).

## 4. Deploy lewat Vercel
1. Buka https://vercel.com/new dan impor repository `all-in-one-tools`.
2. Untuk website statis ini, biasanya Framework Preset = Other, Build Command kosong, Output Directory bisa `.`.
3. Deploy, lalu buka URL yang diberikan Vercel.
4. Jika repository sudah tersambung ke Vercel, commit baru biasanya memicu deployment otomatis.

## 5. Penting untuk role Owner/VIP
- Ini starter login/register, bukan sistem role final.
- Dashboard saat ini menampilkan role placeholder “Member”; jangan gunakan teks itu sebagai bukti hak akses.
- Jangan pernah membuat dropdown role saat register atau membiarkan user mengedit role sendiri.
- OWNER ditentukan dari `OWNER_EMAILS` di `config.js` dan dijaga oleh Firebase Rules. VIP memakai custom claim `role` yang hanya bisa diisi lewat Firebase Admin SDK (server). Tetapkan Owner pertama lewat langkah admin satu kali yang aman, bukan lewat JavaScript publik.
- Proteksi tool/API harus diperiksa di backend/database, bukan hanya menyembunyikan tombol di frontend.

## Troubleshooting
- “Koneksi belum siap”: periksa blok `FIREBASE` di `config.js`.
- `auth/unauthorized-domain`: tambahkan domain di Authentication → Settings → Authorized domains.
- `auth/operation-not-allowed`: aktifkan Email/Password di Firebase Console.
- Email verifikasi tidak masuk: cek folder Spam; login ulang akan mengirim ulang tautan.
- Jika ada error, jangan menghapus file downloader lama. Catat pesan error dan perbaiki file terkait.
