"use strict";

(() => {
const $ = (id) => document.getElementById(id);

const tools = [
{name:"Kalkulator",desc:"Hitung angka dengan mudah.",icon:"＋",vip:false},
{name:"Password Generator",desc:"Buat password acak secara lokal.",icon:"◇",vip:false},
{name:"Morse Code",desc:"Konversi teks dan kode Morse.",icon:"⌁",vip:false},
{name:"QR Code",desc:"Generator QR code.",icon:"▦",vip:false},
{name:"Image Tools",desc:"Alat bantu pengolahan gambar.",icon:"▧",vip:false},
{name:"TikTok Downloader",desc:"Download video TikTok.",icon:"♪",vip:true},
{name:"Instagram Downloader",desc:"Alat untuk konten Instagram.",icon:"◎",vip:true},
{name:"YouTube Tools",desc:"Utilitas video YouTube.",icon:"▶",vip:true},
{name:"Spotify Tools",desc:"Informasi musik dan lagu.",icon:"♫",vip:true},
{name:"BRAT Generator",desc:"Generator gambar gaya BRAT.",icon:"✦",vip:true},
{name:"Quote Generator",desc:"Buat kutipan menarik.",icon:"❝",vip:true},
{name:"AI Tools",desc:"Kumpulan alat berbasis AI.",icon:"✧",vip:true}
];

let currentUser = null;
let currentRole = "member";
let supabaseClient = null;

function normalizeRole(role) {
const value = String(role || "").trim().toLowerCase();

if (value === "owner") return "owner";
if (value === "vip") return "vip";

// Role yang tidak dikenal dianggap FREE.
return "member";

}

function labelRole(role) {
if (role === "owner") return "OWNER";
if (role === "vip") return "VIP";
return "FREE";
}

function isOwner() {
return currentRole === "owner";
}

function applyOwnerAccess() {
const ownerNav = $("ownerNav");
const ownerPage = $("page-owner");

// Pakai style.display juga agar aman di browser mobile.
if (ownerNav) {
  ownerNav.hidden = !isOwner();
  ownerNav.style.display = isOwner() ? "" : "none";
  ownerNav.setAttribute("aria-hidden", String(!isOwner()));
}

if (!isOwner() && ownerPage) {
  ownerPage.classList.remove("active");
}

}

function showNotice(message) {
const box = $("settingsNotice");

if (box) {
  box.textContent = message;
  box.classList.add("show");
} else {
  alert(message);
}

}

function renderGrid(targetId, vipOnly, search = "") {
const target = $(targetId);
if (!target) return;

const filtered = tools.filter(tool => {
  const matchesRole = tool.vip === vipOnly;
  const matchesSearch = (tool.name + " " + tool.desc)
    .toLowerCase()
    .includes(search.toLowerCase());

  return matchesRole && matchesSearch;
});

target.replaceChildren();

filtered.forEach(tool => {
  const unlocked =
    !tool.vip || currentRole === "vip" || isOwner();

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

  const description = document.createElement("p");
  description.textContent = tool.desc;

  const button = document.createElement("button");
  button.className = "tool-open" + (!unlocked ? " locked" : "");
  button.textContent = !unlocked
    ? "🔒 Khusus VIP"
    : "Buka Tools →";

  button.addEventListener("click", () => {
    if (tool.vip && currentRole !== "vip" && !isOwner()) {
      window.open(
        "https://wa.me/6289682380778?text=Halo%2C%20saya%20mau%20upgrade%20role%20ke%20VIP.",
        "_blank",
        "noopener"
      );
      return;
    }

    showNotice(
      "Tools " + tool.name +
      " belum dihubungkan ke halaman/fungsi aslinya."
    );
  });

  card.append(top, title, description, button);
  target.appendChild(card);
});

}

function renderTools(search = "") {
renderGrid("freeGrid", false, search);
renderGrid("vipGrid", true, search);
renderGrid("freeGrid2", false, search);
renderGrid("vipGrid2", true, search);

if ($("freeCount")) {
  $("freeCount").textContent =
    tools.filter(tool => !tool.vip).length;
}

if ($("vipCount")) {
  $("vipCount").textContent =
    tools.filter(tool => tool.vip).length;
}

}

function openPage(pageName) {
const allowedPages = [
"menu", "tools", "profile", "settings", "updates"
];

// Halaman owner hanya untuk role OWNER.
if (pageName === "owner" && !isOwner()) {
  applyOwnerAccess();

  document.querySelectorAll(".page").forEach(page => {
    page.classList.toggle("active", page.id === "page-menu");
  });

  document.querySelectorAll(".nav[data-page]").forEach(link => {
    link.classList.toggle("active", link.dataset.page === "menu");
  });

  if (location.hash === "#owner") {
    history.replaceState(null, "", location.pathname + location.search);
  }

  showNotice("Akses ditolak. Panel Owner hanya untuk akun OWNER.");
  return;
}

if (!allowedPages.includes(pageName) &&
    !(pageName === "owner" && isOwner())) {
  pageName = "menu";
}

document.querySelectorAll(".page").forEach(page => {
  page.classList.toggle(
    "active",
    page.id === "page-" + pageName
  );
});

document.querySelectorAll(".nav[data-page]").forEach(link => {
  link.classList.toggle(
    "active",
    link.dataset.page === pageName
  );
});

if ($("dropdown")) {
  $("dropdown").classList.remove("open");
}

window.scrollTo({top: 0, behavior: "smooth"});

}

async function initialize() {
if ($("year")) {
$("year").textContent = new Date().getFullYear();
}

const now = new Date();

if ($("dateText")) {
  $("dateText").textContent = now.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

const config = window.VEXORA_CONFIG;

if (
  !config ||
  !config.SUPABASE_URL ||
  !config.SUPABASE_ANON_KEY ||
  !window.supabase
) {
  document.body.innerHTML =
    '<div style="padding:30px;color:white;font-family:Arial">' +
    '<h2>VEXORA</h2>' +
    '<p>Konfigurasi Supabase tidak ditemukan. Periksa config.js.</p>' +
    '</div>';
  return;
}

supabaseClient = window.supabase.createClient(
  config.SUPABASE_URL,
  config.SUPABASE_ANON_KEY
);

const {data, error} = await supabaseClient.auth.getSession();

if (error || !data.session) {
  window.location.replace("index.html");
  return;
}

currentUser = data.session.user;

// Role dibaca dari app_metadata, bukan user_metadata.
currentRole = normalizeRole(currentUser.app_metadata?.role);

applyOwnerAccess();

if ($("greetingText")) {
  const prefix = currentUser.email
    ? currentUser.email.split("@")[0]
    : "User";

  $("greetingText").textContent = "Welcome, " + prefix + "!";
}

if ($("profileEmail")) {
  $("profileEmail").textContent = currentUser.email || "-";
}

if ($("profileRole")) {
  $("profileRole").textContent = labelRole(currentRole);
}

if ($("roleValue")) {
  $("roleValue").textContent = labelRole(currentRole);
}

renderTools();

document.querySelectorAll(".nav[data-page]").forEach(link => {
  link.addEventListener("click", event => {
    event.preventDefault();

    const pageName = link.dataset.page;

    if (pageName === "owner" && !isOwner()) {
      openPage("owner");
      return;
    }

    openPage(pageName);
  });
});

document.querySelectorAll("[data-go]").forEach(button => {
  button.addEventListener("click", () => {
    openPage(button.dataset.go);
  });
});

$("dotsBtn")?.addEventListener("click", () => {
  $("dropdown")?.classList.toggle("open");
});

document.addEventListener("click", event => {
  if (!event.target.closest(".menu-wrap")) {
    $("dropdown")?.classList.remove("open");
  }
});

async function logout() {
  if (!confirm("Yakin ingin logout dari VEXORA?")) return;

  const {error: logoutError} =
    await supabaseClient.auth.signOut();

  if (logoutError) {
    alert("Logout gagal: " + logoutError.message);
    return;
  }

  window.location.replace("index.html");
}

$("logoutBtn")?.addEventListener("click", event => {
  event.preventDefault();
  logout();
});

$("dropdownLogout")?.addEventListener("click", logout);

$("toolSearch")?.addEventListener("input", event => {
  renderTools(event.target.value.trim());
});

$("refreshBtn")?.addEventListener("click", () => {
  renderTools($("toolSearch")?.value.trim() || "");
  showNotice("Dashboard berhasil diperbarui.");
});

const video = $("bannerVideo");

$("playVideo")?.addEventListener("click", async () => {
  if (!video) return;

  if (video.paused) {
    try {
      await video.play();
      $("playVideo").textContent = "Ⅱ Pause";
    } catch {
      showNotice("Video belum bisa diputar. Coba tekan lagi.");
    }
  } else {
    video.pause();
    $("playVideo").textContent = "▶ Play";
  }
});

$("muteVideo")?.addEventListener("click", () => {
  if (!video) return;

  video.muted = !video.muted;
  $("muteVideo").textContent =
    video.muted ? "♩ Unmute" : "♩ Mute";
});

video?.addEventListener("error", () => {
  showNotice(
    "File banner.mp4 belum ditemukan. " +
    "Letakkan banner.mp4 di folder yang sama dengan dashboard.html."
  );
});

// URL #owner tidak boleh membuka panel untuk FREE/VIP.
const requestedPage = location.hash.replace(/^#/, "");

if (requestedPage === "owner" && !isOwner()) {
  openPage("owner");
} else if (
  ["menu", "tools", "owner", "profile", "settings", "updates"]
    .includes(requestedPage)
) {
  openPage(requestedPage);
}

}

initialize().catch(error => {
console.error("VEXORA dashboard error:", error);
alert(
"Dashboard gagal dimuat. Periksa koneksi dan config.js, " +
"lalu coba login ulang."
);
});
})();
