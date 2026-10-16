
/* VEXORA EXTRAS — Global Maintenance + Announcements */
(() => {
  'use strict';

  if (window.__VEXORA_EXTRAS_LOADED__) return;
  window.__VEXORA_EXTRAS_LOADED__ = true;

  const $ = (id) => document.getElementById(id);

  const escapeHTML = (value) => String(value ?? '').replace(
    /[&<>"']/g,
    (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[char]
  );

  let client = null;
  let role = 'member';
  let settings = null;
  let announcements = [];
  let busy = false;

  function addStyles() {
    if ($('vexoraExtrasStyles')) return;

    const style = document.createElement('style');
    style.id = 'vexoraExtrasStyles';

    style.textContent = `
      #vxAnnouncements {
        display:grid;
        gap:10px;
        margin:0 0 20px;
      }

      .vx-announcement {
        padding:16px;
        border:1px solid #285078;
        border-radius:13px;
        background:linear-gradient(120deg,#102a45,#111a2d);
        overflow-wrap:anywhere;
      }

      .vx-announcement h3 {
        font-size:14px;
        margin:0 0 8px;
        color:#69dcff;
      }

      .vx-announcement p {
        font-size:12px;
        line-height:1.8;
        color:#d2deef;
        margin:0;
        white-space:pre-wrap;
      }

      .vx-announcement small {
        display:block;
        margin-top:10px;
        color:#91a2bd;
        font-size:10px;
      }

      .vx-extras-card {
        margin-top:18px;
        padding:18px;
        border:1px solid #29405f;
        border-radius:13px;
        background:#0b1425;
      }

      .vx-extras-card h3 {
        margin:0 0 9px;
        font-size:15px;
      }

      .vx-extras-card p {
        color:#91a2bd;
        font-size:11px;
        line-height:1.7;
      }

      .vx-extras-card input,
      .vx-extras-card textarea {
        display:block;
        box-sizing:border-box;
        width:100%;
        margin:10px 0;
        padding:12px;
        border:1px solid #2a3d5b;
        border-radius:9px;
        background:#080f1d;
        color:#fff;
        font:inherit;
        font-size:12px;
      }

      .vx-extras-card textarea {
        min-height:95px;
        resize:vertical;
      }

      .vx-extras-actions {
        display:flex;
        gap:9px;
        flex-wrap:wrap;
      }

      .vx-extras-actions button {
        padding:10px 13px;
        border-radius:9px;
        border:1px solid #2c4b73;
        background:#172a47;
        color:#fff;
        font-size:11px;
        font-weight:700;
        cursor:pointer;
      }

      .vx-extras-actions button:disabled {
        opacity:.5;
        cursor:not-allowed;
      }

      .vx-extras-status {
        font-size:11px!important;
        line-height:1.7;
        overflow-wrap:anywhere;
      }

      .vx-delete-announcement {
        margin-top:12px;
        padding:8px 10px;
        border:1px solid #713b4a;
        border-radius:8px;
        background:#321722;
        color:#ffc4ce;
        cursor:pointer;
      }

      #vxMaintenanceOverlay {
        position:fixed;
        inset:0;
        z-index:99999;
        display:flex;
        align-items:center;
        justify-content:center;
        overflow-y:auto;
        padding:20px;
        box-sizing:border-box;
        background:
          radial-gradient(ellipse at top,#132744 0%,transparent 60%),
          #060a14;
        color:#f4f7ff;
        text-align:center;
      }

      #vxMaintenanceOverlay[hidden] {
        display:none!important;
      }

      .vx-maintenance-box {
        box-sizing:border-box;
        width:min(100%,440px);
        padding:28px;
        border:1px solid #294b70;
        border-radius:20px;
        background:linear-gradient(145deg,#111f35,#0a1120);
        box-shadow:0 0 35px #168bd51c;
      }

      .vx-maintenance-box .vx-symbol {
        display:flex;
        align-items:center;
        justify-content:center;
        width:76px;
        height:76px;
        margin:0 auto 18px;
        border:1px solid #38d9ff66;
        border-radius:22px;
        background:#10283d;
        color:#38d9ff;
        font-size:38px;
        animation:vxGearPulse 2s ease-in-out infinite;
      }

      .vx-maintenance-box h1 {
        font-size:24px;
        margin:0 0 12px;
      }

      .vx-maintenance-box p {
        color:#b6c5dc;
        font-size:13px;
        line-height:1.9;
        white-space:pre-wrap;
        overflow-wrap:anywhere;
      }

      .vx-maintenance-box small {
        color:#7185a5;
        font-size:10px;
        letter-spacing:2px;
      }

      #vxBackToLogin {
        display:block;
        width:100%;
        box-sizing:border-box;
        margin-top:20px;
        padding:13px 16px;
        border:1px solid #38d9ff;
        border-radius:10px;
        background:linear-gradient(135deg,#123b55,#10243d);
        color:#fff;
        font-size:13px;
        font-weight:700;
        cursor:pointer;
        transition:background .2s,box-shadow .2s,transform .2s;
      }

      #vxBackToLogin:hover {
        background:#164968;
        box-shadow:0 0 18px #38d9ff44;
      }

      #vxBackToLogin:active {
        transform:scale(.98);
      }

      @keyframes vxGearPulse {
        0%,100% {
          transform:rotate(0deg);
          box-shadow:0 0 8px #38d9ff22;
        }
        50% {
          transform:rotate(15deg);
          box-shadow:0 0 22px #38d9ff33;
        }
      }

      @media(max-width:420px) {
        .vx-maintenance-box {
          padding:23px 18px;
        }

        .vx-maintenance-box h1 {
          font-size:21px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function createUI() {
    // Area pengumuman pada dashboard.
    const menuPage = $('page-menu');

    if (menuPage && !$('vxAnnouncements')) {
      const container = document.createElement('div');
      container.id = 'vxAnnouncements';

      const hero = menuPage.querySelector('.hero');
      menuPage.insertBefore(container, hero || menuPage.firstChild);
    }

    // Overlay maintenance global.
    if (!$('vxMaintenanceOverlay')) {
      const overlay = document.createElement('div');

      overlay.id = 'vxMaintenanceOverlay';
      overlay.hidden = true;

      overlay.innerHTML = `
        <div class="vx-maintenance-box">
          <div class="vx-symbol" aria-hidden="true">⚙</div>
          <small>VEXORA SYSTEM NOTICE</small>
          <h1>Website Maintenance</h1>
          <p id="vxMaintenanceMessage">
            VEXORA sedang dalam pemeliharaan.
          </p>
          <p>Silakan kembali beberapa saat lagi.</p>
          <button id="vxBackToLogin" type="button">
            ← Kembali ke Halaman Login
          </button>
        </div>
      `;

      document.body.appendChild(overlay);
    }

    // Panel pengaturan khusus Owner.
    const ownerBox = document.querySelector('#page-owner .owner-box');

    if (ownerBox && !$('vxExtrasOwnerPanel')) {
      const panel = document.createElement('section');

      panel.id = 'vxExtrasOwnerPanel';
      panel.className = 'vx-extras-card';

      panel.innerHTML = `
        <h3>Global Maintenance</h3>
        <p>
          Pengaturan ini berlaku untuk semua akun Member dan VIP.
        </p>

        <label for="vxMaintenanceMessageInput">
          Pesan maintenance
        </label>

        <textarea
          id="vxMaintenanceMessageInput"
          maxlength="1000"
          placeholder="Contoh: Kami sedang melakukan pembaruan sistem."
        ></textarea>

        <div class="vx-extras-actions">
          <button type="button" id="vxMaintenanceOn">
            Aktifkan Maintenance
          </button>
          <button type="button" id="vxMaintenanceOff">
            Nonaktifkan Maintenance
          </button>
        </div>

        <p
          id="vxMaintenanceStatus"
          class="vx-extras-status"
          aria-live="polite"
        >Memuat status maintenance...</p>

        <hr style="border:0;border-top:1px solid #23334e;margin:22px 0">

        <h3>Pengumuman Global</h3>
        <p>
          Pengumuman akan muncul pada dashboard Member dan VIP,
          bukan Owner.
        </p>

        <form id="vxAnnouncementForm">
          <input
            id="vxAnnouncementTitle"
            maxlength="120"
            placeholder="Judul pengumuman"
            required
          >

          <textarea
            id="vxAnnouncementBody"
            maxlength="5000"
            placeholder="Isi pengumuman..."
            required
          ></textarea>

          <div class="vx-extras-actions">
            <button type="submit" id="vxAnnouncementSubmit">
              Publikasikan Pengumuman
            </button>
          </div>
        </form>

        <p
          id="vxAnnouncementStatus"
          class="vx-extras-status"
          aria-live="polite"
        ></p>

        <div id="vxOwnerAnnouncementList"></div>
      `;

      ownerBox.appendChild(panel);
    }
  }

  function setStatus(id, message, isError = false) {
    const element = $(id);
    if (!element) return;

    element.textContent = message;
    element.style.color = isError ? '#ff9caa' : '#8fe9c0';
  }

  function isOwner() {
    return role === 'owner';
  }

  function renderAnnouncements() {
    const publicList = $('vxAnnouncements');
    const ownerList = $('vxOwnerAnnouncementList');

    // Pengumuman publik hanya untuk Member dan VIP.
    if (publicList) {
      publicList.innerHTML = isOwner()
        ? ''
        : announcements.map((item) => `
            <article class="vx-announcement">
              <h3>${escapeHTML(item.title)}</h3>
              <p>${escapeHTML(item.message)}</p>
              <small>${escapeHTML(
                item.created_at
                  ? new Date(item.created_at).toLocaleString('id-ID')
                  : 'VEXORA'
              )}</small>
            </article>
          `).join('');
    }

    // Owner tetap dapat mengelola daftar pengumuman.
    if (ownerList) {
      ownerList.innerHTML = announcements.length
        ? announcements.map((item) => `
            <article class="vx-announcement">
              <h3>${escapeHTML(item.title)}</h3>
              <p>${escapeHTML(item.message)}</p>
              <small>${escapeHTML(
                item.created_at
                  ? new Date(item.created_at).toLocaleString('id-ID')
                  : ''
              )}</small>
              <button
                class="vx-delete-announcement"
                type="button"
                data-vx-delete="${escapeHTML(item.id)}"
              >Hapus Pengumuman</button>
            </article>
          `).join('')
        : '<p class="vx-extras-status">Belum ada pengumuman.</p>';
    }
  }

  function renderMaintenance() {
    const overlay = $('vxMaintenanceOverlay');
    if (!overlay) return;

    const enabled = settings?.maintenance_enabled === true;
    const shouldBlock = enabled && !isOwner();

    overlay.hidden = !shouldBlock;

    const message = $('vxMaintenanceMessage');

    if (message) {
      message.textContent = settings?.maintenance_message ||
        'VEXORA sedang dalam pemeliharaan. Silakan kembali nanti.';
    }

    const input = $('vxMaintenanceMessageInput');

    if (input && document.activeElement !== input) {
      input.value = settings?.maintenance_message || '';
    }

    setStatus(
      'vxMaintenanceStatus',
      settings
        ? `Status: ${enabled ? 'AKTIF' : 'NONAKTIF'}`
        : 'Status maintenance belum berhasil dimuat.',
      !settings
    );
  }

  async function loadSettings() {
    const { data, error } = await client
      .from('vexora_site_settings')
      .select('id,maintenance_enabled,maintenance_message,updated_at')
      .eq('id', 1)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      throw new Error(
        'Pengaturan belum tersedia. Periksa SQL setup Supabase.'
      );
    }

    settings = data;
    renderMaintenance();
  }

  async function loadAnnouncements() {
    const { data, error } = await client
      .from('vexora_announcements')
      .select('id,title,message,created_at')
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) throw error;

    announcements = Array.isArray(data) ? data : [];
    renderAnnouncements();
  }

  async function refreshAll() {
    if (!client) return;

    try {
      const { data, error } = await client.auth.getSession();

      if (error) throw error;

      const user = data?.session?.user;

      if (!user) {
        role = 'member';
        settings = null;
        announcements = [];

        renderAnnouncements();
        renderMaintenance();
        return;
      }

      role = String(
        user.app_metadata?.role || 'member'
      ).toLowerCase();

      await Promise.all([
        loadSettings(),
        loadAnnouncements()
      ]);
    } catch (error) {
      console.error('[VEXORA Extras]', error);

      setStatus(
        'vxMaintenanceStatus',
        `Gagal memuat data: ${error.message || 'Periksa koneksi dan RLS Supabase.'}`,
        true
      );

      setStatus(
        'vxAnnouncementStatus',
        `Data belum dimuat: ${error.message || 'Periksa koneksi Supabase.'}`,
        true
      );
    }
  }

  async function changeMaintenance(enabled) {
    if (!isOwner() || busy) return;

    const message = (
      $('vxMaintenanceMessageInput')?.value || ''
    ).trim() ||
      'VEXORA sedang dalam pemeliharaan. Silakan kembali nanti.';

    if (message.length > 1000) {
      setStatus(
        'vxMaintenanceStatus',
        'Pesan maksimal 1000 karakter.',
        true
      );
      return;
    }

    busy = true;

    const buttons = [
      $('vxMaintenanceOn'),
      $('vxMaintenanceOff')
    ];

    buttons.forEach((button) => {
      if (button) button.disabled = true;
    });

    try {
      const { error } = await client
        .from('vexora_site_settings')
        .update({
          maintenance_enabled: enabled,
          maintenance_message: message,
          updated_at: new Date().toISOString()
        })
        .eq('id', 1);

      if (error) throw error;

      await loadSettings();

      setStatus(
        'vxMaintenanceStatus',
        `Maintenance berhasil ${enabled ? 'diaktifkan' : 'dinonaktifkan'}.`
      );
    } catch (error) {
      setStatus(
        'vxMaintenanceStatus',
        `Gagal menyimpan: ${error.message || 'Periksa izin Owner.'}`,
        true
      );
    } finally {
      busy = false;

      buttons.forEach((button) => {
        if (button) button.disabled = false;
      });
    }
  }

  async function publishAnnouncement(event) {
    event.preventDefault();

    if (!isOwner() || busy) return;

    const title = (
      $('vxAnnouncementTitle')?.value || ''
    ).trim();

    const message = (
      $('vxAnnouncementBody')?.value || ''
    ).trim();

    if (!title || !message) {
      setStatus(
        'vxAnnouncementStatus',
        'Judul dan isi wajib diisi.',
        true
      );
      return;
    }

    busy = true;

    const submit = $('vxAnnouncementSubmit');
    if (submit) submit.disabled = true;

    try {
      const { error } = await client
        .from('vexora_announcements')
        .insert({ title, message });

      if (error) throw error;

      $('vxAnnouncementForm')?.reset();

      await loadAnnouncements();

      setStatus(
        'vxAnnouncementStatus',
        'Pengumuman berhasil dipublikasikan.'
      );
    } catch (error) {
      setStatus(
        'vxAnnouncementStatus',
        `Gagal menerbitkan: ${error.message || 'Periksa izin Owner.'}`,
        true
      );
    } finally {
      busy = false;
      if (submit) submit.disabled = false;
    }
  }

  async function deleteAnnouncement(id, button) {
    if (!isOwner() || busy || !id) return;

    if (!window.confirm('Hapus pengumuman ini untuk semua pengguna?')) {
      return;
    }

    busy = true;
    if (button) button.disabled = true;

    try {
      const { error } = await client
        .from('vexora_announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await loadAnnouncements();

      setStatus(
        'vxAnnouncementStatus',
        'Pengumuman berhasil dihapus.'
      );
    } catch (error) {
      setStatus(
        'vxAnnouncementStatus',
        `Gagal menghapus: ${error.message || 'Periksa izin Owner.'}`,
        true
      );

      if (button) button.disabled = false;
    } finally {
      busy = false;
    }
  }

  function bindControls() {
    $('vxMaintenanceOn')?.addEventListener(
      'click',
      () => changeMaintenance(true)
    );

    $('vxMaintenanceOff')?.addEventListener(
      'click',
      () => changeMaintenance(false)
    );

    $('vxAnnouncementForm')?.addEventListener(
      'submit',
      publishAnnouncement
    );

    $('vxOwnerAnnouncementList')?.addEventListener(
      'click',
      (event) => {
        const button = event.target.closest('[data-vx-delete]');

        if (button) {
          deleteAnnouncement(button.dataset.vxDelete, button);
        }
      }
    );

    // Tombol kembali menuju halaman login.
    $('vxBackToLogin')?.addEventListener('click', async () => {
      const button = $('vxBackToLogin');

      if (button) {
        button.disabled = true;
        button.textContent = 'Mengarahkan ke halaman login...';
      }

      try {
        if (client) {
          await client.auth.signOut();
        }
      } catch (error) {
        console.error('[VEXORA logout]', error);
      }

      // Login ada di index.html.
      window.location.replace('index.html');
    });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) refreshAll();
    });
  }

  async function boot() {
    addStyles();
    createUI();
    bindControls();

    // Menunggu dashboard.js menyiapkan client Supabase.
    for (let attempt = 0; attempt < 60; attempt++) {
      if (typeof window.vexoraGetClient === 'function') {
        client = window.vexoraGetClient();
      }

      if (client) break;

      await new Promise((resolve) => {
        window.setTimeout(resolve, 300);
      });
    }

    if (!client) {
      setStatus(
        'vxMaintenanceStatus',
        'Supabase belum siap. Periksa config.js dan dashboard.js.',
        true
      );
      return;
    }

    await refreshAll();

    client.auth.onAuthStateChange((_event, session) => {
      role = String(
        session?.user?.app_metadata?.role || 'member'
      ).toLowerCase();

      window.setTimeout(() => refreshAll(), 0);
    });

    window.setInterval(refreshAll, 60000);
  }

  window.vexoraExtrasRefresh = refreshAll;

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      () => {
        boot().catch((error) => {
          console.error('[VEXORA Extras boot]', error);
        });
      },
      { once: true }
    );
  } else {
    boot().catch((error) => {
      console.error('[VEXORA Extras boot]', error);
    });
  }
})();
                     
