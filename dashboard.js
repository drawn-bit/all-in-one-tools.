document.addEventListener('DOMContentLoaded', async () => {
  const $ = (id) => document.getElementById(id);
  const banner = $('vexoraBanner');
  const soundBtn = $('soundBtn');
  const playBtn = $('bannerPlay');
  const notice = $('toolNotice');

  // Video banner loop; sound requires a tap on mobile browsers.
  if (banner) {
    banner.loop = true;
    banner.muted = true;
    banner.play()?.catch(() => {});
  }
  soundBtn?.addEventListener('click', async () => {
    if (!banner) return;
    banner.muted = !banner.muted;
    if (!banner.muted) {
      try {
        await banner.play();
        soundBtn.textContent = '🔇';
        soundBtn.title = 'Matikan backsound';
        soundBtn.setAttribute('aria-pressed', 'true');
      } catch (_) {
        banner.muted = true;
        soundBtn.textContent = '♫';
        soundBtn.title = 'Nyalakan backsound';
      }
    } else {
      soundBtn.textContent = '♫';
      soundBtn.title = 'Nyalakan backsound';
      soundBtn.setAttribute('aria-pressed', 'false');
    }
  });
  playBtn?.addEventListener('click', () => {
    if (!banner) return;
    if (banner.paused) { banner.play().catch(() => {}); playBtn.textContent = 'Ⅱ'; }
    else { banner.pause(); playBtn.textContent = '▶'; }
  });
  $('menuBtn')?.addEventListener('click', () => {
    document.querySelector('.category-tabs')?.scrollIntoView({behavior:'smooth',block:'center'});
  });

  // Device/browser labels (battery API is optional and may not exist on every phone).
  const ua = navigator.userAgent || '';
  $('deviceText').textContent = /Android/i.test(ua) ? 'Android' : /iPhone|iPad|iPod/i.test(ua) ? 'iOS' : /Windows/i.test(ua) ? 'Windows' : /Macintosh/i.test(ua) ? 'Mac' : 'Browser';
  $('browserText').textContent = /Edg\//i.test(ua) ? 'Edge' : /Firefox\//i.test(ua) ? 'Firefox' : /Chrome\//i.test(ua) ? 'Chrome' : /Safari\//i.test(ua) ? 'Safari' : 'Browser';
  if (navigator.getBattery) {
    navigator.getBattery().then(b => {
      const update = () => $('batteryText').textContent = `${Math.round(b.level * 100)}%${b.charging ? ' ⚡' : ''}`;
      update(); b.addEventListener('levelchange', update); b.addEventListener('chargingchange', update);
    }).catch(() => $('batteryText').textContent = 'Tidak tersedia');
  } else $('batteryText').textContent = 'Tidak tersedia';

  // Category tabs + local search.
  let activeFilter = 'all';
  const cards = [...document.querySelectorAll('.tool-card')];
  const search = $('toolSearch');
  function filterTools() {
    const query = (search?.value || '').trim().toLowerCase();
    let shown = 0;
    cards.forEach(card => {
      const matchesCategory = activeFilter === 'all' || card.dataset.category === activeFilter;
      const matchesSearch = (card.dataset.name || card.textContent).toLowerCase().includes(query);
      card.hidden = !(matchesCategory && matchesSearch);
      if (!card.hidden) shown++;
    });
    $('emptyState').hidden = shown !== 0;
    $('sectionTitle').textContent = activeFilter === 'all' ? 'Semua Tools' : activeFilter === 'vip' ? 'VVIP Tools' : activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1);
  }
  document.querySelectorAll('.category-tab').forEach(button => button.addEventListener('click', () => {
    activeFilter = button.dataset.filter || 'all';
    document.querySelectorAll('.category-tab').forEach(b => b.classList.toggle('active', b === button));
    filterTools();
  }));
  search?.addEventListener('input', filterTools);

  function showNotice(message) {
    if (!notice) return;
    notice.textContent = message;
    notice.classList.add('show');
    window.setTimeout(() => notice.classList.remove('show'), 2600);
  }
  document.querySelectorAll('[data-tool]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    showNotice(`${link.dataset.tool}: SC belum diintegrasikan. Kirim file tool untuk mengaktifkannya.`);
  }));

  // Authentication status. Supabase settings are configured in config.js.
  const cfg = window.VEXORA_CONFIG || {};
  const ready = cfg.SUPABASE_URL && !cfg.SUPABASE_URL.startsWith('ISI_') && cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_ANON_KEY.startsWith('ISI_');
  const msg = $('dashboardMessage');
  if (!ready || !window.supabase?.createClient) {
    $('profileUsername').textContent = 'Akun VEXORA';
    $('welcomeText').textContent = 'Dashboard preview';
    $('statusText').textContent = '● Setup diperlukan';
    msg.textContent = 'Isi config.js dan selesaikan setup Supabase untuk mengaktifkan login. Kartu tools akan aktif setelah SC masing-masing diintegrasikan.';
    msg.className = 'message';
    return;
  }
  const client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) { window.location.replace('index.html'); return; }
  const email = data.user.email || 'Pengguna VEXORA';
  $('profileUsername').textContent = email.split('@')[0];
  $('welcomeText').textContent = 'Login berhasil — selamat datang!';
  $('statusText').textContent = '● Online';
  // Display the role only from server-managed Supabase app_metadata; never trust a form/localStorage for privileges.
  const allowedRoles = ['member', 'vip', 'owner'];
  const serverRole = String(data.user.app_metadata?.role || 'member').toLowerCase();
  const role = allowedRoles.includes(serverRole) ? serverRole : 'member';
  const roleLabel = role.toUpperCase();
  $('roleBadge').textContent = role === 'owner' ? '✦ OWNER' : role === 'vip' ? '✦ VIP' : '♟ MEMBER';
  $('roleText').textContent = role === 'owner' ? '♛ OWNER' : role === 'vip' ? '♛ VIP' : '♙ MEMBER';
  $('roleText').hidden = role === 'member';
  msg.textContent = role === 'owner' ? 'Akun Owner terdeteksi. Hak istimewa tetap harus dilindungi dengan aturan server/database.' : role === 'vip' ? 'Akun VIP terdeteksi. Akses premium harus divalidasi lewat kebijakan database.' : 'Akun Member aktif. Upgrade role dilakukan oleh Owner melalui sistem yang aman.';
  $('logoutButton')?.addEventListener('click', async () => {
    await client.auth.signOut();
    window.location.replace('index.html');
  });
});
