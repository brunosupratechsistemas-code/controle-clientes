/* =========================
   ESTADO GLOBAL / CACHE
========================= */

/* Sessão */
export const session = {
  user: null,
  userName: "",
  isAdmin: false
};

/* Permissões */
export let isAdmin = false;
export let adminUnlocked = false;

/* Usuário atual */
export let currentUserName = "";

/* Cache */
export let contabilidadesCache = {};
export let contabilidadesAdminCache = [];
export const CACHE_KEY = "clientes_cache_v1";

/* Histórico */
export let historyAll = [];
export let historyFiltered = [];

/* Seleção / drag */
export let selectedCard = null;
export let draggedInfo = null;

/* Unsubscribe Firestore */
export let unsubscribeRealtime = null;
export let unsubscribeHistory = null;
export let unsubscribeDashboard = null;
export let unsubscribeContabilidades = null;

/* Charts */
export let chartStatus = null;
export let chartCriacao = null;

/* =========================
   SETTERS (controlados)
========================= */

export function setIsAdmin(value) {
  isAdmin = value;
}

export function setAdminUnlocked(value) {
  adminUnlocked = value;
}

export function setCurrentUserName(value) {
  currentUserName = value;
}

export function setContabilidadesCache(value) {
  contabilidadesCache = value;
}

export function setContabilidadesAdminCache(value) {
  contabilidadesAdminCache = value;
}

export function setHistoryAll(value) {
  historyAll = value;
}

export function setHistoryFiltered(value) {
  historyFiltered = value;
}

export function setSelectedCard(value) {
  selectedCard = value;
}

export function setDraggedInfo(value) {
  draggedInfo = value;
}

export function setUnsubscribeRealtime(fn) {
  unsubscribeRealtime = fn;
}

export function setUnsubscribeHistory(fn) {
  unsubscribeHistory = fn;
}

export function setUnsubscribeDashboard(fn) {
  unsubscribeDashboard = fn;
}

export function setUnsubscribeContabilidades(fn) {
  unsubscribeContabilidades = fn;
}

export function setChartStatus(chart) {
  chartStatus = chart;
}

export function setChartCriacao(chart) {
  chartCriacao = chart;
}

// state.js

let pendingEmailData = null;

export function setPendingEmailData(data) {
  pendingEmailData = data;
}

export function getPendingEmailData() {
  return pendingEmailData;
}

export function clearPendingEmailData() {
  pendingEmailData = null;
}
