
/* VEXORA owner-panel.js
   Compatible with dashboard.js + owner-admin + vexora-extras.js
*/
(() => {
  'use strict';

  if (window.__VEXORA_OWNER_PANEL_LOADED__) return;
  window.__VEXORA_OWNER_PANEL_LOADED__ = true;

  const $ = (id) => document.getElementById(id);

  const ADMIN_FUNCTION = 'owner-admin';
  const TOOLS_TABLE = 'vexora_tools';

  let db = null;
  let users = [];
  let tools = [];
  let loading = false;

  const escapeHTML = (value) =>
    String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[char]);

  function setStatus(id, message, isError = false) {
    const el = $(id);
    if (!el) return;

    el.textContent = message;
    el.style.color = isError ? '#ff9caa' : '#8fe9c0';
  }

  function getClient() {
    if (typeof window.vexoraGetClient === 'function') {
      const shared = window.vexoraGetClient();
      if (shared) db = shared;
    }

    if (!db) {
      db = window.vexoraSupabase || window.supabaseClient || null;
    }

    if (!db) {
      throw new Error(
        'Supabase client belum siap. Muat ulang dashboard.'
      );
    }

    return db;
  }

  function unwrap(result) {
    let value = result;

    // Mendukung respons yang dibungkus beberapa kali.
    for (let i = 0; i < 3; i++) {
      if (!value || typeof value !== 'object') break;

      if (
        value.data &&
        typeof value.data === 'object' &&
        !Array.isArray(value.data)
      ) {
        value = value.data;
        continue;
      }

      break;
    }

    return value;
  }

  async function verifyOwner() {
    const client = getClient();
    const { data, error } = await client.auth.getSession();

    if (error) throw error;

    const user = data?.session?.user;

    if (!user) {
      throw new Error('Sesi login tidak ditemukan.');
    }

    const role = String(
      user.app_metadata?.role ||
      user.user_metadata?.role ||
      'member'
    ).toLowerCase();

    if (role !== 'owner') {
      throw new Error(
        'Akses ditolak. Akun ini bukan Owner VEXORA.'
      );
    }

    return user;
  }

  async function callAdmin(action, payload = {}) {
    const client = getClient();

    const { data, error } = await client.functions.invoke(
      ADMIN_FUNCTION,
      {
        body: {
          action,
          ...payload
        }
      }
    );

    if (error) {
      let detail = error.message || 'Permintaan ke Owner API gagal.';

      if (error.context && typeof error.context.json === 'function') {
        try {
          const body = await error.context.json();
          detail = body.error || body.message || detail;
        } catch (_) {
          // Respons bukan JSON; gunakan pesan awal.
        }
      }

      throw new Error(detail);
    }

    const result = unwrap(data);

    if (!result || result.success === false || result.error) {
      throw new Error(
        result?.error ||
        result?.message ||
        'Owner API mengembalikan respons yang tidak berhasil.'
      );
    }

    return result;
  }

  function getArray(result, keys) {
    for (const key of keys) {
      if (Array.isArray(result?.[key])) return result[key];
    }

    // Mendukung API yang langsung mengembalikan array.
    if (Array.isArray(result)) return result;

    return null;
  }

  function normalizeUser(user) {
    return {
      ...user,
      id: user.id || user.user_id || user.uid || '',
      email: user.email || user.user_email || 'Tanpa email',
      role: String(
        user.role ||
        user.app_metadata?.role ||
        user.user_metadata?.role ||
        'member'
      ).toLowerCase(),
      banned:
        Boolean(user.banned) ||
        Boolean(user.is_banned) ||
        Boolean(user.banned_until && new Date(user.banned_until) > new Date())
    };
  }

  function renderStats(result) {
    const stats = result?.stats || result?.counts || result || {};

    const totalUsers =
      stats.total_users ?? stats.totalUsers ??
      stats.users_count ?? stats.users;

    const totalVip =
      stats.vip_users ?? stats.vipUsers ??
      stats.total_vip ?? stats.vip;

    const totalOwners =
      stats.owner_users ?? stats.ownerUsers ??
      stats.total_owners ?? stats.owners ??
      stats.admins;

    const totalMembers =
      stats.member_users ?? stats.memberUsers ??
      stats.total_members ?? stats.members;

    const totalBanned =
      stats.banned_users ?? stats.bannedUsers ??
      stats.total_banned ?? stats.banned;

    const assign = (id, value) => {
      if ($(id) && value !== undefined && value !== null) {
        $(id).textContent = String(value);
      }
    };

    assign('ownerUsersCount', totalUsers);
    assign('ownerVipCount', totalVip);
    assign('ownerAdminsCount', totalOwners);
    assign('ownerMembersCount', totalMembers);
    assign('ownerBannedCount', totalBanned);
    assign('ownerToolsCount', stats.total_tools ?? stats.tools_count);
  }

  async function loadStats() {
    try {
      const result = await callAdmin('stats');
      renderStats(result);
    } catch (error) {
      console.error('[VEXORA] Stats:', error);
      setStatus(
        'ownerUsersStatus',
        'Statistik gagal dimuat: ' + error.message,
        true
      );
    }
  }

  function renderUsers() {
    const table = $('ownerUsersTable');
    if (!table) return;

    const query = ($('ownerUserSearch')?.value || '')
      .trim()
      .toLowerCase();

    const filtered = users.filter((user) =>
      `${user.email} ${user.id} ${user.role}`
        .toLowerCase()
        .includes(query)
    );

    if (!filtered.length) {
      table.innerHTML =
        '<tr><td colspan="6">Tidak ada akun yang cocok.</td></tr>';
      return;
    }

    table.innerHTML = filtered.map((user) => {
      const id = escapeHTML(user.id);
      const email = escapeHTML(user.email);
      const role = ['owner', 'vip', 'member'].includes(user.role)
        ? user.role
        : 'member';

      const status = user.banned ? 'Diblokir' : 'Aktif';

      const banButton = user.banned
        ? `<button type="button" data-user-action="unban" data-id="${id}">Buka blokir</button>`
        : `<button type="button" data-user-action="ban" data-id="${id}">Ban</button>`;

      const roleControl = role === 'owner'
        ? '<span>OWNER</span>'
        : `
          <select data-role-select="${id}" aria-label="Role ${email}">
            <option value="member" ${role === 'member' ? 'selected' : ''}>Member</option>
            <option value="vip" ${role === 'vip' ? 'selected' : ''}>VIP</option>
          </select>
          <button type="button" data-user-action="role" data-id="${id}">Simpan role</button>
        `;

      return `
        <tr>
          <td>${email}</td>
          <td>${id}</td>
          <td>${escapeHTML(role.toUpperCase())}</td>
          <td>${status}</td>
          <td>${roleControl}</td>
          <td>
            ${banButton}
            ${role !== 'owner'
              ? `<button type="button" data-user-action="delete" data-id="${id}">Hapus</button>`
              : ''}
          </td>
        </tr>
      `;
    }).join('');
  }

  async function loadUsers() {
    setStatus('ownerUsersStatus', 'Memuat data akun...');

    try {
      const result = await callAdmin('list_users');
      const list = getArray(result, ['users', 'data', 'items']);

      if (!list) {
        throw new Error(
          'Format respons list_users tidak sesuai. Periksa respons Edge Function.'
        );
      }

      users = list.map(normalizeUser);
      renderUsers();

      setStatus(
        'ownerUsersStatus',
        `Berhasil memuat ${users.length} akun.`
      );
    } catch (error) {
      console.error('[VEXORA] Load users:', error);
      setStatus(
        'ownerUsersStatus',
        'Gagal memuat akun: ' + error.message,
        true
      );
    }
  }

  function renderTools() {
    const table = $('ownerToolsTable');
    if (!table) return;

    if (!tools.length) {
      table.innerHTML =
        '<tr><td colspan="6">Belum ada data tools.</td></tr>';
      return;
    }

    table.innerHTML = tools.map((tool) => {
      const id = escapeHTML(tool.id);
      const name = escapeHTML(tool.name || '');
      const category = String(tool.category || 'free').toLowerCase();
      const status = String(tool.status || 'active').toLowerCase();

      return `
        <tr>
          <td>${name}</td>
          <td>${escapeHTML(category.toUpperCase())}</td>
          <td>${escapeHTML(status)}</td>
          <td>${escapeHTML(tool.url || '-')}</td>
          <td>
            <button type="button" data-tool-action="edit" data-id="${id}">Edit</button>
            <button type="button" data-tool-action="status" data-id="${id}">
              ${status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
            </button>
            <button type="button" data-tool-action="delete" data-id="${id}">Hapus</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  async function loadTools() {
    setStatus('ownerToolsStatus', 'Memuat data tools...');

    try {
      const result = await callAdmin('tool_status_list');
      const list = getArray(result, ['tools', 'data', 'items']);

      if (!list) {
        throw new Error(
          'Format respons tool_status_list tidak sesuai.'
        );
      }

      tools = list;
      renderTools();

      setStatus(
        'ownerToolsStatus',
        `Berhasil memuat ${tools.length} tools.`
      );

      if ($('ownerToolsCount')) {
        $('ownerToolsCount').textContent = String(tools.length);
      }
    } catch (error) {
      console.error('[VEXORA] Load tools:', error);
      setStatus(
        'ownerToolsStatus',
        'Gagal memuat tools: ' + error.message,
        true
      );

      // Jangan kosongkan data lokal seolah-olah tabel memang kosong.
    }
  }

  async function changeUser(action, userId, extra = {}) {
    if (!userId) throw new Error('ID akun tidak ditemukan.');

    const confirmed = action === 'delete'
      ? window.confirm(
          'Yakin ingin menghapus akun ini secara permanen?'
        )
      : action === 'ban'
        ? window.confirm('Yakin ingin memblokir akun ini?')
        : true;

    if (!confirmed) return;

    const actionMap = {
      role: 'set_role',
      ban: 'ban_user',
      unban: 'unban_user',
      delete: 'delete_user'
    };

    const body = {
      user_id: userId,
      ...extra
    };

    if (action === 'role') {
      body.role = extra.role;
      delete body.roleValue;
    }

    await callAdmin(actionMap[action], body);

    setStatus('ownerUsersStatus', 'Aksi akun berhasil dijalankan.');
    await Promise.all([loadUsers(), loadStats()]);
  }

  function resetToolForm() {
    $('ownerToolForm')?.reset();

    if ($('ownerToolId')) $('ownerToolId').value = '';

    const cancel = $('ownerToolCancel');
    if (cancel) cancel.hidden = true;
  }

  function fillToolForm(tool) {
    if (!tool) return;

    if ($('ownerToolId')) $('ownerToolId').value = tool.id || '';
    if ($('ownerToolName')) $('ownerToolName').value = tool.name || '';
    if ($('ownerToolCategory')) {
      $('ownerToolCategory').value =
        String(tool.category || 'free').toLowerCase();
    }
    if ($('ownerToolDesc')) {
      $('ownerToolDesc').value = tool.description || '';
    }
    if ($('ownerToolUrl')) $('ownerToolUrl').value = tool.url || '';

    $('ownerToolForm')?.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });

    if ($('ownerToolName')) $('ownerToolName').focus();
    if ($('ownerToolCancel')) $('ownerToolCancel').hidden = false;
  }

  async function saveTool(event) {
    event.preventDefault();

    const client = getClient();
    const id = $('ownerToolId')?.value.trim() || '';

    const name = $('ownerToolName')?.value.trim() || '';
    const category = $('ownerToolCategory')?.value || 'free';
    const description = $('ownerToolDesc')?.value.trim() || '';
    const url = $('ownerToolUrl')?.value.trim() || '';

    if (!name) {
      setStatus('ownerToolsStatus', 'Nama tools wajib diisi.', true);
      return;
    }

    if (category !== 'vip' && category !== 'free') {
      setStatus('ownerToolsStatus', 'Kategori tidak valid.', true);
      return;
    }

    if (url && !/^https?:\/\//i.test(url)) {
      setStatus(
        'ownerToolsStatus',
        'URL harus diawali https:// atau http://.',
        true
      );
      return;
    }

    const payload = {
      name,
      category,
      description,
      url
    };

    setStatus('ownerToolsStatus', 'Menyimpan tools...');

    try {
      let query;

      if (id) {
        query = client
          .from(TOOLS_TABLE)
          .update(payload)
          .eq('id', id);
      } else {
        query = client
          .from(TOOLS_TABLE)
          .insert(payload);
      }

      const { error } = await query;
      if (error) throw error;

      resetToolForm();

      await Promise.all([loadTools(), loadStats()]);

      setStatus('ownerToolsStatus', 'Tools berhasil disimpan.');
    } catch (error) {
      console.error('[VEXORA] Save tool:', error);
      setStatus(
        'ownerToolsStatus',
        'Gagal menyimpan tools: ' + error.message,
        true
      );
    }
  }

  async function deleteTool(toolId) {
    if (!toolId) throw new Error('ID tools tidak ditemukan.');

    if (!window.confirm('Yakin ingin menghapus tools ini?')) return;

    const client = getClient();

    const { error } = await client
      .from(TOOLS_TABLE)
      .delete()
      .eq('id', toolId);

    if (error) throw error;

    await Promise.all([loadTools(), loadStats()]);
    setStatus('ownerToolsStatus', 'Tools berhasil dihapus.');
  }

  async function toggleToolStatus(tool) {
    const oldStatus = String(tool.status || 'active').toLowerCase();
    const newStatus = oldStatus === 'active' ? 'disabled' : 'active';

    const message = newStatus === 'disabled'
      ? 'Tools dinonaktifkan oleh Owner.'
      : '';

    await callAdmin('tool_status_set', {
      id: tool.id,
      tool_id: tool.id,
      status: newStatus,
      status_message: message
    });

    await loadTools();
    setStatus('ownerToolsStatus', 'Status tools berhasil diperbarui.');
  }

  function bindEvents() {
    $('ownerReloadUsers')?.addEventListener('click', async () => {
      await Promise.all([loadUsers(), loadStats()]);
    });

    $('ownerUserSearch')?.addEventListener('input', renderUsers);

    $('ownerToolForm')?.addEventListener('submit', saveTool);
    $('ownerToolCancel')?.addEventListener('click', resetToolForm);

    const userTable = $('ownerUsersTable');

    if (userTable && !userTable.dataset.vexoraBound) {
      userTable.dataset.vexoraBound = '1';

      userTable.addEventListener('click', async (event) => {
        const button = event.target.closest('[data-user-action]');
        if (!button) return;

        const action = button.dataset.userAction;
        const userId = button.dataset.id;

        button.disabled = true;

        try {
          if (action === 'role') {
            const select = userTable.querySelector(
              `[data-role-select="${CSS.escape(userId)}"]`
            );

            const role = select?.value;

            if (!['member', 'vip'].includes(role)) {
              throw new Error('Role yang dipilih tidak valid.');
            }

            await changeUser('role', userId, { role });
          } else {
            await changeUser(action, userId);
          }
        } catch (error) {
          console.error('[VEXORA] User action:', error);
          setStatus(
            'ownerUsersStatus',
            'Aksi akun gagal: ' + error.message,
            true
          );
        } finally {
          button.disabled = false;
        }
      });
    }

    const toolTable = $('ownerToolsTable');

    if (toolTable && !toolTable.dataset.vexoraBound) {
      toolTable.dataset.vexoraBound = '1';

      toolTable.addEventListener('click', async (event) => {
        const button = event.target.closest('[data-tool-action]');
        if (!button) return;

        const action = button.dataset.toolAction;
        const tool = tools.find(
          (item) => String(item.id) === String(button.dataset.id)
        );

        if (!tool) {
          setStatus('ownerToolsStatus', 'Data tools tidak ditemukan.', true);
          return;
        }

        button.disabled = true;

        try {
          if (action === 'edit') {
            fillToolForm(tool);
          } else if (action === 'delete') {
            await deleteTool(tool.id);
          } else if (action === 'status') {
            await toggleToolStatus(tool);
          }
        } catch (error) {
          console.error('[VEXORA] Tool action:', error);
          setStatus(
            'ownerToolsStatus',
            'Aksi tools gagal: ' + error.message,
            true
          );
        } finally {
          button.disabled = false;
        }
      });
    }
  }

  async function loadOwnerPanel() {
    if (loading) return;
    loading = true;

    try {
      await verifyOwner();
      bindEvents();

      await Promise.all([
        loadStats(),
        loadUsers(),
        loadTools()
      ]);
    } catch (error) {
      console.error('[VEXORA] Owner panel:', error);
      setStatus(
        'ownerUsersStatus',
        error.message || 'Owner Panel gagal dimuat.',
        true
      );
    } finally {
      loading = false;
    }
  }

  // Dipanggil dashboard.js ketika halaman Owner dibuka.
  window.loadOwnerPanel = loadOwnerPanel;

  // Bisa dipanggil dari console atau tombol refresh bila diperlukan.
  window.VEXORA_OWNER_PANEL = {
    load: loadOwnerPanel,
    loadUsers,
    loadStats,
    loadTools
  };

  // Bind event awal; data dimuat saat Owner membuka panel.
  bindEvents();
})();
         
