/* =========================
   AUTH
========================= */

import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from "./firebase-imports.js";

import { db, auth, secondaryAuth } from "./firebase-init.js";

import {
  session,
  setIsAdmin,
  setAdminUnlocked,
  setCurrentUserName
} from "./state.js";

import { showLoading, hideLoading } from "./utils.js";

import {
  collection,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "./firebase-imports.js";

/* =========================
   LOGIN
========================= */

export async function login(email, password) {
  const loading = document.getElementById("login-loading");

  try {
    if (loading) loading.style.display = "flex";

    await signInWithEmailAndPassword(auth, email, password);

  } catch {
    throw new Error("E-mail ou senha inválidos");
  } finally {
    if (loading) {
      setTimeout(() => (loading.style.display = "none"), 400);
    }
  }
}

/* =========================
   LOGOUT
========================= */

export async function logout() {
  showLoading("Saindo do sistema...");
  await signOut(auth);
  setTimeout(hideLoading, 400);
}

/* =========================
   RESET PASSWORD (ADMIN)
========================= */

export async function resetUserPassword(email, adminUnlocked) {
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
}

/* =========================
   AUTH STATE
========================= */

export function initAuthState({
  onLoggedOut,
  onLoggedIn,
  startRealtime,
  startHistoryRealtime,
}) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      setIsAdmin(false);
      setAdminUnlocked(false);

      if (onLoggedOut) onLoggedOut();
      return;
    }

    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    /* Primeiro login cria doc */
    if (!snap.exists()) {
      await setDoc(userRef, {
        email: user.email,
        name: user.email,
        role: "admin",
        active: true,
        createdAt: serverTimestamp()
      });
    }

    const snap2 = await getDoc(userRef);
    const udata = snap2.data() || {};

    if (udata.active === false) {
      alert("Usuário desativado. Contate o administrador.");
      await signOut(auth);
      return;
    }

    /* Sessão */
    session.user = user;
    session.userName = udata.name || user.email;
    session.isAdmin = udata.role === "admin";

    setCurrentUserName(session.userName);
    setIsAdmin(session.isAdmin);
    setAdminUnlocked(false);

    if (onLoggedIn) {
      onLoggedIn(session);
    }

    /* Inicia listeners */
    if (startRealtime) startRealtime();
    if (session.isAdmin && startHistoryRealtime) startHistoryRealtime();
  });
}

/* =========================
   CREATE USER (ADMIN)
========================= */

export async function createUser({
  email,
  password,
  name,
  role
}) {
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

