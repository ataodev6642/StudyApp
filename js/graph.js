// studyapp/js/graph.js
import { db } from "./firebase.js";
import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

/* ===== グラフ更新 ===== */
async function updateGraph() {
  if (!window.currentUser) return;

  const canvas = document.getElementById("studyGraph");
  if (!canvas || typeof Chart === "undefined") return;

  const uid = window.currentUser.uid;

  // Firestore からログ取得
  const q = query(
    collection(db, "studyLogs"),
    where("uid", "==", uid)
  );

  const snap = await getDocs(q);

  const subjectMap = {};

  snap.forEach(docSnap => {
    const data = docSnap.data();
    if (!data.subject) return;

    subjectMap[data.subject] ??= 0;
    subjectMap[data.subject] += data.minutes;
  });

  const labels = Object.keys(subjectMap);
  const values = Object.values(subjectMap);

  // 既存グラフ破棄
  if (canvas.chartInstance) {
    canvas.chartInstance.destroy();
  }

  // グラフ描画
  canvas.chartInstance = new Chart(canvas.getContext("2d"), {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "勉強時間（分）",
        data: values
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: "科目別 勉強時間"
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

/* ===== グローバル公開 ===== */
window.updateGraph = updateGraph;
