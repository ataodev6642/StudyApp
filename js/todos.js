// studyapp/js/todos.js
import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

/* ===== DOM ===== */
const todoTitle = document.getElementById("todoTitle");
const todoDetail = document.getElementById("todoDetail");
const addTodoBtn = document.getElementById("addTodoBtn");
const todoList = document.getElementById("todoList");

/* ===== 状態 ===== */
let editingId = null;

/* ===== ToDo追加 / 更新 ===== */
addTodoBtn.onclick = async () => {
  if (!window.currentUser) {
    alert("ログインしてください");
    return;
  }

  const title = todoTitle.value.trim();
  const detail = todoDetail.value.trim();
  if (!title) return alert("タイトルを入力してください");

  if (editingId) {
    // 更新
    await updateDoc(doc(db, "todos", editingId), {
      title,
      detail
    });
    editingId = null;
    addTodoBtn.textContent = "追加";
  } else {
    // 新規追加
    await addDoc(collection(db, "todos"), {
      uid: window.currentUser.uid,
      title,
      detail,
      done: false,
      createdAt: serverTimestamp()
    });
  }

  todoTitle.value = "";
  todoDetail.value = "";
  loadTodos();
};

/* ===== 表示 ===== */
async function loadTodos() {
  if (!window.currentUser) return;

  todoList.innerHTML = "";

  const q = query(
    collection(db, "todos"),
    where("uid", "==", window.currentUser.uid)
  );

  const snap = await getDocs(q);

  snap.forEach(docSnap => {
    const data = docSnap.data();

    const div = document.createElement("div");
    div.className = "card todo-item";

    div.innerHTML = `
      <div class="todo-main" style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <input type="checkbox" class="todo-done" ${data.done ? "checked" : ""}>
          <strong>${data.title}</strong> - ${data.detail ?? ""}
        </div>
        <div>
          <button class="edit">✏️</button>
          <button class="delete">🗑</button>
        </div>
      </div>
    `;

    // 完了チェック
    div.querySelector(".todo-done").onclick = async (e) => {
      await updateDoc(doc(db, "todos", docSnap.id), {
        done: e.target.checked
      });
      loadTodos();
    };

    // 編集
    div.querySelector(".edit").onclick = () => {
      todoTitle.value = data.title;
      todoDetail.value = data.detail ?? "";
      editingId = docSnap.id;
      addTodoBtn.textContent = "更新";
    };

    // 削除
    div.querySelector(".delete").onclick = async () => {
      if (!confirm("削除しますか？")) return;
      await deleteDoc(doc(db, "todos", docSnap.id));
      loadTodos();
    };

    todoList.prepend(div);
  });
}

/* ===== auth.js から呼べるように公開 ===== */
window.loadTodos = loadTodos;




// もし読み込み時点でログイン済みなら、自分で自分を動かす
if (window.currentUser) {
  loadTodos();
}