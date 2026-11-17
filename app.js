import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import firebaseConfig from "./firebase-config.js";

const $ = (id) => document.getElementById(id);
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);

// Firebase Auth uses email/password internally. The UI only asks for a username;
// this deterministic alias keeps the account experience username-based.
const usernameToEmail = (username) => `${username.toLowerCase()}@vexora-login.com`;

function authMessage(error) {
  const code = error?.code || "";
  const messages = {
    "auth/email-already-in-use": "Username sudah dipakai. Coba username lain.",
    "auth/invalid-credential": "Username atau password salah.",
    "auth/user-not-found": "Username atau password salah.",
    "auth/wrong-password": "Username atau password salah.",
    "auth/weak-password": "Password terlalu lemah. Gunakan minimal 6 karakter.",
    "auth/invalid-email": "Format username tidak valid.",
    "auth/too-many-requests": "Terlalu banyak percobaan. Coba lagi nanti.",
    "auth/network-request-failed": "Koneksi bermasalah. Periksa internet kamu.",
    "auth/operation-not-allowed": "Aktifkan Email/Password di Firebase Authentication.",
    "auth/configuration-not-found": "Konfigurasi Firebase belum lengkap atau salah."
  };
  return messages[code] || "Terjadi kesalahan saat menghubungi Firebase. Periksa konfigurasi dan coba lagi.";
}
let isRegister = false;
let currentUser = null;
let currentPage = "home";
const tools = [
  {id:"text",icon:"T",color:"#d5ff43",name:"Text Formatter",desc:"Ubah teks jadi uppercase, lowercase, atau capitalize.",category:"TEXT"},
  {id:"counter",icon:"#",color:"#ff83b7",name:"Word Counter",desc:"Hitung kata, karakter, dan paragraf dengan cepat.",category:"TEXT"},
  {id:"notes",icon:"✎",color:"#9bd7ff",name:"Quick Notes",desc:"Tulis catatan singkat langsung di workspace.",category:"PRODUCTIVITY"},
  {id:"color",icon:"◈",color:"#ffc96b",name:"Color Palette",desc:"Buat kombinasi warna random untuk ide desain.",category:"DESIGN"},
  {id:"qr",icon:"▦",color:"#d5ff43",name:"QR Link Helper",desc:"Siapkan teks atau tautan untuk dibuat QR di layanan pilihanmu.",category:"UTILITY"},
  {id:"timer",icon:"◷",color:"#ff83b7",name:"Focus Timer",desc:"Atur sesi fokus sederhana 25 menit.",category:"PRODUCTIVITY"}
];
let saved = JSON.parse(localStorage.getItem("vexora_saved") || "[]");
function showAuth(){ $("authView").classList.remove("hidden"); $("dashboardView").classList.add("hidden"); }
function showDashboard(user){currentUser=user;$("authView").classList.add("hidden");$("dashboardView").classList.remove("hidden");$("welcomeName").textContent=user;$("sideUsername").textContent=user;$("avatarInitial").textContent=user[0].toUpperCase();$("topInitial").textContent=user[0].toUpperCase();renderTools();goPage("home")}
function updateAuthMode(){ $("authEyebrow").textContent=isRegister?"CREATE YOUR ACCOUNT":"WELCOME BACK";$("authTitle").textContent=isRegister?"Bikin akun dulu.":"Login dulu.";$("authSubtitle").textContent=isRegister?"Daftar untuk mulai memakai workspace.":"Masuk untuk membuka workspace kamu.";$("authSubmit").innerHTML=isRegister?'BUAT AKUN <span>↗</span>':'MASUK <span>↗</span>';$("authSwitch").innerHTML=isRegister?'Sudah punya akun? <button type="button" id="switchAuth">Login</button>':'Belum punya akun? <button type="button" id="switchAuth">Daftar sekarang</button>'; $("switchAuth").onclick=()=>{isRegister=!isRegister;$("authError").textContent="";updateAuthMode()};$("password").autocomplete=isRegister?"new-password":"current-password"}
$("switchAuth").onclick=()=>{isRegister=!isRegister;updateAuthMode()};
$("authForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = $("username").value.trim().toLowerCase();
  const password = $("password").value;
  $("authError").textContent = "";
  $("authSubmit").disabled = true;
  if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
    $("authError").textContent = "Username 3–24 karakter: huruf, angka, atau underscore.";
    $("authSubmit").disabled = false;
    return;
  }
  if (password.length < 6) {
    $("authError").textContent = "Password minimal 6 karakter.";
    $("authSubmit").disabled = false;
    return;
  }
  try {
    const emailAlias = usernameToEmail(username);
    if (isRegister) {
      const credential = await createUserWithEmailAndPassword(auth, emailAlias, password);
      await updateProfile(credential.user, { displayName: username });
      isRegister = false;
      updateAuthMode();
      $("authError").textContent = "Akun berhasil dibuat dan tersimpan di Firebase.";
    } else {
      await signInWithEmailAndPassword(auth, emailAlias, password);
    }
  } catch (error) {
    $("authError").textContent = authMessage(error);
  } finally {
    $("authSubmit").disabled = false;
  }
});
function card(t){const active=saved.includes(t.id);return `<article class="tool-card"><div class="tool-card-top"><div class="tool-icon" style="background:${t.color}">${t.icon}</div><button class="tool-save" data-save="${t.id}" aria-label="Simpan tool">${active?"★":"☆"}</button></div><h3>${t.name}</h3><p>${t.desc}</p><div class="tool-open" data-open="${t.id}">OPEN TOOL ↗</div></article>`}
function renderTools(){$("quickTools").innerHTML=tools.slice(0,3).map(card).join("");$("allTools").innerHTML=tools.map(card).join("");$("savedTools").innerHTML=tools.filter(t=>saved.includes(t.id)).map(card).join("")||'<p class="muted">Belum ada tools tersimpan. Tekan ☆ pada tool favoritmu.</p>';document.querySelectorAll("[data-save]").forEach(b=>b.onclick=()=>{const id=b.dataset.save;saved=saved.includes(id)?saved.filter(x=>x!==id):[...saved,id];localStorage.setItem("vexora_saved",JSON.stringify(saved));renderTools();toast(saved.includes(id)?"Tool disimpan":"Tool dihapus dari Saved")});document.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>openTool(b.dataset.open))}
function goPage(page){currentPage=page;["home","tools","saved"].forEach(p=>$(`${p}Page`).classList.toggle("hidden",p!==page));document.querySelectorAll(".nav-item").forEach(n=>n.classList.toggle("active",n.dataset.page===page));}
document.querySelectorAll(".nav-item").forEach(n=>n.onclick=()=>goPage(n.dataset.page));$("exploreBtn").onclick=$("viewAllBtn").onclick=()=>goPage("tools");$("logoutBtn").onclick=async()=>{try{await signOut(auth)}catch(error){toast(authMessage(error))}};
function toast(msg){$("toast").textContent=msg;$("toast").style.display="block";setTimeout(()=>{$("toast").style.display="none"},1800)}
function openTool(id){const t=tools.find(x=>x.id===id);$("modalCategory").textContent=t.category;$("modalTitle").textContent=t.name;const body=$("toolBody");body.innerHTML="";const area=document.createElement("div");area.className="tool-area";body.appendChild(area);
 if(id==="text"){area.innerHTML='<textarea class="tool-input" id="textInput" placeholder="Tulis teks di sini..."></textarea><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="tool-action" data-mode="upper">UPPERCASE</button><button class="tool-action" data-mode="lower">lowercase</button><button class="tool-action" data-mode="title">Capitalize</button></div><div class="tool-result" id="textResult">Hasil akan muncul di sini.</div>';area.querySelectorAll("[data-mode]").forEach(b=>b.onclick=()=>{let s=$("textInput").value,m=b.dataset.mode;if(m==="upper")s=s.toUpperCase();if(m==="lower")s=s.toLowerCase();if(m==="title")s=s.toLowerCase().replace(/(^|\\s)\\S/g,c=>c.toUpperCase());$("textResult").textContent=s||"Tulis teks terlebih dahulu."})}
 if(id==="counter"){area.innerHTML='<textarea class="tool-input" id="countInput" placeholder="Masukkan teks..."></textarea><div class="tool-result" id="countResult">0 kata · 0 karakter · 0 paragraf</div>'; $("countInput").oninput=()=>{let s=$("countInput").value.trim();$("countResult").textContent=`${s?s.split(/\\s+/).length:0} kata · ${$("countInput").value.length} karakter · ${s?s.split(/\\n+/).length:0} paragraf`}}
 if(id==="notes"){area.innerHTML='<textarea class="tool-input" id="noteInput" placeholder="Tulis catatanmu..."></textarea><button class="tool-action" id="saveNote">SIMPAN CATATAN</button><div class="tool-result" id="noteResult">Catatan tersimpan di browser perangkat ini.</div>'; $("noteInput").value=localStorage.getItem("vexora_note")||"";$("saveNote").onclick=()=>{localStorage.setItem("vexora_note",$("noteInput").value);$("noteResult").textContent="Catatan berhasil disimpan di perangkat ini.";}}
 if(id==="color"){area.innerHTML='<div id="palette" style="display:grid;grid-template-columns:repeat(5,1fr);gap:7px"></div><button class="tool-action" id="newPalette">GENERATE PALETTE ↻</button>';const gen=()=>{$("palette").innerHTML=Array.from({length:5},()=>{let c="#"+Math.floor(Math.random()*16777215).toString(16).padStart(6,"0");return `<button title="Salin ${c}" data-color="${c}" style="height:90px;background:${c};border:2px solid #171717"></button>`}).join("");$("palette").querySelectorAll("button").forEach(b=>b.onclick=()=>{navigator.clipboard?.writeText(b.dataset.color);toast("Warna "+b.dataset.color)})};$("newPalette").onclick=gen;gen()}
 if(id==="qr"){area.innerHTML='<input class="tool-input" id="qrText" placeholder="Tempel teks atau URL"><div class="tool-result">Salin teks ini ke generator QR pilihanmu. Fitur ini tidak mengirim data ke server.</div><button class="tool-action" id="copyQr">SALIN TEKS</button>'; $("copyQr").onclick=()=>{navigator.clipboard?.writeText($("qrText").value);toast("Teks disalin")}}
 if(id==="timer"){area.innerHTML='<div class="tool-result" id="timerDisplay" style="font-size:42px;text-align:center;font-weight:700">25:00</div><button class="tool-action" id="timerStart">MULAI / JEDA</button><button class="tool-action" id="timerReset">RESET</button>';let remain=1500,interval=null;const draw=()=>{$("timerDisplay").textContent=`${String(Math.floor(remain/60)).padStart(2,"0")}:${String(remain%60).padStart(2,"0")}`};$("timerStart").onclick=()=>{if(interval){clearInterval(interval);interval=null;return}interval=setInterval(()=>{remain--;draw();if(remain<=0){clearInterval(interval);interval=null;toast("Sesi fokus selesai!")}},1000)};$("timerReset").onclick=()=>{clearInterval(interval);interval=null;remain=1500;draw()}}
 $("toolModal").classList.remove("hidden")}
$("closeModal").onclick=()=>$("toolModal").classList.add("hidden");$("toolModal").onclick=e=>{if(e.target===$("toolModal"))$("toolModal").classList.add("hidden")};
onAuthStateChanged(auth, (user) => {
  if (user) {
    const username = user.displayName || (user.email || "creator@vexora-login.com").split("@")[0];
    showDashboard(username);
  } else {
    currentUser = null;
    showAuth();
  }
});
updateAuthMode();
