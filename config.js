/*
  KONFIGURASI PUBLIK FRONTEND VEXORA

  Semua (login, database tools, penyimpanan ZIP + icon) memakai Firebase.
  Isi dari Firebase Console -> Project settings -> General -> Your apps
  -> Web app -> "SDK setup and configuration".
  Nilai ini memang publik; keamanan diatur lewat Rules (lihat
  firestore.rules dan storage.rules).

  Login memakai USERNAME + password. Di balik layar, username diubah jadi
  alamat internal <username>@USERNAME_DOMAIN (tidak ada email yang dikirim).

  OWNER_EMAILS: akun OWNER (boleh upload/edit/hapus tools), ditulis dalam
  bentuk <username>@vexora.local, huruf kecil semua. Yang sama juga harus ditulis di
  firestore.rules dan storage.rules, karena Rules-lah yang benar-benar
  menjaga keamanan (bukan file ini).
*/
window.VEXORA_CONFIG = {
  FIREBASE: {
    apiKey: "AIzaSyBjeWQXykXBCy3FXYL9ERrCrq-J9n1WeX0",
  authDomain: "vexora-tools.firebaseapp.com",
  projectId: "vexora-tools",
  storageBucket: "vexora-tools.firebasestorage.app",
  messagingSenderId: "55687040556",
  appId: "1:55687040556:web:df6bb513ee2bbc9883cb89",
  measurementId: "G-6WP84TR2GP"
  },

  USERNAME_DOMAIN: "vexora.local",

  OWNER_EMAILS: ["z4m@vexora.local"]
};
