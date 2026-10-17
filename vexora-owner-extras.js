
/* =========================================================
   VEXORA OWNER EXTRAS
   Maintenance Website + Announcement
   Developer: Z4M OFFICIAL
   Tidak mengganti owner-panel.js yang sudah ada.
   ========================================================= */
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const FUNCTION_NAME = "owner-admin";
  let db = null;
  let maintenanceEnabled = false;
  let announcements = [];
  let initialized = false;

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  })[c]);

  function status(message, error = false) {
    const el = $("vxOwnerExtrasStatus");
    if (!el) return;
    el.textContent = message;
    el.style.color = error ? "#ff778b" : "#38d9ff";
  }

  function getDB() {
    if (db) return db;

    db = window.vexoraGetClient?.() ||
      window.supabaseClient ||
      window.vexoraSupabase ||
      window.sb ||
      null;

    if (!db) {
      const config = window.VEXORA_CONFIG || {};
      if (
        window.supabase?.createClient &&
        config.SUPABASE_URL &&
        config.SUPABASE_ANON_KEY
      ) {
        db = window.supabase.createClient(
          config.SUPABASE_URL,
          config.SUPABASE_ANON_KEY
        );
        window.supabaseClient = db;
      }
    }

    if (!db) throw new Error("Supabase client tidak ditemukan.");
    return db;
  }

  async function admin(action, params = {}) {
    const { data, error } = await getDB().functions.invoke(
      FUNCTION_NAME,
      { body: { action, ...params } }
    );

    if (error) {
      let message = error.message || "Permintaan gagal.";
      try {
        if (error.context?.json) {
          const body = await error.context.json();
          message = body.error || body.message || message;
        }
      } catch (_) {}
      throw new Error(message);
    }

    if (data?.error) throw new Error(data.error);
    return data;
  }

  function extractArray(data, names) {
    if (Array.isArray(data)) return data;
    for (const name of names) {
      if (Array.isArray(data?.[name])) return data[name];
      if (Array.isArray(data?.data?.[name])) return data.data[name];
      if (Array.isArray(data?.result?.[name])) return data.result[name];
    }
    return [];
  }

  function ownerRoot() {
    const candidates = [
      $("ownerPanel"),
      $("page-owner"),
      $("owner-page"),
      $("owner"),
      $("ownerToolsTable")?.closest("section"),
      $("ownerToolsTable")?.closest(".page"),
      $("ownerToolsTable")?.closest(".content")
    ].filter(Boolean);

    if (candidates.length) return candidates[0];

    const table = $("ownerToolsTable");
    return table?.closest(".owner-panel") ||
      table?.closest(".owner-section") ||
      table?.parentElement?.parentElement ||
      null;
  }

  function addStyles() {
    if ($("vxOwnerExtrasStyle")) return;

    const style = document.createElement("style");
    style.id = "vxOwnerExtrasStyle";
    style.textContent = `
      .vxoe-wrap{margin:20px 0;display:grid;gap:16px;color:#edf5ff}
      .vxoe-card{padding:18px;border:1px solid #263b59;border-radius:16px;
        background:linear-gradient(145deg,#101d32,#0a1221);min-width:0}
      .vxoe-card h2{font-size:17px;margin:0 0 7px}
      .vxoe-muted{font-size:12px;color:#91a2bd;line-height:1.7}
      .vxoe-row{display:flex;align-items:center;justify-content:space-between;
        flex-wrap:wrap;gap:12px;margin-top:15px}
      .vxoe-input{box-sizing:border-box;width:100%;padding:11px;border-radius:10px;
        border:1px solid #2a4263;background:#0a1426;color:#edf5ff;margin-top:7px}
      .vxoe-field{display:block;font-size:12px;margin-top:12px}
      .vxoe-btn{border:1px solid #2c4b73;background:#142743;color:#edf5ff;
        padding:10px 13px;border-radius:10px;font-weight:700;cursor:pointer}
      .vxoe-btn:disabled{opacity:.5;cursor:wait}
      .vxoe-danger{border-color:#80384a;background:#351b2b}
      .vxoe-badge{display:inline-block;border-radius:20px;padding:5px 9px;
        font-size:10px;font-weight:800;background:#142743;color:#38d9ff}
      .vxoe-item{padding:13px;margin-top:10px;border:1px solid #263b59;
        border-radius:12px;background:#0b1629;overflow-wrap:anywhere}
      .vxoe-item p{font-size:12px;line-height:1.7;color:#a6b6ce;white-space:pre-wrap}
      .vxoe-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
      @media(max-width:520px){.vxoe-card{padding:14px}.vxoe-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function createPanel() {
    if ($("vxOwnerExtras")) return true;

    const root = ownerRoot();
    if (!root) return false;

    const panel = document.createElement("div");
    panel.id = "vxOwnerExtras";
    panel.className = "vxoe-wrap";
    panel.innerHTML = `
      <section class="vxoe-card">
        <span class="vxoe-badge">OWNER CONTROL</span>
        <h2 style="margin-top:10px">Maintenance Website</h2>
        <p class="vxoe-muted">
          Aktifkan mode maintenance untuk memberi tahu pengguna bahwa website
          sedang dalam pemeliharaan.
        </p>
        <div class="vxoe-row">
          <strong id="vxMaintenanceLabel">Status belum dimuat</strong>
          <button class="vxoe-btn" id="vxMaintenanceToggle" type="button">
            Muat Status
          </button>
        </div>
      </section>

      <section class="vxoe-card">
        <span class="vxoe-badge">ANNOUNCEMENTS</span>
        <h2 style="margin-top:10px">Pengumuman Website</h2>
        <p class="vxoe-muted">
          Buat pengumuman untuk ditampilkan di daftar pengumuman.
        </p>
        <form id="vxAnnouncementForm">
          <label class="vxoe-field">
            Judul pengumuman
            <input class="vxoe-input" id="vxAnnouncementTitle"
              maxlength="120" required placeholder="Contoh: Update VEXORA">
          </label>
          <label class="vxoe-field">
            Isi pengumuman
            <textarea class="vxoe-input" id="vxAnnouncementBody"
              rows="4" maxlength="3000" required
              placeholder="Tulis isi pengumuman..."></textarea>
          </label>
          <div class="vxoe-row">
            <label class="vxoe-muted">
              <input id="vxAnnouncementActive" type="checkbox" checked>
              Aktifkan pengumuman
            </label>
            <button class="vxoe-btn" type="submit">Buat Pengumuman</button>
          </div>
        </form>
        <div id="vxAnnouncementList" aria-live="polite">
          <p class="vxoe-muted">Pengumuman belum dimuat.</p>
        </div>
      </section>

      <p id="vxOwnerExtrasStatus" class="vxoe-muted" aria-live="polite"></p>
    `;

    root.appendChild(panel);
    return true;
  }

  async function loadMaintenance() {
    status("Memuat status maintenance...");
    const data = await admin("maintenance_get");

    const source = data?.settings || data?.data?.settings ||
      data?.maintenance || data?.data?.maintenance || data;

    const value = typeof source === "boolean"
      ? source
      : source?.maintenance_enabled ??
        source?.maintenance ??
        source?.enabled ??
        source?.is_enabled;

    if (typeof value !== "boolean") {
      throw new Error(
        "Respons maintenance tidak dikenali. Perlu mencocokkan format respons backend."
      );
    }

    maintenanceEnabled = value;
    renderMaintenance();
    status("Status maintenance berhasil dimuat.");
  }

  function renderMaintenance() {
    const label = $("vxMaintenanceLabel");
    const button = $("vxMaintenanceToggle");
    if (!label || !button) return;

    label.textContent = maintenanceEnabled
      ? "MAINTENANCE AKTIF"
      : "WEBSITE NORMAL";

    label.style.color = maintenanceEnabled ? "#ffb45e" : "#38d9ff";
    button.textContent = maintenanceEnabled
      ? "Nonaktifkan Maintenance"
      : "Aktifkan Maintenance";

    button.classList.toggle("vxoe-danger", !maintenanceEnabled);
  }

  async function toggleMaintenance() {
    const next = !maintenanceEnabled;
    const confirmation = next
      ? "Aktifkan maintenance website?"
      : "Nonaktifkan maintenance website?";

    if (!confirm(confirmation)) return;

    const button = $("vxMaintenanceToggle");
    if (button) button.disabled = true;

    try {
      status("Menyimpan status maintenance...");

      // Nama action dan field mengikuti kontrak backend yang diharapkan.
      await admin("maintenance_set", { enabled: next });

      maintenanceEnabled = next;
      renderMaintenance();
      status("Status maintenance berhasil diperbarui.");
    } catch (error) {
      console.error("[VEXORA] Maintenance:", error);
      status("Maintenance gagal: " + error.message, true);
    } finally {
      if (button) button.disabled = false;
    }
  }

  function renderAnnouncements() {
    const list = $("vxAnnouncementList");
    if (!list) return;

    if (!announcements.length) {
      list.innerHTML = '<p class="vxoe-muted">Belum ada pengumuman.</p>';
      return;
    }

    list.innerHTML = announcements.map((item) => {
      const id = item.id;
      const title = item.title || item.name || "Tanpa judul";
      const body = item.message || item.body || item.content ||
        item.description || "";
      const active = item.active ?? item.is_active ?? item.enabled ?? true;

      return `
        <article class="vxoe-item">
          <span class="vxoe-badge">${active ? "AKTIF" : "NONAKTIF"}</span>
          <h3 style="font-size:14px;margin:10px 0 5px">${esc(title)}</h3>
          <p>${esc(body)}</p>
          <button class="vxoe-btn vxoe-danger" type="button"
            data-vx-announcement-delete="${esc(id)}"
            ${id == null ? "disabled" : ""}>Hapus</button>
        </article>
      `;
    }).join("");
  }

  async function loadAnnouncements() {
    status("Memuat pengumuman...");
    const data = await admin("announcement_list");
    announcements = extractArray(data, [
      "announcements", "items", "results"
    ]);
    renderAnnouncements();
    status(`${announcements.length} pengumuman dimuat.`);
  }

 async function deleteAnnouncement(id) {
  const announcementId = String(id || "").trim();

  // ID pengumuman harus UUID
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(announcementId)
  ) {
    alert("ID pengumuman tidak valid. Muat ulang daftar pengumuman.");
    return;
  }

  const result = await admin("announcement_delete", {
    id: announcementId
  });

  if (result?.error || result?.success === false) {
    alert(result.error?.message || result.error || "Gagal menghapus pengumuman.");
    return;
  }

  await loadAnnouncements();
 }
      status("Pengumuman berhasil dibuat.");
    } catch (error) {
      console.error("[VEXORA] Announcement create:", error);
      status("Gagal membuat pengumuman: " + error.message, true);
    }
  }

  async function deleteAnnouncement(id) {
    if (id == null || id === "") return;
    if (!confirm("Hapus pengumuman ini?")) return;

    try {
      status("Menghapus pengumuman...");
      await admin("announcement_delete", { id });
      await loadAnnouncements();
      status("Pengumuman berhasil dihapus.");
    } catch (error) {
      console.error("[VEXORA] Announcement delete:", error);
      status("Gagal menghapus pengumuman: " + error.message, true);
    }
  }

  function bindEvents() {
    $("vxMaintenanceToggle")?.addEventListener("click", toggleMaintenance);
    $("vxAnnouncementForm")?.addEventListener("submit", createAnnouncement);

    $("vxAnnouncementList")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-vx-announcement-delete]");
      if (!button) return;
      deleteAnnouncement(button.dataset.vxAnnouncementDelete);
    });
  }

  async function init() {
    if (initialized) return;
    addStyles();

    if (!createPanel()) {
      // Coba lagi setelah dashboard menyelesaikan render awal.
      setTimeout(init, 500);
      return;
    }

    initialized = true;
    bindEvents();

    try {
      getDB();
      await Promise.allSettled([
        loadMaintenance(),
        loadAnnouncements()
      ]);
    } catch (error) {
      console.error("[VEXORA] Owner extras init:", error);
      status(error.message, true);
    }
  }

  // Tunggu dashboard dan skrip Owner Panel selesai memuat.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
