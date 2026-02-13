// studyapp/js/auth.js
import {
  GoogleAuthProvider,
  signInWithPopup, // Popupに変更
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

import { auth } from "./firebase.js";

/* ===== Provider ===== */
const provider = new GoogleAuthProvider();

/* ===== グローバル ===== */
window.currentUser = null;

/* ===== DOM ===== */
const authBtn = document.getElementById("authBtn");

/* ===== 認証状態監視 ===== */
onAuthStateChanged(auth, (user) => {
  console.log("Auth state changed:", user);

  if (user) {
    window.currentUser = user;
    authBtn.textContent = "ログアウト";

    // 各機能の初期化（少し待機して関数が登録されるのを確実にする）
    setTimeout(() => {
  window.loadAll?.();
  window.loadTodos?.();
  window.updateGraph?.();
  window.loadCards?.(); // ← 追加
}, 200);


  } else {
  window.currentUser = null;
  authBtn.textContent = "ログイン";

  document.getElementById("log").innerHTML = "";
  document.getElementById("todoList").innerHTML = "";
  document.getElementById("todayTotal").textContent = "今日の合計：0分";
  document.getElementById("streak").textContent = "🔥 ストリーク：0日";
  document.getElementById("weeklyStatus").textContent = "今週：0 / 0 分（0%）";
  document.getElementById("progressFill").style.width = "0%";
}

});

/* ===== ログイン / ログアウト ===== */
authBtn.addEventListener("click", () => {
  if (window.currentUser) {
    signOut(auth)
      .then(() => console.log("Sign out success"))
      .catch((err) => console.error("Sign out error:", err));
  } else {
    // ポップアップでログインを実行
    signInWithPopup(auth, provider)
      .then((result) => {
        console.log("Popup login success:", result.user);
        // onAuthStateChangedが走るので、ここでは状態更新のみでOK
      })
      .catch((err) => {
        console.error("Popup error:", err);
        if (err.code === "auth/popup-closed-by-user") {
          alert("ログインをキャンセルしました");
        } else {
          alert("ログインエラーが発生しました: " + err.message);
        }
      });
  }
});