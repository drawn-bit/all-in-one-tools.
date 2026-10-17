
/* =========================================================
   VEXORA OWNER PANEL
   Pagination akun & tools: 5 item per halaman
   Edge Function: owner-admin
   Payload user: userId (camelCase)
   ========================================================= */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const PAGE_SIZE = 5;
  const ADMIN_FUNCTION = 'owner-admin';
  const TOOLS_TABLE = 'vexora_tools';

  let db = window.supabaseClient ||
           window.vexoraSupabase ||
           window.sb ||
           null;

  let users = [];
  let tools = [];
  let userPage = 1;
  let toolPage = 1;

  const escapeHTML = (value) =>
    String(value ?? '').replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[ch]);

  function showStatus(id, message, isError = false) {
    const el = $(id);
    if (!el) return;
    el.textContent = message;
    el.style.color = isError ? '#ff778b' : '';
  }

  function getDB() {
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

    if (!db) {
      throw new Error(
        'Supabase client tidak ditemukan. Periksa config.js dan dashboard.js.'
      );
    }

    return db;
  }

  async function callAdmin(action, params = {}) {
    const client = getDB();

    const { data, error } = await client.functions.invoke(
      ADMIN_FUNCTION,
      { body: { action, ...params } }
    );

    if (error) {
      let message = error.message || 'Permintaan admin gagal.';

      try {
        if (error.context?.json) {
          const body = await error.context.json();
          message = body.error || body.message || message;
        }
      } catch (_) {}

      throw new Error(message);
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return data;
  }

  function extractArray(data, names) {
    if (Array.isArray(data)) return data;

    for (const name of names) {
      if (Array.isArray(data?.[name])) return data[name];
      if (Array.isArray(data?.data?.[name])) return data.data[name];
    }

    return [];
  }

  function setStat(id, value) {
    const el = $(id);
    if (el && value !== undefined && value !== null) {
      el.textContent = String(value);
    }
  }

  async function loadStats() {
    try {
      const data = await callAdmin('stats');
      const s = data?.stats || data?.data?.stats || data || {};

      setStat('ownerUsersCount',
        s.total_users ?? s.totalUsers ?? s.users);
      setStat('ownerVipCount',
        s.vip_users ?? s.vipUsers ?? s.vip);
      setStat('ownerAdminsCount',
        s.owner_users ?? s.ownerUsers ?? s.owners);
      setStat('ownerMembersCount',
        s.member_users ?? s.memberUsers ?? s.members);
      setStat('ownerBannedCount',
        s.banned_users ?? s.bannedUsers ?? s.banned);

      setStat('ownerToolsCount', tools.length);
    } catch (error) {
      console.error('[VEXORA] Stats:', error);
    }
  }

  /* ---------------- PAGINATION ---------------- */

  function ensurePager(id, tableWrap) {
    let pager = $(id);
    if (pager) return pager;

    pager = document.createElement('div');
    pager.id = id;
    pager.className = 'owner-pagination';
    pager.setAttribute('aria-label', 'Navigasi halaman');

    tableWrap.insertAdjacentElement('afterend', pager);
    return pager;
  }

  function renderPager(id, total, currentPage, onPage) {
    const pager = $(id);
    if (!pager) return;

    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    if (total <= PAGE_SIZE) {
      pager.innerHTML = total
        ? `<span>Menampilkan ${total} item</span>`
        : '';
      return;
    }

    const button = (label, page, disabled = false, active = false) => `
      <button
        type="button"
        data-page="${page}"
        class="${active ? 'active' : ''}"
        ${disabled ? 'disabled' : ''}
        aria-label="${label}"
        ${active ? 'aria-current="page"' : ''}>
        ${label}
      </button>
    `;

    let html = button('‹', currentPage - 1, currentPage === 1);

    for (let p = 1; p <= pages; p++) {
      if (
        p === 1 ||
        p === pages ||
        Math.abs(p - currentPage) <= 1
      ) {
        html += button(String(p), p, false, p === currentPage);
      } else if (
        p === currentPage - 2 ||
        p === currentPage + 2
      ) {
        html += '<span>…</span>';
      }
    }

    html += button('›', currentPage + 1, currentPage === pages);
    html += `<span>Halaman ${currentPage} dari ${pages}</span>`;

    pager.innerHTML = html;

    pager.querySelectorAll('button[data-page]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const page = Number(btn.dataset.page);
        if (page < 1 || page > pages || page === currentPage) return;
        onPage(page);
      });
    });
  }

  function pageSlice(list, page) {
    const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    const safePage = Math.min(Math.max(page, 1), pages);
    const start = (safePage - 1) * PAGE_SIZE;

    return {
      items: list.slice(start, start + PAGE_SIZE),
      page: safePage
    };
  }

  /* ---------------- MANAJEMEN AKUN ---------------- */

  function getUserId(user) {
    return user.id || user.userId || user.user_id || '';
  }

  function getRole(user) {
    return user.role || user.app_metadata?.role || 'member';
  }

  function isBanned(user) {
    if (typeof user.banned === 'boolean') return user.banned;
    if (typeof user.is_banned === 'boolean') return user.is_banned;
    if (typeof user.isBanned === 'boolean') return user.isBanned;

    const until = user.banned_until;
    if (!until) return false;

    const timestamp = Date.parse(until);
    return Number.isNaN(timestamp) || timestamp > Date.now();
  }

  function renderUsers() {
    const tbody = $('ownerUsersTable');
    const wrap = tbody?.closest('.owner-table-wrap');
    if (!tbody || !wrap) return;

    const search = ($('ownerUserSearch')?.value || '')
      .trim()
      .toLowerCase();

    const filtered = users.filter((user) => {
      const text = [
        user.email,
        getUserId(user),
        getRole(user),
        isBanned(user) ? 'diblokir banned' : 'aktif'
      ].join(' ').toLowerCase();

      return text.includes(search);
    });

    const result = pageSlice(filtered, userPage);
    userPage = result.page;

    if (!result.items.length) {
      tbody.innerHTML =
        '<tr><td colspan="4">Tidak ada akun yang cocok.</td></tr>';
    } else {
      tbody.innerHTML = result.items.map((user) => {
        const id = getUserId(user);
        const email = user.email || '(email tidak tersedia)';
        const role = getRole(user);
        const banned = isBanned(user);

        return `
          <tr>
            <td>${escapeHTML(email)}</td>
            <td>
              <select data-role-for="${escapeHTML(id)}"
                aria-label="Role ${escapeHTML(email)}">
                <option value="member" ${role === 'member' ? 'selected' : ''}>Member</option>
                <option value="vip" ${role === 'vip' ? 'selected' : ''}>VIP</option>
                <option value="owner" ${role === 'owner' ? 'selected' : ''}>Owner</option>
              </select>
              <button type="button"
                data-user-action="role"
                data-id="${escapeHTML(id)}">Simpan Role</button>
            </td>
            <td>${banned ? 'Diblokir' : 'Aktif'}</td>
            <td>
              ${banned
                ? `<button type="button" data-user-action="unban" data-id="${escapeHTML(id)}">Buka Blokir</button>`
                : `<button type="button" data-user-action="ban" data-id="${escapeHTML(id)}">Blokir</button>`
              }
              <button type="button"
                data-user-action="delete"
                data-id="${escapeHTML(id)}">Hapus</button>
            </td>
          </tr>
        `;
      }).join('');
    }

    const pager = ensurePager('ownerUsersPager', wrap);

    renderPager(
      'ownerUsersPager',
      filtered.length,
      userPage,
      (page) => {
        userPage = page;
        renderUsers();
      }
    );

    if (filtered.length > 0) {
      const start = (userPage - 1) * PAGE_SIZE + 1;
      const end = Math.min(userPage * PAGE_SIZE, filtered.length);
      const summary = document.createElement('span');
      summary.textContent = `Menampilkan ${start}–${end} dari ${filtered.length} akun`;

      if (pager && filtered.length > PAGE_SIZE) {
        pager.appendChild(summary);
      }
    }
  }

  async function loadUsers() {
    showStatus('ownerUsersStatus', 'Memuat akun...');

    try {
      const data = await callAdmin('list_users');
      users = extractArray(data, ['users', 'results']);
      userPage = 1;

      renderUsers();

      showStatus(
        'ownerUsersStatus',
        users.length
          ? `${users.length} akun berhasil dimuat.`
          : 'Belum ada akun atau data akun tidak ditemukan.'
      );

      await loadStats();
    } catch (error) {
      console.error('[VEXORA] Load users:', error);
      showStatus('ownerUsersStatus', error.message, true);
    }
  }

  async function handleUserAction(action, id) {
    if (!id) {
      alert('ID akun tidak ditemukan.');
      return;
    }

    try {
      if (action === 'role') {
        const select = document.querySelector(
          `[data-role-for="${CSS.escape(id)}"]`
        );
        const role = select?.value;

        if (!role) return;

        if (
          role === 'owner' &&
          !confirm('Jadikan akun ini Owner? Akun Owner memiliki hak administrasi.')
        ) return;

        // Edge Function menggunakan userId.
        await callAdmin('set_role', { userId: id, role });
        alert('Role berhasil diperbarui.');
      } else if (action === 'ban' || action === 'unban') {
        const message = action === 'ban'
          ? 'Yakin ingin memblokir akun ini?'
          : 'Yakin ingin membuka blokir akun ini?';

        if (!confirm(message)) return;

        const functionAction = action === 'ban'
          ? 'ban_user'
          : 'unban_user';

        // Edge Function menggunakan userId.
        await callAdmin(functionAction, { userId: id });
        alert('Status akun berhasil diperbarui.');
      } else if (action === 'delete') {
        if (!confirm('Hapus akun ini secara permanen?')) return;

        // Edge Function menggunakan userId.
        await callAdmin('delete_user', { userId: id });
        alert('Permintaan penghapusan akun berhasil.');
      }

      await loadUsers();
    } catch (error) {
      console.error('[VEXORA] User action:', error);
      alert(`Gagal: ${error.message}`);
    }
  }

  /* ---------------- MANAJEMEN TOOLS ---------------- */

  function renderTools() {
    const tbody = $('ownerToolsTable');
    const wrap = tbody?.closest('.owner-table-wrap');
    if (!tbody || !wrap) return;

    const result = pageSlice(tools, toolPage);
    toolPage = result.page;

    if (!result.items.length) {
      tbody.innerHTML =
        '<tr><td colspan="3">Belum ada tools.</td></tr>';
    } else {
      tbody.innerHTML = result.items.map((tool) => `
        <tr>
          <td>${escapeHTML(tool.name || '(tanpa nama)')}</td>
          <td>${escapeHTML(String(tool.category || '-').toUpperCase())}</td>
          <td>
            <button type="button" data-tool-action="edit"
              data-id="${escapeHTML(tool.id)}">Edit</button>
            <button type="button" data-tool-action="delete"
              data-id="${escapeHTML(tool.id)}">Hapus</button>
          </td>
        </tr>
      `).join('');
    }

    const pager = ensurePager('ownerToolsPager', wrap);

    renderPager(
      'ownerToolsPager',
      tools.length,
      toolPage,
      (page) => {
        toolPage = page;
        renderTools();
      }
    );

    if (tools.length > 0 && pager && tools.length > PAGE_SIZE) {
      const start = (toolPage - 1) * PAGE_SIZE + 1;
      const end = Math.min(toolPage * PAGE_SIZE, tools.length);
      const summary = document.createElement('span');
      summary.textContent = `Menampilkan ${start}–${end} dari ${tools.length} tools`;
      pager.appendChild(summary);
    }
  }

  async function loadTools() {
    showStatus('ownerToolsStatus', 'Memuat tools...');

    try {
      const { data, error } = await getDB()
        .from(TOOLS_TABLE)
        .select('id,name,category,description,url')
        .order('name', { ascending: true });

      if (error) throw error;

      tools = data || [];
      toolPage = 1;
      renderTools();

      showStatus(
        'ownerToolsStatus',
        `${tools.length} tools berhasil dimuat.`
      );

      await loadStats();
    } catch (error) {
      console.error('[VEXORA] Load tools:', error);
      showStatus('ownerToolsStatus', error.message, true);
    }
  }

  function resetToolForm() {
    $('ownerToolForm')?.reset();

    if ($('ownerToolId')) {
      $('ownerToolId').value = '';
    }

    const submit = $('ownerToolForm')?.querySelector('[type="submit"]');
    if (submit) submit.textContent = 'Simpan Tools';
  }

  async function saveTool(event) {
    event.preventDefault();

    const id = $('ownerToolId')?.value.trim();
    const name = $('ownerToolName')?.value.trim();
    const category = $('ownerToolCategory')?.value;
    const description = $('ownerToolDesc')?.value.trim() || '';
    const url = $('ownerToolUrl')?.value.trim();

    if (!name || !category || !url) {
      showStatus('ownerToolsStatus', 'Nama, kategori, dan URL wajib diisi.', true);
      return;
    }

    try {
      showStatus('ownerToolsStatus', 'Menyimpan tools...');

      const payload = { name, category, description, url };
      let query;

      if (id) {
        query = getDB()
          .from(TOOLS_TABLE)
          .update(payload)
          .eq('id', id);
      } else {
        query = getDB()
          .from(TOOLS_TABLE)
          .insert(payload);
      }

      const { error } = await query;
      if (error) throw error;

      resetToolForm();
      await loadTools();
      showStatus('ownerToolsStatus', 'Tools berhasil disimpan.');
    } catch (error) {
      console.error('[VEXORA] Save tools:', error);
      showStatus('ownerToolsStatus', error.message, true);
    }
  }

  function editTool(id) {
    const tool = tools.find((item) => String(item.id) === String(id));
    if (!tool) return;

    $('ownerToolId').value = tool.id;
    $('ownerToolName').value = tool.name || '';
    $('ownerToolCategory').value = tool.category || 'free';
    $('ownerToolDesc').value = tool.description || '';
    $('ownerToolUrl').value = tool.url || '';

    const submit = $('ownerToolForm')?.querySelector('[type="submit"]');
    if (submit) submit.textContent = 'Perbarui Tools';

    $('ownerToolForm')?.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  }

  async function deleteTool(id) {
    const tool = tools.find((item) => String(item.id) === String(id));
    if (!tool) return;

    if (!confirm(`Hapus tools "${tool.name}"?`)) return;

    try {
      showStatus('ownerToolsStatus', 'Menghapus tools...');

      const { error } = await getDB()
        .from(TOOLS_TABLE)
        .delete()
        .eq('id', id);

      if (error) throw error;

      await loadTools();
      showStatus('ownerToolsStatus', 'Tools berhasil dihapus.');
    } catch (error) {
      console.error('[VEXORA] Delete tools:', error);
      showStatus('ownerToolsStatus', error.message, true);
    }
  }

  /* ---------------- EVENT LISTENERS ---------------- */

  function bindEvents() {
    $('ownerReloadUsers')?.addEventListener('click', loadUsers);

    $('ownerUserSearch')?.addEventListener('input', () => {
      userPage = 1;
      renderUsers();
    });

    $('ownerToolForm')?.addEventListener('submit', saveTool);
    $('ownerToolCancel')?.addEventListener('click', resetToolForm);

    $('ownerUsersTable')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-user-action]');
      if (!button) return;

      handleUserAction(
        button.dataset.userAction,
        button.dataset.id
      );
    });

    $('ownerToolsTable')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-tool-action]');
      if (!button) return;

      const { toolAction, id } = {
        toolAction: button.dataset.toolAction,
        id: button.dataset.id
      };

      if (toolAction === 'edit') editTool(id);
      if (toolAction === 'delete') deleteTool(id);
    });
  }

  async function init() {
    bindEvents();

    try {
      getDB();
    } catch (error) {
      showStatus('ownerUsersStatus', error.message, true);
      showStatus('ownerToolsStatus', error.message, true);
      return;
    }

    await Promise.allSettled([
      loadStats(),
      loadUsers(),
      loadTools()
    ]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
   
