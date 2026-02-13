// studyapp/js/cards.js
import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

/* =========================
   DOM
========================= */

const subjectInput = document.getElementById("cardSubject");
const questionInput = document.getElementById("cardQuestion");
const answerInput = document.getElementById("cardAnswer");
const addBtn = document.getElementById("addCardBtn");
const display = document.getElementById("cardDisplay");
const subjectFilter = document.getElementById("subjectFilter");
const levelFilter = document.getElementById("levelFilter");

/* =========================
   状態
========================= */

let allCards = [];
let filteredCards = [];
let currentIndex = 0;

/* =========================
   カード追加
========================= */

if (addBtn) {
  addBtn.onclick = async () => {
    if (!window.currentUser) return alert("ログインしてください");

    const subject = subjectInput.value.trim();
    const question = questionInput.value.trim();
    const answer = answerInput.value.trim();

    if (!question || !answer)
      return alert("問題と答えを入力してください");

    await addDoc(collection(db, "cards"), {
      uid: window.currentUser.uid,
      subject,
      question,
      answer,
      level: 0
    });

    subjectInput.value = "";
    questionInput.value = "";
    answerInput.value = "";

    loadCards();
  };
}

/* =========================
   読み込み
========================= */

async function loadCards() {
  if (!window.currentUser) return;

  const q = query(
    collection(db, "cards"),
    where("uid", "==", window.currentUser.uid)
  );

  const snap = await getDocs(q);

  allCards = [];
  snap.forEach(d => {
    allCards.push({ id: d.id, ...d.data() });
  });

  // 苦手優先（level低い順）
  allCards.sort((a, b) => a.level - b.level);

  generateSubjectFilter();
  applyFilters();
}

/* =========================
   フィルター生成
========================= */

function generateSubjectFilter() {
  if (!subjectFilter) return;

  const subjects = new Set();
  allCards.forEach(c => {
    if (c.subject) subjects.add(c.subject);
  });

  subjectFilter.innerHTML = `<option value="">すべて</option>`;
  subjects.forEach(s => {
    subjectFilter.innerHTML += `<option value="${s}">${s}</option>`;
  });
}

/* =========================
   フィルター適用
========================= */

function applyFilters() {
  const selectedSubject = subjectFilter?.value ?? "";
  const selectedLevel = levelFilter?.value ?? "";

  filteredCards = allCards.filter(card => {
    const subjectMatch =
      !selectedSubject || card.subject === selectedSubject;

    const levelMatch =
      selectedLevel === "" || card.level == selectedLevel;

    return subjectMatch && levelMatch;
  });

  currentIndex = 0;
  showCard();
}

/* =========================
   表示
========================= */

function showCard() {
  if (!display) return;

  if (!filteredCards.length) {
    display.innerHTML = "カードがありません";
    return;
  }

  const card = filteredCards[currentIndex];

  display.innerHTML = `
    <div class="flashcard" id="flashcard">
      <div class="flashcard-face">
        ${card.question}
      </div>
      <div class="flashcard-face flashcard-back">
        <div>
          ${card.answer}
          <div class="card-actions">
            <button data-level="0">😣</button>
            <button data-level="1">😐</button>
            <button data-level="2">😎</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const flashcard = document.getElementById("flashcard");

  flashcard.onclick = () => {
    flashcard.classList.toggle("flip");
  };

  document.querySelectorAll(".card-actions button").forEach(btn => {
    btn.onclick = async (e) => {
      const level = Number(e.target.dataset.level);

      await updateDoc(doc(db, "cards", card.id), {
        level
      });

      nextCard();
    };
  });
}

/* =========================
   次へ
========================= */

function nextCard() {
  currentIndex++;
  if (currentIndex >= filteredCards.length) {
    currentIndex = 0;
  }
  showCard();
}

/* =========================
   フィルターイベント
========================= */

if (subjectFilter) {
  subjectFilter.onchange = applyFilters;
}

if (levelFilter) {
  levelFilter.onchange = applyFilters;
}

/* =========================
   外部公開（auth.js用）
========================= */

window.loadCards = loadCards;
