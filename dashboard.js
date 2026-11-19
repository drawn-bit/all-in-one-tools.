
/* VEXORA dashboard.js — navigasi + login Firebase + data tools Firestore */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);

  const notice = (message, isError = false) => {
    const el = $('settingsNotice');
    if (!el) return;

    el.textContent = message;
    el.style.color = isError ? '#ff9caa' : '#8fe9c0';
  };

  let client = null;
  let currentUser = null;
  let currentRole = 'member';
  let tools = [];

  // NAVIGASI HALAMAN
  function openPage(name) {
    const target = document.getElementById(`page-${name}`);
    if (!target) return;

    if (name === 'owner' && currentRole !== 'owner') {
      notice('Panel Owner hanya bisa dibuka oleh akun Owner.', true);
      return;
    }

    document.querySelectorAll('.page').forEach((page) => {
      page.classList.toggle('active', page === target);

      if (page.id === 'page-owner') {
        page.hidden = page !== target;
      }
    });

    document.querySelectorAll('.nav[data-page]').forEach((link) => {
      link.classList.toggle('active', link.dataset.page === name);
    });

    if (
      name === 'owner' &&
      typeof window.loadOwnerPanel === 'function'
    ) {
      Promise.resolve(window.loadOwnerPanel()).catch((error) => {
        console.error('Owner panel:', error);
      });
    }

    if (name === 'tools') {
      $('toolSearch')?.focus({ preventScroll: true });
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // PASANG EVENT SEMUA TOMBOL
  function bindInterface() {
    document.querySelectorAll('.nav[data-page]').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        openPage(link.dataset.page);
      });
    });

    // LOGOUT
    $('logoutBtn')?.addEventListener('click', async (event) => {
      event.preventDefault();

      try {
        if (window.vexoraAuth) {
          await window.vexoraAuth.signOut();
        }
      } catch (error) {
        console.error('Logout:', error);
      }

      window.location.href = 'index.html';
    });

    // REFRESH DASHBOARD
    $('refreshBtn')?.addEventListener('click', () => {
      notice('Memuat ulang dashboard...');

      initialize().catch((error) => {
        console.error(error);
        notice(
          'Dashboard gagal dimuat. Periksa koneksi dan config.js.',
          true
        );
      });
    });

    // PENCARIAN TOOLS
    $('toolSearch')?.addEventListener('input', renderTools);

    // MENU TITIK TIGA
    $('dotsBtn')?.addEventListener('click', (event) => {
      event.stopPropagation();
      $('dropdown')?.classList.toggle('open');
    });

    document.addEventListener('click', (event) => {
      if (!event.target.closest('.menu-wrap')) {
        $('dropdown')?.classList.remove('open');
      }
    });

    // NAVIGASI DARI MENU DROPDOWN
    document.querySelectorAll('[data-go]').forEach((button) => {
      button.addEventListener('click', () => {
        openPage(button.dataset.go);
        $('dropdown')?.classList.remove('open');
      });
    });

    $('dropdownLogout')?.addEventListener('click', () => {
      $('logoutBtn')?.click();
    });

    // KONTROL VIDEO BANNER
    const video = $('bannerVideo');

    $('playVideo')?.addEventListener('click', async () => {
      if (!video) return;

      if (video.paused) {
        try {
          await video.play();
          $('playVideo').textContent = 'Ⅱ Pause';
        } catch (error) {
          console.warn('Video tidak dapat diputar:', error);
          $('playVideo').textContent = '▶ Play';
        }
      } else {
        video.pause();
        $('playVideo').textContent = '▶ Play';
      }
    });

    $('muteVideo')?.addEventListener('click', () => {
      if (!video) return;

      video.muted = !video.muted;
      $('muteVideo').textContent = video.muted
        ? '♩ Unmute'
        : '♩ Mute';
    });

    // TAHUN DAN TANGGAL
    const year = $('year');

    if (year) {
      year.textContent = String(new Date().getFullYear());
    }

    const date = $('dateText');

    if (date) {
      date.textContent = new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'full'
      }).format(new Date());
    }
  }

  // CEK ROLE AKUN
  function normalizeRole(user) {
    const role =
      user?.app_metadata?.role ||
      user?.user_metadata?.role ||
      'member';

    const normalized = String(role).toLowerCase();

    return ['owner', 'vip', 'member'].includes(normalized)
      ? normalized
      : 'member';
  }

  // TAMPILKAN INFORMASI AKUN
  function setAccountUI(user) {
    currentUser = user || null;
    currentRole = normalizeRole(user);

    const email = user?.email || '—';

    const roleLabel =
      currentRole === 'owner'
        ? 'OWNER'
        : currentRole === 'vip'
          ? 'VIP'
          : 'FREE';

    if ($('greetingText')) {
      $('greetingText').textContent = user?.email
        ? `Welcome back, ${user.email.split('@')[0]}!`
        : 'Welcome to VEXORA!';
    }

    if ($('profileEmail')) {
      $('profileEmail').textContent = email;
    }

    if ($('profileRole')) {
      $('profileRole').textContent = roleLabel;
    }

    if ($('roleValue')) {
      $('roleValue').textContent = roleLabel;
    }

    if ($('ownerNav')) {
      $('ownerNav').hidden = currentRole !== 'owner';
    }

    const ownerPage = $('page-owner');

    if (ownerPage && currentRole !== 'owner') {
      ownerPage.hidden = true;
    }
  }

  // AMANKAN TEKS SEBELUM DIMASUKKAN KE HTML
  function safeText(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[char]);
  }

  // JENIS TOOLS: pakai field "type" kalau ada, kalau tidak ditebak dari nama
  const TYPE_RULES = [
    ['Downloader', /download|unduh/i],
    ['Uploader', /to link|uploader/i],
    ['Generator', /generator|card|quote|brat/i],
    ['Pencarian', /finder|search|cari/i],
    ['Utilitas', /calculator|kalkulator|convert/i]
  ];

  function typeOf(tool) {
    const own = String(tool.type || '').trim();
    if (own) return own.slice(0, 20);
    const name = String(tool.name || tool.title || '');
    for (const [label, re] of TYPE_RULES) if (re.test(name)) return label;
    return 'Lainnya';
  }

  let typeFilter = 'all';

  const ICON_GRID = '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>';
  const ICON_CROWN = '<svg viewBox="0 0 24 24"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/></svg>';

  // Seluruh kartu bisa diklik (tombol di dalamnya disembunyikan oleh CSS)
  document.addEventListener('click', (e) => {
    const card = e.target.closest('.tool-grid .tool-card');
    if (!card || e.target.closest('.tool-open')) return;
    card.querySelector('.tool-open:not(:disabled)')?.click();
  });

  function drawTypeTabs() {
    const box = $('typeTabs');
    if (!box) return;
    const counts = {};
    tools.forEach((t) => { const k = typeOf(t); counts[k] = (counts[k] || 0) + 1; });
    if (typeFilter !== 'all' && !counts[typeFilter]) typeFilter = 'all';
    const items = [['all', 'ALL', tools.length], ...Object.keys(counts).sort().map((k) => [k, k, counts[k]])];
    box.innerHTML = items.map(([k, label, n]) =>
      `<button class="ty-tab" type="button" data-type="${safeText(k)}" aria-pressed="${k === typeFilter}">${k === 'all' ? ICON_GRID : ''}${safeText(label)} <em>${n}</em></button>`
    ).join('');
    box.querySelectorAll('.ty-tab').forEach((b) => {
      b.addEventListener('click', () => { typeFilter = b.dataset.type; renderTools(); });
    });
  }

  // MEMBUAT KARTU TOOLS
  function renderCard(tool) {
    const category =
      String(tool.category || 'free').toLowerCase() === 'vip'
        ? 'vip'
        : 'free';

    const locked =
      category === 'vip' &&
      !['vip', 'owner'].includes(currentRole);

    const name = safeText(tool.name || tool.title || 'Tools');

    const desc = safeText(
      tool.description || tool.desc || 'Tools VEXORA'
    );

    const url = String(tool.url || tool.href || '').trim();

    const iconUrl = String(tool.iconUrl || '').trim();

    const iconHtml = /^(https:\/\/|data:image\/png;base64,)/i.test(iconUrl)
      ? `<img src="${safeText(iconUrl)}" alt="" loading="lazy" ` +
        'style="width:100%;height:100%;object-fit:contain">'
      : category === 'vip'
        ? ICON_CROWN
        : ICON_GRID;

    let action;

    if (locked) {
      action =
        '<button class="tool-open locked" type="button" disabled>' +
        '✦ Khusus VIP</button>';
    } else if (tool.zipPath) {
      action =
        `<button class="tool-open" type="button" ` +
        `data-tool-id="${safeText(tool.id)}">` +
        'Buka Tools ▶</button>';
    } else if (url && /^https?:\/\//i.test(url)) {
      action =
        `<button class="tool-open" type="button" ` +
        `data-tool-url="${safeText(url)}">` +
        'Buka Tools ↗</button>';
    } else {
      action =
        '<button class="tool-open" type="button" disabled>' +
        'Belum ada file</button>';
    }

    return `
      <article class="tool-card${locked ? ' locked' : ''}">
        <div class="tool-top">
          <div class="tool-icon"${iconHtml.startsWith('<img') ? ' style="background:transparent"' : ''}>${iconHtml}</div>
          <span class="pill ${category}">
            ${category.toUpperCase()}
          </span>
        </div>
        <h3>${name}</h3>
        <span class="tool-type">${safeText(typeOf(tool))}</span>
        <p>${desc}</p>
        ${action}
      </article>
    `;
  }

  // TAMPILKAN DAN FILTER TOOLS
  function renderTools() {
    const query = ($('toolSearch')?.value || '')
      .trim()
      .toLowerCase();

    const filtered = tools.filter((tool) => {
      const searchable = [
        tool.name || tool.title || '',
        tool.description || tool.desc || '',
        tool.category || ''
      ].join(' ').toLowerCase();

      return searchable.includes(query);
    });

    const free = filtered.filter(
      (tool) =>
        String(tool.category || 'free').toLowerCase() !== 'vip'
    );

    const vip = filtered.filter(
      (tool) =>
        String(tool.category || 'free').toLowerCase() === 'vip'
    );

    const shown = filtered.filter((t) => typeFilter === 'all' || typeOf(t) === typeFilter);

    function fill(id, items, emptyMessage) {
      const node = $(id);
      if (!node) return;

      node.innerHTML = items.length
        ? items.map(renderCard).join('')
        : `<div class="tool-card"><p>${safeText(emptyMessage)}</p></div>`;
    }

    fill(
      'freeGrid',
      free,
      'Belum ada FREE tools. Owner bisa menambahkan tools dari Panel Owner.'
    );

    const ordered = [
      ...shown.filter((t) => String(t.category || 'free').toLowerCase() !== 'vip'),
      ...shown.filter((t) => String(t.category || 'free').toLowerCase() === 'vip')
    ];

    fill('allGrid2', ordered, 'Tidak ada tools yang cocok.');
    drawTypeTabs();

    if ($('toolsTitle')) {
      $('toolsTitle').textContent =
        (typeFilter === 'all' ? 'Semua Tools' : typeFilter) + ' (' + ordered.length + ')';
    }

    fill(
      'vipGrid',
      vip,
      'Belum ada VIP tools.'
    );


    [
      'freeGrid',
      'allGrid2',
      'vipGrid'
    ].forEach((id) => {
      $(id)?.querySelectorAll('[data-tool-id]').forEach((button) => {
        button.addEventListener('click', () => {
          const tool = tools.find(
            (item) => String(item.id) === button.getAttribute('data-tool-id')
          );

          if (tool && typeof window.vexoraRunTool === 'function') {
            window.vexoraRunTool(tool);
          }
        });
      });

      $(id)?.querySelectorAll('[data-tool-url]').forEach((button) => {
        button.addEventListener('click', () => {
          const url = button.getAttribute('data-tool-url');

          if (url && /^https?:\/\//i.test(url)) {
            window.open(url, '_blank', 'noopener,noreferrer');
          }
        });
      });
    });

    if ($('freeCount')) {
      $('freeCount').textContent = String(
        tools.filter(
          (tool) =>
            String(tool.category || 'free').toLowerCase() !== 'vip'
        ).length
      );
    }

    if ($('vipCount')) {
      $('vipCount').textContent = String(
        tools.filter(
          (tool) =>
            String(tool.category || '').toLowerCase() === 'vip'
        ).length
      );
    }

    if ($('ownerToolsCount')) {
      $('ownerToolsCount').textContent = String(tools.length);
    }
  }

  // AMBIL DATA TOOLS DARI FIRESTORE
  async function loadTools() {
    let loadFailed = false;

    if (!window.vexoraDb) {
      tools = [];
      renderTools();
      return false;
    }

    try {
      const snapshot = await window.vexoraDb
        .collection('vexora_tools')
        .orderBy('createdAt', 'desc')
        .get();

      tools = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.warn('VEXORA tools:', error);
      tools = [];
      loadFailed = true;

      notice(
        error?.code === 'permission-denied'
          ? 'Daftar tools tidak bisa dibaca. Pastikan Firestore Rules sudah dipasang dan email sudah diverifikasi.'
          : 'Daftar tools gagal dimuat. Periksa koneksi internet.',
        true
      );
    }

    renderTools();

    return !loadFailed;
  }

  // INISIALISASI DASHBOARD
  async function initialize() {
    if (!window.vexoraAuth) {
      notice(
        'Navigasi aktif, tetapi Firebase belum siap. Periksa FIREBASE di config.js.',
        true
      );
      renderTools();
      return;
    }

    try {
      const firebaseUser = await window.vexoraWaitForUser();

      if (!firebaseUser || !firebaseUser.emailVerified) {
        notice(
          'Sesi login tidak ditemukan. Mengalihkan ke halaman login...'
        );

        window.setTimeout(() => {
          window.location.href = 'index.html';
        }, 900);

        return;
      }

      const ban = await window.vexoraIsBanned?.(firebaseUser);

      if (ban) {
        await window.vexoraAuth.signOut();
        alert(
          'Akun ini diblokir oleh Owner.' +
            (ban.reason ? '\nAlasan: ' + ban.reason : '')
        );
        window.location.href = 'index.html';
        return;
      }

      window.vexoraSyncUser?.(firebaseUser).catch((error) => {
        console.warn('Sync user:', error);
      });

      setAccountUI(await window.vexoraAdaptUser(firebaseUser));

      const loaded = await loadTools();

      if (loaded) notice('Dashboard berhasil dimuat.');
    } catch (error) {
      console.error('VEXORA initialize:', error);

      notice(
        `Navigasi aktif. Gagal memuat data akun/tools: ${
          error.message || 'periksa koneksi'
        }`,
        true
      );

      renderTools();
    }
  }

  // FUNGSI YANG BISA DIPAKAI SCRIPT LAIN
  window.vexoraOpenPage = openPage;
  window.vexoraGetClient = () => null;
  window.vexoraGetRole = () => currentRole;

  window.vexoraRefreshTools = () =>
    loadTools().catch(console.error);

  // JALANKAN DASHBOARD
  bindInterface();
  renderTools();

  initialize().catch((error) => {
    console.error('VEXORA startup:', error);

    notice(
      'Dashboard mengalami error, tetapi menu tetap bisa digunakan. Periksa konfigurasi.',
      true
    );
  });
})();
      
