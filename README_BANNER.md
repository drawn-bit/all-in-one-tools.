# VEXORA — Dashboard dengan video banner

## Upload ke GitHub
1. Ekstrak ZIP ini di HP atau komputer.
2. Upload semua file dan folder di dalamnya ke root repository `all-in-one-tools` (jangan upload ZIP sebagai satu file).
3. Pastikan `banner.mp4` berada satu folder dengan `dashboard.html`.
4. Commit perubahan, lalu tunggu Vercel selesai deploy.

## Video dan backsound
- `banner.mp4` adalah video banner yang diberikan, termasuk audio yang sudah ada di video tersebut.
- Video diatur `autoplay` dan `loop`, jadi akan terus berulang.
- Karena browser HP biasanya memblokir autoplay dengan suara, video dimulai dalam keadaan mute. Tekan tombol **Nyalakan backsound** di banner untuk mendengarkan audio; tekan lagi untuk mematikan suara.

## Penting
- File ini membawa file dasar VEXORA (login/register, konfigurasi, dan dashboard).
- Edit `config.js` dengan URL dan publishable/anon key Supabase milikmu sebelum login dipakai.
- Jangan masukkan Supabase service-role key atau Cloudflare Turnstile secret ke file frontend.
- Dashboard ini masih menampilkan role default Member. Jangan menganggap badge sebagai pengamanan role; role VIP/Owner perlu divalidasi lewat database dan kebijakan akses Supabase.
- Kartu tool yang belum terhubung masih berupa tampilan, belum menjalankan downloader.
