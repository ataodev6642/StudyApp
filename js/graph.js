// studyapp/js/graph.js

import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Firestore 初期化（timer.js と同じ db を使う場合はそのまま利用）
const db = getFirestore();

window.loadGraph = async (uid) => {
  const canvas = document.getElementById("studyGraph");

  if (!canvas) return;

  // Firebase からログ取得
  const q = query(collection(db, "studyLogs"), where("uid", "==", uid));
  const snap = await getDocs(q);

  const subjectMap = {};

  snap.forEach(doc => {
    const data = doc.data();
    if (!subjectMap[data.subject]) subjectMap[data.subject] = 0;
    subjectMap[data.subject] += data.minutes;
  });

  const labels = Object.keys(subjectMap);
  const data = Object.values(subjectMap);

  // 既存の chart があれば破棄
  if (canvas.chartInstance) {
    canvas.chartInstance.destroy();
  }

  // Chart.js で棒グラフ描画
  canvas.chartInstance = new Chart(canvas.getContext("2d"), {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: "勉強時間（分）",
        data: data,
        backgroundColor: "rgba(79, 70, 229, 0.7)",
        borderColor: "rgba(79, 70, 229, 1)",
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        title: { display: true, text: "科目別勉強時間" }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 10 }
        }
      }
    }
  });
};
