/* =========================================================
   VEXORA — inisialisasi Firebase Authentication
   Dimuat setelah config.js dan library firebase compat.
   ========================================================= */
(() => {
  "use strict";

  const cfg = window.VEXORA_CONFIG?.FIREBASE;
  const placeholder = (v) => !v || String(v).startsWith("ISI_");

  if (
    !window.firebase ||
    !cfg ||
    placeholder(cfg.apiKey) ||
    placeholder(cfg.projectId) ||
    placeholder(cfg.appId)
  ) {
    console.error("[VEXORA] Firebase belum dikonfigurasi. Periksa config.js.");
    window.vexoraAuth = null;
    return;
  }

  try {
    const app = firebase.apps.length
      ? firebase.app()
      : firebase.initializeApp(cfg);

    window.vexoraAuth = firebase.auth(app);

    // Firestore (data tools) dan Storage (ZIP + icon) hanya dimuat di dashboard.
    window.vexoraDb =
      typeof firebase.firestore === "function" ? firebase.firestore(app) : null;

    window.vexoraStorage =
      typeof firebase.storage === "function" && !placeholder(cfg.storageBucket)
        ? firebase.storage(app)
        : null;
  } catch (error) {
    console.error("[VEXORA] Gagal menyiapkan Firebase:", error);
    window.vexoraAuth = null;
    return;
  }

  // Menunggu status login pertama selesai dibaca Firebase.
  window.vexoraWaitForUser = () =>
    new Promise((resolve) => {
      const off = window.vexoraAuth.onAuthStateChanged((user) => {
        off();
        resolve(user || null);
      });
    });

  /*
   * Ubah user Firebase ke bentuk yang dipakai dashboard.
   * Role: OWNER dari OWNER_EMAILS (config.js); VIP/member dari
   * custom claim "role" (hanya bisa diisi lewat Firebase Admin SDK).
   */
  window.vexoraAdaptUser = async (user) => {
    if (!user) return null;

    let role = "member";

    try {
      const token = await user.getIdTokenResult();
      role = String(token.claims?.role || "member").toLowerCase();
    } catch (error) {
      console.warn("[VEXORA] Gagal membaca role:", error);
    }

    // OWNER ditentukan dari daftar email di config.js (hanya untuk tampilan).
    // Keamanan sebenarnya dijaga oleh Firestore/Storage Rules.
    const owners = (window.VEXORA_CONFIG?.OWNER_EMAILS || [])
      .map((email) => String(email).trim().toLowerCase());

    if (
      user.emailVerified &&
      owners.includes(String(user.email || "").toLowerCase())
    ) {
      role = "owner";
    }

    return {
      id: user.uid,
      email: user.email,
      emailVerified: user.emailVerified,
      created_at: user.metadata?.creationTime || null,
      last_sign_in_at: user.metadata?.lastSignInTime || null,
      app_metadata: { role },
      user_metadata: {}
    };
  };
})();
