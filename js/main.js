// studyapp/js/main.js

/* ===== DOM ===== */
const menuButtons = document.querySelectorAll(".menu-btn");
const pages = document.querySelectorAll(".page");

/* ===== サイドメニュー切り替え ===== */
menuButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.page;

    menuButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    pages.forEach(page => page.classList.remove("active"));
    const targetPage = document.getElementById(target);
    if (targetPage) targetPage.classList.add("active");

    // グラフページなら描画（windowに公開された関数を呼ぶ）
    if (target === "graph" && typeof window.updateGraph === "function") {
      window.updateGraph();
    }
  });
});