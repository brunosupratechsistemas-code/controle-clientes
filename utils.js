/* =========================
   FUNÇÕES AUXILIARES (UTILS)
========================= */

/* =========================
   HTML SAFE
========================= */
export function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* =========================
   DATE FORMATTERS
========================= */

/* Timestamp ou Date */
export function fmtTS(ts) {
  try {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString("pt-BR");
  } catch {
    return "";
  }
}

/* Documento do cliente */
export function fmtDateFromDoc(data) {
  try {
    if (data?.createdAtClient) {
      return new Date(data.createdAtClient).toLocaleString("pt-BR");
    }
    if (data?.createdAt?.toDate) {
      return data.createdAt.toDate().toLocaleString("pt-BR");
    }
    return "";
  } catch {
    return "";
  }
}

/* =========================
   LOADING GLOBAL
========================= */

export function showLoading(text = "Processando...") {
  const el = document.getElementById("global-loading");
  const txt = document.getElementById("loading-text");

  if (txt) txt.innerText = text;
  if (el) el.style.display = "flex";
}

export function hideLoading() {
  const el = document.getElementById("global-loading");
  if (el) el.style.display = "none";
}

/* =========================
   HELPERS
========================= */

export function containerByStatus(status) {
  if (status === "agendado") return document.getElementById("agendado");
  if (status === "finalizado") return document.getElementById("finalizado");
  return document.getElementById("espera");
}

export function formatarDataBR(dataISO) {
  if (!dataISO || typeof dataISO !== "string") return "";
  if (dataISO.includes("/")) return dataISO;
  if (!dataISO.includes("-")) return "";

  const [ano, mes, dia] = dataISO.split("-");
  return `${dia}/${mes}`;
}
