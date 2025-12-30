/* =========================
   MAIN CONTROLLER
========================= */
console.log("🔥 MAIN.JS CARREGADO");
emailjs.init("-a3VRbvh00ISwTPNX");
let unsubscribeDashboard = null;
import { carregarAtividades, paginaAnterior, paginaProxima } from "./atividades.js";
window.clienteAtual = null;
window.carregarAtividades = carregarAtividades;
window.paginaAnterior = paginaAnterior;
window.paginaProxima = paginaProxima;
import { updateCalendarEvent } from "./calendar.js";
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  startResumoAtividadesAdmin,
  stopResumoAtividadesAdmin,
  loadResumoSuportesAdmin
} from "./admin-atividades.js";


import { limit, orderBy } from "./firebase-imports.js";
// 🔔 ELEMENTOS DO SINO — COLOQUE NO TOPO DO ARQUIVO
const bell = document.getElementById("notif-bell");
const dropdown = document.getElementById("notif-dropdown");
const notifCount = document.getElementById("notif-count");


/* AUTH */
import {
  login as authLogin,
  logout,
  initAuthState
} from "./auth.js";


import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  doc,
  where,
  onSnapshot,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc   // 🔥 ADICIONAR ISTO
} from "./firebase-imports.js";


import { db, auth } from "./firebase-init.js";

/* STATE */
import {
  isAdmin,
  adminUnlocked,
getPendingEmailData,
  clearPendingEmailData,
  setAdminUnlocked
} from "./state.js";

import { session } from "./state.js";

/* 🔥 EXPÕE PARA O CONSOLE E HTML */
window.session = session;

/* CLIENTES */
import {
  startRealtimeClientes,
  startHistoryRealtime,
  saveObservation,
  closeModal,
  loadSuporteFilter   // 🔥 ADICIONAR
} from "./clientes.js";

/* CONTABILIDADES */
import {
  loadContabilidades,
  onContabilidadeChange
} from "./contabilidades-modal.js";

import {
  startContabilidadesRealtime,
  saveContabilidade,
  bindSearchContabilidades
} from "./contabilidades-admin.js";

/* USERS */
import {
  startUsersRealtime,
  createUserAdmin
} from "./users-admin.js";
/* DASHBOARD */
import { startDashboardRealtime } from "./dashboard.js";

/* UTILS */
import { showLoading, hideLoading } from "./utils.js";

import { loadSuportes } from "./suportes.js";
let notifSoundEnabled = true;

/* =========================
   ELEMENTOS GERAIS
========================= */

const loginScreen = document.getElementById("login-screen");
const appScreen = document.getElementById("app");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginError = document.getElementById("login-error");

const adminLockEl = document.getElementById("admin-lock");
const adminAreaEl = document.getElementById("admin-area");
document.getElementById("btn-login")?.addEventListener("click", () => {
  login();
});

/* =========================
   LOGIN
========================= */

window.login = async function () {
  console.log("✅ login() chamado");

  try {
    const email = document.getElementById("email")?.value;
    const password = document.getElementById("password")?.value;

    await authLogin(email, password);

    const err = document.getElementById("login-error");
    if (err) err.innerText = "";

  } catch (error) {
    console.error("❌ Erro no login:", error);
    const err = document.getElementById("login-error");
    if (err) err.innerText = error.message;
  }

const remember = document.getElementById("rememberEmail")?.checked;
const email = emailInput.value;

if (remember) {
  localStorage.setItem("loginEmail", email);
} else {
  localStorage.removeItem("loginEmail");
}


};



/* =========================
   AUTH STATE INIT
========================= */

initAuthState({
  onLoggedOut() {
    loginScreen.style.display = "flex";
    appScreen.style.display = "none";
    adminLockEl.style.display = "none";
    adminAreaEl.style.display = "none";
    
    document.body.classList.remove("admin-open"); 
    document.getElementById("notif-wrapper").style.display = "none";
    
  },

  onLoggedIn(session) {
    
    loginScreen.style.display = "none";
    appScreen.style.display = "block";

    startNotificacoes();
      startNotificacoesAdmin(); 
    startBellNotifications();
// ✅ TABS EXCLUSIVAS DO SUPORTE
const suporteTabs = document.getElementById("suporte-tabs");

if (suporteTabs) {
  // mostra só se NÃO for admin
  suporteTabs.style.display = session?.isAdmin ? "none" : "flex";
}

// por padrão: suporte vê o kanban e não vê atividades

if (!session?.isAdmin) {
  showSuporteTab("kanban");
}

const filterBox = document.getElementById("filter-suporte-box");

if (filterBox) {
  if (session?.isAdmin === true) {
    filterBox.style.display = "block";
    loadSuporteFilter();
  } else {
    filterBox.style.display = "none";
  }
}

const dashFilterBox = document.getElementById("dash-suporte-filter-box");

if (dashFilterBox) {
  dashFilterBox.style.display = session?.isAdmin ? "block" : "none";
}

    adminLockEl.style.display = session.isAdmin ? "block" : "none";
    adminAreaEl.style.display = "none";
    document.getElementById("notif-wrapper").style.display = "block";
    

  },

  startRealtime: startRealtimeClientes,
  startHistoryRealtime
});

/* =========================
   ADMIN LOCK
========================= */
window.unlockAdmin = () => {
  const modal = document.getElementById("modal-unlock-admin");
  const input = document.getElementById("unlockAdminPassword");
  const error = document.getElementById("unlock-admin-error");

  error.innerText = "";
  input.value = "";

  modal.style.display = "flex";

  requestAnimationFrame(() => {
    modal.classList.add("show");
    input.focus();
  });
};

window.closeUnlockAdminModal = () => {
  const modal = document.getElementById("modal-unlock-admin");

  modal.classList.remove("show");

  setTimeout(() => {
    modal.style.display = "none";
  }, 250);
};

window.confirmUnlockAdmin = async () => {
  const pass = document.getElementById("unlockAdminPassword").value;
  const error = document.getElementById("unlock-admin-error");

  if (!pass) {
    error.innerText = "Digite a senha.";
    return;
  }

  try {
    await authLogin(session.user.email, pass);

    setAdminUnlocked(true);
    adminLockEl.style.display = "none";
    adminAreaEl.style.display = "block";
    document.body.classList.add("admin-open");

    closeUnlockAdminModal();
    showAdminTab("users");
  } catch {
    error.innerText = "Senha incorreta.";
  }
};


window.closeUnlockAdminModal = function () {
  const modal = document.getElementById("modal-unlock-admin");
  if (!modal) return;

  modal.style.display = "none";
  document.body.classList.remove("modal-open");
};

document.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    const modal = document.getElementById("modal-unlock-admin");
    if (modal?.style.display === "block") {
      confirmUnlockAdmin();
    }
  }
});

window.lockAdmin = () => {
  adminAreaEl.classList.add("exit");

  setTimeout(() => {
    setAdminUnlocked(false);

    adminAreaEl.style.display = "none";
    adminLockEl.style.display = isAdmin ? "block" : "none";

    adminAreaEl.classList.remove("exit");
    document.body.classList.remove("admin-open");
  }, 250);
};



/* =========================
   ADMIN TABS
========================= */

window.showAdminTab = function (tab) {
  const tabs = [
    "users",
    "history",
    "dashboard",
    "contabilidades",
    "exclusoes",
    "atividades-admin"
  ];

  // 🔁 desativa todas
  tabs.forEach(t => {
    const panel = document.getElementById(`admin-tab-${t}`);
    const btn = document.getElementById(`tab-${t}`);

    if (panel) panel.classList.remove("active");
    if (btn) btn.classList.remove("active");
  });

  // 🎯 ativa a selecionada
  const activePanel = document.getElementById(`admin-tab-${tab}`);
  const activeBtn = document.getElementById(`tab-${tab}`);

  if (activePanel) activePanel.classList.add("active");
  if (activeBtn) activeBtn.classList.add("active");

  /* =========================
     LÓGICA EXISTENTE (INTACTA)
  ========================= */

  if (tab === "exclusoes") startSolicitacoesExclusaoRealtime();

  if (tab === "users") startUsersRealtime();

  if (tab === "dashboard") {
    startDashboardRealtime();
    loadDashboardSuportes();
  }

  if (tab === "contabilidades") {
    startContabilidadesRealtime();
    bindSearchContabilidades();
  }

  if (tab === "atividades-admin") {
    startResumoAtividadesAdmin();
    loadResumoSuportesAdmin();
  }
};


const dashFilter = document.getElementById("dashSuporteFilter");

if (dashFilter) {
  dashFilter.addEventListener("change", e => {
    const suporteId = e.target.value || null;
    startDashboardRealtime(suporteId);
  });
}

/* =========================
   MODAL CLIENTE
========================= */
window.openAddClientModal = async function () {
  openModalById("modal-add-client");

  await loadContabilidades();

  const modalSuporte = document.getElementById("modalSuporte");
  if (!modalSuporte) return;

  if (session?.isAdmin === true) {
    modalSuporte.style.display = "block";
    await loadSuportes();
  } else {
    modalSuporte.style.display = "none";
    modalSuporte.value = "";
  }
};





window.closeAddClientModal = function () {
  closeModalById("modal-add-client");
};

window.onContabilidadeChange = onContabilidadeChange;

/* =========================
   MODAL OBS
========================= */

window.saveObservation = saveObservation;
window.closeModal = closeModal;

/* =========================
   CONTABILIDADES ADMIN
========================= */

window.saveContabilidade = saveContabilidade;

/* =========================
   USUÁRIOS ADMIN
========================= */

window.createUser = async function () {
  const email = document.getElementById("newUserEmail")?.value.trim();
  const password = document.getElementById("newUserPassword")?.value;
  const name = document.getElementById("newUserName")?.value.trim();

  const roleInput = document.querySelector('input[name="userRole"]:checked');
  const role = roleInput ? roleInput.value : "user";

if (!name) {
  mostrarNotificacao("⚠️ Informe o nome do usuário");
  return;
}

if (!email) {
  mostrarNotificacao("⚠️ Informe o e-mail do usuário");
  return;
}

if (!password) {
  mostrarNotificacao("⚠️ Informe a senha");
  return;
}



  try {
    await createUserAdmin({ email, password, name, role });
    mostrarNotificacao("✅ Usuário criado com sucesso", "success");
  } catch (err) {
    console.error(err);
    alert("Erro ao criar usuário.");
  }
};
/* =========================
   CONTABILIDADES - HTML
========================= */

// abrir modal
function closeAllModals() {
  ["modal-add-client", "modal-contabilidade", "modal"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
}

/* =========================
   CONTABILIDADES - HTML
========================= */

window.openCreateContabilidade = function () {
  const modal = document.getElementById("modal-contabilidade");
  if (!modal) return;

  modal.classList.add("show");

  // 🔥 ISSO É O QUE ESTÁ FALTANDO
  document.body.classList.add("modal-open");
  document.documentElement.classList.add("modal-open");

  // se você usa overlay
  document.getElementById("global-overlay")?.classList.add("active");
};


window.closeCreateContabilidade = function () {
  const modal = document.getElementById("modal-contabilidade");
  if (!modal) return;

  modal.classList.remove("show");

  document.body.classList.remove("modal-open");
  document.documentElement.classList.remove("modal-open");
  document.getElementById("global-overlay")?.classList.remove("active");
};


document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    window.closeCreateContabilidade();
  }
});

window.openModalById = function (id) {
  const modal = document.getElementById(id);
  if (!modal) return;

  modal.classList.remove("hide");
  modal.classList.add("show");

  document.getElementById("global-overlay")?.classList.add("active");
  document.documentElement.classList.add("modal-open");
  document.body.classList.add("modal-open");
};


window.closeModalById = function (id) {
  const modal = document.getElementById(id);
  if (!modal) return;

  modal.classList.add("hide");

  setTimeout(() => {
    modal.classList.remove("show", "hide");
    document.getElementById("global-overlay")?.classList.remove("active");
    document.documentElement.classList.remove("modal-open");
    document.body.classList.remove("modal-open");
  }, 250);
};


let loggingOut = false;

window.logout = async function () {
  if (loggingOut) return;
  loggingOut = true;

  try {
    showLoading("Saindo do sistema...");
    stopResumoAtividadesAdmin();
    await new Promise(r => setTimeout(r, 400));
    await logout();
  } finally {
    loggingOut = false;
  }
};



window.confirmAddClient = async function () {
  const name = document.getElementById("modalClientName")?.value.trim();
  const telefone = document.getElementById("modalClientTelefone")?.value.trim();
  const contabilidadeId = document.getElementById("modalContabilidade")?.value;
let suporteId = document.getElementById("modalSuporte")?.value || null;

// 🔥 SE FOR SUPORTE, AUTO-ATRIBUI
if (!session?.isAdmin) {
  suporteId = session.user.uid;
}

  if (!name || !contabilidadeId) {
    alert("Preencha nome e contabilidade");
    return;
  }

  if (!session?.user?.uid) {
    alert("Usuário não autenticado. Recarregue a página.");
    return;
  }

  try {
    showLoading("Salvando cliente...");

    // 🔹 Salva cliente
   const docRef = await addDoc(collection(db, "clientes"), {
  name,
  telefone: telefone || "",
  status: "espera",
  contabilidadeId,
  suporteId,
  criadoPorId: session.user.uid,
  criadoPorNome:
    session.user.name ||
    session.user.displayName ||
    session.user.email,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
});


    // 🔹 Notificação + E-mail
    if (suporteId) {
await addDoc(collection(db, "notificacoes"), {
    tipo: "NOVO_CLIENTE",
    clienteId: docRef.id,
    clienteNome: name,
    suporteId,
    lida: false,
    createdAt: serverTimestamp()
  });





      const supSnap = await getDoc(doc(db, "users", suporteId));

      if (supSnap.exists()) {
        const suporte = supSnap.data();

        try {
          await emailjs.send(
             "service_7segirh",  
            "template_pf5wind",
            {
              suporte_nome: suporte.name,
              cliente_nome: name,
              cliente_telefone: telefone || "Não informado",
              to_email: suporte.email
            }
          );

          console.log("📧 E-mail enviado com sucesso");
        } catch (emailErr) {
          console.error("❌ Erro ao enviar e-mail", emailErr);
        }
      }
    }



    closeModalById("modal-add-client");

  } catch (err) {
    console.error(err);
    alert("Erro ao salvar cliente");
  } finally {
    hideLoading();
  }
};



export function showToast(message) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}


function startNotificacoes() {
  const userId = auth.currentUser.uid;
  const sound = document.getElementById("notif-sound");

  const q = query(
    collection(db, "notificacoes"),
    where("suporteId", "==", userId),
    where("lida", "==", false)
  );

  onSnapshot(q, snap => {
    snap.forEach(async d => {
      const n = d.data();

      showToast(`🆕 Novo cliente atribuído: ${n.clienteNome}`);

      // 🔊 SOM
      if (notifSoundEnabled && sound) {
        sound.currentTime = 0;
        sound.play().catch(() => {});
      }

      await updateDoc(d.ref, { lida: true });
    });
  });
}

window.toggleNotifSound = function () {
  notifSoundEnabled = !notifSoundEnabled;

  const btn = document.getElementById("btnNotifSound");
  if (btn) {
    btn.innerText = notifSoundEnabled ? "🔔 Som: ON" : "🔕 Som: OFF";
  }
};

// =========================
// MODAL CONFIRMAR EMAIL
// =========================
window.openConfirmEmailModal = function () {
  const modal = document.getElementById("modal-confirm-email");
  if (!modal) return;

  modal.style.display = "block";
  document.body.classList.add("modal-open");
};

window.closeConfirmEmailModal = function () {
  const modal = document.getElementById("modal-confirm-email");
  if (!modal) return;

  modal.style.display = "none";
  document.body.classList.remove("modal-open");
};

window.cancelSendEmail = function () {
  clearPendingEmailData();   // limpa dados pendentes
  closeConfirmEmailModal();  // fecha SOMENTE o popup
};


window.confirmSendEmail = async function () {
  const data = getPendingEmailData();
  if (!data) return;

  showLoading("Enviando e-mail...");

  try {
    // 📧 ENVIO (isso está OK)
    const supSnap = await getDoc(doc(db, "users", data.suporteId));
    if (!supSnap.exists()) throw new Error("Suporte não encontrado");

    const suporte = supSnap.data();

    await emailjs.send(
      "service_7segirh",
      "template_pf5wind",
      {
        suporte_nome: suporte.name,
        cliente_nome: data.clienteNome,
        cliente_telefone: data.clienteTelefone || "Não informado",
        to_email: suporte.email
      }
    );

    // 🧾 LOG → NÃO pode quebrar
  try{}catch (logErr) {
      console.warn("⚠️ Log de e-mail não salvo", logErr);
    }

    alert("✅ E-mail enviado com sucesso");

  } catch (err) {
    console.error("❌ Erro REAL no envio", err);
    alert("Erro ao enviar e-mail");
  } finally {
    hideLoading();
    clearPendingEmailData();
    closeConfirmEmailModal();
    closeEditClientModal();
  }
};

function startNotificacoesAdmin() {
  if (!session?.isAdmin) return;

  const sound = document.getElementById("notif-sound");

  const q = query(
    collection(db, "notificacoes_admin"),
    where("lida", "==", false)
  );

  onSnapshot(q, snap => {
    snap.forEach(async d => {
      const n = d.data();

      showToast(
        `🛑 Solicitação de exclusão\nCliente: ${n.clienteNome}\nPor: ${n.solicitadoPorNome}`
      );

      // 🔊 SOM (igual novo cliente)
      if (sound) {
        sound.currentTime = 0;
        sound.play().catch(() => {});
      }

      await updateDoc(d.ref, { lida: true });
    });
  });
}


export function startSolicitacoesExclusaoRealtime() {
  const q = query(
    collection(db, "solicitacoes_exclusao"),
    where("status", "==", "PENDENTE")
  );

  onSnapshot(q, snap => {
    const body = document.getElementById("exclusoes-body");
    if (!body) return;

    body.innerHTML = "";

    if (snap.empty) {
      body.innerHTML = `
        <tr>
          <td colspan="4" class="empty-row">
            Nenhuma solicitação pendente
          </td>
        </tr>
      `;
      return;
    }

    snap.forEach(d => {
      const s = d.data();

      body.innerHTML += `
        <tr>
          <td>${s.clienteNome || "-"}</td>
<td>${s.solicitadoPorNome || s.solicitadoPorEmail || "-"}</td>
          <td>${s.motivo || "-"}</td>
          <td class="actions">
            <button class="btn-approve"
              onclick="aprovarExclusao('${d.id}','${s.clienteId}','${s.solicitadoPor}')">
              ✅ Aprovar
            </button>
            <button class="btn-reject"
              onclick="rejeitarExclusao('${d.id}','${s.solicitadoPor}')">
              ❌ Rejeitar
            </button>
          </td>
        </tr>
      `;
    });
  });
}


window.aprovarExclusao = async function (reqId, clienteId, suporteId) {
  // 🔍 busca dados da solicitação
  const reqSnap = await getDoc(
    doc(db, "solicitacoes_exclusao", reqId)
  );

  let clienteNome = "";

  if (reqSnap.exists()) {
    clienteNome = reqSnap.data().clienteNome || "";
  }

  // ❌ exclui cliente
  await deleteDoc(doc(db, "clientes", clienteId));

  // 📝 atualiza solicitação
  await updateDoc(doc(db, "solicitacoes_exclusao", reqId), {
    status: "APROVADA",
    resolvidoEm: serverTimestamp()
  });

  // 🔔 notifica suporte
  await addDoc(collection(db, "notificacoes"), {
    tipo: "EXCLUSAO_APROVADA",
    suporteId,
    clienteNome,
    lida: false,
    createdAt: serverTimestamp()
  });
};

window.rejeitarExclusao = async function (reqId, suporteId) {
  await updateDoc(doc(db, "solicitacoes_exclusao", reqId), {
    status: "REJEITADA",
    resolvidoEm: serverTimestamp()
  });

  await addDoc(collection(db, "notificacoes"), {
    tipo: "EXCLUSAO_REJEITADA",
    suporteId,
    clienteNome: "",
    lida: false,
    createdAt: serverTimestamp()
  });
};



bell.onclick = () => {
  dropdown.style.display =
    dropdown.style.display === "block" ? "none" : "block";
};
function startBellNotifications() {
  const dropdown = document.getElementById("notif-dropdown");
  const notifCount = document.getElementById("notif-count");

  if (!dropdown || !notifCount) return;

  const isAdmin = session?.isAdmin === true;

  let q;

  if (isAdmin) {
    // 🔐 ADMIN vê apenas notificações de admin
    q = query(
      collection(db, "notificacoes_admin"),
      orderBy("createdAt", "desc"),
      limit(8)
    );
  } else {
    // 🔐 SUPORTE vê apenas as dele
    q = query(
      collection(db, "notificacoes"),
      where("suporteId", "==", auth.currentUser.uid),
      orderBy("createdAt", "desc"),
      limit(8)
    );
  }

  onSnapshot(q, snap => {
    dropdown.innerHTML = "";
    notifCount.innerText = snap.size;

    if (snap.empty) {
      dropdown.innerHTML = `
        <div class="notif-item" style="opacity:.7">
          Nenhuma notificação
        </div>
      `;
      return;
    }

    snap.forEach(d => {
      const n = d.data();

      dropdown.innerHTML += `
        <div class="notif-item">
          <strong>${n.tipo.replaceAll("_", " ")}</strong>
          <small>Cliente: ${n.clienteNome || "-"}</small>
        </div>
      `;
    });
  });
}

async function loadDashboardSuportes() {
  const sel = document.getElementById("dashSuporteFilter");
  if (!sel) return;

  sel.innerHTML = `<option value="">📊 Todos os suportes</option>`;

  const snap = await getDocs(
    query(collection(db, "users"), where("role", "==", "suporte"))
  );

  snap.forEach(d => {
    const u = d.data();

    sel.innerHTML += `
      <option value="${d.id}">
        ${u.name || u.email}
      </option>
    `;
  });
}
window.salvarAtividade = async function () {
  const clienteEl = document.getElementById("atividadeCliente");
  const dataEl = document.getElementById("atividadeData");
  const tipoEl = document.getElementById("atividadeTipo");

  const cliente = clienteEl?.value.trim();
  const data = dataEl?.value;
  const tipo = tipoEl?.value;

  if (!cliente || !data || !tipo) {
    alert("Preencha Cliente, Data e Tipo.");
    return;
  }

  const mesRef = data.slice(0, 7); // YYYY-MM

  await addDoc(collection(db, "atividades_suporte"), {
    clienteNome: cliente,
    data,
    tipo,
    mesRef,
    suporteId: session.user.uid,
    suporteNome: session.user.name || session.user.email,
    createdAt: serverTimestamp()
  });

  clienteEl.value = "";
  alert("✅ Atividade registrada!");

  // atualiza gráfico no mês atual selecionado
};

window.showSuporteTab = function (tab) {
  const kanbanBoard = document.querySelector(".board");
  const addClientBtn = document.querySelector(".add-client");
  const atividadesPanel = document.getElementById("suporte-tab-atividades");
const searchInput = document.getElementById("searchClient");

if (tab === "kanban") {
  if (searchInput) searchInput.style.display = "block";
}

if (tab === "atividades") {
  if (searchInput) searchInput.style.display = "none";
}

  // botões
  const btnKanban = document.getElementById("tab-sup-kanban");
  const btnAtiv = document.getElementById("tab-sup-atividades");

  if (btnKanban) btnKanban.classList.toggle("active", tab === "kanban");
  if (btnAtiv) btnAtiv.classList.toggle("active", tab === "atividades");

  if (tab === "kanban") {
    if (kanbanBoard) kanbanBoard.style.display = "flex";
    if (addClientBtn) addClientBtn.style.display = "block";
    if (atividadesPanel) atividadesPanel.style.display = "none";
    return;
  }

if (tab === "atividades") {
  if (kanbanBoard) kanbanBoard.style.display = "none";
  if (addClientBtn) addClientBtn.style.display = "none";
  if (atividadesPanel) atividadesPanel.style.display = "block";

  carregarAtividades(); // ✅ agora existe global e importada
}
};

function buildISO(dateStr, timeStr) {
  return new Date(`${dateStr}T${timeStr}:00`).toISOString();
}


window.salvarEdicaoAgendamento = async function () {
if (!window.clienteAtual?.id) {
  alert("Cliente não identificado.");
  return;
}


  const data = document.getElementById("editAgData").value;
  const hora = document.getElementById("editAgHora").value;
  const duracao = Number(document.getElementById("editAgDuracao").value || 60);
  const descricao = document.getElementById("editAgDesc").value || "";

  if (!data || !hora) {
    alert("Selecione data e hora.");
    return;
  }

  const startISO = buildISO(data, hora);
  const endISO = new Date(
    new Date(startISO).getTime() + duracao * 60000
  ).toISOString();

  showLoading();

  try {
    const clienteId = window.clienteAtual?.id || selectedCard?.id;

if (!clienteId) {
  alert("Cliente não identificado.");
  return;
}

const ref = doc(db, "clientes", clienteId);

    const snap = await getDoc(ref);

    if (!snap.exists()) {
      alert("Cliente não encontrado.");
      return;
    }

    const cliente = snap.data();

    // 🔄 Atualiza Google Agenda (se existir)
  if (cliente.googleEventId) {
  await updateCalendarEvent(
    cliente.googleEventId,
    {
      start: { dateTime: startISO },
      end: { dateTime: endISO },
      description: descricao
    },
    cliente.googleCreatorEmail || null
  );
}


    // 💾 Atualiza Firestore
    await updateDoc(ref, {
      status: "agendado",
      agendamento: {
        ...(cliente.agendamento || {}),
        data,
        hora,
        duracaoMin: duracao,
        descricao,
        startISO,
        endISO
      },
      updatedAt: serverTimestamp()
    });

    mostrarNotificacao("✅ Agendamento atualizado com sucesso");
    closeModal();

  } catch (err) {
    console.error(err);
    alert("Erro ao atualizar agendamento.");
  } finally {
    hideLoading();
  }
};

window.openModalObservacoes = async function (cliente) {
  try {
    // 🔥 sempre busca versão atual do Firestore
    const snap = await getDoc(doc(db, "clientes", cliente.id));

    if (!snap.exists()) {
      mostrarNotificacao("❌ Cliente não encontrado");
      return;
    }

    const clienteAtualizado = {
      id: snap.id,
      ...snap.data()
    };

    window.clienteAtual = clienteAtualizado;

    // =====================
    // TÍTULO
    // =====================
    const titleEl = document.getElementById("modalTitle");
    if (titleEl) {
      titleEl.innerText = clienteAtualizado.name || "Observações";
    }

    // =====================
    // OBSERVAÇÃO (🔥 ESSENCIAL)
    // =====================
    if (typeof modalTextarea !== "undefined") {
      modalTextarea.value = clienteAtualizado.observation || "";
    }

    // =====================
    // AGENDAMENTO (se existir)
    // =====================
    document.getElementById("editAgData").value =
      clienteAtualizado.agendamento?.data || "";

    document.getElementById("editAgHora").value =
      clienteAtualizado.agendamento?.hora || "";

    document.getElementById("editAgDuracao").value =
      clienteAtualizado.agendamento?.duracaoMin || 60;

    document.getElementById("editAgDesc").value =
      clienteAtualizado.agendamento?.descricao || "";

    // =====================
    // ABRE ABA CORRETA
    // =====================
    if (clienteAtualizado.status === "agendado") {
      abrirAbaObs(
        "agenda",
        document.querySelector(".obs-tabs .tab-btn[data-aba='agenda']")
      );
    } else {
      abrirAbaObs(
        "obs",
        document.querySelector(".obs-tabs .tab-btn[data-aba='obs']")
      );
    }

    // =====================
    // ABRE MODAL
    // =====================
    openModalById("modal");

  } catch (err) {
    console.error("Erro ao abrir observações:", err);
    mostrarNotificacao("❌ Erro ao carregar observações");
  }
};



function getValue(id) {
  const el = document.getElementById(id);
  if (!el) {
    console.error(`Elemento não encontrado: ${id}`);
    return "";
  }
  return el.value;
}

window.showLoading = function () {
  const loading = document.getElementById("global-loading");
  if (loading) loading.style.display = "flex";
};

window.hideLoading = function () {
  const loading = document.getElementById("global-loading");
  if (loading) loading.style.display = "none";
};


window.salvarNovoAgendamento = async function () {
  const data = document.getElementById("agendamentoData")?.value;
  const hora = document.getElementById("agendamentoHora")?.value;
  const duracao = document.getElementById("agendamentoDuracao")?.value;
  const descricao = document.getElementById("agendamentoDesc")?.value;

  if (!data || !hora) {
    alert("Selecione data e hora");
    return;
  }

  showLoading();

  try {
    await addDoc(collection(db, "agendamentos"), {
      clienteId,
      clienteNome,
      data,
      hora,
      duracao: Number(duracao || 60),
      descricao: descricao || "",
      suporteId: auth.currentUser.uid,
      status: "AGENDADO",
      createdAt: serverTimestamp()
    });

    await updateDoc(doc(db, "clientes", clienteId), {
      status: "agendado",
      updatedAt: serverTimestamp()
    });

    mostrarNotificacao("✅ Agendamento criado");
    closeModal();

  } catch (err) {
    console.error(err);
    alert("Erro ao criar agendamento");
  } finally {
    hideLoading();
  }
};


function abrirModalNovoAgendamento() {
  agendamentoAtualId = null;

  document.getElementById("btn-criar-agendamento").style.display = "block";
  document.getElementById("btn-editar-agendamento").style.display = "none";

  openModalById("modal");
}


window.mostrarNotificacao = function (msg) {
  let container = document.getElementById("toast-container");

  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerText = msg;

  container.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 10);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
};

function celebrarFinalizacao(clienteNome) {
  // 🔊 som
  const audio = document.getElementById("celebre-sound");
  if (audio) {
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }

  // 🎉 overlay
  const overlay = document.createElement("div");
  overlay.className = "celebrate-overlay";

  overlay.innerHTML = `
    <div class="celebrate-box">
      🎉 Parabéns!
      <div style="margin-top:6px;font-size:16px;opacity:.85">
        Atendimento finalizado com sucesso
      </div>
      <div class="celebrate-emojis">🎉 🎊 ✨</div>
    </div>
  `;

  document.body.appendChild(overlay);

  setTimeout(() => {
    overlay.remove();
  }, 3000);
}


window.togglePassword = function () {
  const input = document.getElementById("password");
  const icon = document.getElementById("togglePasswordIcon")?.querySelector("i");

  if (!input || !icon) return;

  const isPassword = input.type === "password";

  input.type = isPassword ? "text" : "password";

  icon.classList.toggle("fa-eye", !isPassword);
  icon.classList.toggle("fa-eye-slash", isPassword);

  icon.parentElement.title = isPassword
    ? "Ocultar senha"
    : "Mostrar senha";
};



document.addEventListener("DOMContentLoaded", () => {
  const savedEmail = localStorage.getItem("loginEmail");

  if (savedEmail) {
    emailInput.value = savedEmail;
    document.getElementById("rememberEmail").checked = true;
  }
});


window.forgotPassword = async function () {
  console.log("🔥 forgotPassword clicado");

  const emailInput = document.getElementById("email");
  console.log("📧 input:", emailInput);

  const email = emailInput?.value?.trim();
  console.log("📧 email:", email);

  if (!email) {
    mostrarNotificacao("⚠️ Informe o e-mail para redefinir a senha");
    return;
  }

  try {
    console.log("📨 enviando reset...");
    await sendPasswordResetEmail(auth, email);
    console.log("✅ email enviado");
    mostrarNotificacao("📧 E-mail de redefinição enviado");
  } catch (err) {
    console.error("❌ erro reset senha:", err);
    mostrarNotificacao("❌ Erro ao enviar e-mail");
  }
};

window.openForgotModal = function () {
  const modal = document.getElementById("modal-forgot-password");
  const input = document.getElementById("forgotEmail");

  if (!modal || !input) return;

  input.value = "";
  modal.classList.add("show");

  document.body.classList.add("modal-open");
  document.getElementById("global-overlay")?.classList.add("active");

  setTimeout(() => input.focus(), 100);
};

window.closeForgotModal = function () {
  const modal = document.getElementById("modal-forgot-password");
  if (!modal) return;

  modal.classList.remove("show");
  document.body.classList.remove("modal-open");
  document.getElementById("global-overlay")?.classList.remove("active");
};

window.confirmForgotPassword = async function () {
  const email = document.getElementById("forgotEmail")?.value.trim();

  if (!email) {
    mostrarNotificacao("⚠️ Informe o e-mail");
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
closeForgotModal();
openForgotSuccessModal();
    mostrarNotificacao(
      "📧 E-mail enviado com sucesso! Verifique sua caixa de entrada ou spam."
    );

    closeForgotModal();

  } catch (err) {
    console.error(err);
    mostrarNotificacao("❌ Não foi possível enviar o e-mail");
  }
};

window.openForgotSuccessModal = function () {
  const modal = document.getElementById("modal-forgot-success");
  if (!modal) return;

  modal.classList.add("show");
  document.body.classList.add("modal-open");
  document.getElementById("global-overlay")?.classList.add("active");
};

window.closeForgotSuccessModal = function () {
  const modal = document.getElementById("modal-forgot-success");
  if (!modal) return;

  modal.classList.remove("show");
  document.body.classList.remove("modal-open");
  document.getElementById("global-overlay")?.classList.remove("active");
};





window.gerarResumoAtividades = gerarResumoAtividades;
window.loadDashboardSuportes = loadDashboardSuportes;


