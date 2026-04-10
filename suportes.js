import {
  collection,
  query,
  where,
  getDocs
} from "./firebase-imports.js";

import { db } from "./firebase-init.js";

export async function loadSuportes(selectId = "modalSuporte", includeEmpty = true) {
  const sel = document.getElementById(selectId);
  if (!sel) return;

  sel.innerHTML = includeEmpty
    ? `<option value="">Selecione o suporte</option>`
    : "";

  const q = query(
    collection(db, "users"),
    where("active", "==", true)
  );

  const snap = await getDocs(q);

  snap.forEach(docSnap => {
    const u = docSnap.data();

    if (u.role === "admin") return;

    sel.innerHTML += `
      <option value="${docSnap.id}">
        ${u.name || u.email}
      </option>
    `;
  });
}