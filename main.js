/* =========================
   MAIN CONTROLLER
========================= */

/* AUTH */
import {
  login,
  logout,
  initAuthState
} from "./auth.js";

import {
  collection,
  addDoc,
  serverTimestamp
} from "./firebase-imports.js";

import { db, auth } from "./firebase-init.js";

/* STATE */
import {
  session,
  isAdmin,
  adminUnlocked,
  setAdminUnlocked
} from "./state.js";

/* CLIENTES */
import {
  startRealtimeClientes,
  startHistoryRealtime,
  saveObservation,
  closeModal
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

/* =========================
   LOGIN
========================= */

window.login = async function () {
  try {
    await login(emailInput.value, passwordInput.value);
    if (loginError) loginError.innerText = "";
  } catch (err) {
    if (loginError) loginError.innerText = err.message;
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
  },

  onLoggedIn(session) {
    loginScreen.style.display = "none";
    appScreen.style.display = "block";

    adminLockEl.style.display = session.isAdmin ? "block" : "none";
    adminAreaEl.style.display = "none";
  },

  startRealtime: startRealtimeClientes,
  startHistoryRealtime
});

/* =========================
   ADMIN LOCK
========================= */

window.unlockAdmin = async () => {
  const pass = prompt("Digite sua senha:");
  if (!pass) return;

  try {
    await login(session.user.email, pass);
    setAdminUnlocked(true);
    adminLockEl.style.display = "none";
    adminAreaEl.style.display = "block";
    showAdminTab("users");
  } catch {
    alert("Senha incorreta.");
  }
};

window.lockAdmin = () => {
  setAdminUnlocked(false);
  adminAreaEl.style.display = "none";
  adminLockEl.style.display = isAdmin ? "block" : "none";
};

/* =========================
   ADMIN TABS
========================= */

window.showAdminTab = function (tab) {
  const tabs = ["users", "history", "dashboard", "contabilidades"];

  tabs.forEach(t => {
    const panel = document.getElementById(`admin-tab-${t}`);
    const btn = document.getElementById(`tab-${t}`);
    if (panel) panel.style.display = tab === t ? "block" : "none";
    if (btn) btn.classList.toggle("active", tab === t);
  });

  if (tab === "users") startUsersRealtime();
  if (tab === "dashboard") startDashboardRealtime();
  if (tab === "contabilidades") {
    startContabilidadesRealtime();
    bindSearchContabilidades();
  }
};

/* =========================
   MODAL CLIENTE
========================= */
window.openAddClientModal = async function () {
  openModalById("modal-add-client");

  await loadContabilidades();

  const telInput = document.getElementById("modalTelefone");
  if (telInput) {
    telInput.value = "";
    telInput.disabled = true;
  }

  const modalSuporte = document.getElementById("modalSuporte");
  if (session.isAdmin && modalSuporte) {
    modalSuporte.style.display = "block";
    await loadSuportes();
  } else if (modalSuporte) {
    modalSuporte.style.display = "none";
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

  if (!email || !password || !name) {
    alert("Preencha todos os campos.");
    return;
  }

  try {
    await createUserAdmin({ email, password, name, role });
    alert("Usuário criado com sucesso!");
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

window.openCreateContabilidade = function () {
  closeAllModals();
  openModalById("modal-contabilidade");
};

window.closeCreateContabilidade = function () {
  closeModalById("modal-contabilidade");
};


// salvar
window.saveContabilidade = saveContabilidade;

// editar
// (essas duas já estão definidas no contabilidades-admin.js como window.)
window.closeCreateContabilidade = function () {
  const modal = document.getElementById("modal-contabilidade");
  if (modal) modal.style.display = "none";
};
document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    closeCreateContabilidade();
  }
});

function openModalById(id) {
  const modal = document.getElementById(id);
  if (!modal) return;

  document.body.classList.add("modal-open");
  modal.style.display = "block";
}

function closeModalById(id) {
  const modal = document.getElementById(id);
  if (!modal) return;

  modal.style.display = "none";
  document.body.classList.remove("modal-open");
}

let loggingOut = false;

window.logout = async function () {
  if (loggingOut) return;
  loggingOut = true;

  try {
    showLoading("Saindo do sistema...");
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
  const suporteId = document.getElementById("modalSuporte")?.value || null;

  if (!name || !contabilidadeId) {
    alert("Preencha nome e contabilidade");
    return;
  }

  const user = auth.currentUser;

  if (!user) {
    alert("Sessão inválida. Recarregue a página.");
    return;
  }

  try {
    showLoading("Salvando cliente...");

    await addDoc(collection(db, "clientes"), {
      name,
      telefone: telefone || "",

      status: "espera",

      contabilidadeId,
      suporteId,

      criadoPorId: user.uid,
      criadoPorNome:
        session.user?.name ||
        session.user?.nome ||
        session.user?.displayName ||
        user.email,

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    closeModalById("modal-add-client");

  } catch (err) {
    console.error(err);
    alert("Erro ao salvar cliente");
  } finally {
    hideLoading();
  }
};





