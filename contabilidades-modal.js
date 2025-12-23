/* =========================
   CONTABILIDADES - MODAL CLIENTE
========================= */

import {
  collection,
  getDocs
} from "./firebase-imports.js";

import { db } from "./firebase-init.js";

import {
  contabilidadesCache,
  setContabilidadesCache
} from "./state.js";

/* =========================
   LOAD CONTABILIDADES
========================= */

export async function loadContabilidades() {
  const select = document.getElementById("modalContabilidade");
  const search = document.getElementById("contabilidadeSearch");

  if (!select) return;

  select.innerHTML = "";
  const cache = {};

  const snap = await getDocs(collection(db, "contabilidades"));

  snap.forEach(docSnap => {
    const c = docSnap.data();
    cache[docSnap.id] = c;

    select.innerHTML += `
      <option value="${docSnap.id}">
        ${c.nome}
      </option>
    `;
  });

  setContabilidadesCache(cache);

  /* Busca por nome */
  if (search) {
    search.oninput = () => {
      const term = search.value.toLowerCase();
      select.innerHTML = "";

      Object.entries(cache).forEach(([id, c]) => {
        if ((c.nome || "").toLowerCase().includes(term)) {
          select.innerHTML += `
            <option value="${id}">
              ${c.nome}
            </option>
          `;
        }
      });
    };
  }
}

/* =========================
   CHANGE CONTABILIDADE
========================= */

export function onContabilidadeChange() {
  const select = document.getElementById("modalContabilidade");
  const telInput = document.getElementById("modalTelefone");

  if (!select || !telInput) return;

  const contId = select.value;

  if (!contId) {
    telInput.value = "";
    telInput.disabled = true;
    return;
  }

  const cont = contabilidadesCache[contId];

  if (cont?.telefone) {
    telInput.value = cont.telefone;
    telInput.disabled = true;
  } else {
    telInput.value = "";
    telInput.disabled = false;
    telInput.placeholder = "Digite o telefone";
  }
}
