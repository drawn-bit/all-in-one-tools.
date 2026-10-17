
/* VEXORA owner-panel.js
   Pagination akun: 5 akun per halaman.
   Statistik, role, ban, hapus akun, dan tools tetap tersedia.
*/
(() => {
  'use strict';

  if (window.__VEXORA_OWNER_PANEL_LOADED__) return;
  window.__VEXORA_OWNER_PANEL_LOADED__ = true;

  const $ = (id) => document.getElementById(id);
  const TABLE_TOOLS = 'vexora_tools';
  const ADMIN_FUNCTION = 'owner-admin';
  const PAGE_SIZE = 5;

  let db = null;
  let currentUsers = [];
  let currentTools = [];
  let currentPage = 1;
  let isLoading = false;
  let eventsBound = false;

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;',
      '"': '&quot;', "'": '&#39;'
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

    if (!db) throw new Error('Supabase belum siap. Muat ulang dashboard.');
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
    const { data, error } = await getClient().functions.invoke(
      ADMIN_FUNCTION,
      { body: { action, ...payload } }
    );

    if (error) {
      let message = error.message || 'Permintaan Owner API gagal.';
      try {
        if (error.context?.json) {
          const body = await error.context.json();
          message = body.error || body.message || message;
        }
      } catch (_) {}
      throw new Error(message);
    }

    if (!data) throw new Error('Owner API tidak mengembalikan data.');
    if (data.success === false || data.error) {
      throw new Error(data.error || data.message || 'Aksi gagal.');
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

  function renderStats(result = {}) {
    const source = result.stats || result.counts || result.data || result;

    const values = {
      ownerUsersCount: source.total ?? source.total_users,
      ownerVipCount: source.vips ?? source.vip ?? source.vip_users,
      ownerAdminsCount: source.owners ?? source.owner ?? source.owner_users,
      ownerMembersCount: source.members ?? source.member ?? source.member_users,
      ownerBannedCount: currentUsers.filter((u) => u.banned).length,
      ownerToolsCount: currentTools.length
    };

    for (const [id, value] of Object.entries(values)) {
      const el = $(id);
      if (el && value !== undefined && value !== null) {
        el.textContent = String(value);
      }
    }
  }

  async function loadStats() {
    try {
      renderStats(await callAdmin('stats'));
    } catch (error) {
      console.error('[VEXORA] Statistik:', error);
      status('ownerUsersStatus', 'Statistik gagal dimuat: ' + error.message, true);
    }
  }

  // ---------------- AKUN ----------------

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
      (user.banned_until &&
       new Date(user.banned_until).getTime() > Date.now())
    );

    return {
      ...user,
      id: user.id || user.userId || user.user_id || '',
      email: user.email || user.user_email || 'Tanpa email',
      role,
      banned
    };
  }

  function ensurePagination() {
    const table = $('ownerUsersTable');
    const wrap = table?.closest('.owner-table-wrap');
    if (!wrap) return null;

    let pager = $('ownerUsersPagination');

    if (!pager) {
      pager = document.createElement('div');
      pager.id = 'ownerUsersPagination';
      pager.style.cssText = [
        'display:flex',
        'align-items:center',
        'justify-content:space-between',
        'gap:10px',
        'flex-wrap:wrap',
        'margin-top:12px',
        'padding:12px',
        'background:#10192b',
        'border:1px solid #23334e',
        'border-radius:12px'
      ].join(';');

      wrap.insertAdjacentElement('afterend', pager);
    }

    return pager;
  }

  function renderPagination(total, pages) {
    const pager = ensurePagination();
    if (!pager) return;

    if (total <= PAGE_SIZE) {
      pager.innerHTML = `
        <span style="font-size:11px;color:#91a2bd">
          ${total} akun ditampilkan
        </span>`;
      return;
    }

    const start = (currentPage - 1) * PAGE_SIZE + 1;
    const end = Math.min(currentPage * PAGE_SIZE, total);

    pager.innerHTML = `
      <span style="font-size:11px;color:#91a2bd">
        ${start}–${end} dari ${total} akun
        <br>Halaman ${currentPage} / ${pages}
      </span>
      <div style="display:flex;gap:7px">
        <button type="button" data-user-page="${currentPage - 1}"
          ${currentPage <= 1 ? 'disabled' : ''}
          style="border:1px solid #2a4264;background:#172a47;color:#fff;border-radius:8px;padding:9px 12px;font-size:12px;${currentPage <= 1 ? 'opacity:.4' : ''}">
          ‹ Sebelumnya
        </button>
        <button type="button" data-user-page="${currentPage + 1}"
          ${currentPage >= pages ? 'disabled' : ''}
          style="border:1px solid #2a4264;background:#172a47;color:#fff;border-radius:8px;padding:9px 12px;font-size:12px;${currentPage >= pages ? 'opacity:.4' : ''}">
          Berikutnya ›
        </button>
      </div>`;
  }

  function renderUsers() {
    const table = $('ownerUsersTable');
    if (!table) return;

    const query = ($('ownerUserSearch')?.value || '').trim().toLowerCase();
    const list = currentUsers.filter((user) =>
      `${user.email} ${user.id} ${user.role}`.toLowerCase().includes(query)
    );

    const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    currentPage = Math.min(currentPage, pages);
    currentPage = Math.max(1, currentPage);

    if (!list.length) {
      table.innerHTML = '<tr><td colspan="6">Tidak ada akun yang cocok.</td></tr>';
      renderPagination(0, 1);
      return;
    }

    const start = (currentPage - 1) * PAGE_SIZE;
    const visibleUsers = list.slice(start, start + PAGE_SIZE);

    table.innerHTML = visibleUsers.map((user) => {
      const id = escapeHTML(user.id);
      const email = escapeHTML(user.email);
      const role = ['owner', 'vip', 'member'].includes(user.role)
        ? user.role : 'member';

      const roleUI = role === 'owner'
        ? '<strong>OWNER</strong>'
        : `
          <select data-role-select="${id}" aria-label="Pilih role">
            <option value="member" ${role === 'member' ? 'selected' : ''}>Member</option>
            <option value="vip" ${role === 'vip' ? 'selected' : ''}>VIP</option>
          </select>
          <button type="button" data-user-action="role" data-id="${id}">Simpan</button>`;

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
        </tr>`;
    }).join('');

    renderPagination(list.length, pages);
  }

  async function loadUsers() {
    status('ownerUsersStatus', 'Memuat daftar akun...');

    try {
      const result = await callAdmin('list_users');
      const list = getList(result, ['users', 'items']);
      if (!list) throw new Error('Respons daftar akun tidak valid.');

      currentUsers = list.map(normalizeUser);
      currentPage = 1;
      renderUsers();
      renderStats();

      status('ownerUsersStatus', `${currentUsers.length} akun berhasil dimuat.`);
    } catch (error) {
      console.error('[VEXORA] Daftar akun:', error);
      status('ownerUsersStatus', 'Gagal memuat akun: ' + error.message, true);
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
        !window.confirm('Hapus akun ini secara permanen?')) return;

    const payload = { userId, user_id: userId };

    if (action === 'role') {
      if (!['member', 'vip'].includes(extra.role)) {
        throw new Error('Role yang dipilih tidak valid.');
      }
      payload.role = extra.role;
    }

    await callAdmin(adminAction, payload);
    await Promise.all([loadUsers(), loadStats()]);
    status('ownerUsersStatus', 'Aksi akun berhasil dijalankan.');
  }

  // ---------------- TOOLS ----------------

  async function loadTools() {
    status('ownerToolsStatus', 'Memuat daftar tools...');

    try {
      const { data, error } = await getClient()
        .from(TABLE_TOOLS)
        .select('*');

      if (error) throw error;

      currentTools = Array.isArray(data) ? data : [];
      renderTools();
      renderStats();

      status('ownerToolsStatus', `${currentTools.length} tools berhasil dimuat.`);
    } catch (error) {
      console.error('[VEXORA] Daftar tools:', error);
      status('ownerToolsStatus', 'Gagal memuat tools: ' + error.message, true);
    }
  }

  function renderTools() {
    const table = $('ownerToolsTable');
    if (!table) return;

    if (!currentTools.length) {
      table.innerHTML = '<tr><td colspan="3">Belum ada data tools.</td></tr>';
      return;
    }

    table.innerHTML = currentTools.map((tool) => `
      <tr>
        <td>${escapeHTML(tool.name || '')}</td>
        <td>${escapeHTML(String(tool.category || 'free').toUpperCase())}</td>
        <td>
          <button type="button" data-tool-action="edit" data-id="${escapeHTML(tool.id)}">Edit</button>
          <button type="button" data-tool-action="delete" data-id="${escapeHTML(tool.id)}">Hapus</button>
        </td>
      </tr>`).join('');
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
      $('ownerToolCategory').value = String(tool.category || 'free').toLowerCase();
    }
    if ($('ownerToolDesc')) $('ownerToolDesc').value = tool.description || '';
    if ($('ownerToolUrl')) $('ownerToolUrl').value = tool.url || '';
    if ($('ownerToolCancel')) $('ownerToolCancel').hidden = false;

    $('ownerToolForm')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async function saveTool(event) {
    event.preventDefault();

    try {
      const client = getClient();
      const id = $('ownerToolId')?.value.trim() || '';
      const name = $('ownerToolName')?.value.trim() || '';
      const category = $('ownerToolCategory')?.value || 'free';
      const description = $('ownerToolDesc')?.value.trim() || '';
      const url = $('ownerToolUrl')?.value.trim() || '';

      if (!name) throw new Error('Nama tools wajib diisi.');
      if (!['free', 'vip'].includes(category)) {
        throw new Error('Kategori tools harus FREE atau VIP.');
      }
      if (url && !/^https?:\/\//i.test(url)) {
        throw new Error('URL harus diawali http:// atau https://.');
      }

      status('ownerToolsStatus', 'Menyimpan tools...');

      const values = { name, category, description, url };
      const result = id
        ? await client.from(TABLE_TOOLS).update(values).eq('id', id)
        : await client.from(TABLE_TOOLS).insert(values);

      if (result.error) throw result.error;

      resetToolForm();
      await Promise.all([loadTools(), loadStats()]);

      if (typeof window.vexoraRefreshTools === 'function') {
        await window.vexoraRefreshTools();
      }

      status('ownerToolsStatus', 'Tools berhasil disimpan.');
    } catch (error) {
      console.error('[VEXORA] Simpan tools:', error);
      status('ownerToolsStatus', 'Gagal menyimpan tools: ' + error.message, true);
    }
  }

  async function deleteTool(tool) {
    if (!window.confirm(`Hapus tools "${tool.name || ''}"?`)) return;

    const { error } = await getClient()
      .from(TABLE_TOOLS)
      .delete()
      .eq('id', tool.id);

    if (error) throw error;

    await Promise.all([loadTools(), loadStats()]);

    if (typeof window.vexoraRefreshTools === 'function') {
      await window.vexoraRefreshTools();
    }

    status('ownerToolsStatus', 'Tools berhasil dihapus.');
  }

  // ---------------- EVENT ----------------

  function bindEvents() {
    if (eventsBound) return;
    eventsBound = true;

    $('ownerReloadUsers')?.addEventListener('click', () => {
      Promise.all([loadUsers(), loadStats()]);
    });

    $('ownerUserSearch')?.addEventListener('input', () => {
      currentPage = 1;
      renderUsers();
    });

    $('ownerUsersPagination')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-user-page]');
      if (!button || button.disabled) return;

      const nextPage = Number(button.dataset.userPage);
      if (!Number.isFinite(nextPage) || nextPage < 1) return;

      currentPage = nextPage;
      renderUsers();
    });

    $('ownerToolForm')?.addEventListener('submit', saveTool);
    $('ownerToolCancel')?.addEventListener('click', resetToolForm);

    $('ownerUsersTable')?.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-user-action]');
      if (!button) return;

      button.disabled = true;

      try {
        const action = button.dataset.userAction;
        const userId = button.dataset.id;

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
        status('ownerUsersStatus', 'Aksi gagal: ' + error.message, true);
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
        if (button.dataset.toolAction === 'edit') {
          editTool(tool);
        } else if (button.dataset.toolAction === 'delete') {
          await deleteTool(tool);
        }
      } catch (error) {
        console.error('[VEXORA] Aksi tools:', error);
        status('ownerToolsStatus', 'Aksi tools gagal: ' + error.message, true);
      } finally {
        button.disabled = false;
      }
    });
  }

  async function loadOwnerPanel() {
    if (isLoading) return;
    isLoading = true;

    try {
      await verifyOwner();
      bindEvents();

      await Promise.allSettled([
        loadStats(),
        loadUsers(),
        loadTools()
      ]);
    } catch (error) {
      console.error('[VEXORA] Owner Panel:', error);
      status('ownerUsersStatus', 'Owner Panel gagal dibuka: ' + error.message, true);
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
        
