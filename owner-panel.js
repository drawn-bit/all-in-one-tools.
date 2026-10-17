
/* VEXORA owner-panel.js
   Owner Panel — dashboard.js + owner-admin + vexora-extras.js
*/
(() => {
  'use strict';

  if (window.__VEXORA_OWNER_PANEL_LOADED__) return;
  window.__VEXORA_OWNER_PANEL_LOADED__ = true;

  const $ = (id) => document.getElementById(id);

  const TABLE_TOOLS = 'vexora_tools';
  const ADMIN_FUNCTION = 'owner-admin';

  let db = null;
  let currentUsers = [];
  let currentTools = [];
  let isLoading = false;
  let eventsBound = false;

  // -----------------------------
  // UTILITAS
  // -----------------------------
  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[c]);
  }

  function status(id, message, isError = false) {
    const el = $(id);
    if (!el) return;

    el.textContent = message;
    el.style.color = isError ? '#ff9caa' : '#8fe9c0';
  }

  function getClient() {
    if (typeof window.vexoraGetClient === 'function') {
      db = window.vexoraGetClient() || db;
    }

    db = db || window.vexoraSupabase || window.supabaseClient;

    if (!db) {
      throw new Error('Supabase belum siap. Muat ulang dashboard.');
    }

    return db;
  }

  async function verifyOwner() {
    const client = getClient();
    const { data, error } = await client.auth.getSession();

    if (error) throw error;

    const user = data?.session?.user;
    if (!user) throw new Error('Sesi login tidak ditemukan.');

    const role = String(
      user.app_metadata?.role ||
      user.user_metadata?.role ||
      'member'
    ).toLowerCase();

    if (role !== 'owner') {
      throw new Error('Akun ini tidak memiliki akses Owner.');
    }

    return user;
  }

  async function callAdmin(action, payload = {}) {
    const client = getClient();

    const { data, error } = await client.functions.invoke(
      ADMIN_FUNCTION,
      {
        body: { action, ...payload }
      }
    );

    if (error) {
      let message = error.message || 'Permintaan ke Owner API gagal.';

      try {
        const response = error.context;
        if (response && typeof response.json === 'function') {
          const body = await response.json();
          message = body.error || body.message || message;
        }
      } catch (_) {}

      throw new Error(message);
    }

    if (data == null) {
      throw new Error('Owner API tidak mengembalikan data.');
    }

    if (data.success === false || data.error) {
      throw new Error(
        data.error || data.message || 'Aksi ditolak oleh Owner API.'
      );
    }

    return data;
  }

  function getList(result, keys) {
    if (Array.isArray(result)) return result;

    for (const key of keys) {
      if (Array.isArray(result?.[key])) return result[key];
      if (Array.isArray(result?.data?.[key])) return result.data[key];
    }

    return null;
  }

  // -----------------------------
  // STATISTIK
  // -----------------------------
function renderStats(result) {
  const source = result?.stats || result?.counts || result?.data || result;

  const values = {
    ownerUsersCount: source.total ?? source.total_users ?? source.totalUsers,
    ownerVipCount: source.vip ?? source.vip_users ?? source.vipUsers,
    ownerAdminsCount: source.owner ?? source.owner_users ?? source.ownerUsers,
    ownerMembersCount: source.member ?? source.member_users ?? source.memberUsers,
    ownerBannedCount: source.banned ?? source.banned_users ?? source.bannedUsers,
    ownerToolsCount: source.tools ?? source.total_tools ?? source.tools_count
  };

  for (const [id, value] of Object.entries(values)) {
    const el = $(id);
    if (el && value !== undefined && value !== null) {
      el.textContent = String(value);
    }
  }
    }
   
    const values = {
      ownerUsersCount: [
        'total_users', 'totalUsers', 'users_count', 'user_count'
      ],
      ownerVipCount: [
        'vip_users', 'vipUsers', 'total_vip', 'vip_count'
      ],
      ownerAdminsCount: [
        'owner_users', 'ownerUsers', 'total_owners', 'owners', 'admins'
      ],
      ownerMembersCount: [
        'member_users', 'memberUsers', 'total_members', 'members'
      ],
      ownerBannedCount: [
        'banned_users', 'bannedUsers', 'total_banned', 'banned'
      ],
      ownerToolsCount: [
        'total_tools', 'tools_count', 'totalTools'
      ]
    };

    for (const [elementId, keys] of Object.entries(values)) {
      const el = $(elementId);
      if (!el) continue;

      for (const key of keys) {
        if (source?.[key] !== undefined && source[key] !== null) {
          el.textContent = String(source[key]);
          break;
        }
      }
    }
  }

  async function loadStats() {
    try {
      const result = await callAdmin('stats');
      renderStats(result);
    } catch (error) {
      console.error('[VEXORA] Statistik:', error);
      status(
        'ownerUsersStatus',
        'Statistik gagal dimuat: ' + error.message,
        true
      );
    }
  }

  // -----------------------------
  // DATA AKUN
  // -----------------------------
  function normalizeUser(user) {
    const role = String(
      user.role ||
      user.app_metadata?.role ||
      user.user_metadata?.role ||
      'member'
    ).toLowerCase();

    const banned = Boolean(
      user.banned ||
      user.is_banned ||
      (
        user.banned_until &&
        new Date(user.banned_until).getTime() > Date.now()
      )
    );

    return {
      ...user,
      id: user.id || user.userId || user.userId || '',
      email: user.email || user.user_email || 'Tanpa email',
      role,
      banned
    };
  }

  function renderUsers() {
    const table = $('ownerUsersTable');
    if (!table) return;

    const query = ($('ownerUserSearch')?.value || '')
      .trim()
      .toLowerCase();

    const list = currentUsers.filter((user) =>
      `${user.email} ${user.id} ${user.role}`
        .toLowerCase()
        .includes(query)
    );

    if (!list.length) {
      table.innerHTML =
        '<tr><td colspan="6">Tidak ada akun yang cocok.</td></tr>';
      return;
    }

    table.innerHTML = list.map((user) => {
      const id = escapeHTML(user.id);
      const email = escapeHTML(user.email);
      const role = ['owner', 'vip', 'member'].includes(user.role)
        ? user.role
        : 'member';

      const roleUI = role === 'owner'
        ? '<strong>OWNER</strong>'
        : `
          <select data-role-select="${id}">
            <option value="member" ${role === 'member' ? 'selected' : ''}>Member</option>
            <option value="vip" ${role === 'vip' ? 'selected' : ''}>VIP</option>
          </select>
          <button type="button" data-user-action="role" data-id="${id}">
            Simpan
          </button>
        `;

      const banUI = user.banned
        ? `<button type="button" data-user-action="unban" data-id="${id}">Buka blokir</button>`
        : `<button type="button" data-user-action="ban" data-id="${id}">Ban</button>`;

      const deleteUI = role === 'owner'
        ? ''
        : `<button type="button" data-user-action="delete" data-id="${id}">Hapus</button>`;

      return `
        <tr>
          <td>${email}</td>
          <td>${id}</td>
          <td>${escapeHTML(role.toUpperCase())}</td>
          <td>${user.banned ? 'Diblokir' : 'Aktif'}</td>
          <td>${roleUI}</td>
          <td>${banUI} ${deleteUI}</td>
        </tr>
      `;
    }).join('');
  }

  async function loadUsers() {
    status('ownerUsersStatus', 'Memuat data akun...');

    try {
      const result = await callAdmin('list_users');
      const list = getList(result, ['users', 'items']);

      if (!list) {
        throw new Error(
          'Format list_users tidak sesuai. Periksa respons Edge Function.'
        );
      }

      currentUsers = list.map(normalizeUser);
      renderUsers();

      status(
        'ownerUsersStatus',
        `${currentUsers.length} akun berhasil dimuat.`
      );
    } catch (error) {
      console.error('[VEXORA] Memuat akun:', error);
      status(
        'ownerUsersStatus',
        'Gagal memuat akun: ' + error.message,
        true
      );
    }
  }

  async function userAction(action, userId, extra = {}) {
    if (!userId) throw new Error('ID akun tidak ditemukan.');

    const actionNames = {
      role: 'set_role',
      ban: 'ban_user',
      unban: 'unban_user',
      delete: 'delete_user'
    };

    const adminAction = actionNames[action];
    if (!adminAction) throw new Error('Aksi akun tidak dikenal.');

    if (action === 'ban' &&
        !window.confirm('Yakin ingin memblokir akun ini?')) return;

    if (action === 'delete' &&
        !window.confirm('Yakin ingin menghapus akun ini secara permanen?')) return;

    const payload = {
      // Kirim kedua bentuk ID untuk kompatibilitas dengan handler.
      userId,
      user_id: userId
    };

    if (action === 'role') {
      const role = extra.role;
      if (!['member', 'vip'].includes(role)) {
        throw new Error('Role yang dipilih tidak valid.');
      }
      payload.role = role;
    }

    await callAdmin(adminAction, payload);

    status('ownerUsersStatus', 'Aksi akun berhasil dijalankan.');

    await Promise.all([loadUsers(), loadStats()]);
  }

  // -----------------------------
  // DATA TOOLS
  // -----------------------------
  function renderTools() {
    const table = $('ownerToolsTable');
    if (!table) return;

    if (!currentTools.length) {
      table.innerHTML =
        '<tr><td colspan="6">Belum ada data tools.</td></tr>';
      return;
    }

    table.innerHTML = currentTools.map((tool) => {
      const id = escapeHTML(tool.id);
      const category = String(tool.category || 'free').toLowerCase();
      const state = String(tool.status || 'active').toLowerCase();

      return `
        <tr>
          <td>${escapeHTML(tool.name || '')}</td>
          <td>${escapeHTML(category.toUpperCase())}</td>
          <td>${escapeHTML(state)}</td>
          <td>${escapeHTML(tool.url || '-')}</td>
          <td>
            <button type="button" data-tool-action="edit" data-id="${id}">Edit</button>
            <button type="button" data-tool-action="status" data-id="${id}">
              ${state === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
            </button>
            <button type="button" data-tool-action="delete" data-id="${id}">Hapus</button>
          </td>
        </tr>
      `;
    }).join('');
  }


async function loadTools() {
  status('ownerToolsStatus', 'Memuat tools...');

  try {
    const result = await callAdmin('tool_list');
    const list = getList(result, ['tools', 'items']);

    if (!list) throw new Error('Respons daftar tools tidak valid.');

    currentTools = list;
    renderTools();

    if ($('ownerToolsCount')) {
      $('ownerToolsCount').textContent = String(list.length);
    }

    status('ownerToolsStatus', `${list.length} tools berhasil dimuat.`);
  } catch (error) {
    console.error('[VEXORA] Memuat tools:', error);
    status('ownerToolsStatus', 'Gagal memuat tools: ' + error.message, true);
  }
  }
       }

  function resetToolForm() {
    $('ownerToolForm')?.reset();

    if ($('ownerToolId')) $('ownerToolId').value = '';
    if ($('ownerToolCancel')) $('ownerToolCancel').hidden = true;
  }

  function editTool(tool) {
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

    if ($('ownerToolCancel')) $('ownerToolCancel').hidden = false;

    $('ownerToolForm')?.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
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
      status('ownerToolsStatus', 'Nama tools wajib diisi.', true);
      return;
    }

    if (!['free', 'vip'].includes(category)) {
      status('ownerToolsStatus', 'Kategori tools tidak valid.', true);
      return;
    }

    if (url && !/^https?:\/\//i.test(url)) {
      status(
        'ownerToolsStatus',
        'URL harus diawali https:// atau http://.',
        true
      );
      return;
    }

    const payload = { name, category, description, url };

    status('ownerToolsStatus', 'Menyimpan tools...');

    try {
      let request = id
        ? client.from(TABLE_TOOLS).update(payload).eq('id', id)
        : client.from(TABLE_TOOLS).insert(payload);

      const { error } = await request;
      if (error) throw error;

      resetToolForm();

      await Promise.all([loadTools(), loadStats()]);

      status('ownerToolsStatus', 'Tools berhasil disimpan.');
    } catch (error) {
      console.error('[VEXORA] Menyimpan tools:', error);
      status(
        'ownerToolsStatus',
        'Gagal menyimpan tools: ' + error.message,
        true
      );
    }
  }

  async function deleteTool(tool) {
    if (!window.confirm(`Hapus tools "${tool.name || ''}"?`)) return;

    const client = getClient();
    const { error } = await client
      .from(TABLE_TOOLS)
      .delete()
      .eq('id', tool.id);

    if (error) throw error;

    await Promise.all([loadTools(), loadStats()]);
    status('ownerToolsStatus', 'Tools berhasil dihapus.');
  }

  async function toggleToolStatus(tool) {
    const oldStatus = String(tool.status || 'active').toLowerCase();
    const newStatus = oldStatus === 'active' ? 'disabled' : 'active';

    await callAdmin('tool_status_set', {
      id: tool.id,
      tool_id: tool.id,
      status: newStatus,
      status_message: newStatus === 'disabled'
        ? 'Tools dinonaktifkan oleh Owner.'
        : ''
    });

    await loadTools();
    status('ownerToolsStatus', 'Status tools diperbarui.');
  }

  // -----------------------------
  // EVENT TOMBOL
  // -----------------------------
  function bindEvents() {
    if (eventsBound) return;
    eventsBound = true;

    $('ownerReloadUsers')?.addEventListener('click', async () => {
      await Promise.all([loadUsers(), loadStats()]);
    });

    $('ownerUserSearch')?.addEventListener('input', renderUsers);

    $('ownerToolForm')?.addEventListener('submit', saveTool);
    $('ownerToolCancel')?.addEventListener('click', resetToolForm);

    $('ownerUsersTable')?.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-user-action]');
      if (!button) return;

      const action = button.dataset.userAction;
      const userId = button.dataset.id;

      button.disabled = true;

      try {
        if (action === 'role') {
          const select = Array.from(
            $('ownerUsersTable').querySelectorAll('[data-role-select]')
          ).find((item) => item.dataset.roleSelect === userId);

          if (!select) throw new Error('Pilihan role tidak ditemukan.');

          await userAction('role', userId, { role: select.value });
        } else {
          await userAction(action, userId);
        }
      } catch (error) {
        console.error('[VEXORA] Aksi akun:', error);
        status(
          'ownerUsersStatus',
          'Aksi akun gagal: ' + error.message,
          true
        );
      } finally {
        button.disabled = false;
      }
    });

    $('ownerToolsTable')?.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-tool-action]');
      if (!button) return;

      const tool = currentTools.find(
        (item) => String(item.id) === String(button.dataset.id)
      );

      if (!tool) {
        status('ownerToolsStatus', 'Tools tidak ditemukan.', true);
        return;
      }

      button.disabled = true;

      try {
        switch (button.dataset.toolAction) {
          case 'edit':
            editTool(tool);
            break;
          case 'status':
            await toggleToolStatus(tool);
            break;
          case 'delete':
            await deleteTool(tool);
            break;
        }
      } catch (error) {
        console.error('[VEXORA] Aksi tools:', error);
        status(
          'ownerToolsStatus',
          'Aksi tools gagal: ' + error.message,
          true
        );
      } finally {
        button.disabled = false;
      }
    });
  }

  // -----------------------------
  // PEMBUKA PANEL
  // -----------------------------
  async function loadOwnerPanel() {
    if (isLoading) return;
    isLoading = true;

    try {
      await verifyOwner();
      bindEvents();

      await Promise.all([
        loadStats(),
        loadUsers(),
        loadTools()
      ]);
    } catch (error) {
      console.error('[VEXORA] Owner Panel:', error);
      status(
        'ownerUsersStatus',
        'Owner Panel gagal dibuka: ' + error.message,
        true
      );
    } finally {
      isLoading = false;
    }
  }

  window.loadOwnerPanel = loadOwnerPanel;

  window.VEXORA_OWNER_PANEL = {
    load: loadOwnerPanel,
    loadUsers,
    loadStats,
    loadTools
  };

  bindEvents();
})();
       
