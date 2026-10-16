
"use strict";

(() => {
  const $ = (id) => document.getElementById(id);

  const tools = [
    { name: "Kalkulator", desc: "Hitung angka dengan mudah.", icon: "＋", vip: false },
    { name: "Password Generator", desc: "Buat password acak secara lokal.", icon: "◇", vip: false },
    { name: "Morse Code", desc: "Konversi teks dan kode Morse.", icon: "⌁", vip: false },
    { name: "QR Code", desc: "Generator QR code.", icon: "▦", vip: false },
    { name: "Image Tools", desc: "Alat bantu pengolahan gambar.", icon: "▧", vip: false },
    { name: "TikTok Downloader", desc: "Download video TikTok.", icon: "♪", vip: true },
    { name: "Instagram Downloader", desc: "Alat untuk konten Instagram.", icon: "◎", vip: true },
    { name: "YouTube Tools", desc: "Utilitas video YouTube.", icon: "▶", vip: true },
    { name: "Spotify Tools", desc: "Informasi musik dan lagu.", icon: "♫", vip: true },
    { name: "BRAT Generator", desc: "Generator gambar gaya BRAT.", icon: "✦", vip: true },
    { name: "Quote Generator", desc: "Buat kutipan menarik.", icon: "❝", vip: true },
    { name: "AI Tools", desc: "Kumpulan alat berbasis AI.", icon: "✧", vip: true }
  ];

  let supabaseClient = null;
  let currentUser = null;
  let currentRole = "member";
  let initialized = false;

  function normalizeRole(role) {
    role = String(role || "").trim().toLowerCase();
    return ["owner", "vip"].includes(role) ? role : "member";
  }

  function labelRole() {
    if (currentRole === "owner") return "OWNER";
    if (currentRole === "vip") return "VIP";
    return "FREE";
  }

  function notice(message) {
    const box = $("settingsNotice");

    if (box) {
      box.textContent = message;
      box.classList.add("show");
    } else {
      alert(message);
    }
  }

  function setOwnerVisibility() {
    const ownerNav = $("ownerNav");
    const ownerPage = $("page-owner");

    // Tombol Panel Owner selalu terlihat.
    if (ownerNav) {
      ownerNav.hidden = false;
      ownerNav.style.display = "";
    }

    // Isi panel hanya dapat dibuka OWNER.
    if (ownerPage) {
      ownerPage.hidden = currentRole !== "owner";

      if (currentRole !== "owner") {
        ownerPage.classList.remove("active");
      }
    }
  }

  function openPage(name) {
    const validPages = [
      "menu", "tools", "profile", "settings", "updates", "owner"
    ];

    if (!validPages.includes(name)) name = "menu";

    // Pemeriksaan akses setiap kali halaman diminta.
    if (name === "owner" && currentRole !== "owner") {
      name = "menu";
      notice("Akses ditolak. Panel Owner hanya untuk OWNER.");
    }
if (name === "owner" && currentRole === "owner") {
  loadOwnerPanel();
}
    document.querySelectorAll(".page").forEach((page) => {
      page.classList.toggle("active", page.id === "page-" + name);
    });

    document.querySelectorAll(".nav[data-page]").forEach((link) => {
      link.classList.toggle("active", link.dataset.page === name);
    });

    const ownerPage = $("page-owner");
    if (ownerPage) {
      ownerPage.hidden = currentRole !== "owner";
    }

    $("dropdown")?.classList.remove("open");

    if (location.hash !== "#" + name) {
      history.replaceState(null, "", location.pathname + location.search + "#" + name);
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }
if (name === "owner" && currentRole === "owner") {
  loadOwnerPanel();
}
  function renderGrid(id, vipOnly, search = "") {
    const target = $(id);
    if (!target) return;

    target.replaceChildren();

    const filtered = tools.filter((tool) => {
      return tool.vip === vipOnly &&
        (tool.name + " " + tool.desc).toLowerCase().includes(search.toLowerCase());
    });

    filtered.forEach((tool) => {
      const unlocked = !tool.vip ||
        currentRole === "vip" ||
        currentRole === "owner";

      const card = document.createElement("article");
      card.className = "tool-card";

      const top = document.createElement("div");
      top.className = "tool-top";

      const icon = document.createElement("div");
      icon.className = "tool-icon";
      icon.textContent = tool.icon;

      const badge = document.createElement("span");
      badge.className = "pill " + (tool.vip ? "vip" : "free");
      badge.textContent = tool.vip ? "VIP" : "FREE";

      top.append(icon, badge);

      const title = document.createElement("h3");
      title.textContent = tool.name;

      const desc = document.createElement("p");
      desc.textContent = tool.desc;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "tool-open" + (!unlocked ? " locked" : "");
      button.textContent = unlocked ? "Buka Tools →" : "🔒 Khusus VIP";

      button.addEventListener("click", () => {
        if (!unlocked) {
          window.open(
            "https://wa.me/6289682380778?text=Halo%2C%20saya%20mau%20upgrade%20role%20ke%20VIP.",
            "_blank",
            "noopener"
          );
          return;
        }

        notice("Tools " + tool.name + " belum terhubung ke fungsi aslinya.");
      });

      card.append(top, title, desc, button);
      target.appendChild(card);
    });
  }

  function renderTools(search = "") {
    renderGrid("freeGrid", false, search);
    renderGrid("vipGrid", true, search);
    renderGrid("freeGrid2", false, search);
    renderGrid("vipGrid2", true, search);

    if ($("freeCount")) {
      $("freeCount").textContent = tools.filter((tool) => !tool.vip).length;
    }

    if ($("vipCount")) {
      $("vipCount").textContent = tools.filter((tool) => tool.vip).length;
    }
  }

  async function loadOwnerPanel() {
    const page = $("page-owner");
    if (!page || currentRole !== "owner") return;

    page.replaceChildren();

    const heading = document.createElement("h2");
    heading.textContent = "Panel Owner";
    page.appendChild(heading);

    const description = document.createElement("p");
    description.textContent =
      "Kelola akun VEXORA dan role Member/VIP.";
    page.appendChild(description);

    const status = document.createElement("p");
    status.textContent = "Memuat data...";
    page.appendChild(status);

    const statsBox = document.createElement("div");
    statsBox.className = "owner-stats";
    page.appendChild(statsBox);

    const search = document.createElement("input");
    search.type = "search";
    search.placeholder = "Cari email pengguna...";
    search.setAttribute("aria-label", "Cari email pengguna");
    page.appendChild(search);

    const table = document.createElement("div");
    table.className = "owner-users";
    page.appendChild(table);

    const moreButton = document.createElement("button");
    moreButton.type = "button";
    moreButton.textContent = "Muat pengguna berikutnya";
    moreButton.hidden = true;
    page.appendChild(moreButton);

    let users = [];
    let pageNumber = 1;
    let hasMore = false;
    let busy = false;

    async function callOwner(action, extra = {}) {
      const { data, error } = await supabaseClient.functions.invoke(
        "owner-admin",
        { body: { action, ...extra } }
      );

      if (error) {
        let detail = error.message || "Permintaan gagal.";
        try {
          const response = error.context;
          if (response && typeof response.json === "function") {
            const body = await response.json();
            if (body.error) detail = body.error;
          }
        } catch (_) {}
        throw new Error(detail);
      }

      if (!data || data.error) {
        throw new Error(data?.error || "Respons server tidak valid.");
      }

      return data;
    }

    function renderUsers() {
      table.replaceChildren();

      const query = search.value.trim().toLowerCase();
      const filtered = users.filter((u) =>
        (u.email || "").toLowerCase().includes(query)
      );

      if (!filtered.length) {
        const empty = document.createElement("p");
        empty.textContent = query
          ? "Pengguna tidak ditemukan."
          : "Belum ada data pengguna.";
        table.appendChild(empty);
      }

      filtered.forEach((user) => {
        const card = document.createElement("article");
        card.className = "owner-user-card";

        const email = document.createElement("p");
        email.textContent = user.email || "(tanpa email)";

        const roleText = document.createElement("p");
        roleText.textContent = "Role: " + user.role.toUpperCase();

        const select = document.createElement("select");
        select.setAttribute("aria-label", "Role baru");

        [
          { value: "member", label: "Member" },
          { value: "vip", label: "VIP" }
        ].forEach((optionData) => {
          const option = document.createElement("option");
          option.value = optionData.value;
          option.textContent = optionData.label;
          select.appendChild(option);
        });

        select.value = user.role === "vip" ? "vip" : "member";

        const save = document.createElement("button");
        save.type = "button";
        save.textContent = "Simpan Role";

        save.addEventListener("click", async () => {
          if (busy) return;

          if (!["member", "vip"].includes(select.value)) return;

          if (user.role === select.value) {
            notice("Role pengguna tidak berubah.");
            return;
          }

          if (!confirm(
            "Ubah role " + (user.email || "pengguna") +
            " menjadi " + select.value.toUpperCase() + "?"
          )) return;

          busy = true;
          save.disabled = true;
          status.textContent = "Menyimpan perubahan...";

          try {
            await callOwner("set_role", {
              userId: user.id,
              role: select.value
            });

            user.role = select.value;
            roleText.textContent = "Role: " + user.role.toUpperCase();
            notice("Role berhasil diperbarui.");
            status.textContent = "Perubahan berhasil disimpan.";
          } catch (error) {
            status.textContent = "Gagal mengubah role.";
            notice(error.message);
          } finally {
            busy = false;
            save.disabled = false;
          }
        });

        card.append(email, roleText, select, save);
        table.appendChild(card);
      });
    }

    async function loadStats() {
      try {
        const data = await callOwner("stats");
        statsBox.replaceChildren();

        [
          ["Total akun", data.total],
          ["Member", data.members],
          ["VIP", data.vips],
          ["Owner", data.owners]
        ].forEach(([label, value]) => {
          const item = document.createElement("div");
          item.className = "owner-stat-card";

          const title = document.createElement("p");
          title.textContent = label;

          const number = document.createElement("strong");
          number.textContent = String(value ?? 0);

          item.append(title, number);
          statsBox.appendChild(item);
        });
      } catch (error) {
        console.error("VEXORA owner stats:", error);
        status.textContent = "Statistik gagal dimuat: " + error.message;
      }
    }

    async function loadUsers(reset = false) {
      if (busy) return;
      busy = true;
      moreButton.disabled = true;
      status.textContent = "Memuat daftar pengguna...";

      try {
        if (reset) {
          pageNumber = 1;
          users = [];
        }

        const data = await callOwner("list_users", {
          page: pageNumber,
          perPage: 50
        });

        users = reset ? data.users : users.concat(data.users);
        hasMore = Boolean(data.has_more);
        moreButton.hidden = !hasMore;

        renderUsers();
        status.textContent = users.length + " akun berhasil dimuat.";
      } catch (error) {
        console.error("VEXORA owner users:", error);
        status.textContent = "Gagal memuat pengguna: " + error.message;
      } finally {
        busy = false;
        moreButton.disabled = false;
      }
    }

    search.addEventListener("input", renderUsers);

    moreButton.addEventListener("click", async () => {
      if (!hasMore || busy) return;
      pageNumber++;
      await loadUsers(false);
    });

    const reloadButton = document.createElement("button");
    reloadButton.type = "button";
    reloadButton.textContent = "Refresh Panel";
    reloadButton.addEventListener("click", async () => {
      await loadUsers(true);
      await loadStats();
    });

    page.insertBefore(reloadButton, statsBox);

    await Promise.all([loadUsers(true), loadStats()]);
                                               }
      
  function bindInterface() {
    if (initialized) return;
    initialized = true;

    // Navigasi utama, termasuk tombol Panel Owner.
    document.querySelectorAll(".nav[data-page]").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        openPage(link.dataset.page);
      });
    });

    // Dropdown menu.
    $("dotsBtn")?.addEventListener("click", (event) => {
      event.stopPropagation();
      $("dropdown")?.classList.toggle("open");
    });

    document.querySelectorAll("[data-go]").forEach((button) => {
      button.addEventListener("click", () => {
        openPage(button.dataset.go);
      });
    });

    document.addEventListener("click", (event) => {
      if (!event.target.closest(".menu-wrap")) {
        $("dropdown")?.classList.remove("open");
      }
    });

    // Pencarian tools.
    $("toolSearch")?.addEventListener("input", (event) => {
      renderTools(event.target.value.trim());
    });

    // Refresh.
    $("refreshBtn")?.addEventListener("click", () => {
      renderTools($("toolSearch")?.value.trim() || "");
      notice("Daftar tools berhasil diperbarui.");
    });

    // Video banner.
    const video = $("bannerVideo");

    $("playVideo")?.addEventListener("click", async () => {
      if (!video) {
        notice("Elemen video banner tidak ditemukan.");
        return;
      }

      if (video.paused) {
        try {
          await video.play();
          $("playVideo").textContent = "Ⅱ Pause";
        } catch (error) {
          notice("Video tidak dapat diputar. Periksa file banner.mp4.");
        }
      } else {
        video.pause();
        $("playVideo").textContent = "▶ Play";
      }
    });

    $("muteVideo")?.addEventListener("click", () => {
      if (!video) return;

      video.muted = !video.muted;
      $("muteVideo").textContent = video.muted ? "♩ Unmute" : "♩ Mute";
    });

    // Logout.
    async function logout() {
      if (!supabaseClient) {
        alert("Supabase belum siap. Coba lagi sebentar.");
        return;
      }

      if (!confirm("Yakin ingin logout dari VEXORA?")) return;

      const { error } = await supabaseClient.auth.signOut();

      if (error) {
        alert("Logout gagal: " + error.message);
        return;
      }

      window.location.replace("index.html");
    }

    $("logoutBtn")?.addEventListener("click", (event) => {
      event.preventDefault();
      logout();
    });

    $("dropdownLogout")?.addEventListener("click", logout);
  }

  async function initialize() {
    // Event tombol dipasang sebelum menunggu koneksi Supabase.
    bindInterface();

    if (!window.VEXORA_CONFIG || !window.supabase) {
      throw new Error(
        "Supabase atau config.js tidak ditemukan. Periksa urutan script HTML."
      );
    }

    const config = window.VEXORA_CONFIG;

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

    currentUser = data.session.user;
    currentRole = normalizeRole(currentUser.app_metadata?.role);

    setOwnerVisibility();

    if ($("year")) {
      $("year").textContent = new Date().getFullYear();
    }

    if ($("dateText")) {
      $("dateText").textContent = new Date().toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      });
    }

    if ($("greetingText")) {
      $("greetingText").textContent =
        "Welcome, " + (currentUser.email?.split("@")[0] || "User") + "!";
    }

    if ($("profileEmail")) {
      $("profileEmail").textContent = currentUser.email || "-";
    }

    if ($("profileRole")) {
      $("profileRole").textContent = labelRole();
    }

    if ($("roleValue")) {
      $("roleValue").textContent = labelRole();
    }

    renderTools();

    // Tentukan halaman awal berdasarkan hash URL.
    const hashPage = window.location.hash.replace(/^#/, "");
    const allowedPages = [
      "menu", "tools", "profile", "settings", "updates", "owner"
    ];

    if (allowedPages.includes(hashPage)) {
      openPage(hashPage);
    } else {
      openPage("menu");
    }

    // Perbarui tampilan jika sesi berubah.
    supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        window.location.replace("index.html");
      }
    });
  }

  initialize().catch((error) => {
    console.error("VEXORA dashboard error:", error);
    alert(
      "Dashboard gagal dimuat: " + error.message +
      ". Periksa config.js, koneksi internet, dan console browser."
    );
  });
})();
     
