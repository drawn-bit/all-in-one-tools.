/* =========================================================
   VEXORA TOOL RUNNER
   Mengunduh ZIP tools dari Firebase Storage, mengekstraknya di
   browser ke Cache Storage, lalu membukanya di dalam website
   lewat service worker (sw.js) pada alamat virtual __vx/...
   ========================================================= */
(() => {
  'use strict';

  const CACHE = 'vexora-tools-v1';
  const MAX_ZIP_BYTES = 50 * 1024 * 1024;
  const MAX_FILES = 3000;

  const MIME = {
    html: 'text/html; charset=utf-8',
    htm: 'text/html; charset=utf-8',
    css: 'text/css; charset=utf-8',
    js: 'text/javascript; charset=utf-8',
    mjs: 'text/javascript; charset=utf-8',
    json: 'application/json; charset=utf-8',
    map: 'application/json; charset=utf-8',
    txt: 'text/plain; charset=utf-8',
    xml: 'application/xml; charset=utf-8',
    svg: 'image/svg+xml',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    avif: 'image/avif',
    ico: 'image/x-icon',
    bmp: 'image/bmp',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    m4a: 'audio/mp4',
    mp4: 'video/mp4',
    webm: 'video/webm',
    woff: 'font/woff',
    woff2: 'font/woff2',
    ttf: 'font/ttf',
    otf: 'font/otf',
    wasm: 'application/wasm',
    pdf: 'application/pdf',
    csv: 'text/csv; charset=utf-8',
    webmanifest: 'application/manifest+json'
  };

  function mimeFor(path) {
    const dot = path.lastIndexOf('.');
    const ext = dot >= 0 ? path.slice(dot + 1).toLowerCase() : '';
    return MIME[ext] || 'application/octet-stream';
  }

  /*
   * Menentukan file mana saja dari ZIP yang dipakai.
   * - Mengabaikan folder, __MACOSX, .DS_Store, Thumbs.db, dan path berbahaya.
   * - Mencari index.html yang paling dangkal; foldernya menjadi "root".
   *   (ZIP yang dibungkus satu folder tetap bisa dipakai.)
   * Mengembalikan [{ name, rel }]  (name = path asli di ZIP, rel = path di web).
   */
  function planEntries(names) {
    const clean = [];

    names.forEach((original) => {
      const name = String(original).replace(/\\/g, '/').replace(/^(\.\/)+/, '').replace(/^\/+/, '');

      if (!name || name.endsWith('/')) return;

      const parts = name.split('/');

      if (parts.some((part) => part === '' || part === '..' || part === '.')) return;
      if (parts[0] === '__MACOSX') return;

      const base = parts[parts.length - 1];

      if (base === '.DS_Store' || base === 'Thumbs.db') return;

      clean.push({ name: original, path: name, parts });
    });

    const indexes = clean
      .filter((item) => item.parts[item.parts.length - 1].toLowerCase() === 'index.html')
      .sort((a, b) => a.parts.length - b.parts.length || a.path.localeCompare(b.path));

    if (!indexes.length) {
      const error = new Error('Di dalam ZIP tidak ada file index.html.');
      error.code = 'NO_INDEX';
      throw error;
    }

    const rootParts = indexes[0].parts.slice(0, -1);
    const rootPrefix = rootParts.length ? rootParts.join('/') + '/' : '';

    const files = [];
    const seen = new Set();

    clean.forEach((item) => {
      if (!item.path.startsWith(rootPrefix)) return;

      let rel = item.path.slice(rootPrefix.length);

      if (rel.toLowerCase() === 'index.html') rel = 'index.html';

      if (seen.has(rel)) return;
      seen.add(rel);

      files.push({ name: item.name, rel });
    });

    return files;
  }

  function encodePath(rel) {
    return rel.split('/').map(encodeURIComponent).join('/');
  }

  window.vexoraZipHelpers = {
    planEntries,
    mimeFor,
    maxZipBytes: MAX_ZIP_BYTES,
    maxFiles: MAX_FILES
  };

  /* ---------------- UI ---------------- */

  let modal = null;
  let running = false;
  let currentSrc = '';

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[ch]);
  }

  function ensureModal() {
    if (modal) return modal;

    const style = document.createElement('style');
    style.textContent = `
      #vxRunner{position:fixed;inset:0;z-index:2000;background:#050a14;display:none;flex-direction:column}
      #vxRunner.open{display:flex;animation:vxRunIn .36s cubic-bezier(.22,.8,.3,1)}
      @keyframes vxRunIn{from{transform:translateY(40px);opacity:0}to{transform:none;opacity:1}}
      #vxRunnerBar{animation:vxRunBar .5s .12s cubic-bezier(.22,.8,.3,1) backwards}
      @keyframes vxRunBar{from{transform:translateY(-14px);opacity:0}to{transform:none;opacity:1}}
      #vxRunnerBar button:active{transform:scale(.94)}
      @media(prefers-reduced-motion:reduce){#vxRunner.open,#vxRunnerBar{animation:none}}
      #vxRunnerBar{display:flex;align-items:center;gap:8px;padding:8px 10px;padding-top:calc(8px + env(safe-area-inset-top,0px));background:#0b1221;border-bottom:1px solid #1d2c47;color:#fff}
      #vxRunnerTitle{flex:1;min-width:0;font-size:13px;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      #vxRunnerBar button{border:1px solid #2c4b73;background:#172a47;color:#e9f5ff;border-radius:9px;padding:8px 12px;font-size:12px;font-weight:700;cursor:pointer}
      #vxRunnerBody{position:relative;flex:1;min-height:0;background:#fff}
      #vxRunnerFrame{position:absolute;inset:0;width:100%;height:100%;border:0;background:#fff}
      #vxRunnerMsg{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;background:#050a14;color:#d4eaff;font-size:13px;line-height:1.7}
      #vxRunnerMsg.error{color:#ff9caa}
      #vxRunnerMsg[hidden]{display:none}
    `;
    document.head.appendChild(style);

    modal = document.createElement('div');
    modal.id = 'vxRunner';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `
      <div id="vxRunnerBar">
        <div id="vxRunnerTitle">Tools</div>
        <button type="button" id="vxRunnerReload" aria-label="Muat ulang tools">↻</button>
        <button type="button" id="vxRunnerClose" aria-label="Tutup tools">✕ Tutup</button>
      </div>
      <div id="vxRunnerBody">
        <iframe id="vxRunnerFrame" title="Tools"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
          allow="clipboard-write; fullscreen"></iframe>
        <div id="vxRunnerMsg"></div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#vxRunnerClose').addEventListener('click', closeRunner);

    modal.querySelector('#vxRunnerReload').addEventListener('click', () => {
      const frame = modal.querySelector('#vxRunnerFrame');
      if (currentSrc) frame.src = currentSrc;
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && modal.classList.contains('open')) closeRunner();
    });

    return modal;
  }

  function setMessage(text, isError = false) {
    const box = ensureModal().querySelector('#vxRunnerMsg');
    box.hidden = !text;
    box.className = isError ? 'error' : '';
    box.innerHTML = text ? escapeHTML(text) : '';
  }

  function closeRunner() {
    if (!modal) return;

    modal.classList.remove('open');
    modal.querySelector('#vxRunnerFrame').src = 'about:blank';
    document.body.style.overflow = '';
    currentSrc = '';
  }

  /* ---------------- Service worker + cache ---------------- */

  async function ensureServiceWorker() {
    if (!('serviceWorker' in navigator) || !window.caches) {
      throw new Error(
        'Browser ini tidak mendukung menjalankan tools dari ZIP. Gunakan Chrome/Edge/Safari terbaru lewat alamat https.'
      );
    }

    if (!window.isSecureContext) {
      throw new Error('Tools ZIP hanya bisa dijalankan lewat alamat https (atau localhost).');
    }

    await navigator.serviceWorker.register('sw.js');

    const registration = await navigator.serviceWorker.ready;

    if (!registration.active) {
      throw new Error('Service worker belum aktif. Muat ulang halaman lalu coba lagi.');
    }

    return registration;
  }

  async function hasTool(cache, indexUrl) {
    return Boolean(await cache.match(indexUrl));
  }

  async function downloadZip(tool) {
    // ZIP disimpan di repo GitHub (folder tools-zip), diambil dari situs sendiri.
    if (tool.zipSource === 'repo') {
      let res;

      try {
        res = await fetch(
          new URL(tool.zipPath, window.location.href).href + '?v=' + encodeURIComponent(tool.version || ''),
          { cache: 'no-store' }
        );
      } catch (error) {
        throw new Error('Gagal mengunduh ZIP. Periksa koneksi internet.');
      }

      if (!res.ok) {
        throw new Error('File ZIP tools tidak ditemukan di situs (kode ' + res.status + '). Hubungi owner.');
      }

      const buf = await res.arrayBuffer();

      if (buf.byteLength > MAX_ZIP_BYTES) {
        throw new Error('File ZIP terlalu besar.');
      }

      return buf;
    }

    if (!window.vexoraStorage) {
      throw new Error('Firebase Storage belum siap. Periksa storageBucket di config.js.');
    }

    let url;

    try {
      url = await window.vexoraStorage.ref(tool.zipPath).getDownloadURL();
    } catch (error) {
      if (error?.code === 'storage/object-not-found') {
        throw new Error('File ZIP tools tidak ditemukan di Storage. Hubungi owner.');
      }

      if (error?.code === 'storage/unauthorized') {
        throw new Error('Akses ke file tools ditolak. Pastikan sudah login.');
      }

      throw error;
    }

    let response;

    try {
      response = await fetch(url);
    } catch (error) {
      throw new Error(
        'Gagal mengunduh ZIP. Kemungkinan CORS bucket belum diatur (lihat README_TOOLS_ZIP.md) atau koneksi bermasalah.'
      );
    }

    if (!response.ok) {
      throw new Error('Gagal mengunduh ZIP (kode ' + response.status + ').');
    }

    const buffer = await response.arrayBuffer();

    if (buffer.byteLength > MAX_ZIP_BYTES) {
      throw new Error('File ZIP terlalu besar.');
    }

    return buffer;
  }

  async function unpackToCache(tool, base, cache) {
    if (!window.JSZip) {
      throw new Error('Library JSZip gagal dimuat. Periksa koneksi internet lalu muat ulang.');
    }

    setMessage('Mengunduh tools...');

    const buffer = await downloadZip(tool);

    setMessage('Membuka ZIP...');

    let zip;

    try {
      zip = await window.JSZip.loadAsync(buffer);
    } catch (error) {
      throw new Error('File ZIP rusak atau tidak bisa dibuka.');
    }

    const names = Object.keys(zip.files).filter((name) => !zip.files[name].dir);

    if (names.length > MAX_FILES) {
      throw new Error('Isi ZIP terlalu banyak (maksimal ' + MAX_FILES + ' file).');
    }

    const files = planEntries(names);

    // Bersihkan sisa ekstraksi sebelumnya yang mungkin tidak lengkap.
    const stale = await cache.keys();

    await Promise.all(
      stale.filter((req) => req.url.startsWith(base)).map((req) => cache.delete(req))
    );

    // index.html ditulis TERAKHIR: kalau ekstraksi terputus, tools
    // tidak dianggap siap dan akan diekstrak ulang.
    const ordered = files
      .filter((file) => file.rel !== 'index.html')
      .concat(files.filter((file) => file.rel === 'index.html'));

    for (let i = 0; i < ordered.length; i += 1) {
      const file = ordered[i];
      const blob = await zip.files[file.name].async('blob');

      await cache.put(
        base + encodePath(file.rel),
        new Response(blob, {
          headers: {
            'Content-Type': mimeFor(file.rel),
            'Content-Length': String(blob.size)
          }
        })
      );

      if (i % 10 === 0 || i === ordered.length - 1) {
        setMessage('Menyiapkan tools... ' + Math.round(((i + 1) / ordered.length) * 100) + '%');
      }
    }
  }

  async function pruneOldVersions(tool, base, scope, cache) {
    const prefix = new URL('__vx/' + tool.id + '-', scope).href;
    const keys = await cache.keys();

    await Promise.all(
      keys
        .filter((req) => req.url.startsWith(prefix) && !req.url.startsWith(base))
        .map((req) => cache.delete(req))
    );
  }

  /* ---------------- Fungsi utama ---------------- */

  async function runTool(tool) {
    if (running) return;

    if (!tool || !tool.zipPath || !tool.id) {
      alert('Tools ini belum punya file ZIP.');
      return;
    }

    running = true;

    const root = ensureModal();
    const frame = root.querySelector('#vxRunnerFrame');

    root.querySelector('#vxRunnerTitle').textContent = tool.name || 'Tools';
    root.classList.add('open');
    document.body.style.overflow = 'hidden';
    frame.src = 'about:blank';
    currentSrc = '';
    setMessage('Menyiapkan tools...');

    try {
      const registration = await ensureServiceWorker();
      const cache = await caches.open(CACHE);

      const version = String(tool.version || tool.zipPath.replace(/\W+/g, ''));
      const base = new URL('__vx/' + tool.id + '-' + version + '/', registration.scope).href;
      const indexUrl = base + 'index.html';

      if (!(await hasTool(cache, indexUrl))) {
        await unpackToCache(tool, base, cache);
      }

      await pruneOldVersions(tool, base, registration.scope, cache);

      currentSrc = indexUrl;

      frame.addEventListener(
        'load',
        () => {
          if (currentSrc) setMessage('');
        },
        { once: true }
      );

      frame.src = indexUrl;
    } catch (error) {
      console.error('[VEXORA] Runner:', error);
      setMessage(error?.message || 'Tools gagal dibuka.', true);
    } finally {
      running = false;
    }
  }

  window.vexoraRunTool = runTool;
})();
