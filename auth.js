
/* =========================================================
   VEXORA AUTH SYSTEM
   Firebase Authentication
   Login • Register • Email Verification • Password Toggle
   ========================================================= */
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const config = window.VEXORA_CONFIG;

  let mode = "login";
  let busy = false;

  // ---------------------------------------------------------
  // PESAN FORM
  // ---------------------------------------------------------

  function showMessage(message, type = "error") {
    const el = $("formMessage");
    if (!el) return;

    el.textContent = message;
    el.className = "form-message show " + type;
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
  }

  function clearMessage() {
    const el = $("formMessage");
    if (!el) return;

    el.textContent = "";
    el.className = "form-message";
  }

  // ---------------------------------------------------------
  // CEK FIREBASE
  // ---------------------------------------------------------

  const auth = window.vexoraAuth;

  if (!auth) {
    console.error("[VEXORA] Firebase belum siap.");

    showMessage(
      "Koneksi belum siap. Periksa config.js (FIREBASE) dan koneksi internet."
    );

    return;
  }

  // ---------------------------------------------------------
  // STATUS TOMBOL
  // ---------------------------------------------------------

  function setBusy(value) {
    busy = value;

    const button = $("submitBtn");
    const text = $("submitText");

    if (button) {
      button.disabled = value;
      button.setAttribute("aria-busy", String(value));
    }

    if (text) {
      text.textContent = value
        ? "Memproses..."
        : mode === "register"
          ? "Daftar"
          : "Masuk ke Dashboard";
    }
  }

  // ---------------------------------------------------------
  // MODE LOGIN / REGISTER
  // ---------------------------------------------------------

  function setMode(nextMode) {
    mode = nextMode === "register" ? "register" : "login";

    clearMessage();

    const registering = mode === "register";

    if ($("formTitle")) {
      $("formTitle").textContent = registering
        ? "Buat Akun VEXORA"
        : "Welcome back.";
    }

    if ($("formSubtitle")) {
      $("formSubtitle").textContent = registering
        ? "Daftar untuk mulai menggunakan VEXORA."
        : "Masuk ke akun kamu untuk melanjutkan.";
    }

    const confirmGroup = $("confirmGroup");

    if (confirmGroup) {
      confirmGroup.hidden = !registering;
      confirmGroup.style.display = registering ? "block" : "none";
    }

    const confirmPassword = $("confirmPassword");

    if (confirmPassword) {
      confirmPassword.required = registering;
      confirmPassword.autocomplete = "new-password";
    }

    if ($("loginOptions")) {
      $("loginOptions").style.display = registering
        ? "none"
        : "flex";
    }

    if ($("submitText")) {
      $("submitText").textContent = registering
        ? "Daftar"
        : "Masuk ke Dashboard";
    }

    if ($("switchLink")) {
      $("switchLink").textContent = registering
        ? "Sudah punya akun? Masuk"
        : "Belum punya akun? Daftar";
    }

    if ($("loginTab")) {
      $("loginTab").classList.toggle("active", !registering);
    }

    if ($("registerTab")) {
      $("registerTab").classList.toggle("active", registering);
    }

    if ($("password")) {
      $("password").autocomplete = registering
        ? "new-password"
        : "current-password";
    }
  }

  // ---------------------------------------------------------
  // PENJELASAN ERROR
  // ---------------------------------------------------------

  function explainError(error) {
    const code = String(error?.code || "");

    console.error("[VEXORA] Auth error:", {
      code: error?.code,
      message: error?.message
    });

    switch (code) {
      case "auth/email-already-in-use":
        return "Email ini sudah terdaftar. Silakan login.";

      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "Email atau password salah.";

      case "auth/invalid-email":
        return "Format email tidak valid. Periksa kembali email kamu.";

      case "auth/weak-password":
        return "Password belum memenuhi persyaratan.";

      case "auth/user-disabled":
        return "Akun ini dinonaktifkan.";

      case "auth/too-many-requests":
        return "Terlalu banyak percobaan. Tunggu beberapa saat sebelum mencoba lagi.";

      case "auth/operation-not-allowed":
        return "Login Email/Password belum diaktifkan di Firebase Console.";

      case "auth/network-request-failed":
        return "Koneksi server gagal. Periksa internet kamu.";

      case "auth/unauthorized-domain":
        return "Domain website belum didaftarkan di Firebase (Authentication → Settings → Authorized domains).";

      case "auth/api-key-not-valid":
      case "auth/invalid-api-key":
        return "API key Firebase tidak valid. Periksa config.js.";

      default:
        return "Proses gagal. Periksa Console dan konfigurasi Firebase.";
    }
  }

  // ---------------------------------------------------------
  // URL VERIFIKASI EMAIL
  // ---------------------------------------------------------

  function getEmailRedirectUrl() {
    return new URL("index.html", window.location.href).href;
  }

  async function sendVerification(user) {
    await user.sendEmailVerification({ url: getEmailRedirectUrl() });
  }

  // ---------------------------------------------------------
  // REGISTER
  // ---------------------------------------------------------

  async function handleRegister(email, password, confirmPassword) {
    if (password.length < 8) {
      showMessage("Password minimal 8 karakter.");
      return;
    }

    if (!confirmPassword) {
      showMessage("Masukkan konfirmasi password.");
      return;
    }

    if (password !== confirmPassword) {
      showMessage("Konfirmasi password tidak cocok.");
      return;
    }

    const credential =
      await auth.createUserWithEmailAndPassword(email, password);

    try {
      await sendVerification(credential.user);
    } catch (error) {
      console.error("[VEXORA] Gagal kirim verifikasi:", error);
    }

    // Catat akun baru agar muncul di Panel Owner.
    try {
      await window.vexoraSyncUser?.(credential.user);
    } catch (error) {
      console.warn("[VEXORA] Gagal mencatat akun:", error);
    }

    // Wajib verifikasi email dulu sebelum masuk dashboard.
    await auth.signOut();

    if ($("password")) $("password").value = "";
    if ($("confirmPassword")) $("confirmPassword").value = "";

    setMode("login");

    showMessage(
      "Akun berhasil dibuat. Kami sudah mengirim tautan verifikasi — periksa kotak masuk dan folder Spam, lalu login.",
      "success"
    );
  }

  // ---------------------------------------------------------
  // LOGIN
  // ---------------------------------------------------------

  async function handleLogin(email, password) {
    const credential =
      await auth.signInWithEmailAndPassword(email, password);

    const user = credential.user;

    if (!user.emailVerified) {
      try {
        await sendVerification(user);
      } catch (error) {
        console.error("[VEXORA] Gagal kirim ulang verifikasi:", error);
      }

      await auth.signOut();

      showMessage(
        "Email belum diverifikasi. Kami kirim ulang tautan verifikasi — periksa kotak masuk dan folder Spam."
      );
      return;
    }

    // Cek ban.
    const ban = await window.vexoraIsBanned?.(user);

    if (ban) {
      await auth.signOut();

      showMessage(
        "Akun ini diblokir oleh Owner." +
          (ban.reason ? " Alasan: " + ban.reason : "")
      );
      return;
    }

    try {
      await window.vexoraSyncUser?.(user);
    } catch (error) {
      console.warn("[VEXORA] Gagal mencatat akun:", error);
    }

    showMessage(
      "Login berhasil. Membuka dashboard...",
      "success"
    );

    window.location.replace("dashboard.html");
  }

  // ---------------------------------------------------------
  // SUBMIT FORM
  // ---------------------------------------------------------

  async function handleSubmit(event) {
    event.preventDefault();

    if (busy) return;

    clearMessage();

    const email = $("email")?.value.trim().toLowerCase() || "";
    const password = $("password")?.value || "";
    const confirmPassword = $("confirmPassword")?.value || "";

    if (!email || !password) {
      showMessage("Isi email dan password terlebih dahulu.");
      return;
    }

    if (mode === "register") {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailPattern.test(email)) {
        showMessage("Masukkan alamat email yang valid.");
        return;
      }
    }

    setBusy(true);

    try {
      if (mode === "register") {
        await handleRegister(email, password, confirmPassword);
      } else {
        await handleLogin(email, password);
      }
    } catch (error) {
      showMessage(explainError(error));
    } finally {
      setBusy(false);
    }
  }

  // ---------------------------------------------------------
  // EVENT FORM
  // ---------------------------------------------------------

  const authForm = $("authForm");

  if (authForm) {
    authForm.addEventListener("submit", handleSubmit);
  } else {
    console.error("[VEXORA] Elemen authForm tidak ditemukan.");
  }

  $("loginTab")?.addEventListener("click", () => {
    if (!busy) setMode("login");
  });

  $("registerTab")?.addEventListener("click", () => {
    if (!busy) setMode("register");
  });

  $("switchLink")?.addEventListener("click", (event) => {
    event.preventDefault();

    if (busy) return;

    setMode(mode === "login" ? "register" : "login");
  });

  // ---------------------------------------------------------
  // LIHAT / SEMBUNYIKAN PASSWORD
  // ---------------------------------------------------------

  $("togglePassword")?.addEventListener("click", () => {
    const input = $("password");
    const button = $("togglePassword");

    if (!input || !button) return;

    const showing = input.type === "password";

    input.type = showing ? "text" : "password";
    button.textContent = showing ? "SEMBUNYIKAN" : "LIHAT";
  });

  // ---------------------------------------------------------
  // CEK SESI
  // ---------------------------------------------------------

  function checkExistingSession() {
    const off = auth.onAuthStateChanged((user) => {
      off();

      if (user && user.emailVerified) {
        // dashboard.js yang akan memeriksa ban dan mengeluarkan akun terblokir.
        window.location.replace("dashboard.html");
      }
    });
  }

  // ---------------------------------------------------------
  // MULAI
  // ---------------------------------------------------------

  setMode("login");
  checkExistingSession();
})();
