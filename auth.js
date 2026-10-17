
/* =========================================================
   VEXORA AUTH SYSTEM
   Login • Register • Email Verification
   Duplicate Email Handling • Password Toggle
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
  // CEK KONFIGURASI
  // ---------------------------------------------------------

  if (
    !config ||
    !config.SUPABASE_URL ||
    !config.SUPABASE_ANON_KEY ||
    !window.supabase ||
    typeof window.supabase.createClient !== "function"
  ) {
    console.error(
      "[VEXORA] Supabase config atau library belum tersedia."
    );

    showMessage(
      "Koneksi belum siap. Periksa config.js dan koneksi internet."
    );

    return;
  }

  let supabaseClient;

  try {
    supabaseClient = window.supabase.createClient(
      config.SUPABASE_URL,
      config.SUPABASE_ANON_KEY
    );
  } catch (error) {
    console.error("[VEXORA] Gagal membuat client:", error);

    showMessage(
      "Koneksi autentikasi gagal disiapkan. Muat ulang halaman."
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
    const originalMessage = String(error?.message || "");
    const message = originalMessage.toLowerCase();
    const code = String(error?.code || "").toLowerCase();
    const status = Number(error?.status || 0);

    console.error("[VEXORA] Auth error:", {
      message: originalMessage,
      code: error?.code,
      status: error?.status,
      name: error?.name
    });

    if (
      code === "user_already_exists" ||
      code === "email_exists" ||
      message.includes("user already registered") ||
      message.includes("already registered") ||
      message.includes("user already exists") ||
      message.includes("email already exists") ||
      message.includes("email_exists")
    ) {
      return "Email ini sudah terdaftar. Silakan login.";
    }

    if (
      message.includes("invalid login credentials") ||
      code === "invalid_credentials"
    ) {
      return "Email atau password salah.";
    }

    if (
      message.includes("email not confirmed") ||
      code === "email_not_confirmed"
    ) {
      return "Email belum diverifikasi. Periksa kotak masuk dan folder Spam.";
    }

    if (
      message.includes("password should be at least") ||
      message.includes("weak_password")
    ) {
      return "Password belum memenuhi persyaratan.";
    }

    if (
      message.includes("invalid email") ||
      (
        message.includes("email address") &&
        message.includes("invalid")
      )
    ) {
      return "Format email tidak valid. Periksa kembali email kamu.";
    }

    if (
      message.includes("rate limit") ||
      message.includes("too many requests") ||
      message.includes("email rate limit exceeded") ||
      status === 429
    ) {
      return "Terlalu banyak permintaan. Tunggu beberapa saat sebelum mencoba lagi.";
    }

    if (
      message.includes("signup is disabled") ||
      message.includes("signups not allowed")
    ) {
      return "Pendaftaran sedang dinonaktifkan.";
    }

    if (
      message.includes("failed to fetch") ||
      message.includes("network request failed") ||
      message.includes("fetch failed") ||
      message.includes("networkerror") ||
      error?.name === "TypeError"
    ) {
      return "Koneksi server gagal. Periksa internet dan konfigurasi Supabase.";
    }

    if (status >= 500) {
      return "Server autentikasi sedang bermasalah. Coba lagi nanti.";
    }

    if (status === 400) {
      return "Permintaan ditolak. Periksa email, password, dan konfigurasi Supabase.";
    }

    if (status === 401 || status === 403) {
      return "Akses ditolak. Periksa konfigurasi Supabase.";
    }

    return "Proses gagal. Periksa Console dan Supabase Auth Logs.";
  }

  // ---------------------------------------------------------
  // URL VERIFIKASI EMAIL
  // ---------------------------------------------------------

  function getEmailRedirectUrl() {
    return new URL("index.html", window.location.href).href;
  }

  // ---------------------------------------------------------
  // DETEKSI RESPONS EMAIL DUPLIKAT
  // ---------------------------------------------------------

  function isDuplicateEmailResponse(data) {
    /*
     * Supabase dapat mengembalikan user dengan identities
     * kosong ketika email sudah terdaftar.
     *
     * Pengecekan ini hanya mengenali pola respons tersebut.
     * Ini bukan cara untuk menjamin semua akun lama terdeteksi.
     */
    return Boolean(
      data?.user &&
      Array.isArray(data.user.identities) &&
      data.user.identities.length === 0
    );
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

    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getEmailRedirectUrl()
      }
    });

    if (error) {
      showMessage(explainError(error));
      return;
    }

    if (isDuplicateEmailResponse(data)) {
      showMessage(
        "Email ini kemungkinan sudah terdaftar. Silakan coba login."
      );
      return;
    }

    if (data?.session) {
      showMessage(
        "Akun berhasil dibuat. Membuka dashboard...",
        "success"
      );

      window.location.replace("dashboard.html");
      return;
    }

    showMessage(
      "Permintaan pendaftaran diproses. Jika email memenuhi syarat, periksa kotak masuk dan folder Spam untuk tautan verifikasi. Jika akun sudah ada, silakan login.",
      "success"
    );

    if ($("password")) $("password").value = "";
    if ($("confirmPassword")) $("confirmPassword").value = "";
  }

  // ---------------------------------------------------------
  // LOGIN
  // ---------------------------------------------------------

  async function handleLogin(email, password) {
    const { data, error } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

    if (error) {
      showMessage(explainError(error));
      return;
    }

    if (!data?.session) {
      showMessage(
        "Login belum selesai. Periksa status verifikasi email."
      );
      return;
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

  async function checkExistingSession() {
    try {
      const { data, error } =
        await supabaseClient.auth.getSession();

      if (!error && data?.session) {
        window.location.replace("dashboard.html");
      }
    } catch (error) {
      console.error("[VEXORA] Session check:", error);
    }
  }

  // ---------------------------------------------------------
  // MULAI
  // ---------------------------------------------------------

  setMode("login");
  checkExistingSession();
})();
      
