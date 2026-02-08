// studyapp/js/todos.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore,
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

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

/* ===== Firebase ===== */
const firebaseConfig = {
  apiKey: "AIzaSyCeAxPKmoIzbmbK8MM-lDRJBtJFjWaLR-A",
  authDomain: "studyapp-debb8.firebaseapp.com",
  projectId: "studyapp-debb8",
  storageBucket: "studyapp-debb8.firebasestorage.app",
  messagingSenderId: "742083836001",
  appId: "1:742083836001:web:e15fa7958b088859a61220"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

/* ===== DOM ===== */
const todoTitle = document.getElementById("todoTitle");
const todoDetail = document.getElementById("todoDetail");
const addTodoBtn = document.getElementById("addTodoBtn");
const todoList = document.getElementById("todoList");

/* ===== 状態 ===== */
let currentUser = null;
let editingId = null;



/* ===== ToDo追加 ===== */
addTodoBtn.onclick = async () => {
  const title = todoTitle.value.trim();
  const detail = todoDetail.value.trim();
  if (!title) return alert("タイトルを入力してください");

  if (editingId) {
    // 編集中
    await updateDoc(doc(db, "todos", editingId), {
      title,
      detail
    });
    editingId = null;
    addTodoBtn.textContent = "追加";
  } else {
    await addDoc(collection(db, "todos"), {
      uid: currentUser.uid,
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
  todoList.innerHTML = "";
  const q = query(collection(db, "todos"), where("uid", "==", currentUser.uid));
  const snap = await getDocs(q);

  snap.forEach(docSnap => {
    const data = docSnap.data();
    const div = document.createElement("div");
    div.className = "card todo-item";

    div.innerHTML = `
      <div class="todo-main" style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <input type="checkbox" class="todo-done" ${data.done ? "checked" : ""}>
          <strong>${data.title}</strong> - ${data.detail}
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
      todoDetail.value = data.detail;
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

