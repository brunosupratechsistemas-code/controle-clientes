/* =========================
   CLIENTES
========================= */
let clientesCache = [];

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
  serverTimestamp
} from "./firebase-imports.js";


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

nameEl.innerHTML = `
  <div class="client-title">${escapeHtml(data.name || "Sem nome")}</div>
  ${data.telefone ? `<div class="client-phone">📞 ${escapeHtml(data.telefone)}</div>` : ""}
`;



  /* Duplo clique: editar nome */
  nameEl.ondblclick = async () => {
    const novoNome = prompt("Editar nome:", nameEl.textContent);
    if (!novoNome || novoNome.trim() === nameEl.textContent) return;

    showLoading("Atualizando nome...");

    try {
      await updateDoc(doc(db, "clientes", data.id), {
        name: novoNome.trim(),
        updatedAt: serverTimestamp()
      });

      /* Atualiza histórico */
      const qh = query(collection(db, "historico"));
      const snap = await getDocs(qh);

      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.forEach(d => {
          batch.update(d.ref, { clienteNome: novoNome.trim() });
        });
        await batch.commit();
      }

      await logHistorico({
        clienteId: data.id,
        clienteNome: novoNome.trim(),
        acao: "ALTEROU_NOME"
      });

    } finally {
      hideLoading();
    }
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
  deleteBtn.onclick = async e => {
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
      name: nameEl.textContent,
      from: card.parentElement?.id || ""
    });
    card.classList.add("dragging");
  });

  card.addEventListener("dragend", () => {
    setDraggedInfo(null);
    card.classList.remove("dragging");
  });

  card.append(nameEl, meta, editBtn, deleteBtn);
  return card;
}

function renderClients(list) {
  colEspera.innerHTML = "";
  colAgendado.innerHTML = "";
  colFinalizado.innerHTML = "";

  const cols = {
    espera: colEspera,
    agendado: colAgendado,
    finalizado: colFinalizado
  };

  list.forEach(data => {
    const card = createCard(data);
    containerByStatus(data.status || "espera", cols).appendChild(card);
  });
}


/* =========================
   DRAG & DROP
========================= */

document.querySelectorAll(".card-container").forEach(container => {
  container.addEventListener("dragover", e => e.preventDefault());

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
   MODAL OBSERVAÇÃO
========================= */

function openModal(card, data) {
  setSelectedCard({ el: card, id: data.id });

  modalTitle.innerText = "Observações - " + (data.name || "");

const phoneEl = document.getElementById("modalClientPhone");
if (phoneEl) {
  phoneEl.innerText = data.telefone ? `📞 ${data.telefone}` : "";
}

modalTextarea.value = data.observation || "";
modal.style.display = "block";


  loadObsMeta(data);
}


export function closeModal() {
  modal.style.display = "none";
}

export async function saveObservation() {
  if (!selectedCard?.id) return;

  showLoading("Salvando observações...");

  await updateDoc(doc(db, "clientes", selectedCard.id), {
    observation: modalTextarea.value,
    updatedAt: serverTimestamp()
  });

  await logHistorico({
    clienteId: selectedCard.id,
    clienteNome:
      selectedCard.el.querySelector(".client-name")?.innerText || "",
    acao: "EDITOU_OBSERVACAO"
  });

  closeModal();
  hideLoading();
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

  snapshot.forEach(docSnap => {
    list.push({ id: docSnap.id, ...docSnap.data() });
  });

  clientesCache = list;      // 🔥 salva todos
  renderClients(list);       // render padrão
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
  console.log("CLIENTE NO MODAL:", cliente);

  const metaCard = document.getElementById("obs-meta-card");
  if (!metaCard) return;

  const isAdmin = session.isAdmin === true;
  const isSuporte = cliente.suporteId === auth.currentUser.uid;

  // 🔐 Regra de visibilidade
  if (!isAdmin && !isSuporte) {
    metaCard.style.display = "none";
    return;
  }

  try {
    // =====================
    // CONTABILIDADE
    // =====================
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

    // =====================
    // SUPORTE
    // =====================
    let suporteNome = "-";

    if (cliente.suporteId) {
      const supSnap = await getDoc(
        doc(db, "users", cliente.suporteId)
      );

      if (supSnap.exists()) {
        suporteNome = supSnap.data().name || "-";
      }
    }

    // =====================
    // ATUALIZA UI
    // =====================
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
