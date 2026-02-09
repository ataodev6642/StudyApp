// studyapp/js/auth.js
import {
  GoogleAuthProvider,
  signInWithRedirect,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

import { auth } from "./firebase.js";

const provider = new GoogleAuthProvider();

/* ===== グローバル ===== */
window.currentUser = null;

/* ===== DOM ===== */
const authBtn = document.getElementById("authBtn");

/* ===== 認証状態監視 ===== */
onAuthStateChanged(auth, (user) => {
  if (user) {
    // ログイン済み
    window.currentUser = user;
    authBtn.textContent = "ログアウト";

    // 各機能へ通知
    window.loadAll?.();      // timer
    window.loadTodos?.();    // todo
    window.updateGraph?.();  // graph

  } else {
    // 未ログイン
    window.currentUser = null;
    authBtn.textContent = "ログイン";
  }
});

/* ===== ボタン操作 ===== */
authBtn.addEventListener("click", () => {
  if (window.currentUser) {
    signOut(auth);
  } else {
    signInWithRedirect(auth, provider);
  }
});
