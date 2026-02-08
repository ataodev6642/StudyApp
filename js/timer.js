// studyapp/js/timer.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  setDoc,
  doc,
  deleteDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* ===== Firebase 設定 ===== */
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

// 他のファイル（todos.js等）でもDBを使えるようにwindowに公開
window.db = db;

/* ===== DOM 要素 ===== */
const subjectInput = document.getElementById("subject");
const detailInput = document.getElementById("detail");
const minutesInput = document.getElementById("minutes");
const startBtn = document.getElementById("startBtn");
const manualBtn = document.getElementById("manualBtn");
const timerEl = document.getElementById("timerDisplay");
const logEl = document.getElementById("log");
const todayTotalEl = document.getElementById("todayTotal");
const streakEl = document.getElementById("streak");
const authBtn = document.getElementById("authBtn");

/* モーダル */
const editModal = document.getElementById("editModal");
const editSubject = document.getElementById("editSubject");
const editDetail = document.getElementById("editDetail");
const editMinutes = document.getElementById("editMinutes");
const updateBtn = document.getElementById("updateBtn");
const cancelBtn = document.getElementById("cancelBtn");

/* ===== 状態管理 ===== */
let interval = null;
let remaining = 0;
let editingId = null;
window.currentUser = null;

/* ===== Auth 状態監視 ===== */
onAuthStateChanged(auth, async (user) => {
  if (user) {
    window.currentUser = user;
    authBtn.textContent = "ログアウト";
    
    await setupUserData();
    loadAll();

    // 他のJSファイル（todos.jsなど）にログイン完了を通知
    window.dispatchEvent(new CustomEvent("authChanged", { detail: user }));
  } else {
    window.currentUser = null;
    authBtn.textContent = "ログイン";
    clearUI();
  }
});

/* ===== ログイン／ログアウト処理 ===== */
/* ===== ログイン／ログアウトボタン (修正版) ===== */
authBtn.onclick = async () => {
  if (window.currentUser) {
    await auth.signOut();
    location.reload();
  } else {
    // リダイレクトではなく Popup を使うが、
    // 「ボタンクリック直後」に実行すればブラウザにブロックされません
    const { signInWithPopup } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
    try {
      await signInWithPopup(auth, provider);
      // Popup成功後は onAuthStateChanged が自動で検知して画面が変わります
    } catch (error) {
      console.error("Login error:", error);
      if (error.code === 'auth/popup-blocked') {
        alert("ポップアップがブロックされました。ブラウザの設定で許可するか、アドレスバーの右側を確認してください。");
      }
    }
  }
};

/* ===== ユーザー情報登録 ===== */
async function setupUserData() {
  if (!window.currentUser) return;
  try {
    await setDoc(doc(db, "users", window.currentUser.uid), {
      name: window.currentUser.displayName,
      icon: window.currentUser.photoURL,
      lastLogin: serverTimestamp()
    }, { merge: true });
  } catch (e) {
    console.error("Error setting user data:", e);
  }
}

/* ===== タイマー処理 ===== */
startBtn.onclick = () => {
  if (!window.currentUser) return alert("ログインしてください");
  if (interval) return;

  const minutes = Number(minutesInput.value);
  if (!subjectInput.value || !detailInput.value || minutes <= 0) {
    alert("教科、内容、時間を正しく入力してください");
    return;
  }

  remaining = minutes * 60;
  updateTimer();
  interval = setInterval(tick, 1000);
  startBtn.disabled = true;
};

function tick() {
  if (remaining <= 0) {
    clearInterval(interval);
    interval = null;
    startBtn.disabled = false;
    saveStudyRecord(Number(minutesInput.value));
    alert("お疲れ様でした！記録しました。");
  } else {
    remaining--;
    updateTimer();
  }
}

function updateTimer() {
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  timerEl.textContent = `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

/* ===== 手入力保存 ===== */
manualBtn.onclick = () => {
  if (!window.currentUser) return alert("ログインしてください");

  const minutes = Number(minutesInput.value);
  if (!subjectInput.value || !detailInput.value || minutes <= 0) {
    alert("内容をすべて入力してください");
    return;
  }
  saveStudyRecord(minutes);
};

async function saveStudyRecord(minutes) {
  if (!window.currentUser) return;
  const today = new Date().toISOString().slice(0,10);

  try {
    await addDoc(collection(db, "studyLogs"), {
      uid: window.currentUser.uid,
      subject: subjectInput.value,
      detail: detailInput.value,
      minutes: minutes,
      date: today,
      createdAt: serverTimestamp()
    });
    resetForm();
    loadAll();
  } catch (e) {
    console.error("Save error:", e);
  }
}

/* ===== ログ表示・読み込み ===== */
async function loadLogs() {
  if (!window.currentUser) return;
  logEl.innerHTML = "<p>読み込み中...</p>";

  const q = query(collection(db, "studyLogs"), where("uid", "==", window.currentUser.uid));
  const snap = await getDocs(q);
  
  logEl.innerHTML = "";
  if (snap.empty) {
    logEl.innerHTML = "<p>まだ記録がありません</p>";
    return;
  }

  // データを配列に入れて日付順にソート（新しい順）
  const logs = [];
  snap.forEach(d => logs.push({ id: d.id, ...d.data() }));
  logs.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);

  logs.forEach(data => {
    const div = document.createElement("div");
    div.className = "log-item";

    div.innerHTML = `
      <span>${data.date}｜${data.subject}｜${data.detail}｜${data.minutes}分</span>
      <div class="log-buttons">
        <button class="edit-btn" data-id="${data.id}">✏️</button>
        <button class="delete-btn" data-id="${data.id}">🗑</button>
      </div>
    `;

    // 削除ボタンのイベント
    div.querySelector(".delete-btn").onclick = async () => {
      if (!confirm("この記録を削除しますか？")) return;
      await deleteDoc(doc(db, "studyLogs", data.id));
      loadAll();
    };

    // 編集ボタンのイベント
    div.querySelector(".edit-btn").onclick = () => openEditModal(data.id, data);

    logEl.appendChild(div);
  });
}

/* ===== 編集モーダル制御 ===== */
function openEditModal(id, data) {
  editingId = id;
  editSubject.value = data.subject;
  editDetail.value = data.detail;
  editMinutes.value = data.minutes;
  editModal.classList.remove("hidden");
}

cancelBtn.onclick = () => {
  editModal.classList.add("hidden");
  editingId = null;
};

updateBtn.onclick = async () => {
  if (!editingId || !window.currentUser) return;

  await updateDoc(doc(db, "studyLogs", editingId), {
    subject: editSubject.value,
    detail: editDetail.value,
    minutes: Number(editMinutes.value)
  });

  editModal.classList.add("hidden");
  editingId = null;
  loadAll();
};

/* ===== 集計表示 ===== */
async function loadTodayTotal() {
  const today = new Date().toISOString().slice(0,10);
  const q = query(collection(db, "studyLogs"),
    where("uid", "==", window.currentUser.uid),
    where("date", "==", today)
  );
  const snap = await getDocs(q);
  let total = 0;
  snap.forEach(d => total += d.data().minutes);
  todayTotalEl.textContent = `今日の合計：${total}分`;
}

async function loadStreak() {
  const q = query(collection(db, "studyLogs"), where("uid", "==", window.currentUser.uid));
  const snap = await getDocs(q);
  const dates = new Set();
  snap.forEach(d => dates.add(d.data().date));

  let streak = 0;
  let day = new Date();
  while (dates.has(day.toISOString().slice(0,10))) {
    streak++;
    day.setDate(day.getDate() - 1);
  }
  streakEl.textContent = `🔥 ストリーク：${streak}日`;
}

/* ===== ユーティリティ ===== */
function resetForm() {
  subjectInput.value = "";
  detailInput.value = "";
  minutesInput.value = "";
  timerEl.textContent = "00:00";
}

function clearUI() {
  resetForm();
  logEl.innerHTML = "";
  todayTotalEl.textContent = "今日の合計：0分";
  streakEl.textContent = "🔥 ストリーク：0日";
}

function loadAll() {
  loadTodayTotal();
  loadStreak();
  loadLogs();
}