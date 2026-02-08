// studyapp/js/timer.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
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
const subjectInput = document.getElementById("subject");
const detailInput = document.getElementById("detail");
const minutesInput = document.getElementById("minutes");
const startBtn = document.getElementById("startBtn");
const manualBtn = document.getElementById("manualBtn");
const timerEl = document.getElementById("timerDisplay");
const logEl = document.getElementById("log");
const todayTotalEl = document.getElementById("todayTotal");
const streakEl = document.getElementById("streak");

/* モーダル */
const editModal = document.getElementById("editModal");
const editSubject = document.getElementById("editSubject");
const editDetail = document.getElementById("editDetail");
const editMinutes = document.getElementById("editMinutes");
const updateBtn = document.getElementById("updateBtn");
const cancelBtn = document.getElementById("cancelBtn");

/* ===== 状態 ===== */
let interval = null;
let remaining = 0;
let editingId = null;

/* ===== Auth ===== */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    const result = await signInWithPopup(auth, provider);
    user = result.user;
  }

  // グローバルに currentUser を置く
  window.currentUser = user;

  await setDoc(doc(db, "users", user.uid), {
    name: user.displayName,
    icon: user.photoURL,
    createdAt: serverTimestamp()
  }, { merge: true });

  loadAll();

  // ページ切り替えでグラフが表示される場合に備えて
  window.loadGraphIfReady = () => {
    if (document.getElementById("graph").classList.contains("active") && typeof window.loadGraph === "function") {
      window.loadGraph(window.currentUser.uid);
    }
  };
});

/* ===== タイマー ===== */
startBtn.onclick = () => {
  if (interval) return;

  const minutes = Number(minutesInput.value);
  if (!subjectInput.value || !detailInput.value || minutes <= 0) {
    alert("全部入力して！");
    return;
  }

  remaining = minutes * 60;
  updateTimer();
  interval = setInterval(tick, 1000);
};

function tick() {
  remaining--;
  updateTimer();

  if (remaining <= 0) {
    clearInterval(interval);
    interval = null;
    saveStudyRecord(Number(minutesInput.value));
  }
}

function updateTimer() {
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  timerEl.textContent = `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

/* ===== 手入力 ===== */
manualBtn.onclick = () => {
  const minutes = Number(minutesInput.value);
  if (!subjectInput.value || !detailInput.value || minutes <= 0) {
    alert("全部入力して！");
    return;
  }
  saveStudyRecord(minutes);
};

/* ===== 保存 ===== */
async function saveStudyRecord(minutes) {
  const today = new Date().toISOString().slice(0,10);

  await addDoc(collection(db, "studyLogs"), {
    uid: window.currentUser.uid,
    subject: subjectInput.value,
    detail: detailInput.value,
    minutes,
    date: today,
    createdAt: serverTimestamp()
  });

  resetForm();
  loadAll();
}

/* ===== 編集モーダル ===== */
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
  if (!editingId) return;

  await updateDoc(doc(db, "studyLogs", editingId), {
    subject: editSubject.value,
    detail: editDetail.value,
    minutes: Number(editMinutes.value)
  });

  editModal.classList.add("hidden");
  editingId = null;
  loadAll();
};

/* ===== ログ表示 ===== */
async function loadLogs() {
  logEl.innerHTML = "";

  const q = query(collection(db, "studyLogs"), where("uid", "==", window.currentUser.uid));
  const snap = await getDocs(q);

  snap.forEach(d => {
    const data = d.data();
    const div = document.createElement("div");
    div.className = "log-item";

    // テキスト
    const textSpan = document.createElement("span");
    textSpan.textContent = `${data.date}｜${data.subject}｜${data.detail}｜${data.minutes}分`;

    // ボタンラッパー
    const btnWrapper = document.createElement("div");
    btnWrapper.className = "log-buttons";

    const editBtn = document.createElement("button");
    editBtn.className = "edit";
    editBtn.textContent = "✏️";
    editBtn.onclick = () => openEditModal(d.id, data);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete";
    deleteBtn.textContent = "🗑";
    deleteBtn.onclick = async () => {
      if (!confirm("削除する？")) return;
      await deleteDoc(doc(db, "studyLogs", d.id));
      loadAll();
    };

    btnWrapper.append(editBtn, deleteBtn);
    div.append(textSpan, btnWrapper);
    logEl.prepend(div);
  });
}

/* ===== 今日の合計 ===== */
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

/* ===== ストリーク ===== */
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

/* ===== 共通 ===== */
function resetForm() {
  subjectInput.value = "";
  detailInput.value = "";
  minutesInput.value = "";
  timerEl.textContent = "00:00";
}

function loadAll() {
  loadTodayTotal();
  loadStreak();
  loadLogs();
}

const authBtn = document.getElementById("authBtn");

// 認証状態の変化を監視
onAuthStateChanged(auth, (user) => {
  if (user) {
    // ログイン中
    currentUser = user;
    authBtn.textContent = "ログアウト";
    loadAll(); // タイマーやログをロード
  } else {
    // ログアウト中
    currentUser = null;
    authBtn.textContent = "ログイン";
    resetForm();
    logEl.innerHTML = "";
    todayTotalEl.textContent = "今日の合計：0分";
    streakEl.textContent = "🔥 ストリーク：0日";
  }
});

// ボタンクリックでログイン／ログアウト切り替え
authBtn.onclick = async () => {
  if (currentUser) {
    await auth.signOut();
  } else {
    try {
      const result = await signInWithPopup(auth, provider);
      currentUser = result.user;
      await setDoc(doc(db, "users", currentUser.uid), {
        name: currentUser.displayName,
        icon: currentUser.photoURL,
        createdAt: serverTimestamp()
      }, { merge: true });
      loadAll();
    } catch (err) {
      console.error("ログイン失敗", err);
    }
  }
};
