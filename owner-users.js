/* =========================================================
   VEXORA OWNER PANEL — Daftar akun + Ban / Unban
   Data  : Firestore "users/{uid}" (email, tanggal daftar, login terakhir)
   Ban   : Firestore "banned/{uid}" (dijaga oleh firestore.rules & storage.rules)
   Password TIDAK ada di sini: Firebase tidak pernah memberikannya.
   ========================================================= */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const PAGE_SIZE = 10;

  let users = [];
  let bans = new Map();
  let ips = new Map();
  let page = 1;
  let busy = false;

  const owners = () =>
    (window.VEXORA_CONFIG?.OWNER_EMAILS || []).map((e) =>
      String(e).trim().toLowerCase()
    );

  const esc = (v) =>
    String(v ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);

  const fmt = (ts) => {
    try {
      return ts?.toDate ? ts.toDate().toLocaleString('id-ID') : '—';
    } catch (e) {
      return '—';
    }
  };

  const status = (msg, isError = false) => {
    const el = $('usersStatus');
    if (!el) return;
    el.textContent = msg;
    el.style.color = isError ? '#ff778b' : '';
  };

  const roleOf = (u) => (owners().includes(u.email) ? 'owner' : 'member');

  function filtered() {
    const q = ($('usersSearch')?.value || '').trim().toLowerCase();
    return q ? users.filter((u) => u.email.includes(q)) : users;
  }

  function renderStats() {
    $('usersTotal').textContent = users.length;
    $('usersOwner').textContent = users.filter((u) => roleOf(u) === 'owner').length;
    $('usersMember').textContent = users.filter((u) => roleOf(u) === 'member').length;
    $('usersBanned').textContent = bans.size;
  }

  function render() {
    const body = $('usersTable');
    if (!body) return;

    const list = filtered();
    const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    page = Math.min(page, pages);

    const slice = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    if (!slice.length) {
      body.innerHTML = '<tr><td colspan="7">Belum ada akun.</td></tr>';
    } else {
      body.innerHTML = slice.map((u) => {
        const role = roleOf(u);
        const ban = bans.get(u.id);
        const action = role === 'owner'
          ? '—'
          : ban
            ? `<button class="tool-open" data-act="unban" data-id="${esc(u.id)}">Unban</button>`
            : `<button class="tool-open u-danger" data-act="ban" data-id="${esc(u.id)}">Ban</button>`;

        return `<tr>
          <td>${esc(u.email)}</td>
          <td><span class="u-badge u-${role}">${role.toUpperCase()}</span></td>
          <td>${esc(fmt(u.createdAt))}</td>
          <td>${esc(fmt(u.lastLogin))}</td>
          <td>${esc(ips.get(u.id)?.ip || '—')}</td>
          <td>${ban
            ? `<span class="u-badge u-ban">BANNED</span>${ban.reason ? '<br><small>' + esc(ban.reason) + '</small>' : ''}`
            : '<span class="u-badge u-ok">AKTIF</span>'}</td>
          <td>${action}</td>
        </tr>`;
      }).join('');
    }

    const pager = $('usersPager');
    pager.innerHTML = '';
    pager.hidden = pages <= 1;

    if (pages > 1) {
      const mk = (label, disabled, fn) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'tool-open';
        b.style.width = 'auto';
        b.textContent = label;
        b.disabled = disabled;
        b.addEventListener('click', fn);
        return b;
      };
      const info = document.createElement('span');
      info.className = 'owner-help';
      info.textContent = `Halaman ${page} / ${pages}`;
      pager.append(
        mk('‹', page <= 1, () => { page--; render(); }),
        info,
        mk('›', page >= pages, () => { page++; render(); })
      );
    }

    renderStats();
  }

  async function load() {
    const db = window.vexoraDb;
    if (!db) {
      status('Firestore belum siap. Periksa config.js.', true);
      return;
    }

    status('Memuat data akun...');

    try {
      const [uSnap, bSnap, iSnap] = await Promise.all([
        db.collection('users').get(),
        db.collection('banned').get(),
        db.collection('user_ips').get()
      ]);

      ips = new Map(iSnap.docs.map((d) => [d.id, d.data()]));

      users = uSnap.docs
        .map((d) => ({ id: d.id, ...d.data(), email: String(d.data().email || '').toLowerCase() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

      bans = new Map(bSnap.docs.map((d) => [d.id, d.data()]));

      status(`${users.length} akun terdaftar. Akun lama muncul setelah login berikutnya.`);
      render();
    } catch (error) {
      console.error('[VEXORA] Load users:', error);
      status(
        error.code === 'permission-denied'
          ? 'Akses ditolak. Publish firestore.rules terbaru dan login sebagai owner.'
          : (error.message || 'Gagal memuat akun.'),
        true
      );
    }
  }

  async function setBan(id, shouldBan) {
    if (busy) return;

    const user = users.find((u) => u.id === id);
    if (!user || owners().includes(user.email)) return;

    const db = window.vexoraDb;
    let reason = '';

    if (shouldBan) {
      const answer = window.prompt(`Ban ${user.email}?\nAlasan (boleh kosong):`, '');
      if (answer === null) return;
      reason = answer.trim().slice(0, 200);
    } else if (!window.confirm(`Unban ${user.email}?`)) {
      return;
    }

    busy = true;

    try {
      if (shouldBan) {
        await db.collection('banned').doc(id).set({
          email: user.email,
          reason,
          bannedBy: window.vexoraAuth?.currentUser?.email || '',
          bannedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        bans.set(id, { email: user.email, reason });
        status(`${user.email} berhasil di-ban.`);
      } else {
        await db.collection('banned').doc(id).delete();
        bans.delete(id);
        status(`${user.email} berhasil di-unban.`);
      }
      render();
    } catch (error) {
      console.error('[VEXORA] Ban:', error);
      status(
        error.code === 'permission-denied'
          ? 'Akses ditolak. Pastikan rules terbaru sudah di-publish.'
          : (error.message || 'Gagal memproses ban.'),
        true
      );
    } finally {
      busy = false;
    }
  }

  async function init() {
    $('usersSearch')?.addEventListener('input', () => { page = 1; render(); });
    $('usersRefresh')?.addEventListener('click', load);
    $('usersTable')?.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-act]');
      if (btn) setBan(btn.dataset.id, btn.dataset.act === 'ban');
    });

    const user = await (window.vexoraWaitForUser?.() || Promise.resolve(null));
    const adapted = user ? await window.vexoraAdaptUser(user) : null;

    if (adapted?.app_metadata?.role !== 'owner') return;

    await load();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
