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

import { createCalendarEvent } from "./calendar.js";

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
  containerByStatus
} from "./utils.js";

/* =========================
   ELEMENTOS
========================= */

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

  document.body.classList.add("modal-open");
  document.getElementById("modal-edit-client").style.display = "block";
};







window.closeEditClientModal = function () {
  editingClientId = null;
  document.getElementById("modal-edit-client").style.display = "none";
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

function createCard(data) {
  const card = document.createElement("div");
  card.className = "client-card";
  card.draggable = true;
  card.dataset.id = data.id;

  const nameEl = document.createElement("div");
  nameEl.className = "client-name";

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

const dataFmt = fmtDateFromDoc(data);
const criadoPor = data.criadoPorNome || "Usuário";

meta.innerHTML = `
  🕒 ${dataFmt}
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



// TOOLTIP (observações)
if (data.observation && data.observation.trim()) {
  const tooltip = document.createElement("div");
  tooltip.className = "tooltip";
  tooltip.innerText = data.observation;
  card.appendChild(tooltip);
}

  card.addEventListener("dragstart", () => {
    setDraggedInfo({
      id: data.id,
      name: data.name || "Cliente",
      from: card.parentElement?.id || ""
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
  info.innerText = `Agenda: ${data.agendamento.data} às ${data.agendamento.hora}`;
  card.appendChild(info);
}


  card.append(nameEl, meta, editBtn, deleteBtn);
  return card;

  if ((data.status || "") === "agendado") {
  const calBtn = document.createElement("button");
  calBtn.className = "edit-btn"; // ou crie uma classe própria
  calBtn.style.marginLeft = "6px";

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

  card.appendChild(calBtn);
}

}

function renderClients(list) {
  colEspera.innerHTML = "";
  colAgendado.innerHTML = "";
  colFinalizado.innerHTML = "";

  list.forEach(data => {
    // 🔥 REGRA ABSOLUTA
    if (data.status === "agendado") {
      colAgendado.appendChild(createCard(data));
      return;
    }

    if (data.status === "finalizado") {
      colFinalizado.appendChild(createCard(data));
      return;
    }

    // 👇 QUALQUER OUTRO CASO = ESPERA
    colEspera.appendChild(createCard(data));
  });
}



/* =========================
   DRAG & DROP
========================= */
document.querySelectorAll(".card-container").forEach((container) => {
  container.addEventListener("dragover", (e) => e.preventDefault());

  container.addEventListener("drop", async () => {
    if (!draggedInfo?.id) return;

    const para = container.id;
    if (draggedInfo.from === para) return;

    // ✅ se for agendado, abre modal e NÃO salva status agora
    if (para === "agendado") {
      window.openAgendamentoModal({
        clienteId: draggedInfo.id,
        clienteNome: draggedInfo.name
      });
      return;
    }

    // comportamento normal pros outros
    await updateDoc(doc(db, "clientes", draggedInfo.id), {
      status: para,
      updatedAt: serverTimestamp()
    });

    if (para === "finalizado") {
celebrarFinalizacao(
  draggedInfo?.name || "Cliente"
);
  mostrarNotificacao("🎉 Atendimento finalizado com sucesso!");
}


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
    await updateDoc(doc(db, "clientes", clienteId), {
      observation: novaObs,
      updatedAt: serverTimestamp()
    });

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

    if (isAdmin || isSuporteResponsavel) {
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


const searchInput = document.getElementById("searchClient");

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
  const newSuporteId = editClientSuporte.value || null;

  showLoading("Salvando alterações...");

  try {
    await updateDoc(doc(db, "clientes", editingClientId), {
      name,
      telefone,
      suporteId: newSuporteId,
      updatedAt: serverTimestamp()
    });
// 🔥 SE TROCOU SUPORTE
if (session?.isAdmin && newSuporteId !== oldSuporteId) {

  // 🔔 NOTIFICAÇÃO INTERNA (NOVO SUPORTE)
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

  // 📧 PREPARA ENVIO DE E-MAIL
setPendingEmailData({
  clienteId: editingClientId,
  clienteNome: name,
  clienteTelefone: telefone,
  suporteId: newSuporteId
});


  oldSuporteId = newSuporteId;

  hideLoading();            // 🔥 fecha loading
  openConfirmEmailModal();  // 🔥 abre confirmação
  return;
}


    closeEditClientModal();
  } catch (e) {
    console.error(e);
    alert("Erro ao salvar");
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

  const modal = document.getElementById("modal-solicitar-exclusao");
  const textarea = document.getElementById("motivoExclusao");
  const erro = document.getElementById("erro-exclusao");

  textarea.value = "";
  erro.innerText = "";

  modal.style.display = "flex";
  document.body.classList.add("modal-open");

  requestAnimationFrame(() => {
    modal.classList.add("show");
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
  document.getElementById("agendamentoGoogle").checked = false;
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
  const errEl = document.getElementById("agendamentoErro");
  errEl.innerText = "";

  if (!agendamentoTarget?.clienteId) return;

  const tipo = document.getElementById("agendamentoTipo").value;
  const data = document.getElementById("agendamentoData").value;
  const hora = document.getElementById("agendamentoHora").value;
  const duracaoMin = parseInt(
    document.getElementById("agendamentoDuracao").value || "60",
    10
  );
  const desc = document.getElementById("agendamentoDesc").value || "";
  const criarGoogle = document.getElementById("agendamentoGoogle").checked;

  if (!data || !hora) {
    errEl.innerText = "Informe data e hora.";
    return;
  }

  const startISO = buildISO(data, hora);
  const endISO = new Date(
    new Date(startISO).getTime() + duracaoMin * 60000
  ).toISOString();

  const title = `${tipo} - ${agendamentoTarget.clienteNome}`;

  try {
    const clienteRef = doc(db, "clientes", agendamentoTarget.clienteId);

    let googlePayload = {};

    // 📅 cria evento no Google (admin escolhe conta)
    if (criarGoogle) {
      const ev = await createCalendarEvent({
        title,
        description: desc,
        startISO,
        endISO
      });

      googlePayload = {
        googleEventId: ev.id || null,
        googleHtmlLink: ev.htmlLink || null,
        googleCreatorEmail: ev.creator?.email || null // 🔥 registra quem foi usado
      };
    }

    // 💾 salva no Firestore
    await updateDoc(clienteRef, {
      status: "agendado",
      agendamento: {
        tipo,
        data,
        hora,
        duracaoMin,
        descricao: desc,
        startISO,
        endISO
      },
      ...googlePayload,
      updatedAt: serverTimestamp()
    });

    closeAgendamentoModal();
mostrarNotificacao("✅ Agendamento salvo com sucesso");
tocarSomNotificacao();


  } catch (e) {
    console.error(e);
    errEl.innerText =
      e.message || "Erro ao salvar/agendar. Veja o console (F12).";
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

  try {
    showLoading("Excluindo cliente...");

    await deleteDoc(
      doc(db, "clientes", clienteParaExcluir.id)
    );

    await logHistorico({
      clienteId: clienteParaExcluir.id,
      clienteNome: clienteParaExcluir.name,
      acao: "EXCLUIU_CLIENTE"
    });

    mostrarNotificacao("🗑 Cliente excluído com sucesso");

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

