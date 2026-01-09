/* =========================
   FIREBASE SDKs
========================= */

import {
  getDocs,
  writeBatch
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

document.getElementById("searchClient").addEventListener("input", (e) => {
  const term = e.target.value.toLowerCase();
  const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "[]");

  const filtered = cached.filter(c =>
    (c.name || "").toLowerCase().includes(term)
  );

  renderClients(filtered);
});
let session = {
  isAdmin: false,
  user: null,
  userName: ""
};
window.openAddClientModal = async function () {
  document.getElementById("modal-add-client").style.display = "block";

  await loadContabilidades();

  const telInput = document.getElementById("modalTelefone");
  telInput.value = "";
  telInput.disabled = true;

  if (session.isAdmin) {
    document.getElementById("modalSuporte").style.display = "block";
    await loadSuportes();
  } else {
    document.getElementById("modalSuporte").style.display = "none";
  }
};


window.closeAddClientModal = function () {
  document.getElementById("modal-add-client").style.display = "none";
};
let contabilidadesCache = {};

async function loadContabilidades() {
  const sel = document.getElementById("modalContabilidade");
  const search = document.getElementById("contabilidadeSearch");

  sel.innerHTML = "";
  contabilidadesCache = {};

  const snap = await getDocs(collection(db, "contabilidades"));

  snap.forEach(docSnap => {
    const c = docSnap.data();
    contabilidadesCache[docSnap.id] = c;

    sel.innerHTML += `
      <option value="${docSnap.id}">
        ${c.nome}
      </option>
    `;
  });

  // 🔍 busca por nome
  search.oninput = () => {
    const term = search.value.toLowerCase();
    sel.innerHTML = "";

    Object.entries(contabilidadesCache).forEach(([id, c]) => {
      if (c.nome.toLowerCase().includes(term)) {
        sel.innerHTML += `
          <option value="${id}">
            ${c.nome}
          </option>
        `;
      }
    });
  };
}

window.onContabilidadeChange = function () {
  const contId = document.getElementById("modalContabilidade").value;
  const telInput = document.getElementById("modalTelefone");

  if (!contId) {
    telInput.value = "";
    telInput.disabled = true;
    return;
  }

  const cont = contabilidadesCache[contId];

  if (cont && cont.telefone) {
    telInput.value = cont.telefone;
    telInput.disabled = true;
  } else {
    telInput.value = "";
    telInput.disabled = false;
    telInput.placeholder = "Digite o telefone";
  }
};

async function loadSuportes() {
  const sel = document.getElementById("modalSuporte");
  sel.innerHTML = `<option value="">Selecione o suporte</option>`;

  const q = query(
    collection(db, "users"),
    where("role", "==", "suporte"),
    where("active", "==", true)
  );

  const snap = await getDocs(q);

  snap.forEach(d => {
    sel.innerHTML += `
      <option value="${d.id}">
        ${d.data().name}
      </option>
    `;
  });
}
window.confirmAddClient = async function () {
  const name = document.getElementById("modalClientName").value.trim();
  const contId = document.getElementById("modalContabilidade").value;
  const telefone = document.getElementById("modalTelefone").value.trim();

  if (!name || !contId) {
    alert("Preencha nome e contabilidade");
    return;
  }

  if (!telefone) {
    alert("Informe o telefone");
    return;
  }

  const cont = contabilidadesCache[contId];
  const now = Date.now(); // 🔥 ESSENCIAL

await addDoc(collection(db, "clientes"), {
  name,
  status: "espera",

  criadoPorId: auth.currentUser.uid,
  criadoPorNome: currentUserName,

  createdAtClient: Date.now(),
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
});



  closeAddClientModal();
};



import { sendPasswordResetEmail } 
from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  getDoc,
  setDoc,
  where,
  limit
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

/* =========================
   FIREBASE CONFIG
========================= */
const firebaseConfig = {
  apiKey: "AIzaSyB5Gz3N_JRxwgtisX_e6I9zGqrMjThents",
  authDomain: "controle-clientes-3a04b.firebaseapp.com",
  projectId: "controle-clientes-3a04b"
};

window.resetUserPassword = async function (email) {
  if (!adminUnlocked) return;

  const confirm = window.confirm(
    `Enviar email de redefinição de senha para:\n${email}?`
  );
  if (!confirm) return;

  try {
    await sendPasswordResetEmail(auth, email);
    alert("Email de redefinição enviado com sucesso.");
  } catch {
    alert("Erro ao enviar email.");
  }
};


/* =========================
   INIT
========================= */
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// auth secundário (criar usuário sem deslogar admin)
const secondaryApp = initializeApp(firebaseConfig, "secondary");
const secondaryAuth = getAuth(secondaryApp);

/* =========================
   ELEMENTOS
========================= */
window.togglePassword = function () {
  const input = document.getElementById("password");
  input.type = input.type === "password" ? "text" : "password";
};

const loginScreen = document.getElementById("login-screen");
const appScreen = document.getElementById("app");

const email = document.getElementById("email");
const password = document.getElementById("password");
const loginError = document.getElementById("login-error");

const clientName = document.getElementById("clientName");

const colEspera = document.getElementById("espera");
const colAgendado = document.getElementById("agendado");
const colFinalizado = document.getElementById("finalizado");

const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const modalTextarea = document.getElementById("modalTextarea");

const adminLockEl = document.getElementById("admin-lock");
const adminAreaEl = document.getElementById("admin-area");

const newUserEmail = document.getElementById("newUserEmail");
const newUserPassword = document.getElementById("newUserPassword");
const newUserName = document.getElementById("newUserName"); // ✅ precisa existir no HTML
const createUserMsg = document.getElementById("createUserMsg");

/* Dashboard */
const dashTotal = document.getElementById("dashTotal");
const dashEspera = document.getElementById("dashEspera");
const dashAgendado = document.getElementById("dashAgendado");
const dashFinalizado = document.getElementById("dashFinalizado");

const canvasStatus = document.getElementById("chartStatus");
const canvasCriacao = document.getElementById("chartCriacao");

/* Histórico */
const historyBody = document.getElementById("historyBody");
const historyCount = document.getElementById("historyCount");

/* =========================
   ESTADO GLOBAL
========================= */
let selectedCard = null;

let unsubscribeRealtime = null;
let unsubscribeHistory = null;
let unsubscribeDashboard = null;

let isAdmin = false;
let adminUnlocked = false;

let currentUserName = "";
let historyAll = [];
let historyFiltered = [];

/* ✅ drag seguro (não depende do DOM) */
let draggedInfo = null;

/* Chart.js */
let chartStatus = null;
let chartCriacao = null;

/* =========================
   LOGIN / LOGOUT
========================= */
window.login = async function () {
  const loading = document.getElementById("login-loading");

  try {
    loading.style.display = "flex";

    await signInWithEmailAndPassword(
      auth,
      email.value,
      password.value
    );

    loginError.innerText = "";

    // deixa o loading aparecer pelo menos um pouquinho
    setTimeout(() => {
      loading.style.display = "none";
    }, 400);

  } catch (err) {
    loading.style.display = "none";
    loginError.innerText = "E-mail ou senha inválidos";
  }
};

function showLoading(text = "Processando...") {
  const el = document.getElementById("global-loading");
  const txt = document.getElementById("loading-text");
  if (txt) txt.innerText = text;
  el.style.display = "flex";
}

function hideLoading() {
  const el = document.getElementById("global-loading");
  el.style.display = "none";
}


window.logout = async () => {
  showLoading("Saindo do sistema...");
  await signOut(auth);
  setTimeout(hideLoading, 400);
};


/* =========================
   AUTH STATE
========================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    if (unsubscribeRealtime) unsubscribeRealtime();
    if (unsubscribeHistory) unsubscribeHistory();
    if (unsubscribeDashboard) unsubscribeDashboard();


    unsubscribeRealtime = null;
    unsubscribeHistory = null;
    unsubscribeDashboard = null;

    loginScreen.style.display = "flex";
    appScreen.style.display = "none";
    adminLockEl.style.display = "none";
    adminAreaEl.style.display = "none";
    return;
    
  }

  loginScreen.style.display = "none";
  appScreen.style.display = "block";

  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  // primeiro login cria doc do usuário
  if (!snap.exists()) {
    await setDoc(userRef, {
      email: user.email,
      name: user.email,
      role: "admin",
      createdAt: serverTimestamp()
    });
  }

  const snap2 = await getDoc(userRef);
  const udata = snap2.data() || {};

  session.user = user;
session.userName = udata.name || user.email;
session.isAdmin = udata.role === "admin";

  isAdmin = udata.role === "admin";
  currentUserName = udata.name || user.email;
  adminUnlocked = false;
  
if (udata.active === false) {
  alert("Usuário desativado. Contate o administrador.");
  await signOut(auth);
  return;
}

  adminLockEl.style.display = isAdmin ? "block" : "none";
  adminAreaEl.style.display = "none";

  startRealtime();

  if (isAdmin) {
    startHistoryRealtime(); // ✅ histórico sempre carregando, mas só aparece se abrir a aba
  } else {
    if (unsubscribeHistory) unsubscribeHistory();
    unsubscribeHistory = null;
  }
});

/* =========================
   ADMIN LOCK
========================= */
window.unlockAdmin = async () => {
  const pass = prompt("Digite sua senha:");
  if (!pass) return;

  try {
    await signInWithEmailAndPassword(auth, auth.currentUser.email, pass);
    adminUnlocked = true;
    adminLockEl.style.display = "none";
    adminAreaEl.style.display = "block";
    showAdminTab("users");
  } catch {
    alert("Senha incorreta.");
  }
};

window.lockAdmin = () => {
  adminUnlocked = false;
  adminAreaEl.style.display = "none";
  adminLockEl.style.display = isAdmin ? "block" : "none";
};

/* =========================
   ADMIN TABS
========================= */
window.showAdminTab = (tab) => {
  const tabs = ["users", "history", "dashboard", "contabilidades"];
  tabs.forEach((t) => {
    const panel = document.getElementById(`admin-tab-${t}`);
    const btn = document.getElementById(`tab-${t}`);
    if (panel) panel.style.display = tab === t ? "block" : "none";
    if (btn) btn.classList.toggle("active", tab === t);
    if (tab === "users") startUsersRealtime();


  });

  if (tab === "history") renderHistory(historyFiltered);
  if (tab === "dashboard") renderDashboard();
    if (tab === "contabilidades") startContabilidadesRealtime();

};

/* =========================
   CRIAR USUÁRIO (com nome)
========================= */
window.createUser = async () => {
  if (!adminUnlocked) return;

  const emailVal = newUserEmail.value.trim();
  const passVal = newUserPassword.value;
  const nameVal = newUserName.value.trim();

  const roleInput = document.querySelector('input[name="userRole"]:checked');
  const roleVal = roleInput ? roleInput.value : "user";

  createUserMsg.innerText = "";

  if (!emailVal || !passVal || !nameVal) {
    createUserMsg.innerText = "Preencha todos os campos.";
    createUserMsg.style.color = "#ff5252";
    return;
  }

  try {
    const cred = await createUserWithEmailAndPassword(
      secondaryAuth,
      emailVal,
      passVal
    );

    await setDoc(doc(db, "users", cred.user.uid), {
      email: emailVal,
      name: nameVal,
      role: roleVal,
      active: true,
      createdAt: serverTimestamp()
    });

    await signOut(secondaryAuth);

    createUserMsg.innerText = "Usuário criado com sucesso!";
    createUserMsg.style.color = "#a5ff9e";

    newUserEmail.value = "";
    newUserPassword.value = "";
    newUserName.value = "";

  } catch (err) {
    console.error(err);
    createUserMsg.innerText = "Erro ao criar usuário.";
    createUserMsg.style.color = "#ff5252";
  }
};



function startUsersRealtime() {
  const q = query(collection(db, "users"));

  onSnapshot(q, (snap) => {
    const body = document.getElementById("usersBody");
    body.innerHTML = "";

    snap.forEach((docSnap) => {
      const u = docSnap.data();
      const uid = docSnap.id;

      const isSelf = uid === auth.currentUser.uid;
      const isInactive = u.active === false;

      body.innerHTML += `
        <tr style="${isInactive ? "opacity:0.5;" : ""}">
          <td>${escapeHtml(u.name || "")}</td>
          <td>${escapeHtml(u.email || "")}</td>
          <td>${escapeHtml(u.role || "user")}</td>
          <td style="display:flex; gap:6px; flex-wrap:wrap;">

            <button class="btn-reset"
              onclick="resetUserPassword('${u.email}')">
              🔑 Reset
            </button>

            ${
              !isSelf && !isInactive
                ? `<button class="btn-danger"
                     onclick="deactivateUser('${uid}', '${escapeHtml(u.name || u.email)}')">
                     🚫 Desativar
                   </button>`
                : ""
            }

            ${
              !isSelf && isInactive
                ? `<button class="btn-success"
                     onclick="reactivateUser('${uid}', '${escapeHtml(u.name || u.email)}')">
                     ♻️ Reativar
                   </button>`
                : ""
            }

            ${
              isInactive
                ? `<span style="font-size:12px;opacity:0.8;">Desativado</span>`
                : ""
            }

          </td>
        </tr>
      `;
    });
  });
}



import { updatePassword } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

async function changeUserPassword(email, oldPass, newPass) {
  if (!adminUnlocked) return;

  try {
    const cred = await signInWithEmailAndPassword(
      secondaryAuth,
      email,
      oldPass
    );

    await updatePassword(cred.user, newPass);
    await signOut(secondaryAuth);

    alert("Senha alterada com sucesso.");

  } catch {
    alert("Erro ao alterar senha.");
  }
}

/* =========================
   HISTÓRICO - SALVAR
========================= */
async function logHistorico(payload) {
  try {
    await addDoc(collection(db, "historico"), {
      ...payload,
      userId: auth.currentUser?.uid || null,
      userEmail: auth.currentUser?.email || null,
      userName: currentUserName || null, // ✅ nome do usuário
      createdAt: serverTimestamp()
    });
  } catch {}
}

/* =========================
   ADD CLIENTE (criado por + data)
========================= */
window.addClient = async function () {
  const name = clientName.value.trim();
  if (!name) return;

  const now = Date.now();

  await addDoc(collection(db, "clientes"), {
    name,
    status: "espera",
    ownerId: auth.currentUser.uid,
    ownerName: currentUserName,
    createdAtClient: now,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
};

/* =========================
   KANBAN - UTIL
========================= */
function containerByStatus(s) {
  return s === "agendado" ? colAgendado : s === "finalizado" ? colFinalizado : colEspera;
}

function fmtDateFromDoc(data) {
  try {
    if (data.createdAtClient) return new Date(data.createdAtClient).toLocaleString("pt-BR");
    if (data.createdAt?.toDate) return data.createdAt.toDate().toLocaleString("pt-BR");
    return "";
  } catch {
    return "";
  }
}

/* =========================
   CRIAR CARD (com data/hora + criado por)
========================= */
function createCard(data) {
  const card = document.createElement("div");
  card.className = "client-card";
  card.draggable = true;
  card.dataset.id = data.id;

  const nameEl = document.createElement("div");
  nameEl.className = "client-name";
  nameEl.textContent = data.name || "Sem nome";

  // ✅ DUPLO CLIQUE PARA EDITAR NOME
 nameEl.ondblclick = async () => {
  const nomeAtual = nameEl.textContent;
  const novoNome = prompt("Editar nome do cliente:", nomeAtual);

  if (!novoNome || novoNome.trim() === nomeAtual) return;

  showLoading("Atualizando nome do cliente...");

  try {
    // 1️⃣ Atualiza o cliente
   await updateDoc(doc(db, "clientes", draggedInfo.id), {
  status: para,
  criadoPorId: draggedInfo.criadoPorId, // 🔥 TEM QUE IR
  updatedAt: serverTimestamp()
});


    // 2️⃣ Atualiza histórico (se existir)
    const qh = query(
      collection(db, "historico"),
    );

    const snap = await getDocs(qh);

    if (!snap.empty) {
      const batch = writeBatch(db);
      snap.forEach(docSnap => {
        batch.update(docSnap.ref, {
          clienteNome: novoNome.trim()
        });
      });
      await batch.commit();
    }

    // 3️⃣ Registra ação
    await logHistorico({
      clienteId: data.id,
      clienteNome: novoNome.trim(),
      acao: "ALTEROU_NOME"
    });

  } catch (err) {
    console.error(err);
    alert("Erro ao alterar nome do cliente.");
  } finally {
    // 🔥 GARANTE que o loading SEMPRE fecha
    hideLoading();
  }
};


  const metaEl = document.createElement("div");
  metaEl.className = "client-meta";
  metaEl.textContent = fmtDateFromDoc(data) + (data.ownerName ? " • " + data.ownerName : "");

  const tooltip = document.createElement("div");
  tooltip.className = "tooltip";
  tooltip.textContent = data.observation || "";

  const editBtn = document.createElement("button");
  editBtn.className = "edit-btn";
  editBtn.textContent = "✏️";
  editBtn.onclick = (e) => {
    e.stopPropagation();
    openModal(card, data);
  };

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-btn";
  deleteBtn.textContent = "🗑";
  deleteBtn.onclick = async (e) => {
    e.stopPropagation();
    if (!confirm(`Excluir "${data.name}"?`)) return;

    showLoading("Excluindo cliente...");
    await deleteDoc(doc(db, "clientes", data.id));
    await logHistorico({
      clienteId: data.id,
      clienteNome: data.name,
      acao: "EXCLUIU"
    });
    hideLoading();
  };

  card.addEventListener("dragstart", () => {
    draggedInfo = {
      id: data.id,
      name: nameEl.textContent,
      from: card.parentElement?.id || ""
    };
    card.classList.add("dragging");
  });

  card.addEventListener("dragend", () => {
    draggedInfo = null;
    card.classList.remove("dragging");
  });

  card.append(nameEl, metaEl, editBtn, deleteBtn, tooltip);
  return card;
}


/* =========================
   DRAG & DROP (corrigido)
========================= */
document.querySelectorAll(".card-container").forEach((container) => {
  container.addEventListener("dragover", (e) => e.preventDefault());

  container.addEventListener("drop", async () => {
    if (!draggedInfo?.id) return;

    const para = container.id;
    if (draggedInfo.from === para) return;

    await updateDoc(doc(db, "clientes", draggedInfo.id), {
      status: para,
      updatedAt: serverTimestamp()
    });

    await logHistorico({
      clienteId: draggedInfo.id,
      clienteNome: draggedInfo.name,
      acao: "MOVEU_STATUS",
      de: draggedInfo.from,
      para
    });
  });
});

/* =========================
   MODAL OBS
========================= */
function openModal(card, data) {
  selectedCard = { el: card, id: data.id };
  modalTitle.innerText = "Observações - " + (data.name || "");
  modalTextarea.value = data.observation || "";
  modal.style.display = "block";
}

window.closeModal = () => (modal.style.display = "none");

window.saveObservation = async () => {
  if (!selectedCard?.id) return;

  showLoading("Salvando observações...");

  const text = modalTextarea.value;

  await updateDoc(doc(db, "clientes", selectedCard.id), {
    observation: text,
    updatedAt: serverTimestamp()
  });

  await logHistorico({
    clienteId: selectedCard.id,
    clienteNome: selectedCard.el.querySelector(".client-name").innerText,
    acao: "EDITOU_OBSERVACAO"
  });

  closeModal();
  hideLoading();
};


/* =========================
   REALTIME CLIENTES (por usuário)
========================= */
function startRealtime() {
  if (unsubscribeRealtime) unsubscribeRealtime();

  const q = query(
    collection(db, "clientes"),
    orderBy("createdAtClient", "desc")
  );

  unsubscribeRealtime = onSnapshot(q, (snapshot) => {
    const list = [];

    snapshot.forEach(docSnap => {
      list.push({ id: docSnap.id, ...docSnap.data() });
    });

    renderClients(list);
  });
}


function renderClients(list) {
  colEspera.innerHTML = "";
  colAgendado.innerHTML = "";
  colFinalizado.innerHTML = "";

  list.forEach(data => {
    const card = createCard(data);
    containerByStatus(data.status || "espera").appendChild(card);
  });
}



/* =========================
   REALTIME HISTÓRICO (admin)
========================= */
function startHistoryRealtime() {
  if (unsubscribeHistory) unsubscribeHistory();

  const qh = query(
    collection(db, "historico"),
    orderBy("createdAt", "desc"),
    limit(500)
  );

  unsubscribeHistory = onSnapshot(qh, (snap) => {
    historyAll = [];
    snap.forEach((d) => historyAll.push({ id: d.id, ...d.data() }));
    historyFiltered = [...historyAll];
    renderHistory(historyFiltered);
  });
}

function fmtTS(ts) {
  try {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString("pt-BR");
  } catch {
    return "";
  }
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderHistory(list) {
  if (!historyBody) return;

  if (!list || list.length === 0) {
    historyBody.innerHTML = `<tr><td colspan="6" style="text-align:center;opacity:0.85;">Sem registros</td></tr>`;
    if (historyCount) historyCount.innerText = "0 registros";
    return;
  }

  historyBody.innerHTML = list.map((h) => {
    const user = h.userName || h.userEmail || "";
    return `
      <tr>
        <td>${escapeHtml(fmtTS(h.createdAt))}</td>
        <td>${escapeHtml(h.acao || "")}</td>
        <td>${escapeHtml(h.clienteNome || "")}</td>
        <td>${escapeHtml(h.de || "")}</td>
        <td>${escapeHtml(h.para || "")}</td>
        <td class="col-user">${escapeHtml(user)}</td>
      </tr>
    `;
  }).join("");

  if (historyCount) historyCount.innerText = `${list.length} registro(s)`;
}

/* filtros (se você usa os botões do HTML) */
window.applyHistoryFilters = () => {
  const search = (document.getElementById("historySearch")?.value || "").trim().toLowerCase();
  const action = document.getElementById("historyAction")?.value || "";

  historyFiltered = historyAll.filter((h) => {
    const matchAction = !action || h.acao === action;
    if (!search) return matchAction;

    const blob = [
      h.clienteNome,
      h.userName,
      h.userEmail,
      h.acao,
      h.de,
      h.para
    ].join(" ").toLowerCase();

    return matchAction && blob.includes(search);
  });

  renderHistory(historyFiltered);
};

window.clearHistoryFilters = () => {
  const s = document.getElementById("historySearch");
  const a = document.getElementById("historyAction");
  if (s) s.value = "";
  if (a) a.value = "";
  historyFiltered = [...historyAll];
  renderHistory(historyFiltered);
};

/* =========================
   DASHBOARD (corrigido + por usuário)
========================= */
function renderDashboard() {
  if (unsubscribeDashboard) unsubscribeDashboard();

  const q = query(
    collection(db, "clientes")
  );

  unsubscribeDashboard = onSnapshot(q, (snap) => {
    let total = 0;
    let espera = 0;
    let agendado = 0;
    let finalizado = 0;

    snap.forEach((docSnap) => {
      const d = docSnap.data();
      total++;

      if (d.status === "espera") espera++;
      else if (d.status === "agendado") agendado++;
      else if (d.status === "finalizado") finalizado++;
    });

    // Atualiza números
    dashTotal.innerText = total;
    dashEspera.innerText = espera;
    dashAgendado.innerText = agendado;
    dashFinalizado.innerText = finalizado;

    // Destrói gráfico antigo
    if (chartStatus) chartStatus.destroy();

    // Cria gráfico novo
    chartStatus = new Chart(canvasStatus, {
      type: "doughnut",
      data: {
        labels: ["Espera", "Agendado", "Finalizado"],
        datasets: [{
          data: [espera, agendado, finalizado],
          backgroundColor: ["#e53935", "#fbc02d", "#43a047"],
          borderWidth: 2,
          borderColor: "#2b2352"
        }]
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
  });
}


window.deactivateUser = async function (uid, name) {
  if (!adminUnlocked) return;

  const confirm = window.confirm(
    `Deseja DESATIVAR o usuário ${name}?\nEle não poderá mais acessar o sistema.`
  );
  if (!confirm) return;

  try {
    await updateDoc(doc(db, "users", uid), {
      active: false,
      deactivatedAt: serverTimestamp()
    });

    alert("Usuário desativado com sucesso.");

  } catch {
    alert("Erro ao desativar usuário.");
  }
};

window.reactivateUser = async function (uid, name) {
  if (!adminUnlocked) return;

  const confirm = window.confirm(
    `Deseja REATIVAR o usuário ${name}?\nEle poderá acessar o sistema novamente.`
  );
  if (!confirm) return;

  try {
    await updateDoc(doc(db, "users", uid), {
      active: true,
      reactivatedAt: serverTimestamp()
    });

    alert("Usuário reativado com sucesso.");

  } catch {
    alert("Erro ao reativar usuário.");
  }
};
clientName.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    window.addClient();
  }
});
window.openCreateContabilidade = function () {
  const modal = document.getElementById("modal-contabilidade");

  if (!modal) {
    alert("Modal de contabilidade não encontrado (id=modal-contabilidade).");
    return;
  }

  modal.style.display = "block";

  const nome = document.getElementById("contNome");
  if (nome) nome.focus();
};
document.getElementById("searchContAdmin")?.addEventListener("input", e => {
  const term = e.target.value.toLowerCase();
  const filtered = contabilidadesAdminCache.filter(c =>
    c.nome.toLowerCase().includes(term)
  );
  renderContabilidadesAdmin(filtered);
});


window.saveContabilidade = async () => {
  const nomeEl = document.getElementById("contNome");
  const telEl = document.getElementById("contTelefone");
  const modalEl = document.getElementById("modal-contabilidade");

  const nome = (nomeEl?.value || "").trim();
  const telefone = (telEl?.value || "").trim();

  if (!nome) {
    alert("Informe o nome");
    return;
  }

  try {
    // (opcional) loading
    if (typeof showLoading === "function") showLoading("Salvando contabilidade...");

    const ref = await addDoc(collection(db, "contabilidades"), {
      nome,
      telefone,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // limpa campos
    if (nomeEl) nomeEl.value = "";
    if (telEl) telEl.value = "";

    // fecha modal
    if (modalEl) modalEl.style.display = "none";

    // ✅ Se o select do modal "Novo Cliente" existir, atualiza ele
    const selectModalCliente = document.getElementById("modalContabilidade");
    if (selectModalCliente) {
      await loadContabilidades();
      selectModalCliente.value = ref.id;
      // dispara change para preencher telefone automaticamente
      if (typeof window.onContabilidadeChange === "function") window.onContabilidadeChange();
    }

    alert("Contabilidade criada com sucesso!");

  } catch (err) {
    console.error("Erro ao salvar contabilidade:", err);
    alert("Erro ao salvar contabilidade. Veja o console (F12).");
  } finally {
    if (typeof hideLoading === "function") hideLoading();
  }
};



window.editContabilidade = async (id) => {
  const ref = doc(db, "contabilidades", id);
  const snap = await getDoc(ref)

  /* =========================
   CONTABILIDADES - ADMIN
========================= */

let contabilidadesAdminCache = [];
let unsubscribeContabilidades = null;

function startContabilidadesRealtime() {
  if (unsubscribeContabilidades) unsubscribeContabilidades();

  const body = document.getElementById("contabilidadesBody");

  body.innerHTML = `
    <tr>
      <td colspan="3" style="text-align:center; opacity:.7">
        Carregando contabilidades...
      </td>
    </tr>
  `;

  const q = query(collection(db, "contabilidades"));

  unsubscribeContabilidades = onSnapshot(q, snap => {
    contabilidadesAdminCache = [];
    body.innerHTML = "";

    if (snap.empty) {
      body.innerHTML = `
        <tr>
          <td colspan="3" style="text-align:center; opacity:.7">
            Nenhuma contabilidade cadastrada
          </td>
        </tr>
      `;
      return;
    }

    snap.forEach(docSnap => {
      const c = docSnap.data();
      contabilidadesAdminCache.push({
        id: docSnap.id,
        nome: c.nome || "",
        telefone: c.telefone || ""
      });
    });

    renderContabilidades(contabilidadesAdminCache);
  });
}

function renderContabilidades(list) {
  const body = document.getElementById("contabilidadesBody");
  body.innerHTML = "";

  list.forEach(c => {
    body.innerHTML += `
      <tr>
        <td>${escapeHtml(c.nome)}</td>
        <td>${escapeHtml(c.telefone)}</td>
        <td class="actions">
          <button class="btn-icon" onclick="editContabilidade('${c.id}')">✏️</button>
          <button class="btn-icon danger" onclick="deleteContabilidade('${c.id}')">🗑</button>
        </td>
      </tr>
    `;
  });
}

/* 🔎 Filtro */
const searchContAdmin = document.getElementById("searchContAdmin");

if (searchContAdmin) {
  searchContAdmin.addEventListener("input", e => {
    const term = e.target.value.toLowerCase().trim();
    const filtered = contabilidadesAdminCache.filter(c =>
      c.nome.toLowerCase().includes(term)
    );
    renderContabilidades(filtered);
  });
}
;
  if (!snap.exists()) return;

  const c = snap.data();

  const nome = prompt("Nome:", c.nome);
  if (!nome) return;

  const telefone = prompt("Telefone:", c.telefone || "");

  await updateDoc(ref, {
    nome,
    telefone,
    updatedAt: serverTimestamp()
  });
};
window.deleteContabilidade = async (id) => {
  if (!confirm("Deseja excluir esta contabilidade?")) return;

  await deleteDoc(doc(db, "contabilidades", id));
};


const CACHE_KEY = "clientes_cache_v1";

