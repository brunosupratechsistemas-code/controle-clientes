/* =========================
   USUÁRIOS - ADMIN
========================= */

import {
  collection,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp
} from "./firebase-imports.js";

import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut
} from "./firebase-imports.js";

import { db, auth, secondaryAuth } from "./firebase-init.js";

import {
  adminUnlocked
} from "./state.js";

import { escapeHtml } from "./utils.js";

/* =========================
   START REALTIME
========================= */

export function startUsersRealtime() {
  const q = collection(db, "users");

  onSnapshot(q, snap => {
    const body = document.getElementById("usersBody");
    if (!body) return;

    body.innerHTML = "";

    snap.forEach(docSnap => {
      const u = docSnap.data();
      const uid = docSnap.id;

      const isSelf = uid === auth.currentUser?.uid;
      const isInactive = u.active === false;

      body.innerHTML += `
        <tr style="${isInactive ? "opacity:.5" : ""}">
          <td>${escapeHtml(u.name || "")}</td>
          <td>${escapeHtml(u.email || "")}</td>
          <td>${escapeHtml(u.role || "user")}</td>
          <td style="display:flex;gap:6px;flex-wrap:wrap">

            <button onclick="resetUserPassword('${u.email}')">
              🔑 Reset
            </button>

            ${
              !isSelf && !isInactive
                ? `<button class="danger"
                     onclick="deactivateUser('${uid}', '${escapeHtml(u.name || u.email)}')">
                     🚫 Desativar
                   </button>`
                : ""
            }

            ${
              !isSelf && isInactive
                ? `<button class="success"
                     onclick="reactivateUser('${uid}', '${escapeHtml(u.name || u.email)}')">
                     ♻️ Reativar
                   </button>`
                : ""
            }

            ${
              isInactive
                ? `<span style="font-size:12px;opacity:.7">Desativado</span>`
                : ""
            }

          </td>
        </tr>
      `;
    });
  });
}

/* =========================
   CREATE USER
========================= */

export async function createUserAdmin({
  email,
  password,
  name,
  role
}) {
  if (!adminUnlocked) return;

  const cred = await createUserWithEmailAndPassword(
    secondaryAuth,
    email,
    password
  );

  await setDoc(doc(db, "users", cred.user.uid), {
    email,
    name,
    role,
    active: true,
    createdAt: serverTimestamp()
  });

  await signOut(secondaryAuth);
}

/* =========================
   RESET PASSWORD
========================= */

window.resetUserPassword = async function (email) {
  if (!adminUnlocked) return;

  const confirm = window.confirm(
    `Enviar email de redefinição de senha para:\n${email}?`
  );
  if (!confirm) return;

  try {
    await sendPasswordResetEmail(auth, email);
    alert("Email enviado com sucesso.");
  } catch {
    alert("Erro ao enviar email.");
  }
};

/* =========================
   ACTIVATE / DEACTIVATE
========================= */

window.deactivateUser = async function (uid, name) {
  if (!adminUnlocked) return;

  const confirm = window.confirm(
    `Deseja DESATIVAR o usuário ${name}?`
  );
  if (!confirm) return;

  await updateDoc(doc(db, "users", uid), {
    active: false,
    deactivatedAt: serverTimestamp()
  });

  alert("Usuário desativado.");
};

window.reactivateUser = async function (uid, name) {
  if (!adminUnlocked) return;

  const confirm = window.confirm(
    `Deseja REATIVAR o usuário ${name}?`
  );
  if (!confirm) return;

  await updateDoc(doc(db, "users", uid), {
    active: true,
    reactivatedAt: serverTimestamp()
  });

  alert("Usuário reativado.");
};
