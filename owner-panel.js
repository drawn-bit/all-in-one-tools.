/* =========================================================
   VEXORA OWNER PANEL — Manajemen Tools (Firebase)
   Tambah tools = upload ZIP + isi nama + upload icon.
   Data  : Firestore  koleksi "vexora_tools"
   File  : Firebase Storage  tools/<id>/app-<versi>.zip dan icon-<versi>.png
   ========================================================= */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);

  const COLLECTION = 'vexora_tools';
  const PAGE_SIZE = 5;
  const ICON_SIZE = 192;
  const MAX_ICON_SOURCE_BYTES = 10 * 1024 * 1024;

  let tools = [];
  let page = 1;
  let busy = false;
  let editingId = '';

  let zipFile = null;     // ZIP baru yang sudah lolos pengecekan
  let iconBlob = null;    // icon baru (PNG 192x192) yang sudah diproses
  let iconPreviewUrl = '';

  const escapeHTML = (value) =>
    String(value ?? '').replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[ch]);

  function showStatus(message, isError = false) {
    // Pesan juga ditampilkan tepat di bawah tombol Simpan supaya langsung terlihat.
    ['ownerToolsStatus', 'ownerToolFormStatus'].forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.textContent = message;
      el.style.color = isError ? '#ff778b' : '';
    });

    if (isError) {
      $('ownerToolFormStatus')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }

  function formatSize(bytes) {
    const n = Number(bytes) || 0;
    if (n >= 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + ' MB';
    if (n >= 1024) return Math.round(n / 1024) + ' KB';
    return n + ' B';
  }

  function services() {
    const db = window.vexoraDb;
    const storage = window.vexoraStorage;

    if (!db) {
      throw new Error('Firestore belum siap. Periksa config.js dan script Firebase.');
    }

    if (!storage) {
      throw new Error('Firebase Storage belum siap. Periksa storageBucket di config.js.');
    }

    return { db, storage };
  }

  function explain(error) {
    const code = String(error?.code || '');

    console.error('[VEXORA] Owner panel:', error);

    if (code === 'permission-denied' || code === 'storage/unauthorized') {
      return 'Akses ditolak. Pastikan kamu login sebagai email owner, email itu sudah ditulis di config.js, firestore.rules, dan storage.rules, lalu Rules sudah dipublikasikan.';
    }

    if (code === 'storage/retry-limit-exceeded' || code === 'unavailable') {
      return 'Koneksi terputus saat mengirim data. Coba lagi.';
    }

    if (code === 'storage/quota-exceeded') {
      return 'Kuota Firebase Storage habis.';
    }

    if (code === 'storage/canceled') {
      return 'Upload dibatalkan.';
    }

    if (code === 'storage/bucket-not-found' || code === 'storage/project-not-found') {
      return 'Bucket Storage tidak ditemukan. Periksa storageBucket di config.js.';
    }

    if (code === 'failed-precondition') {
      return 'Firestore belum dibuat. Buka Firebase Console → Firestore Database → Create database.';
    }

    return error?.message || 'Terjadi kesalahan. Periksa Console.';
  }

  /* ---------------- PAGINATION ---------------- */

  function renderPager() {
    const wrap = $('ownerToolsTable')?.closest('.owner-table-wrap');
    if (!wrap) return;

    let pager = $('ownerToolsPager');

    if (!pager) {
      pager = document.createElement('div');
      pager.id = 'ownerToolsPager';
      pager.className = 'owner-inline-actions';
      wrap.insertAdjacentElement('afterend', pager);
    }

    const totalPages = Math.max(1, Math.ceil(tools.length / PAGE_SIZE));

    pager.innerHTML = '';
    pager.hidden = tools.length <= PAGE_SIZE;

    if (pager.hidden) return;

    const prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'tool-open';
    prev.textContent = '‹ Sebelumnya';
    prev.disabled = page <= 1;
    prev.addEventListener('click', () => { page -= 1; renderTools(); });

    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'tool-open';
    next.textContent = 'Berikutnya ›';
    next.disabled = page >= totalPages;
    next.addEventListener('click', () => { page += 1; renderTools(); });

    const info = document.createElement('span');
    info.textContent = `Halaman ${page} dari ${totalPages}`;

    pager.append(prev, info, next);
  }

  /* ---------------- DAFTAR TOOLS ---------------- */

  function renderTools() {
    const tbody = $('ownerToolsTable');
    if (!tbody) return;

    const totalPages = Math.max(1, Math.ceil(tools.length / PAGE_SIZE));
    page = Math.min(Math.max(1, page), totalPages);

    const items = tools.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    if (!items.length) {
      tbody.innerHTML = '<tr><td colspan="3">Belum ada tools.</td></tr>';
    } else {
      tbody.innerHTML = items.map((tool) => {
        const icon = /^https:\/\//i.test(tool.iconUrl || '')
          ? `<img src="${escapeHTML(tool.iconUrl)}" alt="" width="28" height="28" style="border-radius:8px;object-fit:cover;vertical-align:middle;margin-right:8px">`
          : '';

        const size = tool.zipSize ? ` <small style="color:#91a2bd">(${formatSize(tool.zipSize)})</small>` : '';

        return `
          <tr>
            <td>${icon}${escapeHTML(tool.name || '(tanpa nama)')}${size}</td>
            <td>${escapeHTML(String(tool.category || '-').toUpperCase())}</td>
            <td>
              <button type="button" data-tool-action="edit" data-id="${escapeHTML(tool.id)}">Edit</button>
              <button type="button" data-tool-action="delete" data-id="${escapeHTML(tool.id)}">Hapus</button>
            </td>
          </tr>`;
      }).join('');
    }

    renderPager();

    const count = $('ownerToolsCount');
    if (count) count.textContent = String(tools.length);
  }

  async function loadTools() {
    showStatus('Memuat tools...');

    try {
      const { db } = services();

      const snapshot = await db
        .collection(COLLECTION)
        .orderBy('createdAt', 'desc')
        .get();

      tools = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      renderTools();

      showStatus(`${tools.length} tools berhasil dimuat.`);
    } catch (error) {
      showStatus(explain(error), true);
    }
  }

  function refreshDashboard() {
    try {
      window.vexoraRefreshTools?.();
    } catch (error) {
      console.warn('[VEXORA] Refresh dashboard:', error);
    }
  }

  /* ---------------- INPUT ZIP ---------------- */

  function setZipInfo(message, isError = false) {
    const el = $('ownerToolZipInfo');
    if (!el) return;
    el.textContent = message;
    el.style.color = isError ? '#ff778b' : '';
  }

  async function onZipChange() {
    const input = $('ownerToolZip');
    const file = input?.files?.[0];

    zipFile = null;
    setZipInfo('');

    if (!file) return;

    const helpers = window.vexoraZipHelpers;

    if (!helpers || !window.JSZip) {
      setZipInfo('Library ZIP belum termuat. Periksa koneksi internet lalu muat ulang halaman.', true);
      input.value = '';
      return;
    }

    if (!/\.zip$/i.test(file.name)) {
      setZipInfo('File harus berformat .zip', true);
      input.value = '';
      return;
    }

    if (file.size > helpers.maxZipBytes) {
      setZipInfo(`ZIP terlalu besar (${formatSize(file.size)}). Maksimal ${formatSize(helpers.maxZipBytes)}.`, true);
      input.value = '';
      return;
    }

    setZipInfo('Memeriksa isi ZIP...');

    try {
      const zip = await window.JSZip.loadAsync(file);
      const names = Object.keys(zip.files).filter((name) => !zip.files[name].dir);

      if (names.length > helpers.maxFiles) {
        throw new Error(`Isi ZIP terlalu banyak (maksimal ${helpers.maxFiles} file).`);
      }

      const plan = helpers.planEntries(names);

      zipFile = file;
      setZipInfo(`ZIP OK: ${plan.length} file, index.html ditemukan (${formatSize(file.size)}).`);
    } catch (error) {
      console.error('[VEXORA] Cek ZIP:', error);

      setZipInfo(
        error?.code === 'NO_INDEX'
          ? error.message + ' Pastikan tools-mu punya index.html.'
          : error?.message?.startsWith('Isi ZIP')
            ? error.message
            : 'File ZIP rusak atau tidak bisa dibuka.',
        true
      );

      input.value = '';
    }
  }

  /* ---------------- INPUT ICON ---------------- */

  function setIconPreview(url) {
    const img = $('ownerToolIconPreview');
    if (!img) return;

    if (iconPreviewUrl && iconPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(iconPreviewUrl);
    }

    iconPreviewUrl = url || '';

    if (url) {
      img.src = url;
      img.hidden = false;
    } else {
      img.removeAttribute('src');
      img.hidden = true;
    }
  }

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Gambar tidak bisa dibaca.'));
      };

      img.src = url;
    });
  }

  // Potong tengah (cover) lalu perkecil jadi PNG 192x192.
  async function makeIcon(file) {
    const img = await loadImage(file);

    const side = Math.min(img.naturalWidth, img.naturalHeight);

    if (!side) throw new Error('Gambar tidak valid.');

    const sx = (img.naturalWidth - side) / 2;
    const sy = (img.naturalHeight - side) / 2;

    const canvas = document.createElement('canvas');
    canvas.width = ICON_SIZE;
    canvas.height = ICON_SIZE;

    canvas.getContext('2d').drawImage(img, sx, sy, side, side, 0, 0, ICON_SIZE, ICON_SIZE);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));

    if (!blob) throw new Error('Gagal memproses gambar.');

    return blob;
  }

  async function onIconChange() {
    const input = $('ownerToolIcon');
    const file = input?.files?.[0];

    iconBlob = null;

    if (!file) {
      setIconPreview(editingId ? tools.find((t) => t.id === editingId)?.iconUrl || '' : '');
      return;
    }

    if (!/^image\//i.test(file.type)) {
      showStatus('Icon harus berupa gambar (PNG, JPG, WEBP, dll).', true);
      input.value = '';
      return;
    }

    if (file.size > MAX_ICON_SOURCE_BYTES) {
      showStatus('Gambar icon terlalu besar (maksimal 10 MB).', true);
      input.value = '';
      return;
    }

    try {
      iconBlob = await makeIcon(file);
      setIconPreview(URL.createObjectURL(iconBlob));
      showStatus('Icon siap.');
    } catch (error) {
      showStatus(error.message || 'Gambar tidak bisa dipakai sebagai icon.', true);
      input.value = '';
    }
  }

  /* ---------------- FORM ---------------- */

  function resetForm() {
    $('ownerToolForm')?.reset();

    if ($('ownerToolId')) $('ownerToolId').value = '';

    editingId = '';
    zipFile = null;
    iconBlob = null;

    setZipInfo('');
    setIconPreview('');

    const submit = $('ownerToolForm')?.querySelector('[type="submit"]');
    if (submit) submit.textContent = 'Simpan Tools';
  }

  function setBusy(value) {
    busy = value;

    const form = $('ownerToolForm');

    form?.querySelectorAll('button, input, select, textarea').forEach((el) => {
      el.disabled = value;
    });
  }

  function upload(storage, path, blob, contentType, label) {
    return new Promise((resolve, reject) => {
      // Jangan retry sampai 10 menit kalau koneksi/bucket bermasalah.
      try {
        storage.setMaxUploadRetryTime(20000);
        storage.setMaxOperationRetryTime(20000);
      } catch (error) {
        /* abaikan */
      }

      const task = storage.ref(path).put(blob, { contentType });
      let lastBytes = 0;
      let lastMove = Date.now();

      // Kalau 25 detik tidak ada kemajuan sama sekali, batalkan dan beri tahu penyebabnya.
      const watchdog = setInterval(() => {
        if (Date.now() - lastMove > 25000) {
          clearInterval(watchdog);
          task.cancel();
          const err = new Error(
            'Upload macet di ' + (lastBytes ? 'tengah jalan' : '0%') +
            '. Periksa: Storage sudah dibuat di Firebase, storageBucket di config.js benar, dan koneksi internet stabil.'
          );
          err.code = 'vexora/upload-stalled';
          reject(err);
        }
      }, 3000);

      task.on(
        'state_changed',
        (snap) => {
          if (snap.bytesTransferred !== lastBytes) {
            lastBytes = snap.bytesTransferred;
            lastMove = Date.now();
          }

          const pct = snap.totalBytes
            ? Math.round((snap.bytesTransferred / snap.totalBytes) * 100)
            : 0;

          showStatus(`Mengunggah ${label}... ${pct}%`);
        },
        (error) => {
          clearInterval(watchdog);
          reject(error);
        },
        () => {
          clearInterval(watchdog);
          resolve();
        }
      );
    });
  }

  async function removeFile(storage, path) {
    if (!path) return;

    try {
      await storage.ref(path).delete();
    } catch (error) {
      if (error?.code !== 'storage/object-not-found') {
        console.warn('[VEXORA] Hapus file Storage:', path, error);
      }
    }
  }

  async function saveTool(event) {
    event.preventDefault();

    if (busy) return;

    const name = $('ownerToolName')?.value.trim();
    const category = $('ownerToolCategory')?.value === 'vip' ? 'vip' : 'free';
    const description = $('ownerToolDesc')?.value.trim() || '';

    const editing = Boolean(editingId);
    const current = editing ? tools.find((t) => t.id === editingId) : null;

    if (editing && !current) {
      showStatus('Tools yang diedit tidak ditemukan. Muat ulang daftar.', true);
      return;
    }

    if (!name) {
      showStatus('Nama tools wajib diisi.', true);
      return;
    }

    if (name.length > 60) {
      showStatus('Nama tools maksimal 60 karakter.', true);
      return;
    }

    if (description.length > 300) {
      showStatus('Deskripsi maksimal 300 karakter.', true);
      return;
    }

    if (!editing && !zipFile) {
      showStatus('Pilih file ZIP tools terlebih dahulu.', true);
      return;
    }

    if (!editing && !iconBlob) {
      showStatus('Pilih gambar icon terlebih dahulu.', true);
      return;
    }

    let db;
    let storage;

    try {
      ({ db, storage } = services());
    } catch (error) {
      showStatus(error.message, true);
      return;
    }

    setBusy(true);

    const id = editing ? editingId : db.collection(COLLECTION).doc().id;
    const version = Date.now();
    const uploaded = [];

    try {
      const data = {
        name,
        category,
        description,
        type: 'zip',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        ownerEmail: window.vexoraAuth?.currentUser?.email || ''
      };

      if (zipFile) {
        const zipPath = `tools/${id}/app-${version}.zip`;

        await upload(storage, zipPath, zipFile, 'application/zip', 'ZIP');
        uploaded.push(zipPath);

        data.zipPath = zipPath;
        data.zipSize = zipFile.size;
        data.version = version;
      }

      if (iconBlob) {
        const iconPath = `tools/${id}/icon-${version}.png`;

        await upload(storage, iconPath, iconBlob, 'image/png', 'icon');
        uploaded.push(iconPath);

        data.iconPath = iconPath;
        data.iconUrl = await storage.ref(iconPath).getDownloadURL();
      }

      showStatus('Menyimpan data tools...');

      if (editing) {
        await db.collection(COLLECTION).doc(id).update(data);
      } else {
        data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection(COLLECTION).doc(id).set(data);
      }

      // File lama baru dihapus setelah data baru tersimpan.
      if (editing) {
        if (zipFile) await removeFile(storage, current.zipPath);
        if (iconBlob) await removeFile(storage, current.iconPath);
      }

      resetForm();
      await loadTools();
      refreshDashboard();
      showStatus(editing ? 'Tools berhasil diperbarui.' : 'Tools berhasil ditambahkan.');
    } catch (error) {
      // Batalkan file yang sudah terlanjur terunggah.
      if (storage) {
        await Promise.all(uploaded.map((path) => removeFile(storage, path)));
      }

      showStatus(explain(error), true);
    } finally {
      setBusy(false);
    }
  }

  function editTool(id) {
    const tool = tools.find((item) => String(item.id) === String(id));
    if (!tool) return;

    resetForm();

    editingId = tool.id;

    $('ownerToolId').value = tool.id;
    $('ownerToolName').value = tool.name || '';
    $('ownerToolCategory').value = tool.category === 'vip' ? 'vip' : 'free';
    $('ownerToolDesc').value = tool.description || '';

    setIconPreview(/^https:\/\//i.test(tool.iconUrl || '') ? tool.iconUrl : '');

    setZipInfo(
      tool.zipSize
        ? `ZIP saat ini: ${formatSize(tool.zipSize)}. Kosongkan jika tidak ingin mengganti.`
        : 'Kosongkan jika tidak ingin mengganti ZIP.'
    );

    const submit = $('ownerToolForm')?.querySelector('[type="submit"]');
    if (submit) submit.textContent = 'Perbarui Tools';

    $('ownerToolForm')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async function deleteTool(id) {
    if (busy) return;

    const tool = tools.find((item) => String(item.id) === String(id));
    if (!tool) return;

    if (!confirm(`Hapus tools "${tool.name}"? File ZIP dan icon ikut terhapus.`)) return;

    let db;
    let storage;

    try {
      ({ db, storage } = services());
    } catch (error) {
      showStatus(error.message, true);
      return;
    }

    setBusy(true);

    try {
      showStatus('Menghapus tools...');

      await db.collection(COLLECTION).doc(tool.id).delete();

      await removeFile(storage, tool.zipPath);
      await removeFile(storage, tool.iconPath);

      if (editingId === tool.id) resetForm();

      await loadTools();
      refreshDashboard();
      showStatus('Tools berhasil dihapus.');
    } catch (error) {
      showStatus(explain(error), true);
    } finally {
      setBusy(false);
    }
  }

  /* ---------------- EVENT ---------------- */

  function bindEvents() {
    $('ownerToolForm')?.addEventListener('submit', saveTool);
    $('ownerToolCancel')?.addEventListener('click', () => {
      if (!busy) resetForm();
    });

    $('ownerToolZip')?.addEventListener('change', onZipChange);
    $('ownerToolIcon')?.addEventListener('change', onIconChange);

    $('ownerToolsTable')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-tool-action]');
      if (!button) return;

      if (button.dataset.toolAction === 'edit') editTool(button.dataset.id);
      if (button.dataset.toolAction === 'delete') deleteTool(button.dataset.id);
    });
  }

  async function init() {
    bindEvents();

    // Hanya owner yang memuat daftar (Rules juga menolak selain owner untuk menulis).
    const user = await (window.vexoraWaitForUser?.() || Promise.resolve(null));
    const adapted = user ? await window.vexoraAdaptUser(user) : null;

    if (adapted?.app_metadata?.role !== 'owner') return;

    await loadTools();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
