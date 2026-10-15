
const cfg = window.VEXORA_CONFIG || {};

const isConfigured = () =>
  cfg.SUPABASE_URL &&
  cfg.SUPABASE_ANON_KEY &&
  !cfg.SUPABASE_URL.startsWith("ISI_") &&
  !cfg.SUPABASE_ANON_KEY.startsWith("ISI_");

let supabaseClient = null;

if (isConfigured() && window.supabase?.createClient) {
  supabaseClient = window.supabase.createClient(
    cfg.SUPABASE_URL,
    cfg.SUPABASE_ANON_KEY
  );
}

let authMode = "login";
const $ = (id) => document.getElementById(id);

function setMessage(message, type = "") {
  const el = $("authMessage");
  if (!el) return;
  el.textContent = message;
  el.className = `message ${type}`;
}

function setMode(mode) {
  authMode = mode;
  const registering = mode === "register";

  $("loginTab").classList.toggle("active", !registering);
  $("registerTab").classList.toggle("active", registering);
  $("loginTab").setAttribute("aria-selected", String(!registering));
  $("registerTab").setAttribute("aria-selected", String(registering));

  $("formKicker").textContent = registering
    ? "JOIN THE TOOLSPACE" : "WELCOME TO VEXORA";
  $("formTitle").textContent = registering
    ? "Buat akun baru" : "Masuk ke akunmu";
  $("formSubtitle").textContent = registering
    ? "Buat akun untuk mulai menjelajahi VEXORA."
    : "Lanjutkan perjalanan tools digitalmu.";
  $("submitText").textContent = registering
    ? "Buat akun VEXORA" : "Masuk ke VEXORA";
  $("password").autocomplete = registering
    ? "new-password" : "current-password";
  $("passwordHint").textContent = registering
    ? "Gunakan minimal 8 karakter dan password unik."
    : "Gunakan password yang kuat dan unik.";

  setMessage("");
}

function friendlyError(error) {
  const msg = String(error?.message || "Terjadi kesalahan.");

  if (/invalid login credentials/i.test(msg))
    return "Email atau password salah.";
  if (/email not confirmed/i.test(msg))
    return "Konfirmasi email lu dulu sebelum login.";
  if (/already registered/i.test(msg))
    return "Email sudah terdaftar. Silakan login.";

  return msg;
}

async function handleAuth(event) {
  event.preventDefault();
  setMessage("");

  const email = $("email").value.trim();
  const password = $("password").value;

  if (!email) {
    setMessage("Masukkan email lu.", "error");
    return;
  }

  if (password.length < 8) {
    setMessage("Password minimal 8 karakter.", "error");
    return;
  }

  if (!supabaseClient) {
    setMessage(
      "Supabase belum siap. Periksa config.js dan library Supabase.",
      "error"
    );
    return;
  }

  const button = $("submitButton");
  button.disabled = true;
  $("submitText").textContent = "Memproses...";

  try {
    let result;

    if (authMode === "register") {
      result = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin
        }
      });

      if (result.error) throw result.error;

      if (result.data.session) {
        setMessage("Akun berhasil dibuat!", "success");
        window.location.href = "dashboard.html";
      } else {
        setMessage(
          "Pendaftaran diterima. Cek email untuk konfirmasi, lalu login.",
          "success"
        );
      }
    } else {
      result = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (result.error) throw result.error;

      setMessage("Login berhasil. Mengalihkan...", "success");
      window.location.href = "dashboard.html";
    }
  } catch (error) {
    setMessage(friendlyError(error), "error");
  } finally {
    button.disabled = false;
    $("submitText").textContent =
      authMode === "register" ? "Buat akun VEXORA" : "Masuk ke VEXORA";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  $("loginTab").addEventListener("click", () => setMode("login"));
  $("registerTab").addEventListener("click", () => setMode("register"));
  $("authForm").addEventListener("submit", handleAuth);

  $("togglePassword").addEventListener("click", () => {
    const input = $("password");
    input.type = input.type === "password" ? "text" : "password";
  });
});
