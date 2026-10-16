
/* =====================================================
   VEXORA - OWNER PANEL
   Developed by Z4M OFFICIAL
   File: owner-panel.js
   ===================================================== */

(() => {
  "use strict";

  const CONFIG = window.VEXORA_CONFIG || {};
  const SUPABASE_URL = CONFIG.SUPABASE_URL;
  const SUPABASE_ANON_KEY = CONFIG.SUPABASE_ANON_KEY;
  const ADMIN_FUNCTION = "owner-admin";
  const TOOLS_TABLE = "vexora_tools";

  let db = null;
  let currentUsers = [];
  let currentTools = [];
  let ownerReady = false;
  let busy = false;

  const $ = (id) => document.getElementById(id);

  function setText(id, value) {
    const el = $(id);
    if (el) el.textContent = String(value ?? "");
  }

  function status(id, message, isError = false) {
    const el = $(id);
    if (!el) return;
    el.textContent = message;
    el.style.color = isError ? "#ff6b81" : "";
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function normalizeRole(user) {
    return user?.app_metadata?.role ||
      user?.role ||
      user?.user_metadata?.role ||
      "member";
  }

  function userId(user) {
    return user?.id || user?.user_id || "";
  }

  function isBanned(user) {
    if (
      user?.banned === true ||
      user?.is_banned === true ||
      user?.ban === true
    ) return true;

    if (
      typeof user?.banned_until === "string" &&
      user.banned_until &&
      user.banned_until !== "none"
    ) {
      const until = Date.parse(user.banned_until);
      return Number.isNaN(until) || until > Date.now();
    }

    return false;
  }

  function formatError(error) {
    return error?.message ||
      error?.error_description ||
      error?.details ||
      "Terjadi kesalahan yang tidak diketahui.";
  }

  async function getSession() {
    if (!db) throw new Error("Supabase belum diinisialisasi.");

    const { data, error } = await db.auth.getSession();
    if (error) throw error;

    const session = data?.session;
    if (!session) {
      throw new Error("Sesi login tidak ditemukan. Silakan login ulang.");
    }

    return session;
  }

  async function verifyOwner() {
    const session = await getSession();
    const role = session.user?.app_metadata?.role;

    if (role !== "owner") {
      ownerReady = false;
      throw new Error("Akses ditolak. Halaman ini khusus Owner VEXORA.");
    }

    ownerReady = true;
    return session;
  }

  async function callAdmin(action, extra = {}) {
    await verifyOwner();

    const { data, error } = await db.functions.invoke(ADMIN_FUNCTION, {
      body: { action, ...extra }
    });

    if (error) {
      let detail = error.message || "Gagal menghubungi Owner API.";

      if (error.context && typeof error.context.json === "function") {
        try {
          const response = await error.context.json();
          detail = response.message || response.error || detail;
        } catch (_) {}
      }

      throw new Error(detail);
    }

    if (!data || data.success === false) {
      throw new Error(data?.error || data?.message || "Permintaan gagal.");
    }

    return data;
  }

  // ==================== STATISTIK ====================

  async function loadStats() {
    try {
      const result = await callAdmin("stats");
      const stats = result.stats || result;

      setText("ownerUsersCount", stats.total ?? stats.total_users ?? 0);
      setText("ownerVipCount", stats.vip ?? stats.vip_users ?? 0);
      setText("ownerAdminsCount", stats.owner ?? stats.owner_users ?? 0);
      setText("ownerMembersCount", stats.member ?? stats.member_users ?? 0);
      setText("ownerBannedCount", stats.banned ?? stats.banned_users ?? 0);

      // Jumlah tools diperbarui setelah data tools dimuat.
      if (Array.isArray(currentTools)) {
        setText("ownerToolsCount", currentTools.length);
      }
    } catch (error) {
      console.error("[VEXORA Owner] Stats:", error);
      status("ownerUsersStatus", "Statistik gagal dimuat: " + formatError(error), true);
    }
  }

  // ==================== MANAJEMEN PENGGUNA ====================

  async function loadUsers() {
    status("ownerUsersStatus", "Memuat daftar akun...");

    try {
      const result = await callAdmin("list_users");
      currentUsers = Array.isArray(result.users) ? result.users : [];

      renderUsers();
      status(
        "ownerUsersStatus",
        `Berhasil memuat ${currentUsers.length} akun pada halaman ini.`
      );

      await loadStats();
    } catch (error) {
      console.error("[VEXORA Owner] Users:", error);
      currentUsers = [];
      renderUsers();
      status("ownerUsersStatus", "Gagal memuat akun: " + formatError(error), true);
    }
  }

  function renderUsers() {
    const tbody = $("ownerUsersTable");
    if (!tbody) return;

    const search = ($("ownerUserSearch")?.value || "").trim().toLowerCase();

    const filtered = currentUsers.filter((user) => {
      const email = String(user.email || "").toLowerCase();
      const id = String(userId(user)).toLowerCase();
      const role = normalizeRole(user).toLowerCase();
      return email.includes(search) || id.includes(search) || role.includes(search);
    });

    if (!filtered.length) {
      tbody.innerHTML =
        '<tr><td colspan="4">Tidak ada akun yang cocok.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map((user) => {
      const id = userId(user);
      const email = escapeHTML(user.email || "(email tidak tersedia)");
      const role = normalizeRole(user);
      const banned = isBanned(user);
      const isOwner = role === "owner";

      const roleControl = isOwner
        ? '<span class="owner-role-label">OWNER</span>'
        : `<select data-role-select="${escapeHTML(id)}" aria-label="Role pengguna">
             <option value="member" ${role === "member" ? "selected" : ""}>Member</option>
             <option value="vip" ${role === "vip" ? "selected" : ""}>VIP</option>
           </select>
           <button type="button" class="tool-open" data-action="save-role"
             data-id="${escapeHTML(id)}">Simpan</button>`;

      const banButton = isOwner
        ? '<span>—</span>'
        : `<button type="button" class="tool-open"
             data-action="${banned ? "unban" : "ban"}"
             data-id="${escapeHTML(id)}">
             ${banned ? "Unban" : "Ban"}
           </button>`;

      const deleteButton = isOwner
        ? '<span>—</span>'
        : `<button type="button" class="tool-open"
             data-action="delete-user"
             data-id="${escapeHTML(id)}">Hapus</button>`;

      return `
        <tr>
          <td>
            <strong>${email}</strong>
            <div class="owner-help">${escapeHTML(id)}</div>
          </td>
          <td>${roleControl}</td>
          <td>${banned ? "Diblokir" : "Aktif"}</td>
          <td>
            <div class="owner-form-actions">
              ${banButton}
              ${deleteButton}
            </div>
          </td>
        </tr>`;
    }).join("");
  }

  async function changeRole(id) {
    const select = document.querySelector(`[data-role-select="${CSS.escape(id)}"]`);
    const role = select?.value;

    if (!id || !["member", "vip"].includes(role)) {
      alert("Role tidak valid.");
      return;
    }

    const user = currentUsers.find((item) => userId(item) === id);

    if (!user || normalizeRole(user) === "owner") {
      alert("Akun Owner tidak boleh diubah dari menu ini.");
      return;
    }

    if (!confirm(`Ubah role akun ${user.email || id} menjadi ${role.toUpperCase()}?`)) {
      return;
    }

    try {
      status("ownerUsersStatus", "Menyimpan perubahan role...");
      await callAdmin("set_role", { userId: id, role });
      status("ownerUsersStatus", "Role berhasil diperbarui.");
      await loadUsers();
    } catch (error) {
      console.error("[VEXORA Owner] Set role:", error);
      status("ownerUsersStatus", "Gagal mengubah role: " + formatError(error), true);
      alert(formatError(error));
    }
  }

  async function toggleBan(id, shouldBan) {
    const user = currentUsers.find((item) => userId(item) === id);

    if (!user || normalizeRole(user) === "owner") {
      alert("Akun tidak ditemukan atau merupakan Owner.");
      return;
    }

    const action = shouldBan ? "ban_user" : "unban_user";
    const message = shouldBan
      ? `Ban akun ${user.email || id}?`
      : `Unban akun ${user.email || id}?`;

    if (!confirm(message)) return;

    try {
      status("ownerUsersStatus", shouldBan ? "Memblokir akun..." : "Membuka blokir akun...");
      await callAdmin(action, { user_id: id });
      status("ownerUsersStatus", shouldBan ? "Akun berhasil diblokir." : "Blokir akun berhasil dibuka.");
      await loadUsers();
    } catch (error) {
      console.error("[VEXORA Owner] Ban:", error);
      status("ownerUsersStatus", "Aksi gagal: " + formatError(error), true);
      alert(formatError(error));
    }
  }

  async function deleteUser(id) {
    const user = currentUsers.find((item) => userId(item) === id);

    if (!user || normalizeRole(user) === "owner") {
      alert("Akun tidak ditemukan atau merupakan Owner.");
      return;
    }

    const confirmation = prompt(
      `PERINGATAN: akun ${user.email || id} akan dihapus permanen.\nKetik HAPUS untuk melanjutkan:`
    );

    if (confirmation !== "HAPUS") return;

    try {
      status("ownerUsersStatus", "Menghapus akun...");
      await callAdmin("delete_user", {
        user_id: id,
        confirmation: "HAPUS"
      });
      status("ownerUsersStatus", "Permintaan penghapusan akun berhasil.");
      await loadUsers();
    } catch (error) {
      console.error("[VEXORA Owner] Delete user:", error);
      status("ownerUsersStatus", "Gagal menghapus akun: " + formatError(error), true);
      alert(formatError(error));
    }
  }

  // ==================== MANAJEMEN TOOLS ====================

  async function loadTools() {
    status("ownerToolsStatus", "Memuat daftar tools...");

    try {
      await verifyOwner();

      const { data, error } = await db
        .from(TOOLS_TABLE)
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;

      currentTools = Array.isArray(data) ? data : [];
      renderTools();
      setText("ownerToolsCount", currentTools.length);
      status("ownerToolsStatus", `${currentTools.length} tools berhasil dimuat.`);
    } catch (error) {
      console.error("[VEXORA Owner] Tools:", error);
      currentTools = [];
      renderTools();
      setText("ownerToolsCount", 0);
      status("ownerToolsStatus", "Gagal memuat tools: " + formatError(error), true);
    }
  }

  function renderTools() {
    const tbody = $("ownerToolsTable");
    if (!tbody) return;

    if (!currentTools.length) {
      tbody.innerHTML = '<tr><td colspan="3">Belum ada tools.</td></tr>';
      return;
    }

    tbody.innerHTML = currentTools.map((tool) => {
      const id = tool.id;
      const name = escapeHTML(tool.name || "Tanpa nama");
      const category = String(tool.category || "free").toLowerCase();

      return `
        <tr>
          <td>
            <strong>${name}</strong>
            <div class="owner-help">${escapeHTML(tool.description || "")}</div>
          </td>
          <td>${escapeHTML(category.toUpperCase())}</td>
          <td>
            <div class="owner-form-actions">
              <button type="button" class="tool-open"
                data-action="edit-tool" data-id="${escapeHTML(id)}">Edit</button>
              <button type="button" class="tool-open"
                data-action="delete-tool" data-id="${escapeHTML(id)}">Hapus</button>
            </div>
          </td>
        </tr>`;
    }).join("");
  }

  function resetToolForm() {
    $("ownerToolForm")?.reset();
    setText("ownerToolId", "");
    const idInput = $("ownerToolId");
    if (idInput) idInput.value = "";
    const category = $("ownerToolCategory");
    if (category) category.value = "free";
  }

  function editTool(id) {
    const tool = currentTools.find((item) => String(item.id) === String(id));
    if (!tool) return;

    $("ownerToolId").value = tool.id ?? "";
    $("ownerToolName").value = tool.name ?? "";
    $("ownerToolCategory").value = tool.category ?? "free";
    $("ownerToolDesc").value = tool.description ?? "";
    $("ownerToolUrl").value = tool.url ?? "";

    status("ownerToolsStatus", "Mode edit aktif. Ubah data lalu tekan Simpan Tools.");
    $("ownerToolForm")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function saveTool(event) {
    event.preventDefault();

    if (busy) return;
    busy = true;

    const id = $("ownerToolId")?.value.trim();
    const name = $("ownerToolName")?.value.trim();
    const category = $("ownerToolCategory")?.value;
    const description = $("ownerToolDesc")?.value.trim() || "";
    const url = $("ownerToolUrl")?.value.trim() || "";

    if (!name) {
      status("ownerToolsStatus", "Nama tools wajib diisi.", true);
      busy = false;
      return;
    }

    if (!["free", "vip"].includes(category)) {
      status("ownerToolsStatus", "Kategori harus FREE atau VIP.", true);
      busy = false;
      return;
    }

    if (url) {
      try {
        const parsed = new URL(url);
        if (!["http:", "https:"].includes(parsed.protocol)) {
          throw new Error("URL harus menggunakan HTTP atau HTTPS.");
        }
      } catch (_) {
        status("ownerToolsStatus", "URL tools tidak valid.", true);
        busy = false;
        return;
      }
    }

    const payload = { name, category, description, url };

    try {
      await verifyOwner();

      let query;

      if (id) {
        query = db.from(TOOLS_TABLE).update(payload).eq("id", id);
      } else {
        query = db.from(TOOLS_TABLE).insert(payload);
      }

      const { error } = await query;
      if (error) throw error;

      status("ownerToolsStatus", id ? "Tools berhasil diperbarui." : "Tools berhasil ditambahkan.");
      resetToolForm();
      await loadTools();
    } catch (error) {
      console.error("[VEXORA Owner] Save tool:", error);
      status("ownerToolsStatus", "Gagal menyimpan tools: " + formatError(error), true);
    } finally {
      busy = false;
    }
  }

  async function deleteTool(id) {
    const tool = currentTools.find((item) => String(item.id) === String(id));
    if (!tool) return;

    if (!confirm(`Hapus tools "${tool.name || id}"?`)) return;

    try {
      await verifyOwner();

      const { error } = await db
        .from(TOOLS_TABLE)
        .delete()
        .eq("id", id);

      if (error) throw error;

      status("ownerToolsStatus", "Tools berhasil dihapus.");
      await loadTools();
    } catch (error) {
      console.error("[VEXORA Owner] Delete tool:", error);
      status("ownerToolsStatus", "Gagal menghapus tools: " + formatError(error), true);
      alert(formatError(error));
    }
  }

  // ==================== EVENT LISTENERS ====================

  function bindEvents() {
    $("ownerReloadUsers")?.addEventListener("click", loadUsers);
    $("ownerUserSearch")?.addEventListener("input", renderUsers);
    $("ownerToolForm")?.addEventListener("submit", saveTool);
    $("ownerToolCancel")?.addEventListener("click", resetToolForm);

    $("ownerUsersTable")?.addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;

      const action = button.dataset.action;
      const id = button.dataset.id;
      if (!id) return;

      button.disabled = true;

      try {
        if (action === "save-role") await changeRole(id);
        if (action === "ban") await toggleBan(id, true);
        if (action === "unban") await toggleBan(id, false);
        if (action === "delete-user") await deleteUser(id);
      } finally {
        button.disabled = false;
      }
    });

    $("ownerToolsTable")?.addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;

      const action = button.dataset.action;
      const id = button.dataset.id;
      if (!id) return;

      if (action === "edit-tool") editTool(id);
      if (action === "delete-tool") await deleteTool(id);
    });
  }

  // ==================== INITIALIZATION ====================

  async function initOwnerPanel() {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      status(
        "ownerUsersStatus",
        "Konfigurasi Supabase tidak ditemukan. Periksa config.js.",
        true
      );
      return;
    }

    if (!window.supabase?.createClient) {
      status(
        "ownerUsersStatus",
        "Library Supabase belum dimuat. Periksa koneksi internet.",
        true
      );
      return;
    }

    db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    bindEvents();

    try {
      await verifyOwner();

      await Promise.all([
        loadUsers(),
        loadTools()
      ]);
    } catch (error) {
      console.error("[VEXORA Owner] Initialization:", error);
      status("ownerUsersStatus", formatError(error), true);
    }
  }

  // Fungsi bisa dipanggil lagi setelah panel Owner dibuka.
  window.VEXORA_OWNER_PANEL = {
    refresh: async () => {
      if (!ownerReady) await verifyOwner();
      await Promise.all([loadUsers(), loadTools()]);
    },
    loadUsers,
    loadTools,
    loadStats
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initOwnerPanel, { once: true });
  } else {
    initOwnerPanel();
  }
})();
    
