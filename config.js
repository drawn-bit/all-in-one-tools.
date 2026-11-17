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
    apiKey: "ISI_FIREBASE_API_KEY",
    authDomain: "ISI_PROJECT_ID.firebaseapp.com",
    projectId: "ISI_PROJECT_ID",
    storageBucket: "ISI_PROJECT_ID.firebasestorage.app",
    appId: "ISI_FIREBASE_APP_ID"
  },

  OWNER_EMAILS: ["isi_email_owner@gmail.com"]
};
