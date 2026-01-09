/* =========================
   DASHBOARD
========================= */

import {
  collection,
  onSnapshot,
  query,
  where          
} from "./firebase-imports.js";

import { db } from "./firebase-init.js";

import {
  chartStatus,
  setChartStatus,
  unsubscribeDashboard,
  setUnsubscribeDashboard
} from "./state.js";

/* =========================
   ELEMENTOS
========================= */

const dashTotal = document.getElementById("dashTotal");
const dashEspera = document.getElementById("dashEspera");
const dashAgendado = document.getElementById("dashAgendado");
const dashFinalizado = document.getElementById("dashFinalizado");

const canvasStatus = document.getElementById("chartStatus");

/* =========================
   RENDER DASHBOARD
========================= */

export function startDashboardRealtime(suporteId = null) {
  if (unsubscribeDashboard) unsubscribeDashboard();

  let q;

  // 🔎 FILTRO POR SUPORTE
  if (suporteId) {
    q = query(
      collection(db, "clientes"),
      where("suporteId", "==", suporteId)
    );
  } else {
    // 📊 TODOS OS CLIENTES
    q = query(collection(db, "clientes"));
  }

  const unsub = onSnapshot(q, snap => {
    let total = 0;
    let espera = 0;
    let agendado = 0;
    let finalizado = 0;

    snap.forEach(docSnap => {
      const d = docSnap.data();
      total++;

      if (d.status === "espera") espera++;
      else if (d.status === "agendado") agendado++;
      else if (d.status === "finalizado") finalizado++;
    });

    /* Atualiza números */
    if (dashTotal) dashTotal.innerText = total;
    if (dashEspera) dashEspera.innerText = espera;
    if (dashAgendado) dashAgendado.innerText = agendado;
    if (dashFinalizado) dashFinalizado.innerText = finalizado;

    renderChart(espera, agendado, finalizado);
  });

  setUnsubscribeDashboard(unsub);
}


/* =========================
   CHART
========================= */

function renderChart(espera, agendado, finalizado) {
  if (!canvasStatus) return;

  if (chartStatus) chartStatus.destroy();

  const chart = new Chart(canvasStatus, {
    type: "doughnut",
    data: {
      labels: ["Espera", "Agendado", "Finalizado"],
      datasets: [
        {
          data: [espera, agendado, finalizado],
          backgroundColor: ["#e53935", "#fbc02d", "#43a047"],
          borderWidth: 2,
          borderColor: "#2b2352"
        }
      ]
    },
    options: {
      cutout: "65%",
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: "#fff" }
        }
      }
    }
  });

  setChartStatus(chart);
}
