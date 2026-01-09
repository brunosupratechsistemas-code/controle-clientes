const LOGO_BASE64 = "data:image/png;base64,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";


const PDF_THEME = {
  primary: [88, 61, 158],     // roxo Supra
  secondary: [99, 102, 241],  // azul
  text: [30, 30, 30],
  light: [245, 245, 250]
};
const totaisGerais = {};

import { db } from "./firebase-init.js";
import {
  collection,
  query,
  onSnapshot,
  where,
  getDocs
} from "./firebase-imports.js";

let atividadesAdminCache = [];
let suporteSelecionado = "";

/* =========================
   INICIAR RESUMO ADMIN
========================= */
let unsubResumoAdmin = null;
let resumoChart = null;

export async function startResumoAtividadesAdmin() {
  if (unsubResumoAdmin) unsubResumoAdmin();

  // 🔥 carrega mapa de suportes UMA VEZ
  await carregarMapaSuportesPDF();

  const q = query(collection(db, "atividades_suporte"));

  unsubResumoAdmin = onSnapshot(q, snap => {
    atividadesAdminCache = snap.docs.map(d => d.data());
    atualizarResumoAdmin();
  });
}


export function stopResumoAtividadesAdmin() {
  if (unsubResumoAdmin) {
    unsubResumoAdmin();
    unsubResumoAdmin = null;
  }
}

function atualizarResumoAdmin() {
  gerarResumoAdmin();
}

/* =========================
   GERAR TABELA
========================= */
function gerarResumoAdmin() {
  const body = document.getElementById("admin-resumo-body");
  const footer = document.getElementById("admin-resumo-footer");

  if (!body || !footer) return;

  body.innerHTML = "";
  footer.innerHTML = "";

  const resumo = {};
  const totais = {
    APRESENTACAO: 0,
    TREINAMENTO: 0,
    MIGRACAO: 0,
    PARAMETRIZACAO: 0
  };
atividadesAdminCache.forEach(a => {
  if (
    !a.mesRef ||
    !a.tipo ||
    !a.clienteNome ||
    !a.data
  ) return;


  if (suporteSelecionado && a.suporteId !== suporteSelecionado) return;

  const tipo = String(a.tipo)
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (!resumo[a.mesRef]) {
    resumo[a.mesRef] = {
      APRESENTACAO: 0,
      TREINAMENTO: 0,
      MIGRACAO: 0,
      PARAMETRIZACAO: 0
    };
  }

if (resumo[a.mesRef][tipo] === undefined) return;

  resumo[a.mesRef][tipo]++;
  totais[tipo]++;
});

  const meses = Object.keys(resumo).sort();

 if (!meses.length) {
  body.innerHTML = `
    <tr>
      <td colspan="5" style="text-align:center;opacity:.7;padding:12px;">
        Nenhuma atividade registrada
      </td>
    </tr>
  `;

  // 🔥 ZERA O GRÁFICO
  renderResumoChart({
    APRESENTACAO: 0,
    TREINAMENTO: 0,
    MIGRACAO: 0,
    PARAMETRIZACAO: 0
  });

  return;
}


  meses.forEach(mes => {
    const r = resumo[mes];
    body.innerHTML += `
      <tr>
        <td>${formatarMes(mes)}</td>
        <td>${r.APRESENTACAO}</td>
        <td>${r.TREINAMENTO}</td>
        <td>${r.MIGRACAO}</td>
        <td>${r.PARAMETRIZACAO}</td>
      </tr>
    `;
  });

  footer.innerHTML = `
    <tr class="total-row">
      <td><strong>TOTAL</strong></td>
      <td>${totais.APRESENTACAO}</td>
      <td>${totais.TREINAMENTO}</td>
      <td>${totais.MIGRACAO}</td>
      <td>${totais.PARAMETRIZACAO}</td>
    </tr>
  `;
console.log("Filtro:", suporteSelecionado);
console.log("Totais do gráfico:", totais);

  renderResumoChart(totais);

}

/* =========================
   FILTRO SUPORTE
========================= */
export async function loadResumoSuportesAdmin() {
  const select = document.getElementById("adminResumoSuporte");
  if (!select) return;

  select.innerHTML = `<option value="">👥 Todos os suportes</option>`;

  const snap = await getDocs(
    query(collection(db, "users"), where("role", "==", "suporte"))
  );

  snap.forEach(d => {
    const u = d.data();
    select.innerHTML += `
      <option value="${d.id}">
        ${u.name || u.email}
      </option>
    `;
  });

  select.onchange = e => {
    suporteSelecionado = e.target.value;
    atualizarResumoAdmin();
  };
}

/* =========================
   UTIL
========================= */
function formatarMes(mesRef) {
  const [y, m] = mesRef.split("-");
  const meses = [
    "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
  ];
  return `${meses[Number(m)-1]} ${y}`;
}



function renderResumoChart(totais) {
  const canvas = document.getElementById("adminResumoChart");
  if (!canvas) return;

  if (resumoChart) {
    resumoChart.destroy();
  }

  resumoChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels: [
        "Apresentação",
        "Treinamento",
        "Migração",
        "Parametrização"
      ],
      datasets: [{
        data: [
          totais.APRESENTACAO,
          totais.TREINAMENTO,
          totais.MIGRACAO,
          totais.PARAMETRIZACAO
        ],
        backgroundColor: [
          "#4ade80",
          "#60a5fa",
          "#fbbf24",
          "#a78bfa"
        ],
        borderRadius: 8
      }]
    },
options: {
  plugins: {
    legend: { display: false }
  },
  scales: {
    x: {
      ticks: {
        color: "#ffffff",   // 🔤 texto do eixo X
        font: {
          size: 13,
          weight: "500"
        }
      },
      grid: {
        color: "rgba(255,255,255,0.08)" // linhas verticais
      }
    },
    y: {
      beginAtZero: true,
      ticks: {
        color: "rgba(255,255,255,0.85)",
        precision: 0,
        font: {
          size: 12
        }
      },
      grid: {
        color: "rgba(255,255,255,0.08)" // linhas horizontais
      }
    }
  }
}

  });
}


let mapaSuportesPDF = {};

// carrega suportes uma vez
async function carregarMapaSuportesPDF() {
  const snap = await getDocs(
    query(collection(db, "users"), where("role", "==", "suporte"))
  );

  snap.forEach(d => {
    const u = d.data();
    mapaSuportesPDF[d.id] = u.name || u.email || d.id;
  });
}


window.baixarResumoPDF = function () {
  if (!atividadesAdminCache.length) {
    alert("Nenhuma atividade para gerar o PDF");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("landscape");

  /* =========================
     HEADER
  ========================= */
  // ===== LOGO =====
// ===== HEADER =====
doc.addImage(
  LOGO_BASE64,
  "PNG",
  14,
  10,
  28,
  14
);

doc.setFontSize(17);
doc.setTextColor(30, 30, 30);
doc.text("Relatório de Atividades - SupraTech", 48, 18);

doc.setFontSize(10);
doc.setTextColor(90, 90, 90);
doc.text(
  `Gerado em ${new Date().toLocaleDateString("pt-BR")}`,
  48,
  25
);

// linha separadora
doc.setDrawColor(200);
doc.line(14, 30, 280, 30);


  /* =========================
     AGRUPAR DADOS
  ========================= */
  const porSuporte = {};
  const totaisMes = {
    APRESENTACAO: 0,
    TREINAMENTO: 0,
    MIGRACAO: 0,
    PARAMETRIZACAO: 0
  };

atividadesAdminCache.forEach(a => {
  if (
    !a.mesRef ||
    !a.tipo ||
    !a.clienteNome ||
    !a.data
  ) return;


    const tipo = a.tipo
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    if (!totaisMes[tipo]) totaisMes[tipo] = 0;

    totaisMes[tipo]++;

    const suporteId = a.suporteId || "sem_suporte";

const suporte =
  mapaSuportesPDF[suporteId] ||
  "Sem suporte";


    if (!porSuporte[suporte]) {
      porSuporte[suporte] = {
        APRESENTACAO: 0,
        TREINAMENTO: 0,
        MIGRACAO: 0,
        PARAMETRIZACAO: 0,
        meses: {}
      };
    }

    porSuporte[suporte][tipo]++;

    if (!porSuporte[suporte].meses[a.mesRef]) {
      porSuporte[suporte].meses[a.mesRef] = {
        APRESENTACAO: 0,
        TREINAMENTO: 0,
        MIGRACAO: 0,
        PARAMETRIZACAO: 0
      };
    }

    porSuporte[suporte].meses[a.mesRef][tipo]++;
  });

  /* =========================
     TABELA — TOTAL DO MÊS
  ========================= */
  doc.autoTable({
    startY: 35,
  head: [[
  "Resumo Geral do Mês",
  "Apresentação",
  "Treinamento",
  "Migração",
  "Parametrização"
]],
styles: {
  halign: "center",
  fontStyle: "bold",
  fontSize: 10
},
headStyles: {
  fillColor: [88, 61, 158],
  textColor: [255, 255, 255]
},

    body: [[
      "TOTAL",
      totaisMes.APRESENTACAO,
      totaisMes.TREINAMENTO,
      totaisMes.MIGRACAO,
      totaisMes.PARAMETRIZACAO
    ]],
    styles: {
      halign: "center",
      fontStyle: "bold"
    },
    headStyles: {
      fillColor: [88, 61, 158],
      textColor: [255, 255, 255]
    }
  });

  let cursorY = doc.lastAutoTable.finalY + 15;

  /* =========================
     POR SUPORTE
  ========================= */
  const suportesOrdenados = Object.keys(porSuporte).sort();

for (const suporte of suportesOrdenados) {
    if (cursorY > 160) {
      doc.addPage();
      cursorY = 20;
    }

    doc.setFontSize(14);
    doc.setFontSize(13);
doc.setTextColor(88, 61, 158);
doc.text(`Suporte: ${suporte}`, 14, cursorY);

doc.setDrawColor(88, 61, 158);
doc.line(14, cursorY + 2, 280, cursorY + 2);

cursorY += 6;


    const linhas = Object.keys(porSuporte[suporte].meses)
      .sort()
      .map(mes => [
        formatarMes(mes),
        porSuporte[suporte].meses[mes].APRESENTACAO,
        porSuporte[suporte].meses[mes].TREINAMENTO,
        porSuporte[suporte].meses[mes].MIGRACAO,
        porSuporte[suporte].meses[mes].PARAMETRIZACAO
      ]);

    doc.autoTable({
      startY: cursorY,
      head: [[
        "Mês",
        "Apresentação",
        "Treinamento",
        "Migração",
        "Parametrização"
      ]],
      body: linhas,
      styles: { halign: "center", fontSize: 9 },
      headStyles: {
        fillColor: [99, 102, 241],
        textColor: [255, 255, 255]
      },
      alternateRowStyles: {
        fillColor: [245, 245, 250]
      }
    });

    cursorY = doc.lastAutoTable.finalY + 4;

    const t = porSuporte[suporte];

    doc.autoTable({
      startY: cursorY,
      head: [[
        "TOTAL DO SUPORTE",
        "Apresentação",
        "Treinamento",
        "Migração",
        "Parametrização"
      ]],
      body: [[
        "",
        t.APRESENTACAO,
        t.TREINAMENTO,
        t.MIGRACAO,
        t.PARAMETRIZACAO
      ]],
      styles: {
        halign: "center",
        fontStyle: "bold"
      },
      headStyles: {
        fillColor: [88, 61, 158],
        textColor: [255, 255, 255]
      }
    });

    cursorY = doc.lastAutoTable.finalY + 15;
  }

  /* =========================
     DOWNLOAD
  ========================= */
  doc.save("Relatorio_Atividades_Por_Suporte.pdf");
};
