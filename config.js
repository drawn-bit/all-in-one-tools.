/*
  KONFIGURASI PUBLIK FRONTEND VEXORA

  Semua (login, database tools, penyimpanan ZIP + icon) memakai Firebase.
  Isi dari Firebase Console -> Project settings -> General -> Your apps
  -> Web app -> "SDK setup and configuration".
  Nilai ini memang publik; keamanan diatur lewat Rules (lihat
  firestore.rules dan storage.rules).

  OWNER_EMAILS: email yang menjadi OWNER (boleh upload/edit/hapus tools).
  Tulis huruf kecil semua. Email yang sama juga harus ditulis di
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

  OWNER_EMAILS: ["isi_email_owner@gmail.com"]
};
