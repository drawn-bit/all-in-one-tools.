
/* VEXORA dashboard.js — repaired navigation + safe Supabase initialization */
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
        if (client) {
          await client.auth.signOut();
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

    let action;

    if (locked) {
      action =
        '<button class="tool-open locked" type="button" disabled>' +
        '✦ Khusus VIP</button>';
    } else if (url && /^https?:\/\//i.test(url)) {
      action =
        `<button class="tool-open" type="button" ` +
        `data-tool-url="${safeText(url)}">` +
        'Buka Tools ↗</button>';
    } else {
      action =
        '<button class="tool-open" type="button" disabled>' +
        'URL belum diatur</button>';
    }

    return `
      <article class="tool-card">
        <div class="tool-top">
          <div class="tool-icon">
            ${category === 'vip' ? '✦' : '▦'}
          </div>
          <span class="pill ${category}">
            ${category.toUpperCase()}
          </span>
        </div>
        <h3>${name}</h3>
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

    fill(
      'freeGrid2',
      free,
      'Tidak ada FREE tools yang cocok.'
    );

    fill(
      'vipGrid',
      vip,
      'Belum ada VIP tools.'
    );

    fill(
      'vipGrid2',
      vip,
      'Tidak ada VIP tools yang cocok.'
    );

    [
      'freeGrid',
      'freeGrid2',
      'vipGrid',
      'vipGrid2'
    ].forEach((id) => {
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

  // AMBIL DATA TOOLS DARI SUPABASE
  async function loadTools() {
    if (!client) return;

    const { data, error } = await client
      .from('vexora_tools')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('VEXORA tools table:', error.message);
      tools = [];
    } else {
      tools = Array.isArray(data) ? data : [];
    }

    renderTools();
  }

  // INISIALISASI DASHBOARD
  async function initialize() {
    const config = window.VEXORA_CONFIG || {};

    if (!window.supabase?.createClient) {
      notice(
        'Navigasi aktif, tetapi library Supabase belum termuat. Coba muat ulang halaman.',
        true
      );
      renderTools();
      return;
    }

    if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
      notice(
        'Navigasi aktif, tetapi SUPABASE_URL / SUPABASE_ANON_KEY belum benar di config.js.',
        true
      );
      renderTools();
      return;
    }

    if (!client) {
      client = window.supabase.createClient(
        config.SUPABASE_URL,
        config.SUPABASE_ANON_KEY
      );

      // Client bersama untuk script Owner Panel.
      window.vexoraSupabase = client;
      window.supabaseClient = window.supabaseClient || client;
    }

    try {
      const { data, error } = await client.auth.getSession();

      if (error) throw error;

      if (!data?.session?.user) {
        notice(
          'Sesi login tidak ditemukan. Mengalihkan ke halaman login...'
        );

        window.setTimeout(() => {
          window.location.href = 'index.html';
        }, 900);

        return;
      }

      setAccountUI(data.session.user);

      await loadTools();

      notice('Dashboard berhasil dimuat.');
    } catch (error) {
      console.error('VEXORA initialize:', error);

      notice(
        `Navigasi aktif. Gagal memuat data akun/tools: ${
          error.message || 'periksa koneksi Supabase'
        }`,
        true
      );

      renderTools();
    }
  }

  // FUNGSI YANG BISA DIPAKAI SCRIPT LAIN
  window.vexoraOpenPage = openPage;
  window.vexoraGetClient = () => client;
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
      
