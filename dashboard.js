(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const config = window.VEXORA_CONFIG;
  let supabaseClient = null;
  let currentUser = null;
  let currentRole = "member";

  const tools = [
    { name:"TikTok Downloader", desc:"Download video, foto & audio", icon:"♪", vip:true, category:"Media" },
    { name:"Instagram Downloader", desc:"Download foto & video", icon:"◎", vip:true, category:"Media" },
    { name:"YouTube Tools", desc:"Info video & utilitas", icon:"▶", vip:true, category:"Media" },
    { name:"Spotify Tools", desc:"Cari lagu & info musik", icon:"♫", vip:true, category:"Musik" },
    { name:"Text to Image AI", desc:"Ubah ide menjadi gambar", icon:"▧", vip:true, category:"AI" },
    { name:"Calculator", desc:"Kalkulator praktis", icon:"▦", vip:false, category:"Utilitas" },
    { name:"Password Generator", desc:"Buat password secara lokal", icon:"◇", vip:false, category:"Utilitas" },
    { name:"Morse Code", desc:"Konversi teks dan kode Morse", icon:"⌁", vip:false, category:"Utilitas" },
    { name:"Image Tools", desc:"Alat bantu pengolahan gambar", icon:"▧", vip:false, category:"Gambar" },
    { name:"QR Code", desc:"Generator kode QR", icon:"▦", vip:false, category:"Utilitas" },
    { name:"BRAT Generator", desc:"Buat gambar gaya BRAT", icon:"✦", vip:true, category:"Gambar" },
    { name:"Quote Generator", desc:"Buat kutipan menarik", icon:"❝", vip:true, category:"Kreatif" },
    { name:"Advanced Tools", desc:"Kumpulan utilitas lanjutan", icon:"⚒", vip:true, category:"Utilitas" },
    { name:"Tools Premium", desc:"Koleksi tools premium", icon:"♛", vip:true, category:"Premium" }
  ];

  function normalizeRole(value) {
    const role = String(value || "member").toLowerCase();
    return ["owner", "vip", "member"].includes(role) ? role : "member";
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&":"&amp;", "<":"&lt;", ">":"&gt;",
      '"':"&quot;", "'":"&#39;"
    })[char]);
  }

  function toolCard(tool) {
    const locked = tool.vip && !["vip", "owner"].includes(currentRole);
    return `
      <article class="tool-card" data-tool="${escapeHTML(tool.name.toLowerCase())}">
        <div class="tool-top">
          <div class="tool-icon">${tool.icon}</div>
          ${tool.vip ? '<span class="vip-tag">VIP</span>' : '<span class="vip-tag" style="color:#62e5ff;border-color:#12618a">FREE</span>'}
        </div>
        <h3>${escapeHTML(tool.name)}</h3>
        <p>${escapeHTML(tool.desc)}</p>
        <button class="primary-btn open-tool"
          data-name="${escapeHTML(tool.name)}"
          data-locked="${locked}">
          ${locked ? "Upgrade VIP →" : "Buka Tool →"}
        </button>
      </article>`;
  }

  function miniTool(tool) {
    return `<button class="mini-tool open-tool"
      data-name="${escapeHTML(tool.name)}"
      data-locked="${tool.vip && !["vip","owner"].includes(currentRole)}">
      <span>${tool.icon}</span>${escapeHTML(tool.name)}
    </button>`;
  }

  function renderTools() {
    const visible = tools.filter(tool =>
      !tool.vip || ["vip", "owner"].includes(currentRole)
    );
    $("#featuredGrid").innerHTML = tools.slice(0, 5).map(toolCard).join("");
    $("#allToolsGrid").innerHTML = tools.map(toolCard).join("");
    $("#memberMini").innerHTML = tools.filter(t => !t.vip).slice(0, 6).map(miniTool).join("");
    $("#vipMini").innerHTML = tools.filter(t => t.vip).slice(0, 6).map(miniTool).join("");
    $("#toolCount").textContent = `${visible.length} tools tersedia untuk role kamu`;
  }

  function showPage(page) {
    if (page === "owner" && currentRole !== "owner") {
      alert("Halaman ini hanya tersedia untuk Owner.");
      return;
    }

    $$(".page").forEach(el => el.classList.toggle("active", el.id === `page-${page}`));
    $$("[data-page]").forEach(el => el.classList.toggle("active", el.dataset.page === page));

    if (page === "owner") {
      $("#ownerStatus").textContent =
        "Login sebagai Owner terdeteksi. Operasi administrasi belum dihubungkan ke backend.";
    }

    window.scrollTo({ top:0, behavior: $("#reduceMotion")?.checked ? "auto" : "smooth" });
  }

  function setupNavigation() {
    $$("[data-page]").forEach(button => {
      button.addEventListener("click", () => showPage(button.dataset.page));
    });
    $$("[data-goto]").forEach(button => {
      button.addEventListener("click", () => showPage(button.dataset.goto));
    });
    $("#noticeBtn")?.addEventListener("click", () => showPage("updates"));
  }

  function setupSearch() {
    $("#searchInput")?.addEventListener("input", event => {
      const query = event.target.value.trim().toLowerCase();
      showPage("tools");
      $$("#allToolsGrid .tool-card").forEach(card => {
        card.style.display = card.dataset.tool.includes(query) ? "" : "none";
      });
    });
  }

  function setupToolButtons() {
    document.addEventListener("click", event => {
      const button = event.target.closest(".open-tool");
      if (!button) return;

      const name = button.dataset.name;
      const tool = tools.find(item => item.name === name);
      if (!tool) return;

      if (tool.vip && !["vip", "owner"].includes(currentRole)) {
        const go = confirm(`${name} memerlukan role VIP. Mau menghubungi admin untuk upgrade?`);
        if (go) {
          window.open(
            "https://wa.me/6289682380778?text=Halo%2C%20saya%20mau%20upgrade%20role%20ke%20VIP.",
            "_blank",
            "noopener"
          );
        }
        return;
      }

      // Ganti dengan URL tool yang benar saat halaman tool sudah tersedia.
      alert(`${name}\n\nTampilan dashboard sudah siap. Halaman tool ini perlu dihubungkan ke fitur aslinya.`);
    });
  }

  function setupBanner() {
    let playing = false;
    $("#bannerPlay")?.addEventListener("click", () => {
      playing = !playing;
      $("#bannerPlay").textContent = playing ? "Ⅱ" : "▶";
      alert("Banner VEXORA merupakan tampilan visual. Belum ada video yang diputar.");
      playing = false;
      $("#bannerPlay").textContent = "▶";
    });

    $("#soundBtn")?.addEventListener("click", () => {
      alert("Belum ada audio yang dihubungkan ke banner.");
    });
  }

  function setAccount(user) {
    currentUser = user;
    // Role diambil dari app_metadata, bukan user_metadata yang bisa diubah pengguna.
    currentRole = normalizeRole(user.app_metadata?.role);

    const email = user.email || "Akun VEXORA";
    const displayName = email.includes("@") ? email.split("@")[0] : email;
    const prettyRole = currentRole.toUpperCase();

    $("#topName").textContent = currentRole === "owner" ? "Owner VEXORA" : displayName;
    $("#topRole").textContent = prettyRole;
    $("#welcomeName").textContent = currentRole === "owner" ? "Owner VEXORA!" : `${displayName}!`;
    $("#welcomeDesc").textContent = currentRole === "owner"
      ? "Nikmati semua fitur dan tools premium yang tersedia untuk kamu."
      : currentRole === "vip"
        ? "Akun VIP aktif. Nikmati tools member dan fitur VIP."
        : "Nikmati fitur dan tools yang tersedia untuk akun kamu.";

    $("#statRole").textContent = prettyRole;
    $("#profileName").textContent = displayName;
    $("#profileEmail").textContent = email;
    $("#profileRole").textContent = prettyRole;
    $("#ownerNav").hidden = currentRole !== "owner";

    const ua = navigator.userAgent;
    $("#deviceName").textContent = /Android/i.test(ua) ? "Android"
      : /iPhone|iPad/i.test(ua) ? "iOS"
      : /Windows/i.test(ua) ? "Windows"
      : /Mac/i.test(ua) ? "Mac"
      : "Browser";

    renderTools();
  }

  async function logout() {
    if (!supabaseClient) {
      window.location.href = "index.html";
      return;
    }
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      alert("Gagal keluar: " + error.message);
      return;
    }
    window.location.replace("index.html");
  }

  async function init() {
    setupNavigation();
    setupSearch();
    setupToolButtons();
    setupBanner();

    $("#logoutBtn")?.addEventListener("click", logout);
    $("#reduceMotion")?.addEventListener("change", event => {
      document.documentElement.style.scrollBehavior = event.target.checked ? "auto" : "smooth";
    });

    if (!config?.SUPABASE_URL || !config?.SUPABASE_ANON_KEY ||
        !window.supabase?.createClient) {
      $("#topName").textContent = "Konfigurasi belum tersedia";
      $("#welcomeName").textContent = "VEXORA";
      $("#welcomeDesc").textContent = "Periksa config.js dan koneksi Supabase.";
      renderTools();
      return;
    }

    try {
      supabaseClient = window.supabase.createClient(
        config.SUPABASE_URL,
        config.SUPABASE_ANON_KEY
      );

      const { data, error } = await supabaseClient.auth.getSession();
      if (error) throw error;

      if (!data.session) {
        window.location.replace("index.html");
        return;
      }

      setAccount(data.session.user);

      // Jika token diperbarui atau sesi berubah, perbarui tampilan role.
      supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_OUT" || !session) {
          window.location.replace("index.html");
          return;
        }
        setAccount(session.user);
      });
    } catch (error) {
      console.error("VEXORA dashboard:", error);
      $("#welcomeName").textContent = "Gagal memuat akun";
      $("#welcomeDesc").textContent = "Periksa koneksi internet dan konfigurasi Supabase.";
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
