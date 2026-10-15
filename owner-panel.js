
"use strict";

(async function ownerPanel() {
  const $ = (id) => document.getElementById(id);
  const status = (id, message) => {
    if ($(id)) $(id).textContent = message;
  };

  const config = window.VEXORA_CONFIG;
  if (!config || !window.supabase) {
    status("ownerUsersStatus", "Supabase/config.js belum siap.");
    return;
  }

  const db = window.supabase.createClient(
    config.SUPABASE_URL,
    config.SUPABASE_ANON_KEY
  );

  const { data: sessionData, error: sessionError } =
    await db.auth.getSession();

  if (sessionError || !sessionData.session) return;

  const user = sessionData.session.user;
  if (user.app_metadata?.role !== "owner") return;

  const callAdmin = async (action, extra = {}) => {
    const { data, error } = await db.functions.invoke("owner-admin", {
      body: { action, ...extra },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const escapeHtml = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;",
      '"': "&quot;", "'": "&#39;",
    })[ch]);

  async function loadUsers() {
    status("ownerUsersStatus", "Memuat pengguna...");
    try {
      const data = await callAdmin("list_users");
      const tbody = $("ownerUsersTable");
      tbody.replaceChildren();

      for (const u of data.users) {
        const tr = document.createElement("tr");

        const email = document.createElement("td");
        email.textContent = u.email || "(tanpa email)";

        const roleCell = document.createElement("td");
        roleCell.textContent = String(u.role).toUpperCase();

        const actionCell = document.createElement("td");
        const select = document.createElement("select");

        for (const role of ["member", "vip", "owner"]) {
          const option = document.createElement("option");
          option.value = role;
          option.textContent = role.toUpperCase();
          option.selected = role === u.role;
          select.appendChild(option);
        }

        const save = document.createElement("button");
        save.type = "button";
        save.className = "tool-open";
        save.textContent = "Simpan";
        save.addEventListener("click", async () => {
          save.disabled = true;
          try {
            const result = await callAdmin("set_role", {
              userId: u.id,
              role: select.value,
            });
            status("ownerUsersStatus", result.message);
            await loadUsers();
            await loadStats();
          } catch (err) {
            status("ownerUsersStatus", "Gagal: " + err.message);
          } finally {
            save.disabled = false;
          }
        });

        actionCell.append(select, save);
        tr.append(email, roleCell, actionCell);
        tbody.appendChild(tr);
      }

      status(
        "ownerUsersStatus",
        `${data.users.length} akun dimuat.` +
        (data.has_more ? " Hanya 100 akun pertama ditampilkan." : "")
      );
    } catch (err) {
      status("ownerUsersStatus", "Gagal memuat akun: " + err.message);
    }
  }

  async function loadStats() {
    try {
      const stats = await callAdmin("stats");
      $("ownerUsersCount").textContent = stats.total_users;
      $("ownerVipCount").textContent = stats.vip_users;
      $("ownerAdminsCount").textContent = stats.owner_users;
      if (stats.note) status("ownerUsersStatus", stats.note);
    } catch (err) {
      status("ownerUsersStatus", "Statistik gagal: " + err.message);
    }

    const { count, error } = await db
      .from("vexora_tools")
      .select("*", { count: "exact", head: true });

    $("ownerToolsCount").textContent =
      error ? "—" : String(count ?? 0);
  }

  function resetToolForm() {
    $("ownerToolForm").reset();
    $("ownerToolId").value = "";
  }

  async function loadTools() {
    status("ownerToolsStatus", "Memuat tools...");
    const { data, error } = await db
      .from("vexora_tools")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      status("ownerToolsStatus", "Gagal: " + error.message);
      return;
    }

    const tbody = $("ownerToolsTable");
    tbody.replaceChildren();

    for (const tool of data) {
      const tr = document.createElement("tr");
      const name = document.createElement("td");
      name.textContent = tool.name;

      const category = document.createElement("td");
      category.textContent = tool.category.toUpperCase();

      const actions = document.createElement("td");
      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "tool-open";
      edit.textContent = "Edit";
      edit.addEventListener("click", () => {
        $("ownerToolId").value = tool.id;
        $("ownerToolName").value = tool.name;
        $("ownerToolDesc").value = tool.description || "";
        $("ownerToolCategory").value = tool.category;
        $("ownerToolUrl").value = tool.url || "";
        $("ownerToolName").focus();
      });

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "tool-open locked";
      remove.textContent = "Hapus";
      remove.addEventListener("click", async () => {
        if (!confirm(`Hapus tools "${tool.name}"?`)) return;
        const { error: deleteError } = await db
          .from("vexora_tools").delete().eq("id", tool.id);
        if (deleteError) {
          status("ownerToolsStatus", "Gagal menghapus: " + deleteError.message);
          return;
        }
        await loadTools();
        await loadStats();
      });

      actions.append(edit, remove);
      tr.append(name, category, actions);
      tbody.appendChild(tr);
    }

    status("ownerToolsStatus", `${data.length} tools tersimpan.`);
    $("ownerToolsCount").textContent = String(data.length);
  }

  $("ownerToolForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const id = $("ownerToolId").value;
    const name = $("ownerToolName").value.trim();
    const description = $("ownerToolDesc").value.trim();
    const category = $("ownerToolCategory").value;
    const url = $("ownerToolUrl").value.trim();

    if (url && !/^https:\/\/\S+$/i.test(url)) {
      status("ownerToolsStatus", "URL harus menggunakan HTTPS.");
      return;
    }

    const values = { name, description, category, url };
    const query = id
      ? db.from("vexora_tools").update(values).eq("id", id)
      : db.from("vexora_tools").insert(values);

    const { error } = await query;
    if (error) {
      status("ownerToolsStatus", "Gagal menyimpan: " + error.message);
      return;
    }

    resetToolForm();
    await loadTools();
    await loadStats();
    status("ownerToolsStatus", "Tools berhasil disimpan.");
  });

  $("ownerToolCancel")?.addEventListener("click", resetToolForm);
  $("ownerReloadUsers")?.addEventListener("click", loadUsers);

  await Promise.all([loadUsers(), loadTools(), loadStats()]);
})().catch((err) => {
  console.error("Owner panel:", err);
  const box = document.getElementById("ownerUsersStatus");
  if (box) box.textContent = "Panel gagal dimuat. Periksa konfigurasi.";
});
    
