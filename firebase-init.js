/* =========================
   FIREBASE CONFIG + INIT
========================= */

import {
  initializeApp,
  getFirestore,
  getAuth
} from "./firebase-imports.js";

/* =========================
   FIREBASE CONFIG
========================= */

const firebaseConfig = {
  apiKey: "AIzaSyB5Gz3N_JRxwgtisX_e6I9zGqrMjThents",
  authDomain: "controle-clientes-3a04b.firebaseapp.com",
  projectId: "controle-clientes-3a04b"
};

/* =========================
   INIT APP
========================= */

// App principal
const app = initializeApp(firebaseConfig);

// Firestore
const db = getFirestore(app);

// Auth principal
const auth = getAuth(app);

// Auth secundário (criar usuário sem deslogar admin)
const secondaryApp = initializeApp(firebaseConfig, "secondary");
const secondaryAuth = getAuth(secondaryApp);

/* =========================
   EXPORTS
========================= */

export {
  app,
  db,
  auth,
  secondaryAuth
};
