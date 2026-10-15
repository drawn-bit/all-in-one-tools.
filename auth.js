(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const config = window.VEXORA_CONFIG;

  if (
    !config?.SUPABASE_URL ||
    !config?.SUPABASE_ANON_KEY ||
    !window.supabase
  ) {
    console.error("Supabase config atau library belum dimuat.");
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

    if ($("submitBtn")) {
      $("submitBtn").disabled = value;
    }

    if ($("submitText")) {
      $("submitText").textContent = value
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
    const status = Number(error?.status || 0);

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
      return "Email ini sudah terdaftar. Silakan masuk.";
    }

    if (
      message.includes("password should be at least") ||
      message.includes("weak_password")
    ) {
      return "Password terlalu lemah. Gunakan password yang lebih kuat.";
    }

    if (
      message.includes("invalid email") ||
      (message.includes("email address") &&
        message.includes("invalid"))
    ) {
      return "Format email tidak valid. Periksa kembali email lu.";
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
      return "Pendaftaran dinonaktifkan. Periksa pengaturan signup Supabase.";
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
      return "Server autentikasi sedang bermasalah. Coba lagi nanti dan periksa Supabase Logs.";
    }

    if (status === 400) {
      return "Permintaan pendaftaran ditolak. Periksa email, password, dan pengaturan Supabase.";
    }

    if (status === 401 || status === 403) {
      return "Permintaan ditolak server. Periksa konfigurasi Supabase dan API key publik.";
    }

    return "Pendaftaran atau login gagal. Periksa Supabase Auth Logs untuk mengetahui penyebabnya.";
  }

  function getEmailRedirectUrl() {
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
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailPattern.test(email)) {
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

        if (data?.session) {
          showMessage("Akun berhasil dibuat. Membuka dashboard...");
          window.location.replace("dashboard.html");
          return;
        }

        showMessage(
          "Permintaan pendaftaran berhasil. Buka email lu dan klik tautan verifikasi untuk mengaktifkan akun. Periksa folder Spam jika email belum masuk."
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

        if (!data?.session) {
          showMessage(
            "Login belum selesai. Periksa verifikasi email lu.",
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

    input.type =
      input.type === "password" ? "text" : "password";
  });

  async function checkExistingSession() {
    try {
      const { data, error } =
        await supabaseClient.auth.getSession();

      if (!error && data?.session) {
        window.location.replace("dashboard.html");
      }
    } catch (error) {
      console.error("Session check error:", error);
    }
  }

  setMode("login");
  checkExistingSession();
})();
