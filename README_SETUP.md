# VEXORA starter — panduan setup HP Android

Nama website: VEXORA  
Developer: Z4M OFFICIAL

## File
- `index.html`: intro, halaman login/register, dan desain.
- `style.css`: tampilan dark neon responsif.
- `script.js`: animasi loading intro.
- `auth.js`: login/register Supabase.
- `dashboard.html` dan `dashboard.js`: dashboard awal setelah login.
- `config.js`: URL/key publik Supabase dan site key Cloudflare.

## 1. Upload ke GitHub lewat HP
1. Buka repository `all-in-one-tools`.
2. Buka `index.html` lama, tekan Edit (ikon pensil), ganti isinya dengan file `index.html` dari paket ini, lalu Commit changes.
3. Buat file baru untuk setiap file lain dalam paket ini dan tempel isi file yang sesuai.
4. Pastikan semua file berada di root repository, sejajar dengan `index.html`.
5. Jangan menghapus repository atau endpoint downloader lama. Kita baru menghubungkannya setelah login diuji.

## 2. Buat project Supabase
1. Buka https://supabase.com/dashboard lalu buat project.
2. Di Project Settings → API, salin Project URL dan publishable/anon key.
3. Buka `config.js` di GitHub dan ganti:
   - `ISI_SUPABASE_PROJECT_URL`
   - `ISI_SUPABASE_PUBLISHABLE_ATAU_ANON_KEY`
4. Hanya gunakan publishable/anon key di browser. JANGAN masukkan `service_role` atau secret key ke file frontend.

## 3. Aktifkan CAPTCHA Supabase + Cloudflare Turnstile
1. Buka https://dash.cloudflare.com/ dan cari Turnstile.
2. Buat widget untuk domain yang dipakai website. Untuk tes lokal, Cloudflare menyediakan test keys di dokumentasi resminya.
3. Masukkan site key ke `TURNSTILE_SITE_KEY` di `config.js`.
4. Di Supabase Dashboard, buka Authentication → Bot and Abuse Protection (nama menu bisa berubah), aktifkan CAPTCHA dan pilih Turnstile, lalu masukkan secret key Turnstile di dashboard Supabase. Secret key hanya disimpan di dashboard/server, jangan di GitHub.
5. Pastikan domain produksi dan preview yang diperlukan ada di daftar hostname widget. Setelah deploy, tes register dan login.

Catatan: kode frontend mengirim `captchaToken` ke Supabase Auth. Widget saja tidak cukup; CAPTCHA juga harus diaktifkan dan secret key disimpan di konfigurasi Supabase. Jangan menganggap proteksi aktif sebelum dites.

## 4. Deploy lewat Vercel
1. Buka https://vercel.com/new dan impor repository `all-in-one-tools`.
2. Untuk website statis ini, biasanya Framework Preset = Other, Build Command kosong, Output Directory bisa `.`.
3. Deploy, lalu buka URL yang diberikan Vercel.
4. Jika repository sudah tersambung ke Vercel, commit baru biasanya memicu deployment otomatis.

## 5. Penting untuk role Owner/VIP
- Ini starter login/register, bukan sistem role final.
- Dashboard saat ini menampilkan role placeholder “Member”; jangan gunakan teks itu sebagai bukti hak akses.
- Jangan pernah membuat dropdown role saat register atau membiarkan user mengedit role sendiri.
- Sebelum membuka tools VIP/Owner, buat tabel profile dengan RLS dan kebijakan server-side yang aman. Tetapkan Owner pertama lewat langkah admin satu kali yang aman, bukan lewat JavaScript publik.
- Proteksi tool/API harus diperiksa di backend/database, bukan hanya menyembunyikan tombol di frontend.

## Troubleshooting
- “Supabase belum disiapkan”: periksa URL dan publishable/anon key di `config.js`.
- CAPTCHA tidak muncul: periksa site key, hostname widget, dan apakah CAPTCHA Turnstile sudah diaktifkan di Supabase.
- Email konfirmasi: bila Supabase meminta konfirmasi email, buka email sebelum login.
- Jika ada error, jangan menghapus file downloader lama. Catat pesan error dan perbaiki file terkait.
