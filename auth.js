const cfg = window.VEXORA_CONFIG || {};
const isConfigured = () =>
  cfg.SUPABASE_URL && !cfg.SUPABASE_URL.startsWith("ISI_") &&
  cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_ANON_KEY.startsWith("ISI_");

let supabaseClient = null;
if (isConfigured() && window.supabase?.createClient) {
  supabaseClient = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
}

let authMode = "login";
let turnstileToken = "";
let turnstileWidgetId = null;

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
  $("formKicker").textContent = registering ? "JOIN THE TOOLSPACE" : "WELCOME TO VEXORA";
  $("formTitle").textContent = registering ? "Buat akun baru" : "Masuk ke akunmu";
  $("formSubtitle").textContent = registering ? "Buat akun untuk mulai menjelajahi VEXORA." : "Lanjutkan perjalanan tools digitalmu.";
  $("submitText").textContent = registering ? "Buat akun VEXORA" : "Masuk ke VEXORA";
  $("password").autocomplete = registering ? "new-password" : "current-password";
  $("passwordHint").textContent = registering ? "Gunakan minimal 8 karakter dan password yang unik." : "Gunakan password yang kuat dan unik.";
  setMessage("");
  resetCaptcha();
}
function resetCaptcha() {
  turnstileToken = "";
  if (window.turnstile && turnstileWidgetId !== null) {
    try { window.turnstile.reset(turnstileWidgetId); } catch (_) {}
  }
}
function initTurnstile() {
  const siteKey = cfg.TURNSTILE_SITE_KEY;
  if (!siteKey || siteKey.startsWith("ISI_")) {
    $("captchaHint").textContent = "Turnstile belum dikonfigurasi. Isi site key dan aktifkan CAPTCHA di Supabase sebelum produksi.";
    return;
  }
  if (!window.turnstile) {
    setTimeout(initTurnstile, 300);
    return;
  }
  if (turnstileWidgetId !== null) return;
  $("captchaHint").textContent = "Selesaikan verifikasi Cloudflare sebelum mengirim form.";
  turnstileWidgetId = window.turnstile.render("#turnstileWidget", {
    sitekey: siteKey,
    theme: "dark",
    callback: (token) => { turnstileToken = token; },
    "expired-callback": () => { turnstileToken = ""; },
    "error-callback": () => { turnstileToken = ""; }
  });
}
function getCaptchaToken() {
  const siteKey = cfg.TURNSTILE_SITE_KEY;
  if (!siteKey || siteKey.startsWith("ISI_")) return null;
  return turnstileToken || null;
}
function friendlyError(error) {
  const msg = String(error?.message || "Terjadi kesalahan.");
  if (/captcha/i.test(msg)) return "Verifikasi Cloudflare belum valid. Coba verifikasi lagi.";
  if (/invalid login credentials/i.test(msg)) return "Email atau password salah.";
  if (/email not confirmed/i.test(msg)) return "Cek email untuk mengonfirmasi akun terlebih dahulu.";
  if (/already registered/i.test(msg)) return "Email ini sudah terdaftar. Silakan masuk.";
  return msg;
}
async function handleAuth(event) {
  event.preventDefault();
  setMessage("");
  const email = $("email").value.trim();
  const password = $("password").value;
  if (password.length < 8) {
    setMessage("Password minimal 8 karakter.", "error");
    return;
  }
  if (!supabaseClient) {
    setMessage("Supabase belum disiapkan. Isi config.js dan ikuti README_SETUP.md.", "error");
    return;
  }
  const captchaToken = getCaptchaToken();
  if (cfg.TURNSTILE_SITE_KEY && !cfg.TURNSTILE_SITE_KEY.startsWith("ISI_") && !captchaToken) {
    setMessage("Selesaikan verifikasi Cloudflare dulu.", "error");
    return;
  }
  const button = $("submitButton");
  button.disabled = true;
  $("submitText").textContent = "Memproses...";
  try {
    let result;
    if (authMode === "register") {
      const options = { emailRedirectTo: window.location.origin };
      if (captchaToken) options.captchaToken = captchaToken;
      result = await supabaseClient.auth.signUp({ email, password, options });
      if (result.error) throw result.error;
      if (result.data.session) {
        setMessage("Akun berhasil dibuat. Menyiapkan dashboard…", "success");
        window.location.href = "dashboard.html";
      } else {
        setMessage("Pendaftaran diterima. Cek email untuk konfirmasi akun, lalu masuk.", "success");
      }
    } else {
      const options = {};
      if (captchaToken) options.captchaToken = captchaToken;
      result = await supabaseClient.auth.signInWithPassword({ email, password, options });
      if (result.error) throw result.error;
      setMessage("Login berhasil. Mengalihkan…", "success");
      window.location.href = "dashboard.html";
    }
  } catch (error) {
    setMessage(friendlyError(error), "error");
  } finally {
    button.disabled = false;
    $("submitText").textContent = authMode === "register" ? "Buat akun VEXORA" : "Masuk ke VEXORA";
    resetCaptcha();
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
  initTurnstile();
});
