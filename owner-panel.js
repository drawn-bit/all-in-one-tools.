
/* VEXORA owner-panel.js
   Owner admin + tools management
   owner-admin memakai userId (camelCase)
*/
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);

  const CONFIG = window.VEXORA_CONFIG || {};
  const ADMIN_FUNCTION = 'owner-admin';
  const TOOLS_TABLE = 'vexora_tools';

  let db = window.supabaseClient ||
           window.vexoraSupabase ||
           window.sb ||
           null;

  if (!db && window.supabase?.createClient && CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY) {
    db = window.supabase.createClient(
      CONFIG.SUPABASE_URL,
      CONFIG.SUPABASE_ANON_KEY
    );
    window.supabaseClient = db;
  }

  let users = [];
  let tools = [];

  const escapeHTML = (value) =>
    String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[char]);

  function status(elementId, message, error = false) {
    const el = $(elementId);
    if (!el) return;
    el.textContent = message;
    el.style.color = error ? '#ff6b81' : '';
  }

  function requireDB() {
    if (!db) {
      throw new Error(
        'Supabase client tidak ditemukan. Periksa config.js dan inisialisasi Supabase.'
      );
    }
    return db;
  }

  async function admin(action, params = {}) {
    requireDB();

    const { data: sessionData, error: sessionError } =
      await db.auth.getSession();

    if (sessionError) throw sessionError;

    const token = sessionData?.session?.access_token;
    if (!token) throw new Error('Sesi login habis. Silakan login kembali.');

    const { data, error } = await db.functions.invoke(ADMIN_FUNCTION, {
      body: { action, ...params }
    });

    if (error) {
      let message = error.message || 'Permintaan admin gagal.';
      try {
        const context = error.context;
        if (context?.json) {
          const body = await context.json();
          message = body.error || body.message || message;
        }
      } catch (_) {}
      throw new Error(message);
    }

    if (data?.error) throw new Error(data.error);
    return data;
  }

  function getArray(data, keys) {
    if (Array.isArray(data)) return data;

    for (const key of keys) {
      if (Array.isArray(data?.[key])) return data[key];
      if (Array.isArray(data?.data?.[key])) return data.data[key];
    }

    return [];
  }

  function updateStats(data) {
    const stats = data?.stats || data?.data?.stats || data || {};

    const values = {
      ownerUsersCount: stats.total_users ?? stats.totalUsers ?? stats.users,
      ownerVipCount: stats.vip_users ?? stats.vipUsers ?? stats.vip,
      ownerAdminsCount: stats.owner_users ?? stats.ownerUsers ?? stats.owners,
      ownerMembersCount: stats.member_users ?? stats.memberUsers ?? stats.members,
      ownerBannedCount: stats.banned_users ?? stats.bannedUsers ?? stats.banned,
      ownerToolsCount: stats.total_tools ?? stats.totalTools ?? stats.tools
    };

    for (const [id, value] of Object.entries(values)) {
      const el = $(id);
      if (el && value !== undefined && value !== null && typeof value !== 'object') {
        el.textContent = String(value);
      }
    }
  }

  async function loadStats() {
    try {
      const data = await admin('stats');
      updateStats(data);
    } catch (error) {
      console.error('[VEXORA] Stats:', error);
    }
  }

  function userRole(user) {
    return user.role || user.app_metadata?.role || 'member';
  }

  function userIsBanned(user) {
    return Boolean(
      user.banned ||
      user.is_banned ||
      user.isBanned ||
      user.banned_until
    );
  }

  function renderUsers() {
    const tbody = $('ownerUsersTable');
    if (!tbody) return;

    const search = ($('ownerUserSearch')?.value || '').trim().toLowerCase();

    const filtered = users.filter((user) => {
      const text = [
        user.email,
        user.id,
        user.userId,
        userRole(user)
      ].join(' ').toLowerCase();

      return text.includes(search);
    });

    if (!filtered.length) {
      tbody.innerHTML =
        '<tr><td colspan="6">Tidak ada akun yang cocok.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map((user) => {
      const id = user.id || user.userId || user.user_id;
      const email = user.email || '(email tidak tersedia)';
      const role = userRole(user);
      const banned = userIsBanned(user);

      return `
        <tr>
          <td>${escapeHTML(email)}</td>
          <td><code>${escapeHTML(id || '-')}</code></td>
          <td>${escapeHTML(role)}</td>
          <td>${banned ? 'Diblokir' : 'Aktif'}</td>
          <td>
            <select data-user-role="${escapeHTML(id || '')}">
              <option value="member" ${role === 'member' ? 'selected' : ''}>Member</option>
              <option value="vip" ${role === 'vip' ? 'selected' : ''}>VIP</option>
              <option value="owner" ${role === 'owner' ? 'selected' : ''}>Owner</option>
            </select>
            <button type="button" data-user-action="role" data-id="${escapeHTML(id || '')}">
              Simpan Role
            </button>
          </td>
          <td>
            ${banned
              ? `<button type="button" data-user-action="unban" data-id="${escapeHTML(id || '')}">Buka Blokir</button>`
              : `<button type="button" data-user-action="ban" data-id="${escapeHTML(id || '')}">Blokir</button>`
            }
            <button type="button" data-user-action="delete" data-id="${escapeHTML(id || '')}">
              Hapus
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  async function loadUsers() {
    status('ownerUsersStatus', 'Memuat akun...');

    try {
      const data = await admin('list_users');
      users = getArray(data, ['users', 'results']);
      renderUsers();
      status('ownerUsersStatus', `${users.length} akun dimuat.`);
      await loadStats();
    } catch (error) {
      console.error('[VEXORA] Load users:', error);
      status('ownerUsersStatus', error.message, true);
    }
  }

  async function handleUserAction(action, id, role) {
    if (!id) {
      alert('ID akun tidak ditemukan.');
      return;
    }

    try {
      if (action === 'role') {
        if (!role) return;
        if (role === 'owner' &&
            !confirm('Jadikan akun ini Owner? Pastikan kamu memahami hak aksesnya.')) {
          return;
        }

        // Penting: Edge Function menerima userId, bukan user_id.
        await admin('set_role', { userId: id, role });
        alert('Role berhasil diperbarui.');
      } else if (action === 'ban' || action === 'unban') {
        const label = action === 'ban' ? 'memblokir' : 'membuka blokir';
        if (!confirm(`Yakin ingin ${label} akun ini?`)) return;

        const actionName = action === 'ban' ? 'ban_user' : 'unban_user';

        // Penting: Edge Function menerima userId, bukan user_id.
        await admin(actionName, { userId: id });
        alert('Status akun berhasil diperbarui.');
      } else if (action === 'delete') {
        if (!confirm('Hapus akun ini secara permanen? Tindakan ini tidak mudah dibatalkan.')) {
          return;
        }

        // Penting: Edge Function menerima userId, bukan user_id.
        await admin('delete_user', { userId: id });
        alert('Permintaan penghapusan akun berhasil.');
      }

      await loadUsers();
    } catch (error) {
      console.error('[VEXORA] User action:', error);
      alert(`Gagal: ${error.message}`);
    }
  }

  function renderTools() {
    const tbody = $('ownerToolsTable');
    if (!tbody) return;

    if (!tools.length) {
      tbody.innerHTML =
        '<tr><td colspan="5">Belum ada tools.</td></tr>';
      return;
    }

    tbody.innerHTML = tools.map((tool) => `
      <tr>
        <td>${escapeHTML(tool.name)}</td>
        <td>${escapeHTML(tool.category || '-')}</td>
        <td>${escapeHTML(tool.description || '-')}</td>
        <td>
          <a href="${escapeHTML(tool.url)}" target="_blank" rel="noopener noreferrer">
            Buka
          </a>
        </td>
        <td>
          <button type="button" data-tool-edit="${escapeHTML(tool.id)}">Edit</button>
          <button type="button" data-tool-delete="${escapeHTML(tool.id)}">Hapus</button>
        </td>
      </tr>
    `).join('');
  }

  async function loadTools() {
    status('ownerToolsStatus', 'Memuat tools...');

    try {
      const { data, error } = await requireDB()
        .from(TOOLS_TABLE)
        .select('id,name,category,description,url')
        .order('name', { ascending: true });

      if (error) throw error;

      tools = data || [];
      renderTools();
      status('ownerToolsStatus', `${tools.length} tools dimuat.`);
      await loadStats();
    } catch (error) {
      console.error('[VEXORA] Load tools:', error);
      status('ownerToolsStatus', error.message, true);
    }
  }

  function resetToolForm() {
    $('ownerToolForm')?.reset();
    if ($('ownerToolId')) $('ownerToolId').value = '';
    const submit = $('ownerToolForm')?.querySelector('[type="submit"]');
    if (submit) submit.textContent = 'Simpan Tool';
  }

  async function saveTool(event) {
    event.preventDefault();

    const id = $('ownerToolId')?.value.trim();
    const name = $('ownerToolName')?.value.trim();
    const category = $('ownerToolCategory')?.value.trim();
    const description = $('ownerToolDesc')?.value.trim();
    const url = $('ownerToolUrl')?.value.trim();

    if (!name || !url) {
      status('ownerToolsStatus', 'Nama dan URL wajib diisi.', true);
      return;
    }

    try {
      status('ownerToolsStatus', 'Menyimpan tool...');

      const payload = { name, category, description, url };
      let query;

      if (id) {
        query = requireDB()
          .from(TOOLS_TABLE)
          .update(payload)
          .eq('id', id);
      } else {
        query = requireDB()
          .from(TOOLS_TABLE)
          .insert(payload);
      }

      const { error } = await query;
      if (error) throw error;

      resetToolForm();
      await loadTools();
      status('ownerToolsStatus', 'Tool berhasil disimpan.');
    } catch (error) {
      console.error('[VEXORA] Save tool:', error);
      status('ownerToolsStatus', error.message, true);
    }
  }

  async function editTool(id) {
    const tool = tools.find((item) => String(item.id) === String(id));
    if (!tool) return;

    $('ownerToolId').value = tool.id;
    $('ownerToolName').value = tool.name || '';
    $('ownerToolCategory').value = tool.category || '';
    $('ownerToolDesc').value = tool.description || '';
    $('ownerToolUrl').value = tool.url || '';

    const submit = $('ownerToolForm')?.querySelector('[type="submit"]');
    if (submit) submit.textContent = 'Perbarui Tool';

    $('ownerToolForm')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async function deleteTool(id) {
    const tool = tools.find((item) => String(item.id) === String(id));
    if (!tool) return;

    if (!confirm(`Hapus tool "${tool.name}"?`)) return;

    try {
      status('ownerToolsStatus', 'Menghapus tool...');

      const { error } = await requireDB()
        .from(TOOLS_TABLE)
        .delete()
        .eq('id', id);

      if (error) throw error;

      await loadTools();
      status('ownerToolsStatus', 'Tool berhasil dihapus.');
    } catch (error) {
      console.error('[VEXORA] Delete tool:', error);
      status('ownerToolsStatus', error.message, true);
    }
  }

  function bindEvents() {
    $('ownerReloadUsers')?.addEventListener('click', loadUsers);
    $('ownerUserSearch')?.addEventListener('input', renderUsers);
    $('ownerToolForm')?.addEventListener('submit', saveTool);
    $('ownerToolCancel')?.addEventListener('click', resetToolForm);

    $('ownerUsersTable')?.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-user-action]');
      if (!button) return;

      const action = button.dataset.userAction;
      const id = button.dataset.id;
      const roleSelect = document.querySelector(`[data-user-role="${CSS.escape(id)}"]`);
      const role = roleSelect?.value;

      handleUserAction(action, id, role);
    });

    $('ownerToolsTable')?.addEventListener('click', (event) => {
      const edit = event.target.closest('[data-tool-edit]');
      const remove = event.target.closest('[data-tool-delete]');

      if (edit) editTool(edit.dataset.toolEdit);
      if (remove) deleteTool(remove.dataset.toolDelete);
    });
  }

  async function init() {
    bindEvents();

    if (!db) {
      status(
        'ownerUsersStatus',
        'Supabase belum siap. Periksa config.js dan script inisialisasi.',
        true
      );
      status('ownerToolsStatus', 'Supabase belum siap.', true);
      return;
    }

    await Promise.allSettled([loadStats(), loadUsers(), loadTools()]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
   
