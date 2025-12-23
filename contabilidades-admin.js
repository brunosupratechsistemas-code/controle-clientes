/* =========================
   CONTABILIDADES - ADMIN
========================= */

import {
  collection,
  addDoc,
  doc,
  updateDoc,
    getDoc, 
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query
} from "./firebase-imports.js";

import { db, auth } from "./firebase-init.js";


import {
  contabilidadesAdminCache,
  setContabilidadesAdminCache,
  unsubscribeContabilidades,
  setUnsubscribeContabilidades
} from "./state.js";

import { escapeHtml, showLoading, hideLoading } from "./utils.js";

/* =========================
   START REALTIME
========================= */

export function startContabilidadesRealtime() {
  if (unsubscribeContabilidades) unsubscribeContabilidades();

  const body = document.getElementById("contabilidadesBody");
  if (!body) return;

  body.innerHTML = `
    <tr>
      <td colspan="3" style="text-align:center;opacity:.7">
        Carregando contabilidades...
      </td>
    </tr>
  `;

  const q = query(collection(db, "contabilidades"));

  const unsub = onSnapshot(q, snap => {
    const list = [];

    if (snap.empty) {
      body.innerHTML = `
        <tr>
          <td colspan="3" style="text-align:center;opacity:.7">
            Nenhuma contabilidade cadastrada
          </td>
        </tr>
      `;
      return;
    }

    snap.forEach(d => {
      const c = d.data();
      list.push({
        id: d.id,
        nome: c.nome || "",
        telefone: c.telefone || ""
      });
    });

    setContabilidadesAdminCache(list);
    renderContabilidades(list);
  });

  setUnsubscribeContabilidades(unsub);
}

/* =========================
   RENDER
========================= */

function renderContabilidades(list) {
  const body = document.getElementById("contabilidadesBody");
  if (!body) return;

  body.innerHTML = "";

  list.forEach(c => {
    body.innerHTML += `
      <tr>
        <td>${escapeHtml(c.nome)}</td>
        <td>${escapeHtml(c.telefone)}</td>
        <td class="actions">
          <button onclick="editContabilidade('${c.id}')">✏️</button>
          <button class="danger" onclick="deleteContabilidade('${c.id}')">🗑</button>
        </td>
      </tr>
    `;
  });
}

/* =========================
   CREATE
========================= */

export async function saveContabilidade() {
  const nomeEl = document.getElementById("contNome");
  const telEl = document.getElementById("contTelefone");
  const modal = document.getElementById("modal-contabilidade");
const search = document.getElementById("searchContAdmin");
if (search) search.value = "";

  const nome = nomeEl?.value.trim();
  const telefone = telEl?.value.trim();

  if (!nome) {
    alert("Informe o nome");
    return;
  }

  showLoading("Salvando contabilidade...");

  try {
const ref = await addDoc(collection(db, "contabilidades"), {
  nome,
  telefone,
  criadoPorId: auth.currentUser.uid,
  criadoPorNome: auth.currentUser.email,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
});


    if (modal) modal.style.display = "none";
    if (nomeEl) nomeEl.value = "";
    if (telEl) telEl.value = "";

    /* Atualiza select do modal cliente */
    const sel = document.getElementById("modalContabilidade");
    if (sel) sel.value = ref.id;

    alert("Contabilidade criada com sucesso!");
  } catch (err) {
    console.error(err);
    alert("Erro ao salvar contabilidade.");
  } finally {
    hideLoading();
  }
}

/* =========================
   EDIT
========================= */

window.editContabilidade = async function (id) {
  const ref = doc(db, "contabilidades", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const c = snap.data();

  const nome = prompt("Nome:", c.nome || "");
  if (!nome) return;

  const telefone = prompt("Telefone:", c.telefone || "");

  await updateDoc(ref, {
    nome: nome.trim(),
    telefone: (telefone || "").trim(),
    updatedAt: serverTimestamp()
  });
};

/* =========================
   DELETE
========================= */

window.deleteContabilidade = async function (id) {
  if (!confirm("Deseja excluir esta contabilidade?")) return;
  await deleteDoc(doc(db, "contabilidades", id));
};

/* =========================
   FILTER
========================= */

export function bindSearchContabilidades() {
  const search = document.getElementById("searchContAdmin");
  if (!search) return;

  search.addEventListener("input", e => {
    const term = e.target.value.toLowerCase().trim();
    const filtered = contabilidadesAdminCache.filter(c =>
      c.nome.toLowerCase().includes(term)
    );
    renderContabilidades(filtered);
  });
}