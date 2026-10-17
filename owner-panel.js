
/* =========================================================
   VEXORA OWNER PANEL
   Account pagination + search + role + ban/unban + delete
   Tools CRUD via Supabase table: vexora_tools
   ========================================================= */

(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const PAGE_SIZE = 5;

  let client = null;
  let currentUsers = [];
  let filteredUsers = [];
  let currentTools = [];
  let currentPage = 1;
  let loadingUsers = false;
  let loadingTools = false;
  let eventsBound = false;
  let initialized = false;

  const esc = (value) =>
    String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[char]);

  const notice = (id, message, isError = false) => {
    const el = $(id);
    if (!el) return;

    el.textContent = message;
    el.style.color = isError ? '#ff7272' : '#8df5c1';
  };

  const setBusy = (id, busy, text = 'Memproses...') => {
    const el = $(id);
    if (!el) return;

    if (busy) {
      el.dataset.originalText ??= el.textContent;
      el.disabled = true;
      el.textContent = text;
    } else {
      el.disabled = false;

      if (el.dataset.originalText) {
        el.textContent = el.dataset.originalText;
        delete el.dataset.originalText;
      }
    }
  };

  function getClient() {
    if (client) return client;

    if (typeof window.vexoraGetClient === 'function') {
      client = window.vexoraGetClient();
    }

    if (!client && window.supabase && window.VEXORA_CONFIG) {
      const config = window.VEXORA_CONFIG;

      if (config.SUPABASE_URL && config.SUPABASE_ANON_KEY) {
        client = window.supabase.createClient(
          config.SUPABASE_URL,
          config.SUPABASE_ANON_KEY
        );
      }
    }

    if (!client) {
      throw new Error(
        'Supabase client belum tersedia. Periksa config.js dan dashboard.js.'
      );
    }

    return client;
  }

  async function getAccessToken() {
    const db = getClient();
    const { data, error } = await db.auth.getSession();

    if (error) throw error;

    const token = data?.session?.access_token;

    if (!token) {
      throw new Error('Sesi login tidak ditemukan. Silakan login ulang.');
    }

    return token;
  }

  async function callAdmin(action, extra = {}) {
    const db = getClient();
    const config = window.VEXORA_CONFIG || {};
    const baseUrl = String(config.SUPABASE_URL || '').replace(/\/+$/, '');
    const anonKey = config.SUPABASE_ANON_KEY;

    if (!baseUrl || !anonKey) {
      throw new Error('SUPABASE_URL atau SUPABASE_ANON_KEY belum diatur.');
    }

    const token = await getAccessToken();

    const response = await fetch(`${baseUrl}/functions/v1/owner-admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': anonKey
      },
      body: JSON.stringify({
        action,
        ...extra
      })
    });

    const raw = await response.text();
    let result = {};

    try {
      result = raw ? JSON.parse(raw) : {};
    } catch {
      result = { message: raw };
    }

    if (!response.ok || result.error) {
      throw new Error(
        result.error || result.message || `Permintaan gagal (${response.status}).`
      );
    }

    return result;
  }

  function normalizeUsers(result) {
    if (Array.isArray(result)) return result;
    if (Array.isArray(result?.users)) return result.users;
    if (Array.isArray(result?.items)) return result.items;
    if (Array.isArray(result?.data)) return result.data;

    return [];
  }

  function normalizeTools(result) {
    if (Array.isArray(result)) return result;
    if (Array.isArray(result?.tools)) return result.tools;
    if (Array.isArray(result?.items)) return result.items;
    if (Array.isArray(result?.data)) return result.data;

    return [];
  }

  function userId(user) {
    return user?.id || user?.user_id || user?.userId || '';
  }

  function userEmail(user) {
    return user?.email || user?.user_email || '(tanpa email)';
  }

  function userRole(user) {
    return String(
      user?.role ||
      user?.app_metadata?.role ||
      user?.user_metadata?.role ||
      'member'
    ).toLowerCase();
  }

  function isBanned(user) {
    return Boolean(
      user?.banned ||
      user?.is_banned ||
      user?.isBanned ||
      user?.ban_duration && user.ban_duration !== 'none'
    );
  }

  function updateStats(stats = {}) {
    const total = stats.total ?? stats.total_users ?? currentUsers.length;
    const vip = stats.vip ?? stats.vip_users ??
      currentUsers.filter((u) => userRole(u) === 'vip').length;
    const owner = stats.owner ?? stats.owner_users ??
      currentUsers.filter((u) => userRole(u) === 'owner').length;
    const member = stats.member ?? stats.member_users ??
      currentUsers.filter((u) => userRole(u) === 'member').length;
    const banned = stats.banned ?? stats.banned_users ??
      currentUsers.filter(isBanned).length;
    const tools = stats.tools ?? stats.total_tools ?? currentTools.length;

    if ($('ownerUsersCount')) $('ownerUsersCount').textContent = total;
    if ($('ownerVipCount')) $('ownerVipCount').textContent = vip;
    if ($('ownerAdminsCount')) $('ownerAdminsCount').textContent = owner;
    if ($('ownerMembersCount')) $('ownerMembersCount').textContent = member;
    if ($('ownerBannedCount')) $('ownerBannedCount').textContent = banned;
    if ($('ownerToolsCount')) $('ownerToolsCount').textContent = tools;
  }

  function ensurePagination() {
    if ($('ownerUsersPagination')) return;

    const table = $('ownerUsersTable');
    if (!table) return;

    const wrapper = table.closest('.owner-table-wrap');
    const parent = wrapper?.parentElement || table.parentElement;

    if (!parent) return;

    const pager = document.createElement('div');
    pager.id = 'ownerUsersPagination';

    Object.assign(pager.style, {
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '8px',
      padding: '14px 8px',
      marginTop: '8px'
    });

    parent.insertBefore(pager, wrapper ? wrapper.nextSibling : table.nextSibling);
  }

  function filteredList() {
    const query = String($('ownerUserSearch')?.value || '')
      .trim()
      .toLowerCase();

    return currentUsers.filter((user) => {
      const email = userEmail(user).toLowerCase();
      const id = String(userId(user)).toLowerCase();

      return !query || email.includes(query) || id.includes(query);
    });
  }

  function renderPagination(totalPages) {
    ensurePagination();

    const pager = $('ownerUsersPagination');
    if (!pager) return;

    if (!filteredUsers.length) {
      pager.innerHTML = '';
      return;
    }

    const buttonStyle = [
      'border:1px solid #333',
      'background:#111',
      'color:#eee',
      'padding:8px 12px',
      'border-radius:9px',
      'cursor:pointer',
      'font-size:13px'
    ].join(';');

    const activeStyle = [
      'border:1px solid #8b5cf6',
      'background:#38205f',
      'color:#fff',
      'padding:8px 12px',
      'border-radius:9px',
      'cursor:pointer',
      'font-size:13px'
    ].join(';');

    let html = `
      <button type="button" data-user-page="${currentPage - 1}"
        ${currentPage <= 1 ? 'disabled' : ''}
        style="${buttonStyle};${currentPage <= 1 ? 'opacity:.4;cursor:not-allowed;' : ''}">
        ‹
      </button>
    `;

    for (let page = 1; page <= totalPages; page++) {
      html += `
        <button type="button" data-user-page="${page}"
          aria-label="Halaman ${page}"
          style="${page === currentPage ? activeStyle : buttonStyle}">
          ${page}
        </button>
      `;
    }

    html += `
      <button type="button" data-user-page="${currentPage + 1}"
        ${currentPage >= totalPages ? 'disabled' : ''}
        style="${buttonStyle};${currentPage >= totalPages ? 'opacity:.4;cursor:not-allowed;' : ''}">
        ›
      </button>
      <span style="color:#aaa;font-size:12px;margin-left:5px">
        ${currentPage}/${totalPages} · ${filteredUsers.length} akun
      </span>
    `;

    pager.innerHTML = html;
  }

  function renderUsers() {
    const tbody = $('ownerUsersTable');
    if (!tbody) return;

    filteredUsers = filteredList();

    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
    currentPage = Math.min(Math.max(1, currentPage), totalPages);

    const start = (currentPage - 1) * PAGE_SIZE;
    const pageUsers = filteredUsers.slice(start, start + PAGE_SIZE);

    if (!pageUsers.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center;padding:20px;color:#aaa">
            ${currentUsers.length ? 'Akun tidak ditemukan.' : 'Belum ada data akun.'}
          </td>
        </tr>
      `;
    } else {
      tbody.innerHTML = pageUsers.map((user) => {
        const id = userId(user);
        const email = userEmail(user);
        const role = userRole(user);
        const banned = isBanned(user);

        const roleOptions = ['member', 'vip', 'owner'].map((item) => `
          <option value="${item}" ${role === item ? 'selected' : ''}>
            ${item.toUpperCase()}
          </option>
        `).join('');

        return `
          <tr>
            <td>
              <div style="font-weight:600">${esc(email)}</div>
              <div style="font-size:11px;color:#888;word-break:break-all">
                ${esc(id)}
              </div>
            </td>
            <td>
              <span style="color:${role === 'owner' ? '#d6a5ff' : role === 'vip' ? '#ffd166' : '#aaa'}">
                ${esc(role.toUpperCase())}
              </span>
            </td>
            <td>
              <span style="color:${banned ? '#ff7777' : '#8df5c1'}">
                ${banned ? 'Banned' : 'Aktif'}
              </span>
            </td>
            <td>
              <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">
                <select data-user-role="${esc(id)}"
                  aria-label="Role ${esc(email)}"
                  style="max-width:105px;padding:7px;border-radius:7px;background:#151515;color:#fff;border:1px solid #444">
                  ${roleOptions}
                </select>
                <button type="button" data-user-action="${banned ? 'unban' : 'ban'}"
                  data-user-id="${esc(id)}"
                  style="padding:7px 9px;border-radius:7px;background:#242424;color:#fff;border:1px solid #444">
                  ${banned ? 'Unban' : 'Ban'}
                </button>
                <button type="button" data-user-action="delete"
                  data-user-id="${esc(id)}"
                  style="padding:7px 9px;border-radius:7px;background:#401b22;color:#ffb4b4;border:1px solid #74313a">
                  Hapus
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    renderPagination(totalPages);
  }

  async function loadUsers() {
    if (loadingUsers) return;
    loadingUsers = true;

    notice('ownerUsersStatus', 'Memuat daftar akun...');
    setBusy('ownerReloadUsers', true, 'Memuat...');

    try {
      const result = await callAdmin('list_users');
      currentUsers = normalizeUsers(result);
      currentPage = 1;

      renderUsers();

      const hasMore = Boolean(result?.has_more || result?.hasMore);
      notice(
        'ownerUsersStatus',
        hasMore
          ? `Menampilkan ${currentUsers.length} akun yang dikirim server. Hasil mungkin belum lengkap.`
          : `${currentUsers.length} akun berhasil dimuat.`
      );

      updateStats(result?.stats || {});
    } catch (error) {
      console.error('[VEXORA] loadUsers:', error);
      notice('ownerUsersStatus', error.message || 'Gagal memuat akun.', true);
    } finally {
      loadingUsers = false;
      setBusy('ownerReloadUsers', false);
    }
  }

  async function loadStats() {
    try {
      const result = await callAdmin('stats');
      updateStats(result?.stats || result || {});
    } catch (error) {
      console.warn('[VEXORA] stats:', error.message);
    }
  }

  async function handleUserAction(action, id) {
    if (!id) {
      alert('ID akun tidak ditemukan.');
      return;
    }

    const user = currentUsers.find((item) => String(userId(item)) === String(id));

    if (user && userRole(user) === 'owner') {
      alert('Akun Owner dilindungi dari aksi ini.');
      return;
    }

    let adminAction;
    let extra = {};

    if (action === 'ban') {
      if (!confirm('Yakin ingin ban akun ini?')) return;
      adminAction = 'ban_user';
      extra = { userId: id };
    } else if (action === 'unban') {
      if (!confirm('Buka ban akun ini?')) return;
      adminAction = 'unban_user';
      extra = { userId: id };
    } else if (action === 'delete') {
      if (!confirm('HAPUS akun ini secara permanen? Tindakan ini tidak dapat dibatalkan.')) {
        return;
      }

      adminAction = 'delete_user';
      extra = { userId: id, confirmation: 'HAPUS' };
    } else {
      return;
    }

    notice('ownerUsersStatus', 'Memproses aksi akun...');

    try {
      await callAdmin(adminAction, extra);
      notice('ownerUsersStatus', 'Aksi akun berhasil.');
      await Promise.all([loadUsers(), loadStats()]);
    } catch (error) {
      console.error('[VEXORA] user action:', error);
      notice('ownerUsersStatus', error.message || 'Aksi akun gagal.', true);
    }
  }

  async function changeRole(id, role, selectElement) {
    if (!id || !['member', 'vip', 'owner'].includes(role)) return;

    const user = currentUsers.find((item) => String(userId(item)) === String(id));

    if (user && userRole(user) === 'owner') {
      alert('Role akun Owner tidak diubah dari panel ini.');
      renderUsers();
      return;
    }

    if (role === 'owner') {
      alert('Promosi ke Owner tidak tersedia melalui pilihan ini.');
      renderUsers();
      return;
    }

    const email = user ? userEmail(user) : id;

    if (!confirm(`Ubah role ${email} menjadi ${role.toUpperCase()}?`)) {
      renderUsers();
      return;
    }

    if (selectElement) selectElement.disabled = true;
    notice('ownerUsersStatus', 'Mengubah role akun...');

    try {
      await callAdmin('set_role', { userId: id, role });
      notice('ownerUsersStatus', `Role berhasil diubah menjadi ${role.toUpperCase()}.`);
      await Promise.all([loadUsers(), loadStats()]);
    } catch (error) {
      console.error('[VEXORA] changeRole:', error);
      notice('ownerUsersStatus', error.message || 'Gagal mengubah role.', true);
      renderUsers();
    } finally {
      if (selectElement) selectElement.disabled = false;
    }
  }

  // -------------------- TOOLS CRUD --------------------

  async function loadTools() {
    if (loadingTools) return;
    loadingTools = true;

    notice('ownerToolsStatus', 'Memuat daftar tools...');

    try {
      const db = getClient();
      const { data, error } = await db
        .from('vexora_tools')
        .select('*')
        .order('id', { ascending: false });

      if (error) throw error;

      currentTools = data || [];
      renderTools();
      notice('ownerToolsStatus', `${currentTools.length} tools berhasil dimuat.`);
      updateStats({});
    } catch (error) {
      console.error('[VEXORA] loadTools:', error);
      notice('ownerToolsStatus', error.message || 'Gagal memuat tools.', true);
    } finally {
      loadingTools = false;
    }
  }

  function renderTools() {
    const tbody = $('ownerToolsTable');
    if (!tbody) return;

    if (!currentTools.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center;padding:20px;color:#aaa">
            Belum ada tools.
          </td>
        </tr>
      `;
      updateStats({});
      return;
    }

    tbody.innerHTML = currentTools.map((tool) => `
      <tr>
        <td>${esc(tool.name)}</td>
        <td>${esc(tool.category || '-')}</td>
        <td>${esc(tool.description || '-')}</td>
        <td style="max-width:220px;word-break:break-all">
          <a href="${esc(tool.url)}" target="_blank" rel="noopener noreferrer"
             style="color:#bda2ff">Buka link</a>
        </td>
        <td>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            <button type="button" data-tool-action="edit" data-tool-id="${esc(tool.id)}"
              style="padding:7px 9px;border-radius:7px;background:#242424;color:#fff;border:1px solid #444">
              Edit
            </button>
            <button type="button" data-tool-action="delete" data-tool-id="${esc(tool.id)}"
              style="padding:7px 9px;border-radius:7px;background:#401b22;color:#ffb4b4;border:1px solid #74313a">
              Hapus
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    updateStats({});
  }

  function resetToolForm() {
    $('ownerToolForm')?.reset();

    if ($('ownerToolId')) $('ownerToolId').value = '';

    const submit = $('ownerToolForm')?.querySelector('[type="submit"]');
    if (submit) submit.textContent = 'Tambah Tool';

    if ($('ownerToolCancel')) $('ownerToolCancel').hidden = true;
  }

  function editTool(id) {
    const tool = currentTools.find((item) => String(item.id) === String(id));
    if (!tool) return;

    if ($('ownerToolId')) $('ownerToolId').value = tool.id ?? '';
    if ($('ownerToolName')) $('ownerToolName').value = tool.name ?? '';
    if ($('ownerToolCategory')) $('ownerToolCategory').value = tool.category ?? '';
    if ($('ownerToolDesc')) $('ownerToolDesc').value = tool.description ?? '';
    if ($('ownerToolUrl')) $('ownerToolUrl').value = tool.url ?? '';

    const submit = $('ownerToolForm')?.querySelector('[type="submit"]');
    if (submit) submit.textContent = 'Simpan Perubahan';

    if ($('ownerToolCancel')) $('ownerToolCancel').hidden = false;

    $('ownerToolForm')?.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  }

  async function saveTool(event) {
    event.preventDefault();

    const db = getClient();
    const id = $('ownerToolId')?.value?.trim();
    const name = $('ownerToolName')?.value?.trim();
    const category = $('ownerToolCategory')?.value?.trim();
    const description = $('ownerToolDesc')?.value?.trim();
    const url = $('ownerToolUrl')?.value?.trim();

    if (!name || !url) {
      notice('ownerToolsStatus', 'Nama dan URL tools wajib diisi.', true);
      return;
    }

    try {
      new URL(url);
    } catch {
      notice('ownerToolsStatus', 'URL tidak valid. Gunakan https:// atau http://.', true);
      return;
    }

    const payload = {
      name,
      category: category || null,
      description: description || null,
      url
    };

    const submit = $('ownerToolForm')?.querySelector('[type="submit"]');
    if (submit) {
      submit.disabled = true;
      submit.textContent = 'Menyimpan...';
    }

    notice('ownerToolsStatus', 'Menyimpan tools...');

    try {
      let result;

      if (id) {
        result = await db
          .from('vexora_tools')
          .update(payload)
          .eq('id', id);
      } else {
        result = await db
          .from('vexora_tools')
          .insert(payload);
      }

      if (result.error) throw result.error;

      resetToolForm();
      notice('ownerToolsStatus', id ? 'Tools berhasil diperbarui.' : 'Tools berhasil ditambahkan.');
      await Promise.all([loadTools(), loadStats()]);
    } catch (error) {
      console.error('[VEXORA] saveTool:', error);
      notice('ownerToolsStatus', error.message || 'Gagal menyimpan tools.', true);
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.textContent = $('ownerToolId')?.value
          ? 'Simpan Perubahan'
          : 'Tambah Tool';
      }
    }
  }

  async function deleteTool(id
