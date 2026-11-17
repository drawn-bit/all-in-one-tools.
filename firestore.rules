rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // GANTI dengan email owner (huruf kecil). Boleh lebih dari satu.
    function ownerEmails() {
      return ['drawnstorejb@gmail.com'];
    }

    // Akun yang di-ban otomatis kehilangan semua akses data.
    function notBanned() {
      return !exists(/databases/$(database)/documents/banned/$(request.auth.uid));
    }

    function signedIn() {
      return request.auth != null
        && request.auth.token.email_verified == true
        && notBanned();
    }

    function isOwner() {
      return signedIn() && request.auth.token.email in ownerEmails();
    }

    // Daftar tools: user terverifikasi & tidak di-ban boleh membaca, hanya owner menulis.
    match /vexora_tools/{toolId} {
      allow read: if signedIn();
      allow write: if isOwner();
    }

    // Data akun: user hanya bisa membuat/memperbarui dokumennya sendiri
    // (tanpa bisa mengubah email atau tanggal daftar). Owner bisa membaca semua.
    match /users/{uid} {
      allow read: if isOwner() || (request.auth != null && request.auth.uid == uid);

      allow create: if request.auth != null
        && request.auth.uid == uid
        && request.resource.data.keys().hasOnly(['email', 'emailVerified', 'createdAt', 'lastLogin'])
        && request.resource.data.email == request.auth.token.email.lower();

      allow update: if request.auth != null
        && request.auth.uid == uid
        && request.resource.data.diff(resource.data).affectedKeys()
             .hasOnly(['emailVerified', 'lastLogin']);

      allow delete: if isOwner();
    }

    // IP terakhir user: user hanya bisa menulis miliknya sendiri,
    // dan HANYA owner yang bisa membaca.
    match /user_ips/{uid} {
      allow read: if isOwner();
      allow create, update: if request.auth != null
        && request.auth.uid == uid
        && request.resource.data.keys().hasOnly(['ip', 'updatedAt'])
        && request.resource.data.ip is string
        && request.resource.data.ip.size() <= 45;
      allow delete: if isOwner();
    }

    // Daftar ban: hanya owner yang boleh ban/unban (owner tidak bisa di-ban).
    // User boleh membaca dokumen ban miliknya sendiri agar bisa diberi pesan.
    match /banned/{uid} {
      allow read: if isOwner() || (request.auth != null && request.auth.uid == uid);
      allow create, update: if isOwner()
        && !(request.resource.data.email in ownerEmails());
      allow delete: if isOwner();
    }
  }
}
