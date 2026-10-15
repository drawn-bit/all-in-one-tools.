(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const config = window.VEXORA_CONFIG;

  // ==============================
  // CEK KONFIGURASI SUPABASE
  // ==============================

  function showMessage(message, type = "error") {
    const el = $("formMessage");
    if (!el) return;

    el.textContent = message;
    el.className = "form-message show " + type;
    el.setAttribute("role", "status");
  }

  function clearMessage() {
    const el = $("formMessage");
    if (!el) return;

    el.textContent = "";
    el.className = "form-message";
  }

  if (
    !config ||
    !config.SUPABASE_URL ||
    !config.SUPABASE_ANON_KEY ||
    !window.supabase
  ) {
    console.error(
      "VEXORA: Supabase config atau library belum tersedia."
    );

    showMessage(
      "Koneksi belum siap. Periksa config.js dan koneksi internet."
    );

    return;
  }

  const supabaseClient = window.supabase.createClient(
    config.SUPABASE_URL,
    config.SUPABASE_ANON_KEY
  );

  let mode = "login";
  let busy = false;

  // ==============================
  // TOMBOL PROSES
  // ==============================

  function setBusy(value) {
    busy = value;

    const button = $("submitBtn");
    const text = $("submitText");

    if (button) {
      button.disabled = value;
    }

    if (text) {
      if (value) {
        text.textContent = "Memproses...";
      } else {
        text.textContent =
          mode === "register"
            ? "Daftar"
            : "Masuk ke Dashboard";
      }
    }
  }

  // ==============================
  // MODE LOGIN / REGISTER
  // ==============================

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

    // FIX: konfirmasi password harus terlihat saat Register.
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
      $("loginTab").classList.toggle(
        "active",
        !registering
      );
    }

    if ($("registerTab")) {
      $("registerTab").classList.toggle(
        "active",
        registering
      );
    }

    if ($("password")) {
      $("password").autocomplete = registering
        ? "new-password"
        : "current-password";
    }
  }

  // ==============================
  // PESAN ERROR SUPABASE
  // ==============================

  function explainError(error) {
    const message = String(
      error?.message || ""
    ).toLowerCase();

    const code = String(
      error?.code || ""
    ).toLowerCase();

    const status = Number(error?.status || 0);

    // Detail ini membantu mencari penyebab di Console.
    console.error("VEXORA Auth Error:", {
      message: error?.message,
      code: error?.code,
      status: error?.status,
      name: error?.name
    });

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
      message.includes("user already registered") ||
      message.includes("already registered") ||
      code === "user_already_exists"
    ) {
      return "Email ini sudah terdaftar. Silakan login.";
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
      return "Pendaftaran dinonaktifkan di pengaturan Supabase.";
    }

    if (
      message.includes("failed to fetch") ||
      message.includes("network request failed") ||
      message.includes("fetch failed") ||
      message.includes("networkerror") ||
      error?.name === "TypeError"
    ) {
      return "Koneksi ke server gagal. Periksa internet dan URL Supabase.";
    }

    if (status >= 500) {
      return "Server autentikasi bermasalah. Coba lagi nanti dan periksa Supabase Logs.";
    }

    if (status === 400) {
      return "Permintaan ditolak. Periksa email, password, dan konfigurasi Supabase.";
    }

    if (status === 401 || status === 403) {
      return "Akses ditolak. Periksa konfigurasi Supabase.";
    }

    return "Proses gagal. Periksa Supabase Auth Logs untuk mengetahui penyebabnya.";
  }

  // ==============================
  // URL VERIFIKASI EMAIL
  // ==============================

  function getEmailRedirectUrl() {
    return new URL(
      "index.html",
      window.location.href
    ).href;
  }

  // ==============================
  // LOGIN DAN PENDAFTARAN
  // ==============================

  async function handleSubmit(event) {
    event.preventDefault();

    if (busy) return;

    clearMessage();

    const email = $("email")?.value
      .trim()
      .toLowerCase() || "";

    const password = $("password")?.value || "";

    const confirmPassword =
      $("confirmPassword")?.value || "";

    // Validasi umum.
    if (!email || !password) {
      showMessage(
        "Isi email dan password terlebih dahulu."
      );
      return;
    }

    // Validasi khusus pendaftaran.
    if (mode === "register") {
      const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailPattern.test(email)) {
        showMessage(
          "Masukkan alamat email yang valid."
        );
        return;
      }

      if (password.length < 8) {
        showMessage(
          "Password minimal 8 karakter."
        );
        return;
      }

      if (!confirmPassword) {
        showMessage(
          "Masukkan konfirmasi password."
        );
        return;
      }

      if (password !== confirmPassword) {
        showMessage(
          "Konfirmasi password tidak cocok."
        );
        return;
      }
    }

    setBusy(true);

    try {
      // REGISTER
      if (mode === "register") {
        const { data, error } =
          await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: {
              emailRedirectTo: getEmailRedirectUrl()
            }
          });

        if (error) {
          showMessage(explainError(error));
          return;
        }

        // Jika sesi langsung tersedia.
        if (data?.session) {
          showMessage(
            "Akun berhasil dibuat. Membuka dashboard...",
            "success"
          );

          window.location.replace("dashboard.html");
          return;
        }

        // Jika verifikasi email diperlukan.
        showMessage(
          "Pendaftaran berhasil dikirim! Buka email kamu dan klik tautan verifikasi untuk mengaktifkan akun. Periksa folder Spam jika belum masuk.",
          "success"
        );

        if ($("password")) {
          $("password").value = "";
        }

        if ($("confirmPassword")) {
          $("confirmPassword").value = "";
        }

        return;
      }

      // LOGIN
      const { data, error } =
        await supabaseClient.auth.signInWithPassword({
          email: email,
          password: password
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

    } catch (error) {
      showMessage(explainError(error));
    } finally {
      setBusy(false);
    }
  }

  // ==============================
  // EVENT FORM
  // ==============================

  const authForm = $("authForm");

  if (authForm) {
    authForm.addEventListener(
      "submit",
      handleSubmit
    );
  } else {
    console.error("Elemen authForm tidak ditemukan.");
  }

  if ($("loginTab")) {
    $("loginTab").addEventListener(
      "click",
      () => setMode("login")
    );
  }

  if ($("registerTab")) {
    $("registerTab").addEventListener(
      "click",
      () => setMode("register")
    );
  }

  if ($("switchLink")) {
    $("switchLink").addEventListener(
      "click",
      (event) => {
        event.preventDefault();

        setMode(
          mode === "login" ? "register" : "login"
        );
      }
    );
  }

  // ==============================
  // LIHAT / SEMBUNYIKAN PASSWORD
  // ==============================

  if ($("togglePassword")) {
    $("togglePassword").addEventListener(
      "click",
      () => {
        const input = $("password");
        const button = $("togglePassword");

        if (!input) return;

        const showing = input.type === "password";

        input.type = showing ? "text" : "password";

        if (button) {
          button.textContent = showing
            ? "SEMBUNYIKAN"
            : "LIHAT";
        }
      }
    );
  }

  // ==============================
  // CEK SESI LOGIN
  // ==============================

  async function checkExistingSession() {
    try {
      const { data, error } =
        await supabaseClient.auth.getSession();

      if (!error && data?.session) {
        window.location.replace("dashboard.html");
      }
    } catch (error) {
      console.error(
        "VEXORA session check error:",
        error
      );
    }
  }

  // ==============================
  // MULAI
  // ==============================

  setMode("login");
  checkExistingSession();

})();
