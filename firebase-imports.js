/* =========================
   FIREBASE SDKs - IMPORTS
========================= */

/* App */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";

/* Firestore */
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  setDoc,
  onSnapshot,
  writeBatch,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

/* Auth */
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updatePassword
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

/* =========================
   EXPORTS
========================= */

export {
  // app
  initializeApp,

  // firestore
  getFirestore,
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  setDoc,
  onSnapshot,
  writeBatch,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,

  // auth
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updatePassword
};
