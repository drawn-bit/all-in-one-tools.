
"use strict";

(async function ownerPanel() {
  const $ = (id) => document.getElementById(id);

  const status = (id, message) => {
    const el = $(id);
    if (el) el.textContent = message;
  };

  const config = window.VEXORA_CONFIG;

  if (!config || !window.supabase) {
    status("ownerUsersStatus", "Config atau Supabase belum siap.");
    return;
  }

  const db = window.supabase.createClient(
    config.SUPABASE_URL,
    config.SUPABASE_ANON_KEY
  );

  const { data: sessionData, error: sessionError } =
    await db.auth.getSession();

  if (sessionError || !sessionData?.session) return;

  const currentUser = sessionData.session.user;

  if (currentUser.app_metadata?.role !== "owner") return;

  const callAdmin = async (action, extra = {}) => {
    const { data, error } = await db.functions.invoke("owner-admin", {
      body: { action, ...extra },
    });

    if (error) throw error;
    if (data?.error || data?.success === false) {
      throw new Error(data.error || "Permintaan gagal.");
    }

    return data;
  };

  const safeText = (value) => String(value ?? "");

  let allUsers = [];

  function getRole(user) {
    return user.role || user.app_metadata?.role || "member";
  }

  function isBanned(user) {
    if (user.banned === true) return true;
    if (user.is_banned === true) return true;

    if (user.banned_until) {
      return new Date(user.banned_until).getTime() > Date.now();
    }

    return false;
  }

  function makeButton(label, className, callback) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className || "tool-open";
    button.textContent = label;
    button.addEventListener("click", callback);
    return button;
  }

  function renderUsers() {
    const tbody = $("ownerUsersTable");
    if (!tbody) {
      status(
        "ownerUsersStatus",
        "Tabel akun belum ada di dashboard.html."
      );
      return;
    }

    const search = ($("ownerUserSearch")?.value || "")
      .trim()
      .toLowerCase();

    const filtered = allUsers.filter((user) => {
      const email = safeText(user.email).toLowerCase();
      const role = getRole(user).toLowerCase();
      return email.includes(search) || role.includes(search);
    });

    tbody.replaceChildren();

    for (const user of filtered) {
      const role = getRole(user);
      const banned = isBanned(user);

      const tr = document.createElement("tr");

      const emailCell = document.createElement("td");
      emailCell.textContent = user.email || "(tanpa email)";

      const roleCell = document.createElement("td");
      roleCell.textContent = role.toUpperCase();

      const statusCell = document.createElement("td");
      statusCell.textContent = banned ? "DIBLOKIR" : "AKTIF";

      const actionCell = document.createElement("td");

      const roleSelect = document.createElement("select");

      for (const value of ["member", "vip"]) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value.toUpperCase();
        option.selected = value === role;
        roleSelect.appendChild(option);
      }

      const isOwner = role === "owner";

      if (isOwner) {
        roleSelect.disabled = true;
        roleSelect.title = "Role Owner tidak dapat diubah dari sini.";
      }

      const saveButton = makeButton("Simpan Role", "tool-open", async () => {
        if (isOwner) return;

        saveButton.disabled = true;

        try {
          const result = await callAdmin("set_role", {
            userId: user.id,
            role: roleSelect.value,
          });

          status(
            "ownerUsersStatus",
            result.message || "Role berhasil diperbarui."
          );

          await Promise.all([loadUsers(), loadStats()]);
        } catch (error) {
          status("ownerUsersStatus", "Gagal mengubah role: " + error.message);
        } finally {
          saveButton.disabled = false;
        }
      });

      const banButton = makeButton(
        banned ? "Unban" : "Ban",
        "tool-open",
        async () => {
          if (isOwner) {
            status("ownerUsersStatus", "Akun Owner tidak boleh diblokir dari panel ini.");
            return;
          }

          const action = banned ? "unban_user" : "ban_user";
          const message = banned
            ? `Buka blokir akun ${user.email || user.id}?`
            : `Blokir akun ${user.email || user.id}?`;

          if (!confirm(message)) return;

          banButton.disabled = true;

          try {
            const result = await callAdmin(action, {
              userId: user.id,
            });

            status(
              "ownerUsersStatus",
              result.message || "Status akun berhasil diperbarui."
            );

            await Promise.all([loadUsers(), loadStats()]);
          } catch (error) {
            status("ownerUsersStatus", "Gagal: " + error.message);
          } finally {
            banButton.disabled = false;
          }
        }
      );

      const deleteButton = makeButton(
        "Hapus Akun",
        "tool-open locked",
        async () => {
          if (isOwner) {
            status("ownerUsersStatus", "Akun Owner tidak dapat dihapus dari panel ini.");
            return;
          }

          const confirmed = confirm(
            `PERINGATAN!\nHapus akun ${user.email || user.id} secara permanen?\nTindakan ini tidak dapat dibatalkan.`
          );

          if (!confirmed) return;

          deleteButton.disabled = true;

          try {
            const result = await callAdmin("delete_user", {
              userId: user.id,
            });

            status(
              "ownerUsersStatus",
              result.message || "Akun berhasil dihapus."
            );

            await Promise.all([loadUsers(), loadStats()]);
          } catch (error) {
            status("ownerUsersStatus", "Gagal menghapus akun: " + error.message);
          } finally {
            deleteButton.disabled = false;
          }
        }
      );

      actionCell.append(
        roleSelect,
        saveButton,
        banButton,
        deleteButton
      );

      tr.append(emailCell, roleCell, statusCell, actionCell);
      tbody.appendChild(tr);
    }

    status(
      "ownerUsersStatus",
      `${filtered.length} dari ${allUsers.length} akun ditampilkan.`
    );
  }

  async function loadUsers() {
    status("ownerUsersStatus", "Memuat akun...");

    try {
      const data = await callAdmin("list_users");
      allUsers = Array.isArray(data.users) ? data.users : [];
      renderUsers();
    } catch (error) {
      status("ownerUsersStatus", "Gagal memuat akun: " + error.message);
    }
  }

  async function loadStats() {
    try {
      const response = await callAdmin("stats");
      const stats = response.stats || response;

      if ($("ownerUsersCount")) {
        $("ownerUsersCount").textContent =
          stats.total ?? stats.total_users ?? "—";
      }

      if ($("ownerVipCount")) {
        $("ownerVipCount").textContent =
          stats.vip ?? stats.vip_users ?? "—";
      }

      if ($("ownerAdminsCount")) {
        $("ownerAdminsCount").textContent =
          stats.owner ?? stats.owner_users ?? "—";
      }

      if ($("ownerMembersCount")) {
        $("ownerMembersCount").textContent = stats.member ?? "—";
      }

      if ($("ownerBannedCount")) {
        $("ownerBannedCount").textContent = stats.banned ?? "—";
      }
    } catch (error) {
      status("ownerUsersStatus", "Statistik gagal: " + error.message);
    }

    const { count, error } = await db
      .from("vexora_tools")
      .select("*", { count: "exact", head: true });

    if ($("ownerToolsCount")) {
      $("ownerToolsCount").textContent =
        error ? "—" : String(count ?? 0);
    }
  }

  function resetToolForm() {
    $("ownerToolForm")?.reset();

    if ($("ownerToolId")) {
      $("ownerToolId").value = "";
    }
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

    if (!tbody) {
      status("ownerToolsStatus", "Tabel tools belum ada di dashboard.html.");
      return;
    }

    tbody.replaceChildren();

    for (const tool of data || []) {
      const tr = document.createElement("tr");

      const name = document.createElement("td");
      name.textContent = tool.name || "";

      const category = document.createElement("td");
      category.textContent = safeText(tool.category || "").toUpperCase();

      const actions = document.createElement("td");

      const edit = makeButton("Edit", "tool-open", () => {
        if ($("ownerToolId")) $("ownerToolId").value = tool.id;
        if ($("ownerToolName")) $("ownerToolName").value = tool.name || "";
        if ($("ownerToolDesc")) {
          $("ownerToolDesc").value = tool.description || "";
        }
        if ($("ownerToolCategory")) {
          $("ownerToolCategory").value = tool.category || "member";
        }
        if ($("ownerToolUrl")) $("ownerToolUrl").value = tool.url || "";

        $("ownerToolName")?.focus();
      });

      const remove = makeButton("Hapus", "tool-open locked", async () => {
        if (!confirm(`Hapus tools "${tool.name}"?`)) return;

        remove.disabled = true;

        try {
          const { error: deleteError } = await db
            .from("vexora_tools")
            .delete()
            .eq("id", tool.id);

          if (deleteError) throw deleteError;

          status("ownerToolsStatus", "Tools berhasil dihapus.");
          await loadTools();
          await loadStats();
        } catch (error) {
          status("ownerToolsStatus", "Gagal menghapus: " + error.message);
        } finally {
          remove.disabled = false;
        }
      });

      actions.append(edit, remove);
      tr.append(name, category, actions);
      tbody.appendChild(tr);
    }

    status("ownerToolsStatus", `${(data || []).length} tools tersimpan.`);

    if ($("ownerToolsCount")) {
      $("ownerToolsCount").textContent = String((data || []).length);
    }
  }

  $("ownerToolForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const id = $("ownerToolId")?.value || "";
    const name = $("ownerToolName")?.value.trim() || "";
    const description = $("ownerToolDesc")?.value.trim() || "";
    const category = $("ownerToolCategory")?.value || "member";
    const url = $("ownerToolUrl")?.value.trim() || "";

    if (!name) {
      status("ownerToolsStatus", "Nama tools wajib diisi.");
      return;
    }

    if (url && !/^https:\/\/\S+$/i.test(url)) {
      status("ownerToolsStatus", "URL harus menggunakan HTTPS.");
      return;
    }

    const values = { name, description, category, url };

    try {
      const query = id
        ? db.from("vexora_tools").update(values).eq("id", id)
        : db.from("vexora_tools").insert(values);

      const { error } = await query;
      if (error) throw error;

      resetToolForm();
      await loadTools();
      await loadStats();
      status("ownerToolsStatus", "Tools berhasil disimpan.");
    } catch (error) {
      status("ownerToolsStatus", "Gagal menyimpan: " + error.message);
    }
  });

  $("ownerToolCancel")?.addEventListener("click", resetToolForm);
  $("ownerReloadUsers")?.addEventListener("click", loadUsers);
  $("ownerUserSearch")?.addEventListener("input", renderUsers);

  await Promise.all([loadUsers(), loadTools(), loadStats()]);
})().catch((error) => {
  console.error("Owner panel:", error);

  const box = document.getElementById("ownerUsersStatus");
  if (box) {
    box.textContent = "Panel gagal dimuat. Periksa konfigurasi dan Edge Function.";
  }
});
      
