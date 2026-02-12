// studyapp/js/timer.js
import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  setDoc,
  doc,
  deleteDoc,
  updateDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

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

const weeklyGoalInput = document.getElementById("weeklyGoalInput");
const saveWeeklyGoalBtn = document.getElementById("saveWeeklyGoalBtn");
const weeklyStatus = document.getElementById("weeklyStatus");
const progressFill = document.getElementById("progressFill");

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

/* =================================================
   タイマー
================================================= */

startBtn.onclick = () => {
  if (!window.currentUser) {
    alert("ログインしてください");
    return;
  }
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
  timerEl.textContent =
    `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/* =================================================
   手入力
================================================= */

manualBtn.onclick = () => {
  if (!window.currentUser) {
    alert("ログインしてください");
    return;
  }

  const minutes = Number(minutesInput.value);
  if (!subjectInput.value || !detailInput.value || minutes <= 0) {
    alert("全部入力して！");
    return;
  }

  saveStudyRecord(minutes);
};

/* =================================================
   保存
================================================= */

async function saveStudyRecord(minutes) {
  if (!window.currentUser) return;

  const today = new Date().toISOString().slice(0, 10);

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

/* =================================================
   編集モーダル（元のまま保持）
================================================= */

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

/* =================================================
   ログ表示（削除・編集含め元のまま）
================================================= */

async function loadLogs() {
  if (!window.currentUser) return;

  logEl.innerHTML = "";

  const q = query(
    collection(db, "studyLogs"),
    where("uid", "==", window.currentUser.uid)
  );

  const snap = await getDocs(q);

  snap.forEach(d => {
    const data = d.data();
    const div = document.createElement("div");
    div.className = "log-item";

    const textSpan = document.createElement("span");
    textSpan.textContent =
      `${data.date}｜${data.subject}｜${data.detail}｜${data.minutes}分`;

    const btnWrapper = document.createElement("div");
    btnWrapper.className = "log-buttons";

    const editBtn = document.createElement("button");
    editBtn.textContent = "✏️";
    editBtn.onclick = () => openEditModal(d.id, data);

    const deleteBtn = document.createElement("button");
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

/* =================================================
   今日の合計
================================================= */

async function loadTodayTotal() {
  if (!window.currentUser) return;

  const today = new Date().toISOString().slice(0, 10);

  const q = query(
    collection(db, "studyLogs"),
    where("uid", "==", window.currentUser.uid),
    where("date", "==", today)
  );

  const snap = await getDocs(q);

  let total = 0;
  snap.forEach(d => total += d.data().minutes);

  todayTotalEl.textContent = `今日の合計：${total}分`;
}

/* =================================================
   ストリーク
================================================= */

async function loadStreak() {
  if (!window.currentUser) return;

  const q = query(
    collection(db, "studyLogs"),
    where("uid", "==", window.currentUser.uid)
  );

  const snap = await getDocs(q);
  const dates = new Set();
  snap.forEach(d => dates.add(d.data().date));

  let streak = 0;
  let day = new Date();

  while (dates.has(day.toISOString().slice(0, 10))) {
    streak++;
    day.setDate(day.getDate() - 1);
  }

  streakEl.textContent = `🔥 ストリーク：${streak}日`;
}

/* =================================================
   週間目標機能（追加部分のみ）
================================================= */

if (saveWeeklyGoalBtn) {
  saveWeeklyGoalBtn.onclick = async () => {
    if (!window.currentUser) return;

    const goal = Number(weeklyGoalInput.value);
    if (!goal || goal <= 0) return alert("正しい目標を入力して");

    await setDoc(doc(db, "weeklyGoals", window.currentUser.uid), {
      goal,
      updatedAt: serverTimestamp()
    });

    loadWeeklyProgress();
  };
}

function getStartOfWeek() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(now.setDate(diff)).toISOString().slice(0, 10);
}

async function loadWeeklyProgress() {
  if (!window.currentUser) return;

  const startOfWeek = getStartOfWeek();
  const today = new Date().toISOString().slice(0, 10);

  const goalSnap = await getDoc(doc(db, "weeklyGoals", window.currentUser.uid));
  const goal = goalSnap.exists() ? goalSnap.data().goal : 0;

  const q = query(
    collection(db, "studyLogs"),
    where("uid", "==", window.currentUser.uid)
  );

  const snap = await getDocs(q);

  let total = 0;
  snap.forEach(d => {
    const date = d.data().date;
    if (date >= startOfWeek && date <= today) {
      total += d.data().minutes;
    }
  });

  const percent = goal ? Math.min((total / goal) * 100, 100) : 0;

  if (weeklyStatus)
    weeklyStatus.textContent =
      `今週：${total} / ${goal} 分（${Math.floor(percent)}%）`;

  if (progressFill)
    progressFill.style.width = percent + "%";

  if (percent >= 100 && progressFill) {
    progressFill.style.background =
      "linear-gradient(90deg, gold, orange)";
  }
}

/* =================================================
   共通
================================================= */

function resetForm() {
  subjectInput.value = "";
  detailInput.value = "";
  minutesInput.value = "";
  timerEl.textContent = "00:00";
}

/* =================================================
   外部公開
================================================= */

window.loadAll = function () {
  loadTodayTotal();
  loadStreak();
  loadLogs();
  loadWeeklyProgress(); // ← 追加
};