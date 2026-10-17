
/* =========================================================
   VEXORA EXTRAS
   Menu • Profile • Settings • Updates
   Compatible with existing dashboard.html / dashboard.js
   ========================================================= */
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const SETTINGS_KEY = "vexora_dashboard_preferences";

  function readSettings() {
    try {
      return {
        accent: "cyan",
        animations: true,
        compact: false,
        notifications: true,
        ...(JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"))
      };
    } catch {
      return {
        accent: "cyan",
        animations: true,
        compact: false,
        notifications: true
      };
    }
  }

  let settings = readSettings();

  function saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.warn("[VEXORA] Preferences could not be saved.", error);
    }
    applySettings();
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[c]);
  }

  function applySettings() {
    document.documentElement.dataset.accent = settings.accent;
    document.body.classList.toggle("vexora-compact", !!settings.compact);
    document.body.classList.toggle("vexora-no-animations", !settings.animations);
  }

  function addStyles() {
    if ($("vexoraExtrasStyles")) return;

    const style = document.createElement("style");
    style.id = "vexoraExtrasStyles";
    style.textContent = `
      :root {
        --vx-accent: #38d9ff;
        --vx-accent-rgb: 56,217,255;
      }
      :root[data-accent="blue"] {
        --vx-accent: #5793ff;
        --vx-accent-rgb: 87,147,255;
      }
      :root[data-accent="purple"] {
        --vx-accent: #b18aff;
        --vx-accent-rgb: 177,138,255;
      }
      :root[data-accent="cyan"] {
        --vx-accent: #38d9ff;
        --vx-accent-rgb: 56,217,255;
      }

      .vx-panel {
        background: linear-gradient(145deg,#101d32,#0a1221);
        border: 1px solid #263b59;
        border-radius: 17px;
        padding: 20px;
        margin: 16px 0;
        min-width: 0;
        box-shadow: 0 12px 32px #0002;
      }
      .vx-panel h2,.vx-panel h3 { margin-top: 0; }
      .vx-muted { color: #91a2bd; font-size: 12px; line-height: 1.7; }
      .vx-kicker {
        color: var(--vx-accent);
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 1.8px;
        text-transform: uppercase;
      }
      .vx-info-grid {
        display: grid;
        grid-template-columns: repeat(2,minmax(0,1fr));
        gap: 12px;
        margin-top: 16px;
      }
      .vx-info {
        background: #0a1426;
        border: 1px solid #243751;
        border-radius: 13px;
        padding: 14px;
        min-width: 0;
      }
      .vx-info span {
        display: block;
        color: #91a2bd;
        font-size: 10px;
        margin-bottom: 7px;
      }
      .vx-info strong {
        display: block;
        font-size: 13px;
        overflow-wrap: anywhere;
      }
      .vx-chip {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        background: rgba(var(--vx-accent-rgb),.1);
        color: var(--vx-accent);
        border: 1px solid rgba(var(--vx-accent-rgb),.25);
        padding: 7px 10px;
        border-radius: 30px;
        font-size: 10px;
        font-weight: 800;
      }
      .vx-setting-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 14px;
        padding: 15px 0;
        border-bottom: 1px solid #24334b;
      }
      .vx-setting-row:last-child { border-bottom: 0; }
      .vx-setting-row strong { display:block; font-size:12px; }
      .vx-setting-row p { margin:5px 0 0; }
      .vx-control {
        max-width: 150px;
        width: 100%;
        color: #edf5ff;
        background: #0a1426;
        border: 1px solid #2a4263;
        border-radius: 10px;
        padding: 10px;
      }
      .vx-switch {
        appearance: none;
        width: 43px;
        height: 24px;
        flex-shrink: 0;
        border-radius: 30px;
        background: #27354a;
        border: 1px solid #41516a;
        position: relative;
        cursor: pointer;
      }
      .vx-switch:before {
        content: "";
        position: absolute;
        width: 16px;
        height: 16px;
        top: 3px;
        left: 3px;
        border-radius: 50%;
        background: #c5d1e3;
        transition: transform .2s;
      }
      .vx-switch:checked {
        background: #075a77;
        border-color: var(--vx-accent);
      }
      .vx-switch:checked:before {
        transform: translateX(19px);
        background: var(--vx-accent);
      }
      .vx-action {
        border: 1px solid #2c4b73;
        background: #142743;
        color: #e9f5ff;
        border-radius: 10px;
        padding: 10px 13px;
        font-size: 11px;
        font-weight: 700;
      }
      .vx-action:hover {
        border-color: var(--vx-accent);
        box-shadow: 0 0 14px rgba(var(--vx-accent-rgb),.12);
      }
      .vx-update {
        position: relative;
        padding: 15px 15px 15px 20px;
        margin-top: 12px;
        border: 1px solid #263b59;
        border-radius: 13px;
        background: #0b1629;
      }
      .vx-update:before {
        content: "";
        position: absolute;
        top: 18px;
        bottom: 18px;
        left: 0;
        width: 3px;
        background: var(--vx-accent);
        border-radius: 5px;
      }
      .vx-update h3 { font-size: 13px; margin: 9px 0 6px; }
      .vx-update p { font-size: 11px; line-height: 1.7; color: #a6b6ce; margin: 0; }
      .vx-featured-note {
        color: #91a2bd;
        font-size: 10px;
        margin: 9px 0 0;
      }
      .vexora-no-animations *, .vexora-no-animations *:before,
      .vexora-no-animations *:after {
        animation: none !important;
        transition: none !important;
        scroll-behavior: auto !important;
      }
      .vexora-compact .tool-card { padding: 11px; }
      .vexora-compact .tool-card h3 { margin-top: 9px; }

      @media(max-width:520px) {
        .vx-panel { padding: 15px; }
        .vx-info-grid { gap: 8px; }
        .vx-info { padding: 11px; }
        .vx-info strong { font-size: 12px; }
        .vx-setting-row { align-items: flex-start; }
      }
    `;
    document.head.appendChild(style);
  }

  function getDeviceInfo() {
    const ua = navigator.userAgent || "";
    let device = "Perangkat tidak dikenali";

    if (/Android/i.test(ua)) {
      device = "Android";
    } else if (/iPhone|iPad|iPod/i.test(ua)) {
      device = "iPhone / iPad";
    } else if (/Windows/i.test(ua)) {
      device = "Windows";
    } else if (/Macintosh|Mac OS X/i.test(ua)) {
      device = "macOS";
    } else if (/Linux/i.test(ua)) {
      device = "Linux";
    }

    let browser = "Browser tidak dikenali";
    if (/Edg\//i.test(ua)) browser = "Microsoft Edge";
    else if (/SamsungBrowser/i.test(ua)) browser = "Samsung Internet";
    else if (/OPR\//i.test(ua)) browser = "Opera";
    else if (/Firefox\//i.test(ua)) browser = "Firefox";
    else if (/CriOS\//i.test(ua)) browser = "Chrome iOS";
    else if (/Chrome\//i.test(ua)) browser = "Chrome";
    else if (/Safari\//i.test(ua)) browser = "Safari";

    return { device, browser };
  }

  async function getBatteryText() {
    if (typeof navigator.getBattery !== "function") {
      return "Tidak didukung browser";
    }

    try {
      const battery = await navigator.getBattery();
      const render = () => {
        const percent = Math.round(battery.level * 100);
        return `${percent}%${battery.charging ? " · Mengisi daya" : ""}`;
      };

      const value = render();
      battery.addEventListener("levelchange", updateDeviceInfo);
      battery.addEventListener("chargingchange", updateDeviceInfo);
      return value;
    } catch {
      return "Tidak tersedia";
    }
  }

  function getCurrentUser() {
    try {
      const client = window.vexoraGetClient?.() ||
        window.vexoraSupabase ||
        window.supabaseClient ||
        window.sb;

      return client?.auth?.getUser
        ? client.auth.getUser()
        : Promise.resolve({ data: { user: null }, error: null });
    } catch {
      return Promise.resolve({ data: { user: null }, error: null });
    }
  }

  function getRole(user) {
    const role = String(
      user?.app_metadata?.role ||
      user?.user_metadata?.role ||
      window.vexoraGetRole?.() ||
      "member"
    ).toLowerCase();

    return role === "owner" ? "OWNER" : role === "vip" ? "VIP" : "MEMBER";
  }

  function infoCard(label, value, id) {
    return `<div class="vx-info"><span>${escapeHTML(label)}</span><strong id="${id}">${escapeHTML(value)}</strong></div>`;
  }

  function addMenuDeviceCard() {
    const menu = $("page-menu");
    if (!menu || $("vxMenuDeviceCard")) return;

    const card = document.createElement("section");
    card.className = "vx-panel";
    card.id = "vxMenuDeviceCard";
    card.innerHTML = `
      <div class="vx-kicker">Account snapshot</div>
      <h2 style="font-size:17px;margin:9px 0 5px">Info Akun & Perangkat</h2>
      <p class="vx-muted" style="margin:0">Ringkasan akun yang sedang kamu gunakan.</p>
      <div class="vx-info-grid">
        ${infoCard("EMAIL AKUN", "Memuat...", "vxMenuEmail")}
        ${infoCard("ROLE AKUN", "MEMBER", "vxMenuRole")}
        ${infoCard("PERANGKAT", "Memeriksa...", "vxMenuDevice")}
        ${infoCard("BROWSER", "Memeriksa...", "vxMenuBrowser")}
        ${infoCard("BATERAI", "Memeriksa...", "vxMenuBattery")}
        ${infoCard("STATUS SESI", "Aktif di halaman ini", "vxMenuSession")}
      </div>
      <p class="vx-featured-note">Informasi perangkat berasal dari browser. Persentase baterai hanya muncul jika browser mendukungnya.</p>
    `;

    const stats = menu.querySelector(".stats");
    if (stats) stats.insertAdjacentElement("afterend", card);
    else menu.prepend(card);
  }

  function addProfileDetails() {
    const page = $("page-profile");
    if (!page || $("vxProfileDetails")) return;

    const details = document.createElement("section");
    details.className = "vx-panel";
    details.id = "vxProfileDetails";
    details.innerHTML = `
      <div class="vx-kicker">Personal account</div>
      <h2 style="font-size:18px;margin:9px 0 5px">Detail Akun</h2>
      <p class="vx-muted" style="margin:0">Informasi sesi dan perangkat saat ini.</p>
      <div class="vx-info-grid">
        ${infoCard("EMAIL", "Memuat...", "vxProfileEmail")}
        ${infoCard("ROLE", "MEMBER", "vxProfileRole")}
        ${infoCard("PERANGKAT", "Memeriksa...", "vxProfileDevice")}
        ${infoCard("BROWSER", "Memeriksa...", "vxProfileBrowser")}
        ${infoCard("BATERAI", "Memeriksa...", "vxProfileBattery")}
        ${infoCard("BAHASA BROWSER", navigator.language || "Tidak tersedia", "vxProfileLanguage")}
        ${infoCard("LAYAR", `${screen.width} × ${screen.height}`, "vxProfileScreen")}
        ${infoCard("STATUS", "Sesi lokal", "vxProfileSession")}
      </div>
      <p class="vx-featured-note">VEXORA tidak menampilkan IP publik atau lokasi presisi di halaman ini.</p>
    `;

    page.appendChild(details);
  }

  function addSettings() {
    const page = $("page-settings");
    if (!page || $("vxSettingsPanel")) return;

    const panel = document.createElement("section");
    panel.className = "vx-panel";
    panel.id = "vxSettingsPanel";
    panel.innerHTML = `
      <div class="vx-kicker">Personalization</div>
      <h2 style="font-size:19px;margin:9px 0 5px">Pengaturan VEXORA</h2>
      <p class="vx-muted">Sesuaikan pengalaman dashboard kamu. Pilihan ini disimpan di browser perangkat ini.</p>

      <div class="vx-setting-row">
        <div><strong>Warna aksen</strong><p class="vx-muted">Pilih warna neon dashboard.</p></div>
        <select id="vxAccent" class="vx-control" aria-label="Warna aksen">
          <option value="cyan">Cyan Neon</option>
          <option value="blue">Electric Blue</option>
          <option value="purple">Neon Purple</option>
        </select>
      </div>

      <div class="vx-setting-row">
        <div><strong>Animasi</strong><p class="vx-muted">Aktifkan transisi visual.</p></div>
        <input id="vxAnimations" class="vx-switch" type="checkbox" aria-label="Aktifkan animasi">
      </div>

      <div class="vx-setting-row">
        <div><strong>Tampilan ringkas</strong><p class="vx-muted">Kurangi padding kartu tools.</p></div>
        <input id="vxCompact" class="vx-switch" type="checkbox" aria-label="Tampilan ringkas">
      </div>

      <div class="vx-setting-row">
        <div><strong>Preferensi notifikasi</strong><p class="vx-muted">Simpan pilihan notifikasi untuk fitur mendatang.</p></div>
        <input id="vxNotifications" class="vx-switch" type="checkbox" aria-label="Preferensi notifikasi">
      </div>

      <div class="vx-setting-row">
        <div><strong>Info aplikasi</strong><p class="vx-muted">VEXORA Tools Platform · Developed by Z4M OFFICIAL.</p></div>
        <span class="vx-chip">WEB APP</span>
      </div>

      <div style="display:flex;gap:9px;flex-wrap:wrap;margin-top:16px">
        <button class="vx-action" id="vxResetSettings" type="button">Reset pengaturan</button>
        <button class="vx-action" id="vxRefreshPage" type="button">Muat ulang dashboard</button>
      </div>
      <p id="vxSettingsStatus" class="vx-muted" aria-live="polite"></p>
    `;

    page.appendChild(panel);

    $("vxAccent").value = settings.accent;
    $("vxAnimations").checked = !!settings.animations;
    $("vxCompact").checked = !!settings.compact;
    $("vxNotifications").checked = !!settings.notifications;

    $("vxAccent").addEventListener("change", () => {
      settings.accent = $("vxAccent").value;
      saveSettings();
      $("vxSettingsStatus").textContent = "Warna aksen diperbarui.";
    });

    [
      ["vxAnimations", "animations"],
      ["vxCompact", "compact"],
      ["vxNotifications", "notifications"]
    ].forEach(([id, key]) => {
      $(id).addEventListener("change", () => {
        settings[key] = $(id).checked;
        saveSettings();
        $("vxSettingsStatus").textContent = "Pengaturan disimpan di browser ini.";
      });
    });

    $("vxResetSettings").addEventListener("click", () => {
      settings = {
        accent: "cyan",
        animations: true,
        compact: false,
        notifications: true
      };
      saveSettings();
      $("vxAccent").value = settings.accent;
      $("vxAnimations").checked = settings.animations;
      $("vxCompact").checked = settings.compact;
      $("vxNotifications").checked = settings.notifications;
      $("vxSettingsStatus").textContent = "Pengaturan dikembalikan ke default.";
    });

    $("vxRefreshPage").addEventListener("click", () => {
      window.location.reload();
    });
  }

  function addUpdates() {
    const page = $("page-updates");
    if (!page || $("vxUpdatesPanel")) return;

    const panel = document.createElement("section");
    panel.className = "vx-panel";
    panel.id = "vxUpdatesPanel";
    panel.innerHTML = `
      <div class="vx-kicker">What's new</div>
      <h2 style="font-size:19px;margin:9px 0 5px">Info Updates</h2>
      <p class="vx-muted">Catatan fitur dashboard VEXORA. Informasi di bawah menjelaskan fitur yang tersedia di tampilan ini.</p>

      <article class="vx-update">
        <span class="vx-chip">DASHBOARD</span>
        <h3>Ringkasan akun dan perangkat</h3>
        <p>Menampilkan email akun, role, jenis perangkat, browser, bahasa, ukuran layar, serta baterai jika didukung browser.</p>
      </article>

      <article class="vx-update">
        <span class="vx-chip">PERSONALIZATION</span>
        <h3>Settings yang bisa disesuaikan</h3>
        <p>Pilih warna aksen, animasi, dan tampilan ringkas. Preferensi disimpan secara lokal di browser perangkat ini.</p>
      </article>

      <article class="vx-update">
        <span class="vx-chip">TOOLS</span>
        <h3>Menu lebih ringkas</h3>
        <p>Menu depan hanya menampilkan tools unggulan. Daftar lengkap tetap tersedia di halaman Tools.</p>
      </article>

      <article class="vx-update">
        <span class="vx-chip">ACCOUNT</span>
        <h3>Profil akun</h3>
        <p>Periksa email, role, dan ringkasan perangkat dari halaman Profile.</p>
      </article>

      <div style="margin-top:17px">
        <p class="vx-muted">Untuk pengumuman resmi, kunjungi WhatsApp Channel VEXORA.</p>
        <a class="primary-btn" href="https://whatsapp.com/channel/0029Vb74WeWL7UVUjEQj8h2O" target="_blank" rel="noopener noreferrer">BUKA WHATSAPP CHANNEL ↗</a>
      </div>
    `;

    page.appendChild(panel);
  }

  function limitMenuTools() {
    // Batasi kartu hanya di Menu. Halaman Tools tetap lengkap.
    const rules = [
      ["freeGrid", 3],
      ["vipGrid", 2]
    ];

    rules.forEach(([id, limit]) => {
      const grid = $(id);
      if (!grid) return;

      const cards = Array.from(grid.children);
      const actualCards = cards.filter((node) =>
        node.classList.contains("tool-card")
      );

      actualCards.forEach((card, index) => {
        card.hidden = index >= limit;
      });

      const hiddenCount = Math.max(0, actualCards.length - limit);
      const noteId = `vxMore-${id}`;
      let note = $(noteId);

      if (hiddenCount > 0) {
        if (!note) {
          note = document.createElement("div");
          note.id = noteId;
          note.className = "vx-featured-note";
          grid.insertAdjacentElement("afterend", note);
        }

        note.innerHTML = `${hiddenCount} tools lainnya tersedia di halaman <button type="button" class="vx-action" data-vx-open-tools style="padding:6px 9px">Lihat semua tools ↗</button>`;
        note.querySelector("[data-vx-open-tools]")?.addEventListener("click", () => {
          document.querySelector('.nav[data-page="tools"]')?.click();
        });
      } else if (note) {
        note.remove();
      }
    });
  }

  async function updateDeviceInfo() {
    const device = getDeviceInfo();
    const battery = await getBatteryText();

    const { data, error } = await getCurrentUser().catch(() => ({
      data: { user: null },
      error: true
    }));

    const user = !error ? data?.user : null;
    const email = user?.email || $("profileEmail")?.textContent || "Tidak tersedia";
    const role = getRole(user);

    const values = {
      vxMenuEmail: email,
      vxMenuRole: role,
      vxMenuDevice: device.device,
      vxMenuBrowser: device.browser,
      vxMenuBattery: battery,
      vxProfileEmail: email,
      vxProfileRole: role,
      vxProfileDevice: device.device,
      vxProfileBrowser: device.browser,
      vxProfileBattery: battery,
      vxProfileLanguage: navigator.language || "Tidak tersedia",
      vxProfileScreen: `${screen.width} × ${screen.height}`,
      vxProfileSession: user ? "Login terdeteksi" : "Status sesi tidak tersedia"
    };

    Object.entries(values).forEach(([id, value]) => {
      if ($(id)) $(id).textContent = value;
    });
  }

  function observeMenuTools() {
    ["freeGrid", "vipGrid"].forEach((id) => {
      const grid = $(id);
      if (!grid || grid.dataset.vxObserved) return;

      grid.dataset.vxObserved = "true";
      new MutationObserver(() => limitMenuTools()).observe(grid, {
        childList: true
      });
    });

    limitMenuTools();
  }

  function init() {
    addStyles();
    applySettings();
    addMenuDeviceCard();
    addProfileDetails();
    addSettings();
    addUpdates();
    observeMenuTools();
    updateDeviceInfo().catch((error) => {
      console.warn("[VEXORA] Device info:", error);
    });

    // Navigasi ke Profile/Settings/Updates akan memperbarui informasi.
    document.querySelectorAll('.nav[data-page]').forEach((link
