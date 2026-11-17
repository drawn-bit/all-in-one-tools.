# VEXORA — GitHub/Vercel

Paket dashboard VEXORA memakai identitas visual sendiri: midnight navy, cyan elektrik, dan aksen amber. Tidak menggunakan palet ungu referensi. Developer: **Z4M OFFICIAL**.

## Fitur yang disiapkan
- Intro/loading screen saat membuka halaman utama.
- Form Masuk dan Buat Akun pada halaman utama.
- Dashboard responsif dengan video banner `banner.mp4` yang loop; audio dinyalakan lewat tombol karena browser HP memblokir autoplay bersuara.
- Kartu profil, kategori, pencarian tools, dan bagian VIP.
- Role label `member`, `vip`, `owner` owner dari `OWNER_EMAILS` di config.js, VIP dari custom claim Firebase `role` (default `member`).

## Upload
Ekstrak ZIP lalu upload seluruh isi folder ini ke root repository GitHub. Pastikan `banner.mp4` ada di root bersama `dashboard.html`. Deploy melalui Vercel.

## Konfigurasi dan keamanan
1. Isi `config.js` dengan konfigurasi Firebase.
2. Jangan pernah memasukkan service-role key atau Turnstile secret ke frontend.
3. Buat role `vip` dan `owner` hanya melalui mekanisme tepercaya/admin di server; jangan izinkan pengguna mengubah `app_metadata` sendiri.
4. Role yang tampil di UI bukan pengamanan akses. Lindungi data dan fitur premium memakai Firebase Rules/validasi server-side.
5. Kartu tools masih placeholder sampai source code masing-masing tool diintegrasikan.
