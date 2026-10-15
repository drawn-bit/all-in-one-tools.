/*
  KONFIGURASI PUBLIK FRONTEND VEXORA
  Isi setelah membuat project Supabase dan Cloudflare Turnstile.
  Supabase anon/publishable key boleh dipakai di browser jika RLS aman.
  JANGAN taruh service_role/secret key di file ini.
*/
window.VEXORA_CONFIG = {
  SUPABASE_URL: "ISI_SUPABASE_PROJECT_URL",
  SUPABASE_ANON_KEY: "ISI_SUPABASE_PUBLISHABLE_ATAU_ANON_KEY",
  TURNSTILE_SITE_KEY: "ISI_CLOUDFLARE_TURNSTILE_SITE_KEY"
};
