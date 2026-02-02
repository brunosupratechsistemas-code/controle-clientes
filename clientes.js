/* =========================
   CLIENTES
========================= */
let clientesCache = [];
let editingClientId = null;
const suporteCache = {};
let oldSuporteId = null;
let suporteFiltroAtivo = null;
let clienteParaExclusao = null;
let modalAberto = false;
let clienteParaExcluir = null;

import { session } from "./state.js";

import {
  collection,
  addDoc,
  doc,
  getDoc,          // 🔥 ADICIONAR ISSO
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  getDocs,
  writeBatch,
  where, 
  serverTimestamp
} from "./firebase-imports.js";

import {
  createCalendarEvent,
  extrairMeetLink,
  ensureGoogleAccessToken,
  deleteCalendarEvent,
  updateCalendarEvent
} from "./calendar.js";

import { db, auth } from "./firebase-init.js";

import {
  draggedInfo,
  selectedCard,
  historyAll,
  historyFiltered,
  setDraggedInfo,
  setSelectedCard,
  setHistoryAll,
  setHistoryFiltered,
  setUnsubscribeRealtime,
  setPendingEmailData,
  setUnsubscribeHistory
} from "./state.js";

import {
  escapeHtml,
  fmtTS,
  fmtDateFromDoc,
  showLoading,
  hideLoading,
  formatarDataBR,
  containerByStatus
} from "./utils.js";

function getCalendarIdFromSuporte(suporteId, suporteEmail) {
  // ✅ Se o suporte tem email cadastrado e você usa o próprio email como calendarId
  if (suporteEmail && suporteEmail.includes("@")) {
    return suporteEmail;
  }

  // ✅ Se ainda não tiver, tenta usar suporteId como fallback (não ideal)
  if (suporteId) {
    return suporteId;
  }

  throw new Error("Suporte sem calendarId/email configurado");
}



/* =========================
   ELEMENTOS
========================= */
function normalizarTelefoneBR(raw) {
  if (!raw) return "";

  // remove tudo que não for número
  let num = String(raw).replace(/\D/g, "");

  // remove zeros à esquerda
  num = num.replace(/^0+/, "");

  // se tiver 10 ou 11 dígitos → adiciona DDI
  if (num.length === 10 || num.length === 11) {
    num = "55" + num;
  }

  // valida tamanho final (Brasil com DDI = 12 ou 13)
  if (num.length < 12 || num.length > 13) {
    console.warn("⚠️ Telefone inválido após normalização:", raw, num);
    return "";
  }

  return num;
}


const colEspera = document.getElementById("espera");
const colAgendado = document.getElementById("agendado");
const colFinalizado = document.getElementById("finalizado");

const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const modalTextarea = document.getElementById("modalTextarea");

const historyBody = document.getElementById("historyBody");
const historyCount = document.getElementById("historyCount");

window.openEditClientModal = async function (cliente) {
  editingClientId = cliente.id;
  oldSuporteId = cliente.suporteId || null; // 🔥 ESSENCIAL

  document.getElementById("editClientName").value = cliente.name || "";
  document.getElementById("editClientTelefone").value = cliente.telefone || "";

  const suporteSelect = document.getElementById("editClientSuporte");
  suporteSelect.innerHTML = `<option value="">Selecione o suporte</option>`;
const contSelect = document.getElementById("editClientContabilidade");
if (contSelect) {
  contSelect.innerHTML = `<option value="">Sem contabilidade</option>`;

  const snapCont = await getDocs(collection(db, "contabilidades"));

  snapCont.forEach(d => {
    const c = d.data();
    const opt = document.createElement("option");
    opt.value = d.id;
    opt.textContent = c.nome || "Contabilidade";

    if (d.id === cliente.contabilidadeId) opt.selected = true;

    contSelect.appendChild(opt);
  });
}

  if (session?.isAdmin === true) {
    const snap = await getDocs(
      query(collection(db, "users"), where("role", "==", "suporte"))
    );

    snap.forEach(d => {
      const u = d.data();
      const opt = document.createElement("option");
      opt.value = d.id;
      opt.textContent = u.name || u.email;

      if (d.id === cliente.suporteId) opt.selected = true;
      suporteSelect.appendChild(opt);
    });

    suporteSelect.style.display = "block";
  } else {
    suporteSelect.style.display = "none";
  }
  document.getElementById("modal-edit-client").classList.add("show");
document.body.classList.add("modal-open");

};







window.closeEditClientModal = function () {
  editingClientId = null;
  document.getElementById("modal-edit-client").classList.remove("show");

  document.body.classList.remove("modal-open");
};

/* =========================
   HISTÓRICO
========================= */

async function logHistorico(payload) {
  try {
    await addDoc(collection(db, "historico"), {
      ...payload,
      userId: auth.currentUser?.uid || null,
      userEmail: auth.currentUser?.email || null,
      createdAtClient: Date.now(), // 🔥 número, imediato
createdAt: serverTimestamp(),
updatedAt: serverTimestamp()

    });
  } catch {}
}

/* =========================
   KANBAN
========================= */

function createCard(data, options = {}) {
  const readonly = options?.readonly === true;
  const isSuporte = session?.isAdmin !== true;

  const card = document.createElement("div");
  card.className = "client-card";
  card.dataset.id = data.id;

  // por padrão: kanban = arrastável
  card.draggable = !readonly;

  const nameEl = document.createElement("div");
  nameEl.className = "client-name";


  if (readonly && isSuporte) {
    card.draggable = false;
  }

  // ...

  let suporteNome = data.suporteNome || "";


  // 🔥 só depois que card/nameEl existem, pode buscar suporte
  if (!suporteNome && data.suporteId) {
    getDoc(doc(db, "users", data.suporteId)).then(snap => {
      if (snap.exists()) {
        suporteNome = snap.data().name || "";

        // atualiza somente o trecho suporte
        card.querySelector(".client-support")?.remove();
        if (suporteNome) {
          const supEl = document.createElement("div");
          supEl.className = "client-support";
          supEl.innerText = `🛠 ${suporteNome}`;
          nameEl.appendChild(supEl);
        }
      }
    });
  }

  nameEl.innerHTML = `
    <strong>${escapeHtml(data.name || "Sem nome")}</strong>

    ${data.telefone ? `
      <div class="client-phone">📞 ${escapeHtml(data.telefone)}</div>
    ` : ""}

    ${suporteNome ? `
      <div class="client-support">🛠 ${escapeHtml(suporteNome)}</div>
    ` : ""}
  `;


  /* Duplo clique: editar nome */
  
nameEl.ondblclick = () => {
  window.openEditClientModal(data);
};

  const meta = document.createElement("div");
meta.className = "client-meta";

const dataFmt = formatarDataBR(data.agendamento?.data);
const criadoPor = data.criadoPorNome || "Usuário";
const dataComp = fmtDateFromDoc(data);
meta.innerHTML = `
  🕒 ${dataComp}
  <br>
  👤 ${escapeHtml(criadoPor)}
`;


  const editBtn = document.createElement("button");
  editBtn.className = "edit-btn";
  editBtn.textContent = "✏️";
  editBtn.onclick = e => {
    e.stopPropagation();
    openModal(card, data);
  };

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-btn";
  deleteBtn.textContent = "🗑";
deleteBtn.onclick = e => {
  e.stopPropagation();

  // 🔐 se for suporte, mantém fluxo existente
  if (!session?.isAdmin) {
    solicitarExclusaoCliente(data);
    return;
  }

  // 🔥 admin → modal de confirmação
  openDeleteClienteModal(data);
};

// 🔐 REGRAS PARA FINALIZADOS DO SUPORTE
if (readonly && session?.isAdmin !== true) {
  editBtn.remove();
  deleteBtn.remove();
  nameEl.ondblclick = null;
  card.draggable = false;
}


// TOOLTIP (observações)
if (data.observation && data.observation.trim()) {
  const tooltip = document.createElement("div");
  tooltip.className = "tooltip";
  tooltip.innerText = data.observation;
  card.appendChild(tooltip);
}

card.addEventListener("dragstart", () => {
  if (!data || !data.id) {
    console.warn("⛔ dragstart sem data válida");
    return;
  }

  const fromCol = card.closest(".card-container")?.id || null;
  if (!fromCol) {
    console.warn("⛔ drag fora do kanban ignorado");
    return;
  }

  setDraggedInfo({
    id: data.id,
    name: data.name || "Cliente",
    from: fromCol
  });

  card.classList.add("dragging");
});


  card.addEventListener("dragend", () => {
    setDraggedInfo(null);
    card.classList.remove("dragging");
  });
// 🕒 MOSTRA HORÁRIO AGENDADO
if (data.agendamento?.data && data.agendamento?.hora) {
  const info = document.createElement("div");
  info.style.fontSize = "12px";
  info.style.opacity = "0.85";
  info.style.marginTop = "4px";
const dataFmt = formatarDataBR(data.agendamento.data);
info.innerText = `Agenda: ${dataFmt} às ${data.agendamento.hora}`;
  card.appendChild(info);
}
const actions = document.createElement("div");
actions.className = "client-actions";

if ((data.status || "") === "agendado") {
  const calBtn = document.createElement("button");
  calBtn.className = "google-btn";

  if (data.googleEventId && data.googleHtmlLink) {
    calBtn.textContent = "✅ Abrir";
    calBtn.onclick = (e) => {
      e.stopPropagation();
      window.open(data.googleHtmlLink, "_blank");
    };
  } else {
    calBtn.textContent = "📅 Google";
    calBtn.onclick = (e) => {
      e.stopPropagation();
      window.openAgendamentoModal({
        clienteId: data.id,
        clienteNome: data.name || "Cliente"
      });
    };
  }

  actions.appendChild(calBtn); // ✅ AQUI
}

  actions.appendChild(editBtn);
actions.appendChild(deleteBtn);

card.append(nameEl, meta, actions);
return card;




}

function getMesAtual() {
  const agora = new Date();
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
}

function getMesFinalizado(data) {
  // 1️⃣ prioridade: campo oficial
  if (data.finalizadoMes) return data.finalizadoMes;

  // 2️⃣ tenta finalizadoEm
  let baseDate = data.finalizadoEm?.toDate?.();

  // 3️⃣ fallback: updatedAt
  if (!baseDate && data.updatedAt?.toDate) {
    baseDate = data.updatedAt.toDate();
  }

  // 4️⃣ fallback antigo
  if (!baseDate && typeof data.createdAtClient === "number") {
    baseDate = new Date(data.createdAtClient);
  }

  if (!baseDate) return null;

  return `${baseDate.getFullYear()}-${String(
    baseDate.getMonth() + 1
  ).padStart(2, "0")}`;
}



function renderClients(list) {
  colEspera.innerHTML = "";
  colAgendado.innerHTML = "";
  colFinalizado.innerHTML = "";

  const mesAtual = getMesAtual();

  list.forEach(data => {
    if (data.status === "finalizado") {
      // ✅ prioridade total: finalizadoMes
      const mesFinal = data.finalizadoMes || getMesFinalizado(data);

      // 🔒 se não tem mês, NÃO deixa aparecer no Kanban (cliente antigo “bugado”)
      if (!mesFinal) return;

      // ✅ se for de outro mês, NÃO mostra no Kanban
      if (mesFinal !== mesAtual) return;

      colFinalizado.appendChild(createCard(data));
      return;
    }

    if (data.status === "agendado") {
      colAgendado.appendChild(createCard(data));
      return;
    }

    colEspera.appendChild(createCard(data));
  });
}




/* =========================
   DRAG & DROP
========================= */
document.querySelectorAll(".card-container").forEach((container) => {
  container.addEventListener("dragover", (e) => e.preventDefault());
  

  container.addEventListener("drop", async () => {
        const info = draggedInfo; // ✅ congela para não virar null

    if (!info?.id) return;

    const para = container.id;
if (!info?.id || !para || info.from === para) return;

    // ✅ se for agendado, abre modal e NÃO salva status agora
    if (para === "agendado") {
      window.openAgendamentoModal({
        clienteId: info.id,
        clienteNome: info.name
      });
      return;
    }

    // comportamento normal pros outros
    await updateDoc(doc(db, "clientes", info.id), {
      status: para,
      updatedAt: serverTimestamp()
    });

 if (para === "finalizado") {
  const agora = new Date();
  const mesFinalizado = `${agora.getFullYear()}-${String(
    agora.getMonth() + 1
  ).padStart(2, "0")}`;

  await updateDoc(doc(db, "clientes", info.id), {
    status: "finalizado",
    finalizadoEm: serverTimestamp(),
    finalizadoMes: mesFinalizado,
    updatedAt: serverTimestamp()
  });

  celebrarFinalizacao(info?.name || "Cliente");
  mostrarNotificacao("🎉 Atendimento finalizado com sucesso!");
}


    await logHistorico({
      clienteId: info.id,
      clienteNome: info.name,
      acao: "MOVEU_STATUS",
      de: info.from,
      para
    });
  });
});



/* =========================
   MODAL OBSERVAÇÃO
========================= */

function openModal(card, data) {
  const abaAgenda = document.getElementById("aba-agenda");

if (abaAgenda) {
  abaAgenda.style.display =
    data.status === "agendado" ? "block" : "none";
}

  modalAberto = true;
  setSelectedCard({ el: card, id: data.id });
window.clienteAtual = { id: data.id, ...data };

  modalTitle.innerText = "Observações - " + (data.name || "");
if (data.status === "agendado" && data.agendamento) {
  document.getElementById("editAgData").value = data.agendamento.data;
  document.getElementById("editAgHora").value = data.agendamento.hora;
  document.getElementById("editAgDuracao").value = data.agendamento.duracaoMin;
  document.getElementById("editAgDesc").value = data.agendamento.descricao || "";
  const tipoSalvo = data.agendamento?.tipo || "TREINAMENTO";
const selectTipo = document.getElementById("editAgTipo");
const outroInput = document.getElementById("editAgTipoOutro");

if (selectTipo) {
  const opcoesFixas = ["TREINAMENTO", "APRESENTACAO", "MIGRACAO", "OUTRO"];
  if (opcoesFixas.includes(tipoSalvo)) {
    selectTipo.value = tipoSalvo;
    window.onEditAgTipoChange?.(tipoSalvo);
    if (outroInput) outroInput.value = "";
  } else {
    selectTipo.value = "OUTRO";
    window.onEditAgTipoChange?.("OUTRO");
    if (outroInput) outroInput.value = tipoSalvo;
  }
}

}

  const phoneEl = document.getElementById("modalClientPhone");
  if (phoneEl) {
    phoneEl.innerText = data.telefone ? `📞 ${data.telefone}` : "";
  }

  modalTextarea.value = data.observation || "";
  openSystemModal("modal"); // ⬅️ ID do modal de observações
  // 🔥 CONTROLA VISIBILIDADE DA ABA AGENDAMENTO
const tabAgendaBtn = document.querySelector(
  ".obs-tabs .tab-btn[data-aba='agenda']"
);

if (tabAgendaBtn) {
  // mostra só se estiver agendado
  tabAgendaBtn.style.display =
    data.status === "agendado" ? "inline-flex" : "none";
}

abrirAbaObs("obs", document.querySelector(".obs-tabs .tab-btn"));
// 🔁 carrega preferências de WhatsApp automático
// =========================
// 🔁 CARREGAR WHATSAPP AUTOMÁTICO
// =========================
const chkCliente = document.getElementById("agWaCliente");
const chkSuporte = document.getElementById("agWaSuporte");

// regra:
// - se waAuto NÃO existir → true
// - se existir → respeita valor salvo
if (chkCliente) {
  chkCliente.checked = data.waAuto?.cliente !== false;
}

if (chkSuporte) {
  chkSuporte.checked = data.waAuto?.suporte !== false;
}

  loadObsMeta(data);
  
}


export function closeModal() {
  modalAberto = false;
  closeSystemModal("modal"); // ⬅️ mesmo ID
}


export async function saveObservation() {
  if (!selectedCard?.id) return;

  showLoading("Salvando observações...");

  const novaObs = (modalTextarea?.value || "").trim();
  const clienteId = selectedCard.id;

  try {
    /* =========================
       1) SALVA NO FIRESTORE
    ========================= */
   // 🔹 lê os checkboxes de WhatsApp automático
const enviarWaCliente =
  document.getElementById("agWaCliente")?.checked ?? true;

const enviarWaSuporte =
  document.getElementById("agWaSuporte")?.checked ?? true;

await updateDoc(doc(db, "clientes", clienteId), {
  observation: novaObs,

  // 🔥 NOVO: controle de WhatsApp automático
  waAuto: {
    cliente: enviarWaCliente,
    suporte: enviarWaSuporte
  },

  updatedAt: serverTimestamp()
  
});

fetch("https://supratech-whatsapp.fly.dev/sync-wa-jobs", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    clienteId,
    enviarParaCliente: enviarWaCliente === true,
    enviarParaSuporte: enviarWaSuporte === true
  })
}).catch(err => {
  console.warn("⚠️ Falha ao sincronizar jobs WhatsApp", err);
});


    /* =========================
   🔁 SINCRONIZA WA AUTO LOCAL
========================= */

// 1) atualiza clienteAtual (modal)
if (window.clienteAtual?.id === clienteId) {
  window.clienteAtual.waAuto = {
    cliente: enviarWaCliente,
    suporte: enviarWaSuporte
  };
}

// 2) atualiza cache do kanban
const idxWa = clientesCache.findIndex(c => c.id === clienteId);
if (idxWa !== -1) {
  clientesCache[idxWa].waAuto = {
    cliente: enviarWaCliente,
    suporte: enviarWaSuporte
  };
}


    /* =========================
       2) ATUALIZA CACHE LOCAL
    ========================= */
    const idx = clientesCache.findIndex(c => c.id === clienteId);
    if (idx !== -1) {
      clientesCache[idx].observation = novaObs;
    }

    /* =========================
       3) ATUALIZA clienteAtual
    ========================= */
    if (window.clienteAtual?.id === clienteId) {
      window.clienteAtual.observation = novaObs;
    }

    /* =========================
       4) SINCRONIZA TEXTAREA
    ========================= */
    if (modalTextarea) {
      modalTextarea.value = novaObs;
    }

    /* =========================
       5) ATUALIZA CARD VISUAL
       (BUSCA PELO DOM REAL)
    ========================= */
    const cardEl = document.querySelector(
      `.client-card[data-id="${clienteId}"]`
    );

    if (cardEl) {
      // remove tooltip antigo
      cardEl.querySelector(".tooltip")?.remove();

      // cria novo tooltip se houver observação
      if (novaObs) {
        const tooltip = document.createElement("div");
        tooltip.className = "tooltip";
        tooltip.innerText = novaObs;
        cardEl.appendChild(tooltip);
      }
    }

    /* =========================
       6) HISTÓRICO
    ========================= */
    await logHistorico({
      clienteId,
      clienteNome:
        cardEl?.querySelector(".client-name strong")?.innerText || "",
      acao: "EDITOU_OBSERVACAO"
    });

    /* =========================
       7) FEEDBACK
    ========================= */
    mostrarNotificacao("💾 Observação salva com sucesso");

    /* =========================
       8) FECHA MODAL (DEPOIS)
    ========================= */
    setTimeout(() => {
      closeModal();
    }, 50);

  } catch (err) {
    console.error("Erro ao salvar observação:", err);
    mostrarNotificacao("❌ Erro ao salvar observação");
  } finally {
    hideLoading();
  }
}




/* =========================
   REALTIME
========================= */

export function startRealtimeClientes() {
  const q = query(
    collection(db, "clientes"),
    orderBy("createdAt", "desc")
  );

onSnapshot(q, snapshot => {
  const list = [];
  const userId = auth.currentUser?.uid;
  const isAdmin = session?.isAdmin === true;

  snapshot.forEach(docSnap => {
    const data = { id: docSnap.id, ...docSnap.data() };

    const isSuporteResponsavel =
      data.suporteId && data.suporteId === userId;

    if (isAdmin || isSuporteResponsavel || data.id === editingClientId) {
  list.push(data);
}
  });

  // 🔥 NÃO SOBRESCREVE CACHE SE MODAL ABERTO
  if (!modalAberto) {
    clientesCache = [...list];
    aplicarFiltroKanban();
  }
});


}



/* =========================
   HISTÓRICO REALTIME (ADMIN)
========================= */

export function startHistoryRealtime() {
  const qh = query(
    collection(db, "historico"),
    orderBy("createdAt", "desc"),
    limit(500)
  );

  const unsub = onSnapshot(qh, snap => {
    const all = [];
    snap.forEach(d => all.push({ id: d.id, ...d.data() }));
    setHistoryAll(all);
    setHistoryFiltered([...all]);
    renderHistory(historyFiltered);
  });

  setUnsubscribeHistory(unsub);
}

function renderHistory(list) {
  if (!historyBody) return;

  if (!list.length) {
    historyBody.innerHTML =
      `<tr><td colspan="6" style="text-align:center;opacity:.7">Sem registros</td></tr>`;
    if (historyCount) historyCount.innerText = "0 registros";
    return;
  }

  historyBody.innerHTML = list.map(h => `
    <tr>
      <td>${escapeHtml(fmtTS(h.createdAt))}</td>
      <td>${escapeHtml(h.acao || "")}</td>
      <td>${escapeHtml(h.clienteNome || "")}</td>
      <td>${escapeHtml(h.de || "")}</td>
      <td>${escapeHtml(h.para || "")}</td>
      <td>${escapeHtml(h.userEmail || "")}</td>
    </tr>
  `).join("");

  if (historyCount) historyCount.innerText = `${list.length} registro(s)`;
}

async function loadObsMeta(cliente) {
  const metaCard = document.getElementById("obs-meta-card");
  if (!metaCard) return;

  // 🔥 sempre esconder antes
  metaCard.style.display = "none";

  const userId = auth.currentUser?.uid;

  const isAdmin = session?.isAdmin === true;
  const isSuporteResponsavel =
    cliente.suporteId &&
    cliente.suporteId === userId;

  /* 🔐 REGRA FINAL */
  if (!isAdmin && !isSuporteResponsavel) {
    return; // 🚫 não mostra nada
  }

  try {
    /* =====================
       CONTABILIDADE
    ===================== */
    let contNome = "-";
    let contTelefone = "-";

    if (cliente.contabilidadeId) {
      const contSnap = await getDoc(
        doc(db, "contabilidades", cliente.contabilidadeId)
      );

      if (contSnap.exists()) {
        const c = contSnap.data();
        contNome = c.nome || "-";
        contTelefone = c.telefone || "-";
      }
    }

    /* =====================
       SUPORTE
    ===================== */
    let suporteNome = "-";

    if (cliente.suporteId) {
      const supSnap = await getDoc(
        doc(db, "users", cliente.suporteId)
      );

      if (supSnap.exists()) {
        suporteNome = supSnap.data().name || "-";
      }
    }

    /* =====================
       UI
    ===================== */
    document.getElementById("obs-cont-nome").innerText = contNome;
    document.getElementById("obs-cont-telefone").innerText = contTelefone;
    document.getElementById("obs-suporte-nome").innerText = suporteNome;

    metaCard.style.display = "flex";

  } catch (err) {
    console.error("Erro ao carregar meta da observação", err);
    metaCard.style.display = "none";
  }
}


const searchInput =
  document.getElementById("searchClientKanban") ||
  document.getElementById("searchClient");

if (searchInput) {
  searchInput.addEventListener("input", e => {
    const term = e.target.value.toLowerCase().trim();

    if (!term) {
      renderClients(clientesCache);
      return;
    }

    const filtered = clientesCache.filter(c =>
      (c.name || "").toLowerCase().includes(term) ||
      (c.telefone || "").toLowerCase().includes(term)
    );

    renderClients(filtered);
  });
}



window.saveEditClient = async function () {
  if (!editingClientId) return;

  const name = editClientName.value.trim();
  const telefone = editClientTelefone.value.trim();

  // ✅ mantém o suporte atual salvo no Firestore
const snap = await getDoc(doc(db, "clientes", editingClientId));
const clienteAtual = snap.exists() ? snap.data() : {};

let newSuporteId = clienteAtual.suporteId || null;


  // ✅ se admin, pode mudar suporte
  if (session?.isAdmin === true) {
    const val = editClientSuporte.value;
    if (val) newSuporteId = val;
  }

  const newContabilidadeId =
    document.getElementById("editClientContabilidade")?.value || null;

  showLoading("Salvando alterações...");

  try {
    // ✅ ATUALIZA UMA ÚNICA VEZ
    await updateDoc(doc(db, "clientes", editingClientId), {
      name,
      telefone,
      suporteId: newSuporteId,
      contabilidadeId: newContabilidadeId,
      updatedAt: serverTimestamp()
    });

    // 🔥 SE TROCOU SUPORTE → manda notificação + email
    if (session?.isAdmin && newSuporteId !== oldSuporteId) {

      try {
        await addDoc(collection(db, "notificacoes"), {
          tipo: "TROCA_SUPORTE",
          clienteId: editingClientId,
          clienteNome: name,
          suporteId: newSuporteId,
          createdAt: serverTimestamp(),
          lida: false
        });
      } catch (e) {
        console.warn("⚠️ Falha ao criar notificação interna", e);
      }

      setPendingEmailData({
        clienteId: editingClientId,
        clienteNome: name,
        clienteTelefone: telefone,
        suporteId: newSuporteId
      });

      oldSuporteId = newSuporteId;

      hideLoading();
      openConfirmEmailModal();
      return;
    }

    closeEditClientModal();
    mostrarNotificacao("✅ Cliente atualizado com sucesso!");
  } catch (e) {
    console.error(e);
    mostrarNotificacao("❌ Erro ao salvar");
  } finally {
    hideLoading();
  }
};


window.solicitarExclusaoCliente = function (cliente) {
  if (!session?.user?.uid) {
    alert("Usuário não autenticado");
    return;
  }

  clienteParaExclusao = cliente;

  const textarea = document.getElementById("motivoExclusao");
  const erro = document.getElementById("erro-exclusao");

  textarea.value = "";
  erro.innerText = "";

  const modalExclusao = document.getElementById("modal-solicitar-exclusao");
modalExclusao.style.display = "flex";

  document.body.classList.add("modal-open");

  requestAnimationFrame(() => {
modalExclusao.classList.add("show");
    textarea.focus();
  });
};

window.closeSolicitarExclusaoModal = function () {
  const modal = document.getElementById("modal-solicitar-exclusao");

  modal.classList.remove("show");

  setTimeout(() => {
    modal.style.display = "none";
    document.body.classList.remove("modal-open");
    clienteParaExclusao = null;
  }, 200);
};


window.confirmarSolicitacaoExclusao = async function () {
  const motivoEl = document.getElementById("motivoExclusao");
  const erro = document.getElementById("erro-exclusao");

  const motivo = motivoEl.value.trim();

  if (!motivo) {
    erro.innerText = "Motivo é obrigatório.";
    return;
  }

  if (!clienteParaExclusao) {
    erro.innerText = "Cliente inválido.";
    return;
  }

  try {
    showLoading("Solicitando exclusão...");

    // 🔥 SOLICITAÇÃO
    await addDoc(collection(db, "solicitacoes_exclusao"), {
      clienteId: clienteParaExclusao.id,
      clienteNome: clienteParaExclusao.name,
      motivo,
      solicitadoPor: session.user.uid,
      solicitadoPorNome: session.user.name || "Suporte",
      solicitadoPorEmail: session.user.email || "",
      status: "PENDENTE",
      createdAt: serverTimestamp()
    });

    // 🔔 NOTIFICA ADMIN
    await addDoc(collection(db, "notificacoes_admin"), {
      tipo: "SOLICITACAO_EXCLUSAO",
      clienteId: clienteParaExclusao.id,
      clienteNome: clienteParaExclusao.name,
      solicitadoPor: session.user.uid,
      solicitadoPorNome:
        session.user.name ||
        session.user.displayName ||
        session.user.email,
      solicitadoPorEmail: session.user.email || "",
      lida: false,
      createdAt: serverTimestamp()
    });

    closeSolicitarExclusaoModal();
    mostrarNotificacao("🗑 Solicitação enviada com sucesso");

  } catch (err) {
    console.error("Erro ao solicitar exclusão", err);
    erro.innerText = "Erro ao enviar solicitação.";
  } finally {
    hideLoading();
  }
};


export async function loadSuporteFilter() {
  const sel = document.getElementById("filterSuporte");
  if (!sel) return;

  sel.innerHTML = `<option value="">🔎 Todos os suportes</option>`;

  const snap = await getDocs(collection(db, "users"));

  snap.forEach(d => {
    const u = d.data();
    if (u.role !== "admin") {
      sel.innerHTML += `
        <option value="${d.id}">
          ${u.name || u.email}
        </option>
      `;
    }
  });
}
const filtroSuporte = document.getElementById("filterSuporte");

if (filtroSuporte) {
  filtroSuporte.addEventListener("change", () => {
    suporteFiltroAtivo = filtroSuporte.value || null;

    aplicarFiltroKanban();
  });
}
function aplicarFiltroKanban() {
  if (!suporteFiltroAtivo) {
    renderClients(clientesCache);
    return;
  }

  const filtrados = clientesCache.filter(
    c => c.suporteId === suporteFiltroAtivo
  );

  renderClients(filtrados);
}



// estado do modal
let agendamentoTarget = null;

/* =========================
   ABRIR MODAL DE AGENDAMENTO
========================= */
window.openAgendamentoModal = async function ({ clienteId, clienteNome }) {
  agendamentoTarget = { clienteId, clienteNome };

  const modal = document.getElementById("modal-agendamento");
  const labelEl = document.getElementById("agendamentoClienteLabel");
  const erroEl = document.getElementById("agendamentoErro");

  // reset UI
  erroEl.innerText = "";
  labelEl.innerHTML = "Carregando informações...";

  document.getElementById("agendamentoTipo").value = "TREINAMENTO";
  const inputOutro = document.getElementById("agendamentoTipoOutro");
if (inputOutro) {
  inputOutro.value = "";
  inputOutro.style.display = "none";
}
  document.getElementById("agendamentoGoogle").checked = false;
  const meetWrapper = document.getElementById("meetOptionWrapper");
const meetCheck = document.getElementById("agendamentoMeet");

if (meetWrapper) meetWrapper.style.display = "none";
if (meetCheck) meetCheck.checked = true;
  document.getElementById("agendamentoDesc").value = "";
  document.getElementById("agendamentoDuracao").value = 60;
  document.getElementById("agendamentoData").value = "";
  document.getElementById("agendamentoHora").value = "";
  // 🕒 gera horários disponíveis (SEM bloqueio aqui)
gerarHorasSelect(document.getElementById("agendamentoHora"));


  try {
    // 🔍 busca cliente
    const clienteSnap = await getDoc(doc(db, "clientes", clienteId));
    if (!clienteSnap.exists()) {
      throw new Error("Cliente não encontrado.");
    }

    const cliente = clienteSnap.data();

    let suporteEmail = "Não definido";
    let suporteNome = "—";

    // 🔍 busca suporte responsável
    if (cliente.suporteId) {
      const supSnap = await getDoc(doc(db, "users", cliente.suporteId));
      if (supSnap.exists()) {
        const sup = supSnap.data();
        suporteEmail = sup.email || suporteEmail;
        suporteNome = sup.name || suporteNome;
      }
    }
        const dataEl = document.getElementById("agendamentoData");
const horaEl = document.getElementById("agendamentoHora");

dataEl.addEventListener("change", async () => {
  gerarHorasSelect(horaEl);

  if (!dataEl.value || !cliente.suporteId) return;

  await bloquearHorariosSelect(
    horaEl,
    dataEl.value,
    cliente.suporteId,
    null
  );
});

    

    // 🧠 UI clara e anti-erro
    labelEl.innerHTML = `
      <div style="line-height:1.45">
        <strong>Cliente:</strong> ${clienteNome}<br>
        <strong>🛠 Suporte:</strong> ${suporteNome}<br>
        <strong>📧 E-mail do suporte:</strong>
        <span style="color:#6c43d0;font-weight:600">${suporteEmail}</span>
        <br>
        <span style="color:#fbbf24;font-size:13px">
          ⚠️ Ao abrir o Google, escolha <b>EXATAMENTE</b> este e-mail
        </span>
      </div>
    `;
  } catch (e) {
    console.error(e);
    labelEl.innerHTML =
      "<span style='color:#f87171'>Erro ao carregar dados do cliente/suporte.</span>";
  }

  // 🔥 abre modal + trava fundo
  modal.classList.add("show");
  openOverlay();
};

/* =========================
   FECHAR MODAL DE AGENDAMENTO
========================= */
window.closeAgendamentoModal = function () {
  const modal = document.getElementById("modal-agendamento");

  modal.classList.remove("show");
  closeOverlay();

  agendamentoTarget = null;
};


function buildISO(dateStr, timeStr) {
  // dateStr: YYYY-MM-DD, timeStr: HH:MM
  // Monta ISO local (sem timezone “Z”), Google aceita com offset local do navegador.
  return new Date(`${dateStr}T${timeStr}:00`).toISOString();
}

window.saveAgendamento = async function () {
  const target = agendamentoTarget;

  if (!target?.clienteId) {
    console.warn("⛔ saveAgendamento sem agendamentoTarget válido");
    return;
  }

  const clienteId = target.clienteId;
  const clienteNomeTarget = target.clienteNome || "Cliente";

  const errEl = document.getElementById("agendamentoErro");
  if (errEl) errEl.innerText = "";

  // 1) Busca cliente (pra pegar suporteId)
  const clienteSnap = await getDoc(doc(db, "clientes", clienteId));
  if (!clienteSnap.exists()) {
    if (errEl) errEl.innerText = "Cliente não encontrado.";
    return;
  }
  const cliente = clienteSnap.data();

  // 2) Tipo (com OUTRO)
const tipoSelect = document.getElementById("agendamentoTipo").value;
const tipoOutro = document.getElementById("agendamentoTipoOutro")?.value.trim() || "";

let tipo = tipoSelect;

if (tipoSelect === "OUTRO") {
  if (!tipoOutro) {
    mostrarNotificacao("⚠️ Digite o tipo da atividade.");
    return;
  }

  tipo = tipoOutro; // ✅ usa o texto digitado
}



  // 3) Data/hora e demais campos
  const data = document.getElementById("agendamentoData").value;
  const hora = document.getElementById("agendamentoHora").value;
  const duracaoMin = parseInt(document.getElementById("agendamentoDuracao").value || "60", 10);
  const desc = document.getElementById("agendamentoDesc").value || "";

  const criarGoogle = document.getElementById("agendamentoGoogle")?.checked ?? false;
  const gerarMeet = document.getElementById("agendamentoMeet")?.checked ?? true;

  if (!data || !hora) {
    if (errEl) errEl.innerText = "Informe data e hora.";
    return;
  }

  // 4) Monta horários ISO (AGORA SIM antes de usar)
  const startISO = buildISO(data, hora);
  const endISO = new Date(new Date(startISO).getTime() + duracaoMin * 60000).toISOString();

  const title = `${tipo} - ${clienteNomeTarget}`;

  // 5) Descobre suporteEmail (calendarId)
  let suporteEmail = null;
  if (cliente.suporteId) {
    const supSnap = await getDoc(doc(db, "users", cliente.suporteId));
    if (supSnap.exists()) suporteEmail = supSnap.data().email || null;
  }

  // 6) Google payload
  let googlePayload = {
    googleEventId: null,
    googleHtmlLink: null,
    googleMeetLink: "",
    googleCreatorEmail: suporteEmail || null
  };

  try {
    // 7) Cria no Google (se marcado)
    if (criarGoogle) {
      if (!suporteEmail) throw new Error("Suporte sem email cadastrado.");

      const ev = await createCalendarEvent({
        title,
        description: desc,
        startISO,
        endISO,
        calendarId: suporteEmail, // ✅ cria no calendário do suporte
        gerarMeet
      });

      googlePayload = {
        googleEventId: ev?.id || null,
        googleHtmlLink: ev?.htmlLink || null,
        googleMeetLink: extrairMeetLink(ev) || "",
        googleCreatorEmail: suporteEmail
      };
    }

    // 8) Salva Firestore (campos NO TOPO p/ botão Abrir)
    const clienteRef = doc(db, "clientes", clienteId);

    await updateDoc(clienteRef, {
      status: "agendado",
      agendamento: { tipo, data, hora, duracaoMin, descricao: desc, startISO, endISO },

      googleEventId: googlePayload.googleEventId,
      googleHtmlLink: googlePayload.googleHtmlLink,
      googleMeetLink: googlePayload.googleMeetLink,
      googleCreatorEmail: googlePayload.googleCreatorEmail,

      updatedAt: serverTimestamp()
    });

    closeAgendamentoModal();
    mostrarNotificacao("✅ Agendamento salvo com sucesso");

    // ✅ Abrir modal de confirmação WhatsApp automático
await prepararWhatsAppAgendamentoEmBackground(
  clienteId,
  clienteNomeTarget,
  tipo,
  data,
  hora,
  startISO
);

    tocarSomNotificacao();

    

    // segue seu fluxo de WhatsApp...
    // (você pode manter o restante como estava)

    agendamentoTarget = null;

  } catch (e) {
    console.error(e);
    if (errEl) errEl.innerText = e.message || "Erro ao salvar/agendar. Veja o console (F12).";
  }
};


function montarMsgConfirmacaoAgendamento({
  clienteNome,
  suporteNome,
  tipo,
  data,
  hora,
  meetLink
}) {

  const nomeExibicaoMap = {
  Bruno: "Bruno Silva",
  Rian: "Rian Silva"
};

const suporteExibicao = nomeExibicaoMap[suporteNome] || suporteNome;

  const normalizado = String(tipo || "ATIVIDADE").toUpperCase();

const mapaTipos = {
  TREINAMENTO: "TREINAMENTO",
  APRESENTACAO: "APRESENTAÇÃO",
  APRESENTAÇÃO: "APRESENTAÇÃO",
  MIGRACAO: "MIGRAÇÃO",
  MIGRAÇÃO: "MIGRAÇÃO"
};

const tipoFmt = mapaTipos[normalizado] || tipo;

  const dataFmt = formatarDataBR(data);

  let msg = "";

  // ✅ Mensagem para APRESENTAÇÃO
  if (tipoFmt === "APRESENTAÇÃO") {
    msg = `*${suporteExibicao}*\n\nOlá *{nome}*. Me chamo *${suporteNome}* (responsável técnico) e trabalho na empresa SupraTech Sistemas.

Foi agendado uma *APRESENTAÇÃO* referente ao sistema no dia *${dataFmt}* às *${hora} (horário de Brasília)*. Posso confirma?`;
  }

  // ✅ Mensagem para TREINAMENTO
  else if (tipoFmt === "TREINAMENTO") {
    msg = `*${suporteExibicao}*\n\nOlá *{nome}*. Me chamo *${suporteNome}* (responsável técnico) e trabalho na empresa SupraTech Sistemas.

Foi agendado um *TREINAMENTO* referente ao sistema no dia *${dataFmt}* às *${hora} (horário de Brasília)*. Posso confirma?`;
  }

  // ✅ Mensagem para MIGRAÇÃO
  else if (tipoFmt === "MIGRAÇÃO") {
    msg = `*${suporteExibicao}*\n\nOlá *{nome}*. Foi agendado uma *MIGRAÇÃO* para o sistema no dia *${dataFmt}* às *${hora} (horário de Brasília)*. Posso confirma?`;
  }

  // ✅ Fallback caso tenha outro tipo no futuro
  else {
    msg = `Olá *{nome}*. Me chamo *${suporteNome}* (responsável técnico) e trabalho na empresa SupraTech Sistemas.

Foi agendado um *${tipoFmt}* referente ao sistema no dia *${dataFmt}* às *${hora} (horário de Brasília)*. Posso confirma?`;
  }

  // ✅ Link (se tiver)
  if (meetLink && tipoFmt !== "MIGRAÇÃO") {
  msg += `\n\n🔗 *Link*: ${meetLink}`;
}


  msg += `\n\nAté breve!`;

  return msg;
}


function montarMsgLembreteSuporte({
  clienteNome,
  hora,
  data,
  tipo,
  googleMeetLink
}) {
  const dataFmt = formatarDataBR(data);

  const tipoLabel = tipo || "Atividade";
  const tipoUpper = String(tipoLabel).toUpperCase();

  let tituloLembrete = "🔔 *Lembrete do seu treinamento*";

  if (tipoUpper === "APRESENTAÇÃO" || tipoUpper === "APRESENTACAO") {
    tituloLembrete = "🔔 *Lembrete da sua apresentação*";
  } else if (tipoUpper === "MIGRAÇÃO" || tipoUpper === "MIGRACAO") {
    tituloLembrete = "🔔 *Lembrete da sua migração*";
  } else if (tipoUpper !== "TREINAMENTO") {
    tituloLembrete = `🔔 *Lembrete da sua ${tipoLabel}*`;
  }

  let mensagemSuporte = `${tituloLembrete}

👤 *Cliente*: ${clienteNome || "—"}
⏰ *Horário*: ${hora || "—"}
📆 ${dataFmt}`;

  // ✅ Link só se NÃO for migração
  if (tipoUpper !== "MIGRAÇÃO" && tipoUpper !== "MIGRACAO") {
    mensagemSuporte += `\n🔗 *Link*: ${googleMeetLink || "—"}`;
  }

  return mensagemSuporte;
}


window.salvarEdicaoAgendamento = async function () {
  const clienteId =
    window.clienteAtual?.id ??
    selectedCard?.id ??
    null;

  if (!clienteId) {
    mostrarNotificacao("❌ Cliente não identificado.");
    return;
  }

  // 🔥 NOVOS valores do formulário
  const data = document.getElementById("editAgData").value;
  const hora = document.getElementById("editAgHora").value;
  const duracaoMin = parseInt(
    document.getElementById("editAgDuracao").value || "60",
    10
  );

  const desc = document.getElementById("editAgDesc").value || "";

  // ✅ NOVO tipo selecionado
  const tipoSelect = document.getElementById("editAgTipo").value;
const tipoOutro = document.getElementById("editAgTipoOutro")?.value.trim() || "";

let tipo = tipoSelect;

if (tipoSelect === "OUTRO") {
  if (!tipoOutro) {
    mostrarNotificacao("⚠️ Digite o tipo da atividade.");
    return;
  }

  tipo = tipoOutro;
}


  if (!data || !hora) {
    mostrarNotificacao("⚠️ Informe data e hora.");
    return;
  }

  const startISO = buildISO(data, hora);
  const endISO = new Date(
    new Date(startISO).getTime() + duracaoMin * 60000
  ).toISOString();

  try {
    showLoading("Atualizando agendamento...");

    // 🔍 Cliente atualizado
    const snap = await getDoc(doc(db, "clientes", clienteId));
    if (!snap.exists()) {
      mostrarNotificacao("❌ Cliente não encontrado.");
      return;
    }

    const clienteData = snap.data();

    // ✅ Atualiza no Google Agenda também
    if (clienteData.googleEventId && clienteData.googleCreatorEmail) {
      try {
        await updateCalendarEvent(
          clienteData.googleEventId,
          {
            summary: `${tipo} - ${clienteData.name}`, // ✅ título novo
            description: desc,                      // ✅ descrição nova
            start: { dateTime: startISO },
            end: { dateTime: endISO }
          },
          clienteData.googleCreatorEmail            // ✅ calendário correto
        );

        console.log("✅ Evento Google atualizado (título + descrição + horário)");
      } catch (e) {
        console.warn("⚠️ Não consegui atualizar no Google Agenda:", e);
      }
    }

    // ✅ Atualiza Firestore
    await updateDoc(doc(db, "clientes", clienteId), {
      agendamento: {
        tipo,              // ✅ salva tipo novo
        data,
        hora,
        duracaoMin,
        descricao: desc,
        startISO,
        endISO
      },
      updatedAt: serverTimestamp()
    });

    mostrarNotificacao("✅ Agendamento atualizado (Sistema + Google)");
    closeModal();

  } catch (err) {
    console.error("❌ Erro ao atualizar agendamento:", err);
    mostrarNotificacao("❌ Erro ao atualizar agendamento");
  } finally {
    hideLoading();
  }
};



/* =========================
   WHATSAPP AGENDAMENTO
========================= */

function formatHoraBrasilia(hora) {
  return hora;
}


let pendingWA = null;

async function abrirModalConfirmacaoAgendamentoWA(payload) {
  if (!payload || !payload.clienteId || !payload.startISO) {
    console.error("❌ Payload inválido para WhatsApp agendamento:", payload);
    mostrarNotificacao("❌ Erro ao preparar confirmação do agendamento");
    return;
  }
if (!payload.clienteTelefone) {
  mostrarNotificacao("⚠️ Cliente sem telefone válido. WhatsApp não será enviado.");
}

  // normaliza payload (segurança)
pendingWA = {
  clienteId: payload.clienteId,
  clienteNome: payload.clienteNome || "Cliente",
  hora: payload.hora || "",
  tipo: payload.tipo || "TREINAMENTO",
  suporteId: payload.suporteId || null,
  clienteTelefone: payload.clienteTelefone || "",
  suporteTelefone: payload.suporteTelefone || "",
  lucasTelefone: payload.lucasTelefone || "",
  mensagem: payload.mensagem || "",
  startISO: payload.startISO,
  googleMeetLink: payload.googleMeetLink || ""
};


  const preview = document.getElementById("waAgendamentoPreview");
  const chkCliente = document.getElementById("waSendToCliente");
  const chkSuporte = document.getElementById("waSendToSuporte");

  if (preview) preview.innerText = pendingWA.mensagem;
  if (chkCliente) chkCliente.checked = true;
  if (chkSuporte) chkSuporte.checked = true;

  const textarea = document.getElementById("waAgendamentoMensagemCustom");

if (textarea) {
  textarea.value = pendingWA.mensagem;

  const tipoUpper = String(pendingWA.tipo || "").toUpperCase();

  const ehOutro =
    tipoUpper === "OUTRO" ||
    !["TREINAMENTO", "APRESENTAÇÃO", "APRESENTACAO", "MIGRAÇÃO", "MIGRACAO"].includes(tipoUpper);

  if (ehOutro) {
    textarea.style.display = "block";
    if (preview) preview.style.display = "none";
  } else {
    textarea.style.display = "none";
    if (preview) preview.style.display = "block";
  }
}

  openModalById("modal-confirm-wa-agendamento");
}


window.cancelarEnvioAgendamentoWhatsApp = function () {
  pendingWA = null;
  closeModalById("modal-confirm-wa-agendamento");
};


window.confirmarEnvioAgendamentoWhatsApp = async function () {
  if (!pendingWA) return;

  const chkCliente = document.getElementById("waSendToCliente")?.checked;
  const chkSuporte = document.getElementById("waSendToSuporte")?.checked;
  const chkLucas = document.getElementById("waSendToLucas")?.checked;

  try {
    showLoading("Salvando envio automático...");


    // 1) Envia AGORA (se marcado)
    // if (chkCliente && pendingWA.clienteTelefone) {
    //   await enviarWhatsApp({
    //     telefone: pendingWA.clienteTelefone,
    //     mensagem: pendingWA.mensagem
    //   });
    // }
    
if (chkCliente && !pendingWA.clienteTelefone) {
  mostrarNotificacao("⚠️ Telefone do cliente inválido");
}

if (chkSuporte && !pendingWA.suporteTelefone) {
  mostrarNotificacao("⚠️ Telefone do suporte inválido");
}

//     if (chkSuporte && pendingWA.suporteTelefone) {
// const dataFmt = formatarDataBR(
//   pendingWA?.startISO?.slice(0, 10)
// );

// const linkMeetManual =
//   typeof pendingWA.mensagem === "string"
//     ? pendingWA.mensagem.match(/https?:\/\/\S+/)?.[0] || "—"
//     : "—";

// const msgSuporte = `🔔 *Lembrete do seu treinamento*

// 👤 *Cliente*: ${pendingWA.clienteNome || "—"}
// ⏰ *Horário*: ${pendingWA.hora || "—"}
// 📆 ${dataFmt}
// 🔗 *Link*: ${linkMeetManual}`;


//   await enviarWhatsApp({
//     telefone: pendingWA.suporteTelefone,
//     mensagem: msgSuporte
//   });
// }


    // 2) Cria “job” 1h antes (backend Fly vai processar)
    // ✅ essa parte é o que permite 24/7 sem depender do navegador
// =========================
// 🔔 MENSAGENS AUTOMÁTICAS
// =========================

// mensagem longa (cliente) → já existe
const textarea = document.getElementById("waAgendamentoMensagemCustom");

let mensagemCliente = pendingWA.mensagem || "";

// ✅ PRIMEIRO pega a mensagem editada do textarea
if (textarea && textarea.style.display !== "none") {
  mensagemCliente = textarea.value.trim();
}

if (!mensagemCliente) {
  mostrarNotificacao("⚠️ Mensagem vazia!");
  return;
}

// ✅ AGORA SIM salva no cliente (já personalizada!)
try {
  await updateDoc(doc(db, "clientes", pendingWA.clienteId), {
    "agendamento.waMensagemCliente": mensagemCliente,
    updatedAt: serverTimestamp()
  });
} catch (e) {
  console.warn("⚠️ Não consegui salvar waMensagemCliente no cliente:", e);
}




// mensagem curta (suporte) → igual ao envio manual
const dataFmt = formatarDataBR(
  (pendingWA.startISO || "").slice(0, 10)
);

const tipoLabel = pendingWA?.tipo || "Atividade";
const tipoUpper = String(tipoLabel).toUpperCase();

let tituloLembrete = "🔔 *Lembrete do seu treinamento*";

if (tipoUpper === "APRESENTAÇÃO" || tipoUpper === "APRESENTACAO") {
  tituloLembrete = "🔔 *Lembrete da sua apresentação*";
} else if (tipoUpper === "MIGRAÇÃO" || tipoUpper === "MIGRACAO") {
  tituloLembrete = "🔔 *Lembrete da sua migração*";
} else if (tipoUpper !== "TREINAMENTO") {
  // ✅ se for um tipo digitado (OUTRO)
  tituloLembrete = `🔔 *Lembrete da sua ${tipoLabel}*`;
}

let mensagemSuporte = `${tituloLembrete}

👤 *Cliente*: ${pendingWA?.clienteNome || "—"}
⏰ *Horário*: ${pendingWA?.hora || "—"}
📆 ${dataFmt}`;

// ✅ Link só se NÃO for migração
if (tipoUpper !== "MIGRAÇÃO" && tipoUpper !== "MIGRACAO") {
  mensagemSuporte += `\n🔗 *Link*: ${pendingWA?.googleMeetLink || "—"}`;
}


// =========================
// 📦 SALVA JOB
// =========================
await addDoc(collection(db, "wa_agendamentos_jobs"), {
  clienteId: pendingWA.clienteId,
  suporteId: pendingWA.suporteId || null,
  clienteNome: pendingWA?.clienteNome || "Cliente",


  clienteTelefone: pendingWA.clienteTelefone || "",
  suporteTelefone: pendingWA.suporteTelefone || "",

  lucasTelefone: pendingWA.lucasTelefone || "",
enviarParaLucas: chkLucas === true,
mensagemLucas: mensagemSuporte, // mesma do suporte


  // 🔥 AGORA SEPARADAS
  mensagemCliente,
  mensagemSuporte,

  agendamentoStartISO: pendingWA.startISO,

  enviarParaCliente: chkCliente === true,
enviarParaSuporte: chkSuporte === true,

  status: "PENDENTE",
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
});




    mostrarNotificacao("⏰ Lembrete automático agendado com sucesso.");
  } catch (err) {
    console.error("❌ Erro ao confirmar WhatsApp agendamento", err);
    mostrarNotificacao("❌ Falha ao enviar/agendar WhatsApp");
  } finally {
    hideLoading();
    pendingWA = null;
    closeModalById("modal-confirm-wa-agendamento");
  }
};

function mostrarNotificacao(msg) {
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
}

function tocarSomNotificacao() {
  const audio = document.getElementById("notif-sound");
  if (!audio) return;

  audio.currentTime = 0; // reinicia o som
  audio.play().catch(() => {
    // evita erro caso o navegador bloqueie autoplay
  });
}

function openOverlay() {
  document.getElementById("global-overlay")?.classList.add("active");
  document.body.classList.add("modal-open");
}

function closeOverlay() {
  document.getElementById("global-overlay")?.classList.remove("active");

  document.documentElement.classList.remove("modal-open");
  document.body.classList.remove("modal-open");
}


function openSystemModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  modal.classList.remove("hide");
  modal.classList.add("show");
  openOverlay();
}

function closeSystemModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  modal.classList.add("hide");

  setTimeout(() => {
    modal.classList.remove("show", "hide");
    closeOverlay();
  }, 250);
}

async function getHorariosOcupados(dataSelecionada, suporteId, ignoreClienteId = null) {
  let q = query(
    collection(db, "clientes"),
    where("status", "==", "agendado"),
    where("agendamento.data", "==", dataSelecionada)
  );

  // ✅ filtra por suporte (se tiver)
  if (suporteId) {
    q = query(
      collection(db, "clientes"),
      where("status", "==", "agendado"),
      where("agendamento.data", "==", dataSelecionada),
      where("suporteId", "==", suporteId)
    );
  }

  const snap = await getDocs(q);

  const ocupados = [];

  snap.forEach(d => {
    if (ignoreClienteId && d.id === ignoreClienteId) return; // ✅ não bloqueia o próprio
    const ag = d.data().agendamento;
    if (ag?.hora) ocupados.push(ag.hora);
  });

  return ocupados;
}


async function bloquearHorariosSelect(
  selectEl,
  dataSelecionada,
  suporteId,
  ignoreClienteId = null
) {
  if (!selectEl || !dataSelecionada) return;

  const ocupados = await getHorariosOcupados(
    dataSelecionada,
    suporteId,
    ignoreClienteId
  );

  [...selectEl.options].forEach(opt => {
    if (!opt.value) return;
    if (ocupados.includes(opt.value)) opt.remove();
  });

  console.log("⛔ Horários bloqueados:", ocupados);
}



window.abrirAbaObs = async function (aba, btn) {
  // 🔒 BLOQUEIO ABSOLUTO
  if (
    aba === "agenda" &&
    window.clienteAtual?.status !== "agendado"
  ) {
    console.warn("⛔ Acesso à aba Agendamento bloqueado (cliente não agendado)");
    return;
  }

  const abaObs = document.getElementById("aba-obs");
  const abaAgenda = document.getElementById("aba-agenda");

  abaObs.style.display = aba === "obs" ? "block" : "none";
  abaAgenda.style.display = aba === "agenda" ? "block" : "none";

  document.querySelectorAll(".obs-tabs .tab-btn").forEach(b => {
    b.classList.remove("active");
  });

  if (btn) btn.classList.add("active");

  // 🔁 resto da função continua igual…


  if (btn) btn.classList.add("active");

  // 🕒 quando abrir aba agendamento
  if (aba === "agenda") {
    const clienteId =
      window.clienteAtual?.id ??
      selectedCard?.id ??
      null;

    if (!clienteId) {
      console.warn("⚠️ Cliente não identificado para bloqueio de horário");
      return;
    }

    const suporteId = window.clienteAtual?.suporteId || null;
    const dataSel = document.getElementById("editAgData")?.value;

    const selectHora = document.getElementById("editAgHora");
gerarHorasSelect(selectHora);
await bloquearHorariosSelect(
  selectHora,
  dataSel,
  suporteId,
  clienteId
);

  }
};



const editAgDataEl = document.getElementById("editAgData");

if (editAgDataEl) {
  editAgDataEl.addEventListener("change", async (e) => {
    const clienteId =
      window.clienteAtual?.id ??
      selectedCard?.id ??
      null;

    if (!clienteId) {
      console.warn("⚠️ Cliente não identificado para bloqueio de horário");
      return;
    }

    const suporteId = window.clienteAtual?.suporteId || null;
    const selectHora = document.getElementById("editAgHora");

    gerarHorasSelect(selectHora);
    await bloquearHorariosSelect(
  selectHora,
  e.target.value,
  suporteId,
  clienteId
);

  });
}



function gerarHorasSelect(selectEl) {
  if (!selectEl) return;

  selectEl.innerHTML = "<option value=''>Selecione</option>";

  for (let h = 7; h <= 19; h++) {
    for (let m of [0, 30]) {
      if (h === 19 && m > 0) continue; // máximo 19:00

      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");

      const opt = document.createElement("option");
      opt.value = `${hh}:${mm}`;
      opt.textContent = `${hh}:${mm}`;
      selectEl.appendChild(opt);
    }
  }
}

window.openDeleteClienteModal = function (cliente) {
  clienteParaExcluir = cliente;
  openModalById("modal-delete-client");
};

window.confirmDeleteCliente = async function () {
  if (!clienteParaExcluir) return;

  showLoading("Excluindo cliente...");

  const clienteId = clienteParaExcluir.id;

  try {
    const ref = doc(db, "clientes", clienteId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      mostrarNotificacao("⚠️ Cliente não encontrado");
      return;
    }

    const cliente = snap.data();

    // ✅ 1) Apaga evento Google primeiro
    if (cliente.googleEventId) {
      try {
        await deleteCalendarEvent(
          cliente.googleEventId,
          cliente.googleCreatorEmail
        );

        console.log("🗑 Evento Google excluído");
      } catch (e) {
        console.warn("⚠️ Falha ao excluir evento Google:", e.message);
      }
    }

    // ✅ 2) Agora exclui cliente do Firestore
    await deleteDoc(ref);

    mostrarNotificacao("🗑 Cliente excluído (Google + Sistema)");

  } catch (err) {
    console.error(err);
    mostrarNotificacao("❌ Erro ao excluir cliente");
  } finally {
    hideLoading();
    closeModalById("modal-delete-client");
    clienteParaExcluir = null;
  }
};





function celebrarFinalizacao(clienteNome) {
  // 🔊 som
  const audio = document.getElementById("celebre-sound");
  if (audio) {
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }

  // 🎉 overlay
  const nome = clienteNome || "Cliente";
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

  // ⏱ remove após 3s
  setTimeout(() => {
    overlay.remove();
  }, 1000);
}


const WHATSAPP_API =
  window.location.hostname === "localhost"
    ? "http://localhost:3333"
    : "https://supratech-whatsapp.fly.dev";

export async function enviarWhatsApp({ telefone, mensagem }) {
  try {
    const res = await fetch(`${WHATSAPP_API}/send-whatsapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telefone, mensagem })
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("❌ Erro WhatsApp:", data);
      return false;
    }

    console.log("📲 WhatsApp enviado com sucesso");
    return true;
  } catch (err) {
    console.error("❌ Falha ao chamar backend WhatsApp", err);
    return false;
  }
}


window.reenviarConfirmacaoAgendamento = async function () {
  const clienteId = window.clienteAtual?.id;
  if (!clienteId) return;

  let mensagemCliente = ""; // ✅ DECLARA FORA (para usar em qualquer lugar)

  try {
    showLoading("Enviando confirmação...");

    const snap = await getDoc(doc(db, "clientes", clienteId));
    if (!snap.exists()) {
      mostrarNotificacao("⚠️ Cliente não encontrado.");
      return;
    }

    const c = snap.data();

    if (!c.telefone) {
      mostrarNotificacao("⚠️ Cliente sem telefone válido.");
      return;
    }

    // ✅ mensagem do cliente (salva no automático)
    mensagemCliente = (c.agendamento?.waMensagemCliente || "").trim();

    if (!mensagemCliente) {
      let suporteNome = session?.user?.name || session?.user?.email || "Suporte";

      if (c.suporteId) {
        const supSnap = await getDoc(doc(db, "users", c.suporteId));
        if (supSnap.exists()) {
          suporteNome = supSnap.data().name || suporteNome;
        }
      }

      mensagemCliente = montarMsgConfirmacaoAgendamento({
        clienteNome: c.name || "Cliente",
        suporteNome,
        tipo: c.agendamento?.tipo || "TREINAMENTO",
        data: c.agendamento?.data,
        hora: c.agendamento?.hora,
        meetLink: c.googleMeetLink || ""
      });
    }

    // ✅ 1) ENVIA PARA CLIENTE + CONTATOS
    await window.enviarWaClienteMaisContatos({
      clienteId,
      mensagemBase: mensagemCliente
    });

    // ✅ 2) ENVIA PARA SUPORTE
    let suporteTelefone = "";

    if (c.suporteId) {
      const supSnap = await getDoc(doc(db, "users", c.suporteId));
      if (supSnap.exists()) {
        suporteTelefone = supSnap.data().whatsapp || "";
      }
    }

    if (!suporteTelefone) {
      mostrarNotificacao("⚠️ Suporte sem WhatsApp cadastrado.");
    } else {
      const msgSuporte = montarMsgLembreteSuporte({
        clienteNome: c.name || "Cliente",
        hora: c.agendamento?.hora || "",
        data: c.agendamento?.data || "",
        tipo: c.agendamento?.tipo || "TREINAMENTO",
        googleMeetLink: c.googleMeetLink || ""
      });

      await enviarWhatsApp({
        telefone: normalizarTelefoneBR(suporteTelefone),
        mensagem: msgSuporte
      });
    }

    mostrarNotificacao("📲 Mensagem enviada para Cliente + Contatos + Suporte com sucesso!");

  } catch (err) {
    console.error("❌ Erro no reenviarConfirmacaoAgendamento:", err);
    mostrarNotificacao("❌ Erro ao enviar confirmação manualmente.");
  } finally {
    hideLoading();
  }
};






window.carregarFinalizadosSuportePorMes = async function (mesSelecionado = null) {


  
  // 🔐 segurança: só suporte usa essa função
  if (session?.isAdmin === true) return;

  const container = document.getElementById("finalizados-container");
  const tabs = document.getElementById("finalizados-meses");
if (container) {
  container.classList.add("anim-exit");

  setTimeout(() => {
    container.classList.remove("anim-exit");
    container.classList.add("anim-enter");

    setTimeout(() => {
      container.classList.remove("anim-enter");
    }, 200);
  }, 150);
}

  if (!container || !tabs) return;

  container.innerHTML = "";
  tabs.innerHTML = "";

  const userId = session.user.uid;

  // 🔥 FILTRO CORRETO
  const finalizados = clientesCache.filter(c =>
    c.status === "finalizado" &&
    c.suporteId === userId
  );

  if (!finalizados.length) {
    container.innerHTML =
      `<p style="opacity:.7;text-align:center">Nenhum cliente finalizado</p>`;
    return;
  }

  // agrupa por mês
  const porMes = {};

  finalizados.forEach(c => {
  const mes = getMesFinalizado(c); // 🔥 CORRETO
  if (!mes) return;

  if (!porMes[mes]) porMes[mes] = [];
  porMes[mes].push(c);
});


  const meses = Object.keys(porMes).sort().reverse();
  const mesAtivo = mesSelecionado || meses[0];

  // cria abas de mês
  meses.forEach(mes => {
    const btn = document.createElement("button");
    btn.className = "tab-btn";
    btn.innerText = mes;
    btn.onclick = () => carregarFinalizadosSuportePorMes(mes);
    if (mes === mesAtivo) btn.classList.add("active");
    tabs.appendChild(btn);
  });

  // renderiza cards
  porMes[mesAtivo].forEach(c => {
    container.appendChild(createCard(c, { readonly: true }));
  });
};



window.carregarFinalizadosAdmin = async function (mesSelecionado = null) {
  const container = document.getElementById("admin-finalizados-container");
  const tabs = document.getElementById("admin-finalizados-meses");

  if (!container || !tabs) return;

  container.innerHTML = "";
  tabs.innerHTML = "";

  const q = query(
    collection(db, "clientes"),
    where("status", "==", "finalizado")
  );

  const snap = await getDocs(q);

  const porMes = {};

  snap.forEach(d => {
    const c = { id: d.id, ...d.data() };

    let mesRef = c.finalizadoMes || getMesFinalizado(c);
    if (!mesRef) return;

    if (!porMes[mesRef]) porMes[mesRef] = [];
    porMes[mesRef].push(c);
  });

  const meses = Object.keys(porMes).sort().reverse();
  const mesAtivo = mesSelecionado || meses[0];

  meses.forEach(mes => {
    const btn = document.createElement("button");
    btn.className = "tab-btn";
    btn.innerText = mes;
    btn.onclick = () => carregarFinalizadosAdmin(mes);
    if (mes === mesAtivo) btn.classList.add("active");
    tabs.appendChild(btn);
  });

  porMes[mesAtivo]?.forEach(c => {
    container.appendChild(createCard(c, { readonly: true }));
  });
};

const searchFinalizadosAdmin =
  document.getElementById("searchFinalizadosAdmin");

if (searchFinalizadosAdmin) {
  searchFinalizadosAdmin.addEventListener("input", e => {
    const term = e.target.value.toLowerCase().trim();

    document
      .querySelectorAll("#admin-finalizados-container .client-card")
      .forEach(card => {
        card.style.display = card.innerText
          .toLowerCase()
          .includes(term)
          ? "block"
          : "none";
      });
  });
}


window.onChangeTipoAgendamento = function () {
  const select = document.getElementById("agendamentoTipo");
  const inputOutro = document.getElementById("agendamentoTipoOutro");

  const meetWrapper = document.getElementById("meetOptionWrapper");
  const meetCheck = document.getElementById("agendamentoMeet");

  if (!select || !inputOutro) return;

  if (select.value === "OUTRO") {
    inputOutro.style.display = "block";
    inputOutro.focus();

    // ✅ mostra opção do Meet
    if (meetWrapper) meetWrapper.style.display = "block";
    if (meetCheck) meetCheck.checked = true; // padrão ligado
  } else {
    inputOutro.style.display = "none";
    inputOutro.value = "";

    // ✅ esconde opção do Meet
    if (meetWrapper) meetWrapper.style.display = "none";
  }
};

async function prepararWhatsAppAgendamentoEmBackground(clienteId, clienteNomeTarget, tipo, data, hora, startISO) {
  try {
    const clienteRef = doc(db, "clientes", clienteId);
    const clienteSnap = await getDoc(clienteRef);
    const clienteData = clienteSnap.exists() ? clienteSnap.data() : {};

    let meetLinkFinal = clienteData.googleMeetLink || "";

    let suporteNome = session?.user?.name || session?.user?.email || "Suporte";
    let suporteTelefone = "";

    if (clienteData.suporteId) {
      const supSnap = await getDoc(doc(db, "users", clienteData.suporteId));
      if (supSnap.exists()) {
        const sup = supSnap.data();
        suporteNome = sup.name || suporteNome;
        suporteTelefone = sup.whatsapp || "";
      }
    }

    const mensagem = montarMsgConfirmacaoAgendamento({
      clienteNome: clienteData.name || clienteNomeTarget,
      suporteNome,
      tipo,
      data,
      hora,
      meetLink: meetLinkFinal
    });

    abrirModalConfirmacaoAgendamentoWA({
      clienteId,
      clienteNome: clienteData.name || clienteNomeTarget,
      hora,
      tipo,
      suporteId: clienteData.suporteId || null,
      clienteTelefone: normalizarTelefoneBR(clienteData.telefone),
      suporteTelefone: normalizarTelefoneBR(suporteTelefone),
      lucasTelefone: "", // se quiser, busca depois
      mensagem,
      startISO,
      googleMeetLink: meetLinkFinal
    });

  } catch (err) {
    console.warn("⚠️ WhatsApp background falhou:", err);
  }
}

async function carregarContatosDoCliente(clienteId) {
  const contatos = [];

  const snap = await getDocs(collection(db, "clientes", clienteId, "contatos"));

  snap.forEach(docu => {
    contatos.push({
      id: docu.id,
      ...docu.data()
    });
  });

  return contatos;
}

function aplicarNomeNaMensagem(mensagemBase, nome) {
  return (mensagemBase || "").replaceAll("{nome}", nome || "Cliente");
}

window.enviarWaClienteMaisContatos = async function ({ clienteId, mensagemBase }) {
  try {
    showLoading("Enviando WhatsApp para cliente e contatos...");

    // 1) pega cliente principal
    const snapCliente = await getDoc(doc(db, "clientes", clienteId));
    if (!snapCliente.exists()) {
      mostrarNotificacao("⚠️ Cliente não encontrado.");
      return;
    }

    const cliente = snapCliente.data();

    // 2) monta lista de destinos (cliente + contatos)
    const destinos = [];

    // cliente principal
    if (cliente.telefone) {
      destinos.push({
        nome: cliente.name || "Cliente",
        telefone: cliente.telefone
      });
    }

    // contatos vinculados
    const contatos = await carregarContatosDoCliente(clienteId);

    contatos.forEach(c => {
      if (c.telefone) {
        destinos.push({
          nome: c.nome || "Contato",
          telefone: c.telefone
        });
      }
    });

    if (destinos.length === 0) {
      mostrarNotificacao("⚠️ Nenhum telefone encontrado (cliente ou contatos).");
      return;
    }

    // 3) envia um por um
    for (const item of destinos) {
  const msgFinal = aplicarNomeNaMensagem(mensagemBase, item.nome);

  await enviarWhatsApp({
    telefone: normalizarTelefoneBR(item.telefone),
    mensagem: msgFinal
  });
}


    mostrarNotificacao("📲 Mensagem enviada para Cliente + Contatos com sucesso!");
  } catch (err) {
    console.error(err);
    mostrarNotificacao("❌ Erro ao enviar WhatsApp para todos.");
  } finally {
    hideLoading();
  }
};



window.salvarContatoVinculado = async function () {
  const clienteId = window.clienteAtual?.id;
  if (!clienteId) {
    mostrarNotificacao("⚠️ Nenhum cliente selecionado.");
    return;
  }

  const nome = document.getElementById("contatoNome")?.value.trim();
  const telefone = document.getElementById("contatoTelefone")?.value.trim();

  if (!nome || !telefone) {
    mostrarNotificacao("⚠️ Preencha Nome e Telefone do contato.");
    return;
  }

  try {
    showLoading("Salvando contato...");

    await addDoc(collection(db, "clientes", clienteId, "contatos"), {
      nome,
      telefone,
      createdAt: serverTimestamp()
    });

    document.getElementById("contatoNome").value = "";
    document.getElementById("contatoTelefone").value = "";

    await renderizarContatos(clienteId);

    mostrarNotificacao("✅ Contato adicionado!");
  } catch (err) {
    console.error(err);
    mostrarNotificacao("❌ Erro ao salvar contato.");
  } finally {
    hideLoading();
  }
};


window.montarMsgConfirmacaoAgendamento = montarMsgConfirmacaoAgendamento;
window.montarMsgLembreteSuporte = montarMsgLembreteSuporte;
