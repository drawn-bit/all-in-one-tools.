# VEXORA Tools

Workspace tools digital dengan desain colorful Neo-Brutalism.

## Fitur
- Daftar dan login menggunakan username + password melalui Firebase Authentication
- Dashboard, All Tools, dan Saved Tools
- Text Formatter, Word Counter, Quick Notes, Color Palette
- QR Link Helper dan Focus Timer

## Setup Firebase
1. Buat project di Firebase Console: https://console.firebase.google.com/
2. Tambahkan aplikasi Web (ikon `</>`), lalu salin konfigurasi Firebase Web App.
3. Buka `firebase-config.js` dan ganti `ISI_API_KEY`, `ISI_PROJECT_ID`, dan `ISI_APP_ID` dengan nilai dari Firebase.
4. Di Firebase Console, buka **Authentication → Sign-in method**. Aktifkan **Email/Password**.
5. Jalankan/deploy folder ini melalui hosting web (misalnya Firebase Hosting, Vercel, atau Netlify). Jangan buka langsung sebagai `file://` karena modul Firebase perlu dijalankan melalui server.

## Cara kerja username
Firebase Authentication memakai provider Email/Password. Agar tampilan tetap username + password tanpa meminta Gmail, aplikasi mengubah username menjadi alias internal berbentuk `username@vexora-login.com`. Pengguna tetap hanya mengisi username dan password. Tidak ada password yang disimpan di localStorage.

## Catatan penting
- Username dinormalisasi menjadi huruf kecil; username tidak membedakan huruf besar/kecil.
- Password minimal 6 karakter (ketentuan Firebase Authentication).
- Karena akun tidak memakai email pribadi, fitur reset password melalui email tidak tersedia. Jika pengguna lupa password, perlu disiapkan alur pemulihan akun tersendiri.
- Firebase Web API key bukan password rahasia. Jangan pernah memasukkan Firebase Admin SDK private key ke file frontend.
- Fitur Saved/Quick Notes masih tersimpan lokal di browser perangkat, bukan tersinkron antarperangkat.
