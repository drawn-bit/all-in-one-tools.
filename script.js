document.addEventListener("DOMContentLoaded", () => {
  const intro = document.getElementById("intro");
  const fill = document.getElementById("loaderFill");
  const percent = document.getElementById("loaderPercent");
  const label = document.getElementById("loaderLabel");
  const stages = [
    [0, "MENYIAPKAN SISTEM"],
    [28, "MEMUAT INTERFACE"],
    [62, "MENYAMBUNGKAN MODUL"],
    [86, "MENYIAPKAN VEXORA"],
    [100, "SYSTEM READY"]
  ];
  let progress = 0;
  const timer = setInterval(() => {
    progress = Math.min(100, progress + Math.ceil(Math.random() * 4));
    fill.style.width = progress + "%";
    percent.textContent = progress + "%";
    const stage = [...stages].reverse().find(item => progress >= item[0]);
    if (stage) label.textContent = stage[1];
    if (progress >= 100) {
      clearInterval(timer);
      setTimeout(() => intro.classList.add("hide"), 500);
      setTimeout(() => intro.remove(), 1300);
    }
  }, 55);
});
