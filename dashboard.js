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

let supabaseClient;
let currentUser;
let currentRole = "member";

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
const allowed = currentRole === "owner";

if (ownerNav) {
  ownerNav.hidden = !allowed;
  ownerNav.style.display = allowed ? "" : "none";
}

if (ownerPage) {
  ownerPage.hidden = !allowed;
  if (!allowed) ownerPage.classList.remove("active");
}

}

function openPage(name) {
if (name === "owner" && currentRole !== "owner") {
name = "menu";
notice("Akses ditolak. Panel Owner hanya untuk OWNER.");
}

const valid = ["menu", "tools", "profile", "settings", "updates", "owner"];
if (!valid.includes(name)) name = "menu";

document.querySelectorAll(".page").forEach(page => {
  page.classList.toggle("active", page.id === "page-" + name);
});

document.querySelectorAll(".nav[data-page]").forEach(link => {
  link.classList.toggle("active", link.dataset.page === name);
});

const dropdown = $("dropdown");
if (dropdown) dropdown.classList.remove("open");

window.scrollTo({top: 0, behavior: "smooth"});

}

function renderGrid(id, vipOnly, search = "") {
const target = $(id);
if (!target) return;

target.replaceChildren();

tools.filter(tool =>
  tool.vip === vipOnly &&
  (tool.name + " " + tool.desc).toLowerCase().includes(search.toLowerCase())
).forEach(tool => {
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
  button.className = "tool-open" + (!unlocked ? " locked" : "");
  button.textContent = unlocked ? "Buka Tools →" : "🔒 Khusus VIP";

  button.addEventListener("click", () => {
    if (!unlocked) {
      window.open(
        "https://wa.me/6289682380778?text=Halo%2C%20saya%20mau%20upgrade%20role%20ke%20VIP.",
        "_blank"
      );
      return;
    }

    notice("Tools " + tool.name +
      " belum terhubung ke fungsi aslinya.");
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
  $("freeCount").textContent = tools.filter(t => !t.vip).length;
}
if ($("vipCount")) {
  $("vipCount").textContent = tools.filter(t => t.vip).length;
}

}

async function initialize() {
if (!window.VEXORA_CONFIG || !window.supabase) {
throw new Error("Supabase atau config.js tidak ditemukan.");
}

const config = window.VEXORA_CONFIG;

supabaseClient = window.supabase.createClient(
  config.SUPABASE_URL,
  config.SUPABASE_ANON_KEY
);

const {data, error} = await supabaseClient.auth.getSession();

if (error) throw error;

if (!data.session) {
  window.location.replace("index.html");
  return;
}

currentUser = data.session.user;
currentRole = normalizeRole(currentUser.app_metadata?.role);

setOwnerVisibility();

if ($("year")) $("year").textContent = new Date().getFullYear();

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

if ($("profileRole")) $("profileRole").textContent = labelRole();
if ($("roleValue")) $("roleValue").textContent = labelRole();

renderTools();

// Navigasi utama.
document.querySelectorAll(".nav[data-page]").forEach(link => {
  link.addEventListener("click", event => {
    event.preventDefault();
    openPage(link.dataset.page);
  });
});

// Menu titik tiga.
$("dotsBtn")?.addEventListener("click", event => {
  event.stopPropagation();
  $("dropdown")?.classList.toggle("open");
});

document.querySelectorAll("[data-go]").forEach(button => {
  button.addEventListener("click", () => {
    openPage(button.dataset.go);
  });
});

document.addEventListener("click", event => {
  if (!event.target.closest(".menu-wrap")) {
    $("dropdown")?.classList.remove("open");
  }
});

// Logout.
async function logout() {
  if (!confirm("Yakin ingin logout dari VEXORA?")) return;

  const result = await supabaseClient.auth.signOut();

  if (result.error) {
    alert("Logout gagal: " + result.error.message);
    return;
  }

  window.location.replace("index.html");
}

$("logoutBtn")?.addEventListener("click", event => {
  event.preventDefault();
  logout();
});

$("dropdownLogout")?.addEventListener("click", logout);

// Pencarian tools.
$("toolSearch")?.addEventListener("input", event => {
  renderTools(event.target.value.trim());
});

$("refreshBtn")?.addEventListener("click", () => {
  renderTools($("toolSearch")?.value.trim() || "");
  notice("Dashboard berhasil diperbarui.");
});

// Kontrol video banner.
const video = $("bannerVideo");

$("playVideo")?.addEventListener("click", async () => {
  if (!video) return;

  if (video.paused) {
    try {
      await video.play();
      $("playVideo").textContent = "Ⅱ Pause";
    } catch {
      notice("Video belum bisa diputar. Periksa file banner.mp4.");
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

// Mencegah akses Panel Owner lewat hash URL.
const hashPage = window.location.hash.replace(/^#/, "");

if (hashPage === "owner" && currentRole !== "owner") {
  openPage("menu");
  history.replaceState(null, "", location.pathname + location.search);
} else if (
  ["menu", "tools", "profile", "settings", "updates", "owner"].includes(hashPage)
) {
  openPage(hashPage);
}

}

initialize().catch(error => {
console.error("VEXORA dashboard error:", error);
alert("Dashboard gagal dimuat: " + error.message +
". Periksa config.js dan koneksi internet, lalu login ulang.");
});
})();
