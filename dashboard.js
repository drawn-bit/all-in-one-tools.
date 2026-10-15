(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const config = window.VEXORA_CONFIG;

  $("currentYear").textContent = new Date().getFullYear();

  // Ganti URL tool setelah source code tiap tool siap.
  const TOOLS = [
    {
      id: "general-1",
      name: "General Tool 1",
      description: "Tool umum VEXORA.",
      icon: "⌘",
      category: "general",
      access: "member",
      url: ""
    },
    {
      id: "general-2",
      name: "General Tool 2",
      description: "Tool umum berikutnya.",
      icon: "⚡",
      category: "general",
      access: "member",
      url: ""
    },
    {
      id: "member-1",
      name: "Member Tools",
      description: "Tool untuk pengguna Member.",
      icon: "▦",
      category: "member",
      access: "member",
      url: ""
    },
    {
      id: "vip-1",
      name: "VIP Tools",
      description: "Fitur eksklusif untuk akun VIP.",
      icon: "◇",
      category: "vip",
      access: "vip",
      url: ""
    },
    {
      id: "vip-2",
      name: "VIP Tools 2",
      description: "Tool khusus VIP dan Owner.",
      icon: "✧",
      category: "vip",
      access: "vip",
      url: ""
    }
  ];

  let supabaseClient = null;
  let currentRole = "member";
  let currentCategory = "all";
  let bannerPlaying = true;
  let bannerSound = false;

  // Supabase initialization
  if (
    config &&
    config.SUPABASE_URL &&
    config.SUPABASE_ANON_KEY &&
    window.supabase
  ) {
    supabaseClient = window.supabase.createClient(
      config.SUPABASE_URL,
      config.SUPABASE_ANON_KEY
    );
  }

  function showPage(name) {
    const allowedPages = [
      "menu", "tools", "profile", "settings", "updates", "owner"
    ];

    if (!allowedPages.includes(name)) name = "menu";

    // Panel Owner hanya bisa dibuka oleh sesi Owner yang sudah diperiksa.
    if (name === "owner" && currentRole !== "owner") {
      name = "menu";
    }

    document.querySelectorAll(".page").forEach((page) => {
      page.classList.toggle("active", page.id === "page-" + name);
    });

    document.querySelectorAll(".nav-btn").forEach((button) => {
      button.classList.toggle("active", button.dataset.page === name);
    });

    $("dropdownMenu").classList.remove("show");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  document.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", () => {
      showPage(button.dataset.page);
    });
  });

  $("menuBtn").addEventListener("click", (event) => {
    event.stopPropagation();
    $("dropdownMenu").classList.toggle("show");
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".menu-wrap")) {
      $("dropdownMenu").classList.remove("show");
    }
  });

  function canUseTool(tool) {
    if (tool.access !== "vip") return true;
    return currentRole === "vip" || currentRole === "owner";
  }

  function makeToolCard(tool) {
    const card = document.createElement("article");
    card.className = "tool-card";

    const icon = document.createElement("div");
    icon.className = "tool-icon";
    icon.textContent = tool.icon;

    const badge = document.createElement("span");
    badge.className =
      "pill" + (tool.access === "vip" ? " vip" : "");
    badge.textContent =
      tool.access === "vip" ? "VIP ACCESS" : "MEMBER ACCESS";

    const title = document.createElement("h3");
    title.textContent = tool.name;

    const description = document.createElement("p");
    description.textContent = tool.description;

    const button = document.createElement("button");
    button.className = "tool-open";

    const permitted = canUseTool(tool);
    button.disabled = !permitted || !tool.url;
    button.textContent = !permitted
      ? "🔒 Khusus VIP"
      : tool.url
      ? "Buka tool →"
      : "Segera hadir";

    button.addEventListener("click", () => {
      if (!canUseTool(tool)) {
        alert("Tool ini khusus akun VIP atau Owner.");
        return;
      }

      if (tool.url) {
        window.location.href = tool.url;
      }
    });

    card.append(icon, badge, title, description, button);
    return card;
  }

  function renderTools() {
    const grid = $("toolsGrid");
    const featured = $("featuredGrid");
    if (!grid || !featured) return;

    grid.replaceChildren();
    featured.replaceChildren();

    const search = ($("toolSearch").value || "")
      .trim().toLowerCase();

    const matches = TOOLS.filter((tool) => {
      const categoryMatch =
        currentCategory === "all" ||
        tool.category === currentCategory;

      const searchMatch =
        tool.name.toLowerCase().includes(search) ||
        tool.description.toLowerCase().includes(search);

      return categoryMatch && searchMatch;
    });

    matches.forEach((tool) => grid.appendChild(makeToolCard(tool)));

    TOOLS.slice(0, 4).forEach((tool) => {
      featured.appendChild(makeToolCard(tool));
    });

    $("emptyState").style.display =
      matches.length ? "none" : "block";

    $("sectionTitle").textContent =
      currentCategory === "all"
        ? "Daftar Tools"
        : "Tools " + currentCategory.toUpperCase();
  }

  document.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", () => {
      currentCategory = button.dataset.category;

      document.querySelectorAll("[data-category]").forEach((item) => {
        item.classList.toggle("active", item === button);
      });

      renderTools();
    });
  });

  $("toolSearch").addEventListener("input", renderTools);

  // Banner
  const video = $("vexoraBanner");

  function toggleSound() {
    bannerSound = !bannerSound;
    video.muted = !bannerSound;

    if (bannerSound) video.play().catch(() => {});

    $("soundBtn").textContent =
      bannerSound ? "🔊 Suara" : "🔇 Suara";

    $("settingsSound").textContent =
      bannerSound
        ? "🔊 Matikan suara"
        : "🔇 Aktifkan suara";
  }

  function togglePlayback() {
    bannerPlaying = !bannerPlaying;

    if (bannerPlaying) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }

    $("bannerPlay").textContent =
      bannerPlaying ? "Ⅱ Pause" : "▶ Play";

    $("settingsPlay").textContent =
      bannerPlaying ? "Ⅱ Pause banner" : "▶ Putar banner";
  }

  $("soundBtn").addEventListener("click", toggleSound);
  $("settingsSound").addEventListener("click", toggleSound);
  $("bannerPlay").addEventListener("click", togglePlayback);
  $("settingsPlay").addEventListener("click", togglePlayback);

  video.addEventListener("error", () => {
    video.style.display = "none";
  });

  // Informasi perangkat
  const ua = navigator.userAgent;

  $("deviceText").textContent =
    /Android/i.test(ua) ? "Android" :
    /iPhone|iPad/i.test(ua) ? "iOS" :
    /Windows/i.test(ua) ? "Windows" :
    /Macintosh/i.test(ua) ? "Mac" : "Browser";

  $("browserText").textContent =
    /Edg/i.test(ua) ? "Edge" :
    /Firefox/i.test(ua) ? "Firefox" :
    /Chrome/i.test(ua) ? "Chrome" :
    /Safari/i.test(ua) ? "Safari" : "Browser";

  if (navigator.getBattery) {
    navigator.getBattery().then((battery) => {
      const update = () => {
        $("batteryText").textContent =
          Math.round(battery.level * 100) + "%";
      };
      update();
      battery.addEventListener("levelchange", update);
    }).catch(() => {});
  }

  async function loadAccount() {
    if (!supabaseClient) {
      $("statusText").textContent = "Koneksi gagal";
      $("dashboardMessage").textContent =
        "Supabase belum terhubung. Periksa config.js.";
      return;
    }

    try {
      const { data: sessionData, error: sessionError } =
        await supabaseClient.auth.getSession();

      if (sessionError || !sessionData.session) {
        window.location.replace("index.html");
        return;
      }

      const { data, error } = await supabaseClient.auth.getUser();

      if (error || !data.user) {
        window.location.replace("index.html");
        return;
      }

      const user = data.user;
      const email = user.email || "Email tidak tersedia";
      const username =
        user.user_metadata?.username ||
        email.split("@")[0] ||
        "Pengguna";

      // Role berasal dari app_metadata yang ditetapkan admin/server.
      const role = user.app_metadata?.role;
      currentRole = ["member", "vip", "owner"].includes(role)
        ? role
        : "member";

      $("profileUsername").textContent = username;
      $("profileEmail").textContent = email;
      $("welcomeText").textContent = "Halo, " + username + "!";
      $("statusText").textContent = "Aktif";
      $("profileStatus").textContent = "Aktif";
      $("roleBadge").textContent = currentRole.toUpperCase();
      $("roleText").textContent = currentRole.toUpperCase();

      $("roleBadge").className =
        currentRole === "vip" || currentRole === "owner"
          ? "gold"
          : "cyan";

      $("ownerMenuItem").hidden = currentRole !== "owner";

      $("dashboardMessage").textContent =
        currentRole === "owner"
          ? "Akun Owner aktif. Panel Owner tersedia di menu titik tiga."
          : currentRole === "vip"
          ? "Akun VIP aktif. Lu dapat menggunakan tools Member dan VIP."
          : "Akun Member aktif. Upgrade ke VIP untuk mengakses tools VIP.";

      renderTools();
    } catch (error) {
      console.error("Gagal memuat akun:", error);
      $("statusText").textContent = "Gagal memuat";
      $("dashboardMessage").textContent =
        "Gagal memeriksa sesi. Periksa koneksi lalu muat ulang.";
    }
  }

  async function logout() {
    if (!supabaseClient) {
      window.location.replace("index.html");
      return;
    }

    const buttons = [$("logoutButton"), $("menuLogout")];
    buttons.forEach((button) => {
      if (button) button.disabled = true;
    });

    try {
      const { error } = await supabaseClient.auth.signOut();
      if (error) throw error;

      window.location.replace("index.html");
    } catch (error) {
      console.error("Logout gagal:", error);
      alert("Gagal keluar akun. Coba lagi.");
      buttons.forEach((button) => {
        if (button) button.disabled = false;
      });
    }
  }

  $("logoutButton").addEventListener("click", logout);
  $("menuLogout").addEventListener("click", logout);
  $("profileSettings").addEventListener("click", () => {
    showPage("settings");
  });

  renderTools();
  loadAccount();
})();
