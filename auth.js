(function () {
  "use strict";

  const config = window.VEXORA_CONFIG;

  const form = document.getElementById("authForm");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const confirmInput = document.getElementById("confirmPassword");

  const confirmGroup = document.getElementById("confirmGroup");
  const loginOptions = document.getElementById("loginOptions");

  const loginTab = document.getElementById("loginTab");
  const registerTab = document.getElementById("registerTab");
  const switchLink = document.getElementById("switchLink");

  const formTitle = document.getElementById("formTitle");
  const formSubtitle = document.getElementById("formSubtitle");
  const submitBtn = document.getElementById("submitBtn");
  const submitText = document.getElementById("submitText");
  const messageBox = document.getElementById("formMessage");
  const togglePassword = document.getElementById("togglePassword");

  let mode = "login";
  let supabaseClient = null;

  function showMessage(message, type) {
    messageBox.textContent = message;
    messageBox.className = "form-message show " + type;
  }

  function clearMessage() {
    messageBox.textContent = "";
    messageBox.className = "form-message";
  }

  function setLoading(loading) {
    submitBtn.disabled = loading;
    loginTab.disabled = loading;
    registerTab.disabled = loading;

    submitText.textContent = loading
      ? "Memproses..."
      : mode === "login"
        ? "Masuk ke Dashboard"
        : "Buat Akun";
  }

  function setMode(nextMode) {
    mode = nextMode;
    clearMessage();

    const registering = mode === "register";

    loginTab.classList.toggle("active", !registering);
    registerTab.classList.toggle("active", registering);

    confirmGroup.hidden = !registering;
    confirmInput.required = registering;
    loginOptions.hidden = registering;

    formTitle.textContent = registering
      ? "Create account."
      : "Welcome back.";

    formSubtitle.textContent = registering
      ? "Daftar untuk mulai menggunakan VEXORA."
      : "Masuk ke akun kamu untuk melanjutkan.";

    passwordInput.autocomplete = registering
      ? "new-password"
      : "current-password";

    submitText.textContent = registering
      ? "Buat Akun"
      : "Masuk ke Dashboard";

    switchLink.textContent = registering
      ? "Sudah punya akun? Login"
      : "Belum punya akun? Daftar";
  }

  function readableError(error) {
    const message = String(error?.message || "").toLowerCase();

    if (message.includes("invalid login credentials")) {
      return "Email atau password salah.";
    }

    if (message.includes("email not confirmed")) {
      return "Email belum dikonfirmasi. Periksa inbox email kamu.";
    }

    if (
      message.includes("user already registered") ||
      message.includes("already been registered")
    ) {
      return "Email ini sudah terdaftar. Silakan login.";
    }

    if (message.includes("password should be at least")) {
      return "Password terlalu pendek.";
    }

    if (message.includes("rate limit")) {
      return "Terlalu banyak percobaan. Coba lagi nanti.";
    }

    if (
      message.includes("failed to fetch") ||
      message.includes("network")
    ) {
      return "Koneksi gagal. Periksa internet dan konfigurasi Supabase.";
    }

    return error?.message || "Terjadi kesalahan. Coba lagi.";
  }

  function initSupabase() {
    if (!window.supabase || !window.supabase.createClient) {
      showMessage(
        "Library Supabase gagal dimuat. Periksa koneksi internet lalu refresh.",
        "error"
      );
      return false;
    }

    if (
      !config ||
      !config.SUPABASE_URL ||
      !config.SUPABASE_ANON_KEY
    ) {
      showMessage(
        "Konfigurasi Supabase belum lengkap. Periksa file config.js.",
        "error"
      );
      return false;
    }

    try {
      supabaseClient = window.supabase.createClient(
        config.SUPABASE_URL,
        config.SUPABASE_ANON_KEY
      );

      return true;
    } catch (error) {
      console.error("Supabase initialization error:", error);
      showMessage("Supabase gagal diinisialisasi. Periksa config.js.", "error");
      return false;
    }
  }

  loginTab.addEventListener("click", function () {
    setMode("login");
  });

  registerTab.addEventListener("click", function () {
    setMode("register");
  });

  switchLink.addEventListener("click", function (event) {
    event.preventDefault();
    setMode(mode === "login" ? "register" : "login");
  });

  togglePassword.addEventListener("click", function () {
    const visible = passwordInput.type === "password";

    passwordInput.type = visible ? "text" : "password";
    togglePassword.textContent = visible ? "SEMBUNYIKAN" : "LIHAT";
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    clearMessage();

    if (!initSupabase()) {
      return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      showMessage("Isi email dan password terlebih dahulu.", "error");
      return;
    }

    if (password.length < 6) {
      showMessage("Password minimal 6 karakter.", "error");
      return;
    }

    if (mode === "register") {
      if (password !== confirmInput.value) {
        showMessage("Konfirmasi password tidak cocok.", "error");
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === "register") {
        const { data, error } = await supabaseClient.auth.signUp({
          email: email,
          password: password
        });

        if (error) throw error;

        if (data.session) {
          showMessage("Pendaftaran berhasil! Mengalihkan ke dashboard...", "success");

          window.location.replace("dashboard.html");
        } else {
          showMessage(
            "Pendaftaran berhasil. Periksa email kamu untuk konfirmasi akun, lalu login.",
            "success"
          );

          setMode("login");
          emailInput.value = email;
          passwordInput.value = "";
          confirmInput.value = "";
        }
      } else {
        const { data, error } =
          await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
          });

        if (error) throw error;

        if (!data.session) {
          showMessage(
            "Login belum menghasilkan sesi. Coba lagi.",
            "error"
          );
          return;
        }

        showMessage("Login berhasil! Membuka dashboard...", "success");

        window.location.replace("dashboard.html");
      }
    } catch (error) {
      console.error("VEXORA authentication error:", error);
      showMessage(readableError(error), "error");
    } finally {
      setLoading(false);
    }
  });

  // Persiapkan form dan cek konfigurasi tanpa menahan intro loading.
  setMode("login");
  initSupabase();
})();
