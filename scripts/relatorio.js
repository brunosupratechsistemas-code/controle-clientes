/* scripts/relatorio.js */
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const { ChartJSNodeCanvas } = require("chartjs-node-canvas");

// ====== ENV ======
const FIREBASE_SERVICE_ACCOUNT_JSON = process.env.FIREBASE_SERVICE_ACCOUNT_JSON; // JSON inteiro como string
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

if (!FIREBASE_SERVICE_ACCOUNT_JSON) {
  console.error("Faltou FIREBASE_SERVICE_ACCOUNT_JSON");
  process.exit(1);
}
if (!EMAIL_USER || !EMAIL_PASS) {
  console.error("Faltou EMAIL_USER / EMAIL_PASS");
  process.exit(1);
}

const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT_JSON);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// ====== Helpers ======
function getMesAnteriorRef() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function formatarMes(mesRef) {
  const [y, m] = mesRef.split("-");
  const meses = [
    "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
  ];
  return `${meses[Number(m) - 1]} ${y}`;
}

async function getAdminEmails() {
  const snap = await db.collection("users").where("role", "==", "admin").get();
  const emails = [];
  snap.forEach((doc) => {
    const u = doc.data();
    if (u && u.email) emails.push(u.email);
  });
  return [...new Set(emails)];
}

async function carregarMapaSuportes() {
  const snap = await db.collection("users").get();
  const mapa = {};

  snap.forEach((doc) => {
    const u = doc.data() || {};
    mapa[doc.id] = {
      nome: u.name || u.displayName || "",
      email: u.email || ""
    };
  });

  return mapa;
}


async function gerarGraficoPNG(totais) {
  const width = 900;
  const height = 500;
  const chartCanvas = new ChartJSNodeCanvas({
    width,
    height,
    backgroundColour: "white",
  });

  const config = {
    type: "bar",
    data: {
      labels: ["Apresentação", "Treinamento", "Migração", "Parametrização"],
      datasets: [
        {
          label: "Total geral",
          data: [
            totais.APRESENTACAO,
            totais.TREINAMENTO,
            totais.MIGRACAO,
            totais.PARAMETRIZACAO,
          ],
          backgroundColor: ["#22c55e", "#3b82f6", "#f59e0b", "#a855f7"],
          borderRadius: 8,
        },
      ],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
    },
  };

  return chartCanvas.renderToBuffer(config, "image/png");
}

function montarHTMLRelatorio({ mesLabel, porSuporte, totaisGerais }) {
  let html = `
  <div style="font-family:Arial,sans-serif;line-height:1.4">
    <h2>📊 Resumo de Atividades – ${mesLabel}</h2>
    <p><b>Sistema:</b> SupraTech</p>
    <hr/>
    <h3>📌 Totais gerais</h3>
    <ul>
      <li>📊 Apresentações: <b>${totaisGerais.APRESENTACAO}</b></li>
      <li>🎓 Treinamentos: <b>${totaisGerais.TREINAMENTO}</b></li>
      <li>🔄 Migrações: <b>${totaisGerais.MIGRACAO}</b></li>
      <li>⚙️ Parametrizações: <b>${totaisGerais.PARAMETRIZACAO}</b></li>
    </ul>
    <hr/>
    <h3>👥 Por suporte</h3>
  `;

  const suportes = Object.values(porSuporte).sort((a, b) =>
    (a.nome || "").localeCompare(b.nome || "")
  );

  if (!suportes.length) {
    html += `<p style="opacity:.7">Nenhuma atividade registrada nesse mês.</p>`;
  } else {
    suportes.forEach((s) => {
      html += `
      <h4 style="margin-bottom:6px">👤 ${s.nome || s.email || s.id}</h4>
      <ul style="margin-top:0">
        <li>📊 Apresentações: <b>${s.APRESENTACAO}</b></li>
        <li>🎓 Treinamentos: <b>${s.TREINAMENTO}</b></li>
        <li>🔄 Migrações: <b>${s.MIGRACAO}</b></li>
        <li>⚙️ Parametrizações: <b>${s.PARAMETRIZACAO}</b></li>
      </ul>
      `;
    });
  }

  html += `
    <hr/>
    <p style="font-size:12px;color:#666">
      Relatório gerado automaticamente.
    </p>
  </div>
  `;
  return html;
}

// ====== Main ======
(async () => {
  const mesRef = getMesAnteriorRef();
  const mesLabel = formatarMes(mesRef);
const mapaSuportes = await carregarMapaSuportes();

  // Busca atividades do mês anterior
  const snap = await db
    .collection("atividades_suporte")
    .where("mesRef", "==", mesRef)
    .get();

  const porSuporte = {};
  const totaisGerais = {
    APRESENTACAO: 0,
    TREINAMENTO: 0,
    MIGRACAO: 0,
    PARAMETRIZACAO: 0,
  };

  snap.forEach((doc) => {
    const a = doc.data();
    if (!a || !a.suporteId || !a.tipo) return;

    // só conta se for "salvo de verdade"
    const cliente = (a.clienteNome || "").trim();
    const data = (a.data || "").trim();
    if (!cliente || !data) return;

    const tipo = String(a.tipo)
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    if (totaisGerais[tipo] === undefined) return;

if (!porSuporte[a.suporteId]) {
  const info = mapaSuportes[a.suporteId] || {};

  porSuporte[a.suporteId] = {
    id: a.suporteId,
    nome: info.nome || a.suporteNome || "Suporte",
    email: info.email || a.suporteEmail || "",
    APRESENTACAO: 0,
    TREINAMENTO: 0,
    MIGRACAO: 0,
    PARAMETRIZACAO: 0,
  };
}


    porSuporte[a.suporteId][tipo] += 1;
    totaisGerais[tipo] += 1;
  });

  const adminEmails = await getAdminEmails();
  if (!adminEmails.length) {
    console.log("Nenhum admin encontrado (users.role == admin).");
    process.exit(0);
  }

  const html = montarHTMLRelatorio({ mesLabel, porSuporte, totaisGerais });
  const pngBuffer = await gerarGraficoPNG(totaisGerais);

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
  });

  const subject = `📊 Resumo de Atividades – ${mesLabel} | SupraTech`;

  await transporter.sendMail({
    from: `SupraTech Relatórios <${EMAIL_USER}>`,
    to: adminEmails.join(","),
    subject,
    html: html + `<p><b>📈 Gráfico (anexo)</b></p>`,
    attachments: [
      {
        filename: `grafico-${mesRef}.png`,
        content: pngBuffer,
        contentType: "image/png",
      },
    ],
  });

  console.log("✅ Relatório enviado para:", adminEmails.join(", "));
})();




