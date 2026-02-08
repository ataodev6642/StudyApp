// studyapp/js/main.js

/* ===== DOM ===== */
const menuButtons = document.querySelectorAll(".menu-btn");
const pages = document.querySelectorAll(".page");

/* ===== サイドメニュー切り替え ===== */
menuButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.page;

    // ボタンの active 切り替え
    menuButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    // ページ表示切り替え
    pages.forEach(page => page.classList.remove("active"));
    document.getElementById(target).classList.add("active");

    // グラフページなら描画
    if (target === "graph" && typeof window.loadGraph === "function" && window.currentUser) {
      window.loadGraph(window.currentUser.uid);
    }
  });
});

/* ===== ToDo機能 ===== */
const todoListEl = document.getElementById("todoList");
const todoInput = document.getElementById("todoInput");
const todoAddBtn = document.getElementById("todoAddBtn");

async function loadTodos() {
  if (!window.currentUser) return;

  const q = query(
    collection(db, "todos"),
    where("uid", "==", window.currentUser.uid)
  );
  const snap = await getDocs(q);

  todoListEl.innerHTML = "";
  snap.forEach(docSnap => {
    const data = docSnap.data();
    const li = document.createElement("li");
    li.textContent = data.text;

    const delBtn = document.createElement("button");
    delBtn.textContent = "🗑";
    delBtn.onclick = async () => {
      await deleteDoc(doc(db, "todos", docSnap.id));
      loadTodos();
    };

    li.append(delBtn);
    todoListEl.append(li);
  });
}

if (todoAddBtn) {
  todoAddBtn.onclick = async () => {
    if (!todoInput.value || !window.currentUser) return;
    await addDoc(collection(db, "todos"), {
      uid: window.currentUser.uid,
      text: todoInput.value,
      createdAt: serverTimestamp()
    });
    todoInput.value = "";
    loadTodos();
  };
}

/* ===== ページ読み込み時にToDoもロード ===== */
window.addEventListener("load", () => {
  if (window.currentUser) {
    loadTodos();
  }
});




