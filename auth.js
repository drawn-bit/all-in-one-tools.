(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const config = window.VEXORA_CONFIG;

  if (
    !config ||
    !config.SUPABASE_URL ||
    !config.SUPABASE_ANON_KEY ||
    !window.supabase
  ) {
    console.error("Konfigurasi Supabase belum tersedia.");
    showMessage("Koneksi belum siap. Muat ulang halaman.", true);
    return;
  }

  const supabaseClient = window.supabase.createClient(
    config.SUPABASE_URL,
    config.SUPABASE_ANON_KEY
  );

  let mode = "login";
  let busy = false;

  function showMessage(message, isError = false) {
    const el = $("formMessage");
    if (!el) return;

    el.textContent = message;
    el.style.display = "block";
    el.style.color = isError ? "#ff8585" : "#70e6ad";
  }

  function clearMessage() {
    const el = $("formMessage");
    if (!el) return;

    el.textContent = "";
    el.style.display = "none";
  }

  function setBusy(value) {
    busy = value;

    const button = $("submitBtn");
    if (button) button.disabled = value;

    const text = $("submitText");
    if (text) {
      text.textContent = value
        ? "Memproses..."
        : mode === "login"
        ? "Masuk"
        : "Daftar";
    }
  }

  function setMode(nextMode) {
    mode = nextMode === "register" ? "register" : "login";
    clearMessage();

    const registering = mode === "register";

    if ($("formTitle")) {
      $("formTitle").textContent = registering
        ? "Buat Akun VEXORA"
        : "Masuk ke VEXORA";
    }

    if ($("formSubtitle")) {
      $("formSubtitle").textContent = registering
        ? "Daftar untuk mulai menggunakan VEXORA."
        : "Masuk untuk melanjutkan.";
    }

    if ($("confirmGroup")) {
      $("confirmGroup").style.display = registering ? "block" : "none";
    }

    if ($("loginOptions")) {
      $("loginOptions").style.display = registering ? "none" : "flex";
    }

    if ($("submitText")) {
      $("submitText").textContent = registering ? "Daftar" : "Masuk";
    }

    if ($("switchLink")) {
      $("switchLink").textContent = registering
        ? "Sudah punya akun? Masuk"
        : "Belum punya akun? Daftar sekarang";
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

    if ($("confirmPassword")) {
      $("confirmPassword").required = registering;
    }
  }

  function explainError(error) {
    const message = String(error?.message || "").toLowerCase();
    const code = String(error?.code || "").toLowerCase();

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
      return "Email belum diverifikasi. Periksa kotak masuk Gmail lu.";
    }

    if (
      message.includes("user already registered") ||
      message.includes("already registered") ||
      code === "user_already_exists"
    ) {
      return "Email ini sudah terdaftar. Coba masuk saja.";
    }

    if (
      message.includes("password should be at least") ||
      message.includes("weak_password")
    ) {
      return "Password belum memenuhi persyaratan. Gunakan password yang lebih kuat.";
    }

    if (
      message.includes("invalid email") ||
      message.includes("email address") &&
      message.includes("invalid")
    ) {
      return "Format email tidak valid. Periksa kembali email lu.";
    }

    if (
      message.includes("rate limit") ||
      message.includes("too many requests") ||
      message.includes("email rate limit exceeded")
    ) {
      return "Terlalu banyak permintaan email dalam waktu singkat. Tunggu sebelum mencoba lagi atau periksa pengaturan SMTP Supabase.";
    }

    if (
      message.includes("network") ||
      message.includes("fetch") ||
      message.includes("failed to fetch")
    ) {
      return "Koneksi bermasalah. Periksa internet lalu coba lagi.";
    }

    if (
      message.includes("signup is disabled")
    ) {
      return "Pendaftaran sedang dinonaktifkan di pengaturan Supabase.";
    }

    console.error("Supabase auth error:", error);

    return "Proses gagal. Periksa koneksi dan pengaturan Supabase, lalu coba lagi.";
  }

  function getEmailRedirectUrl() {
    // Pastikan URL produksi VEXORA sudah disetel di Supabase
    // Authentication > URL Configuration.
    return new URL("index.html", window.location.href).href;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (busy) return;
    clearMessage();

    const email = $("email")?.value.trim().toLowerCase() || "";
    const password = $("password")?.value || "";
    const confirmPassword = $("confirmPassword")?.value || "";

    if (!email || !password) {
      showMessage("Isi email dan password terlebih dahulu.", true);
      return;
    }

    if (mode === "register") {
      if (!email.includes("@")) {
        showMessage("Masukkan alamat email yang valid.", true);
        return;
      }

      if (password.length < 8) {
        showMessage("Password minimal 8 karakter.", true);
        return;
      }

      if (password !== confirmPassword) {
        showMessage("Konfirmasi password tidak cocok.", true);
        return;
      }
    }

    setBusy(true);

    try {
      if (mode === "register") {
        const { data, error } = await supabaseClient.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: getEmailRedirectUrl()
          }
        });

        if (error) {
          showMessage(explainError(error), true);
          return;
        }

        if (data.session) {
          showMessage(
            "Akun berhasil dibuat. Membuka dashboard..."
          );

          window.location.replace("dashboard.html");
          return;
        }

        showMessage(
          "Pendaftaran berhasil dikirim. Buka Gmail lu, lalu klik tautan verifikasi untuk mengaktifkan akun. Kalau belum ada, periksa folder Spam."
        );

        if ($("password")) $("password").value = "";
        if ($("confirmPassword")) $("confirmPassword").value = "";
      } else {
        const { data, error } =
          await supabaseClient.auth.signInWithPassword({
            email,
            password
          });

        if (error) {
          showMessage(explainError(error), true);
          return;
        }

        if (!data.session) {
          showMessage(
            "Login belum selesai. Periksa status verifikasi email lu.",
            true
          );
          return;
        }

        showMessage("Login berhasil. Membuka dashboard...");

        window.location.replace("dashboard.html");
      }
    } catch (error) {
      showMessage(explainError(error), true);
    } finally {
      setBusy(false);
    }
  }

  $("authForm")?.addEventListener("submit", handleSubmit);

  $("loginTab")?.addEventListener("click", () => setMode("login"));
  $("registerTab")?.addEventListener("click", () => setMode("register"));

  $("switchLink")?.addEventListener("click", (event) => {
    event.preventDefault();
    setMode(mode === "login" ? "register" : "login");
  });

  $("togglePassword")?.addEventListener("click", () => {
    const input = $("password");
    if (!input) return;

    input.type = input.type === "password" ? "text" : "password";
  });

  // Jika sudah login, langsung buka dashboard.
  async function checkExistingSession() {
    try {
      const { data, error } = await supabaseClient.auth.getSession();

      if (!error && data.session) {
        window.location.replace("dashboard.html");
      }
    } catch (error) {
      console.error("Session check error:", error);
    }
  }

  setMode("login");
  checkExistingSession();
})();
