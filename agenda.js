import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  doc,
  getDoc
} from "./firebase-imports.js";

const API_BASE =
  window.location.hostname === "localhost"
    ? "http://localhost:3333"
    : "https://supratech-whatsapp.fly.dev";

import { listCalendarEvents } from "./calendar.js";


import { db, auth } from "./firebase-init.js";
import { session } from "./state.js";

let agendaUnsub = null;
let currentMonth = new Date(); // controla mês exibido
let selectedDate = new Date(); // dia selecionado
let cachedEvents = [];         // eventos carregados

async function getEmailFromSuporte(uid) {
  if (!uid) return null;

  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return null;

    return snap.data().email || null;
  } catch (err) {
    console.warn("Erro pegando email do suporte:", err);
    return null;
  }
}


async function reloadGoogleEventsForCurrentMonth() {
  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);

  const suporteFilter = getActiveSuporteFilter();
// 🔥 pega suporte selecionado ou logado
const suporteUid = getActiveSuporteFilter();

// 🔥 pega email real do suporte
const suporteEmail = await getEmailFromSuporte(suporteUid);

// ✅ busca eventos Google usando o email como calendarId
const googleEventsRaw = suporteEmail
  ? await fetchGoogleEvents(
      {
        timeMinISO: monthStart.toISOString(),
        timeMaxISO: monthEnd.toISOString()
      },
      suporteEmail
    )
  : [];


  const googleEvents = googleEventsRaw
    .map(ev => buildEventFromGoogle(ev, suporteFilter))
    .filter(Boolean);

  // mantém os eventos do sistema e só troca os do google
  const systemEvents = cachedEvents.filter(e => e.fonte === "sistema");

  // ✅ Anti duplicação: remove do Google os eventos que já existem no sistema
const systemKeySet = new Set(
  systemEvents.map(e => `${e.data}|${e.hora}|${(e.clienteNome || "").toLowerCase().trim()}`)
);

const googleNoDup = googleEvents.filter(e => {
  const key = `${e.data}|${e.hora}|${(e.clienteNome || "").toLowerCase().trim()}`;
  return !systemKeySet.has(key);
});

// ✅ junta sem duplicar
cachedEvents = [...systemEvents, ...googleNoDup];

}


async function fetchGoogleEvents({ timeMinISO, timeMaxISO }, suporteEmail = null) {
  try {
    const items = await listCalendarEvents(
      {
        timeMin: timeMinISO,
        timeMax: timeMaxISO
      },
      suporteEmail
    );

    return items.map(ev => ({
      id: ev.id,
      summary: ev.summary || "",
      description: ev.description || "",
      htmlLink: ev.htmlLink || "",
      meetLink:
        ev.hangoutLink ||
        ev.conferenceData?.entryPoints?.find(e => e.entryPointType === "video")?.uri ||
        "",
      start: ev.start?.dateTime || ev.start?.date || "",
      end: ev.end?.dateTime || ev.end?.date || ""
    }));
  } catch (e) {
    console.warn("⚠️ Google events erro:", e.message);
    return [];
  }
}



function isSameEvent(a, b) {
  return (
    a.data === b.data &&
    (a.hora || "") === (b.hora || "") &&
    (a.clienteNome || "").trim().toLowerCase() ===
      (b.clienteNome || "").trim().toLowerCase()
  );
}


function buildEventFromGoogle(ev, suporteId = null) {
  // start pode ser dateTime ou date
  const startRaw = ev.start;
  if (!startRaw) return null;

  const startDate = new Date(startRaw);
  if (isNaN(startDate.getTime())) return null;

  const ymd = toYMD(startDate);
  const hora = startRaw.includes("T")
    ? `${pad2(startDate.getHours())}:${pad2(startDate.getMinutes())}`
    : "";

  return {
    id: ev.id,
    fonte: "google",
    clienteNome: ev.summary || "(Sem título)",
    suporteId,
    tipo: "GOOGLE",
    data: ymd,
    hora,
    duracaoMin: 60,
    descricao: ev.description || "",
    googleLink: ev.meetLink || "",
    calendarLink: ev.htmlLink || ""
  };
}

async function fetchGoogleCalendarEvents() {
  try {
    const suporteId = getActiveSuporteFilter();

    // admin: se suporteId = null → pega tudo (usa /events-all)
    const url = session?.isAdmin && !suporteId
      ? `${API_BASE}/gcal/events-all`
      : `${API_BASE}/gcal/events?suporteId=${suporteId}`;

    const resp = await fetch(url);
    const data = await resp.json();

    if (!data.ok) {
      console.warn("Erro ao buscar Google Agenda:", data.error);
      return [];
    }

    return data.events || [];
  } catch (err) {
    console.error("Erro fetchGoogleCalendarEvents:", err);
    return [];
  }
}


function pad2(n){ return String(n).padStart(2,"0"); }
function toYMD(d){
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
}
function monthLabel(d){
  return d.toLocaleDateString("pt-BR", { month:"long", year:"numeric" });
}
function dayLabel(d){
  return d.toLocaleDateString("pt-BR", { weekday:"long", day:"2-digit", month:"long", year:"numeric" });
}

function getActiveSuporteFilter(){
  // admin pode escolher um suporte; suporte comum sempre é ele mesmo
  if (session?.isAdmin) {
    const sel = document.getElementById("agendaSuporteFilter");
    const v = sel?.value || "";
    return v || null; // null = todos
  }
  return session?.user?.uid || auth.currentUser?.uid || null;
}


async function loadSuportesToFilter(){
  const wrap = document.getElementById("agenda-filter-wrap");
  const sel = document.getElementById("agendaSuporteFilter");
  if (!wrap || !sel) return;

  if (!session?.isAdmin) {
    wrap.style.display = "none";
    return;
  }

  wrap.style.display = "flex";
  sel.innerHTML = `<option value="">👥 Todos os suportes</option>`;

  // busca suportes (igual teu dashboard)
  const snap = await getDocs(query(collection(db, "users"), where("role", "==", "suporte")));
  snap.forEach(d => {
    const u = d.data();
    sel.innerHTML += `<option value="${d.id}">${u.name || u.email}</option>`;
  });

  sel.onchange = () => {
    startAgendaRealtime(); // recarrega escuta com filtro escolhido
  };
}

function buildClientEventFromDoc(docSnap){
  const c = docSnap.data();

  // teu sistema salva o agendamento dentro do cliente (agendamento.data/hora/duracaoMin/descricao/tipo)
  const ag = c.agendamento || {};
  const ymd = ag.data; // "YYYY-MM-DD"
  if (!ymd) return null;

  return {
    id: docSnap.id,
    clienteNome: c.name || "Cliente",
    telefone: c.telefone || "",
    suporteId: c.suporteId || null,
    suporteNome: c.suporteNome || "",
    tipo: ag.tipo || "TREINAMENTO",
    data: ag.data,
    hora: ag.hora || "",
    duracaoMin: ag.duracaoMin || 60,
    descricao: ag.descricao || "",
    googleEventId: c.googleEventId || null,
googleMeetLink: c.googleMeetLink || "",
calendarLink: c.googleHtmlLink || "",

    
  };
}

function startAgendaRealtime(){
  // mata a escuta anterior
  if (agendaUnsub) {
    agendaUnsub();
    agendaUnsub = null;
  }

  const suporteFilter = getActiveSuporteFilter();

  // regra:
  // - suporte: filtra por suporteId = ele
  // - admin: se escolheu um suporte -> filtra, se não escolheu -> não filtra (todos)
  let q;
  if (session?.isAdmin) {
    if (suporteFilter) {
      q = query(
        collection(db, "clientes"),
        where("status", "==", "agendado"),
        where("suporteId", "==", suporteFilter)
      );
    } else {
      q = query(
        collection(db, "clientes"),
        where("status", "==", "agendado")
      );
    }
  } else {
    q = query(
      collection(db, "clientes"),
      where("status", "==", "agendado"),
      where("suporteId", "==", suporteFilter)
    );
  }

  agendaUnsub = onSnapshot(q, snap => {
    const events = [];
    snap.forEach(d => {
      const ev = buildClientEventFromDoc(d);
      if (ev) events.push(ev);
    });

    (async () => {
  // eventos do sistema (Firestore)
  const systemEvents = events
  .filter(e => !e.googleEventId) // ✅ se foi pro google, não mostra duplicado
  .map(e => ({ ...e, fonte: "sistema" }));


  // período de busca: mês atual inteiro
  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);

  const suporteFilter = getActiveSuporteFilter();

// 🔥 pega suporte ativo
const suporteUid = getActiveSuporteFilter();

// 🔥 pega email do suporte
const suporteEmail = await getEmailFromSuporte(suporteUid);

// ✅ busca eventos Google usando o email
const googleEventsRaw = suporteEmail
  ? await fetchGoogleEvents(
      {
        timeMinISO: monthStart.toISOString(),
        timeMaxISO: monthEnd.toISOString()
      },
      suporteEmail
    )
  : [];


  const googleEvents = googleEventsRaw
  .map(ev => buildEventFromGoogle(ev, suporteFilter))
  .filter(Boolean);

// ✅ remove duplicados (Google que já existe no sistema)
const googleEventsFiltrados = googleEvents.filter(gEv => {
  return !systemEvents.some(sEv => isSameEvent(sEv, gEv));
});

// ✅ junta tudo
cachedEvents = [...systemEvents, ...googleEventsFiltrados];

  renderAgenda();
})();

  });
}

function renderAgenda(){
  const grid = document.getElementById("agenda-grid");
  const monthEl = document.getElementById("agenda-month-label");
  const dayEl = document.getElementById("agenda-day-label");
  const listEl = document.getElementById("agenda-day-list");
  const subtitle = document.getElementById("agenda-subtitle");

  if (!grid || !monthEl || !dayEl || !listEl) return;

  monthEl.innerText = monthLabel(currentMonth);
  dayEl.innerText = dayLabel(selectedDate);

  // subtítulo (admin mostra filtro)
  if (subtitle) {
    if (session?.isAdmin) {
      const f = getActiveSuporteFilter();
      subtitle.innerText = f ? "Visualizando: suporte selecionado" : "Visualizando: todos os suportes";
    } else {
      subtitle.innerText = "Visualizando: minha agenda";
    }
  }

  // monta matriz do mês (começa no domingo)
  const first = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const startDay = first.getDay(); // 0-dom
  const start = new Date(first);
  start.setDate(first.getDate() - startDay);

  // 6 semanas x 7 dias = 42 células
  grid.innerHTML = "";
  for (let i=0;i<42;i++){
    const d = new Date(start);
    d.setDate(start.getDate()+i);

    const ymd = toYMD(d);
    const isMuted = d.getMonth() !== currentMonth.getMonth();
    const isSelected = toYMD(d) === toYMD(selectedDate);

    const eventsDay = cachedEvents.filter(ev => ev.data === ymd);

    const cell = document.createElement("div");
    cell.className = `agenda-cell ${isMuted ? "muted":""}`;
    cell.style.outline = isSelected ? "2px solid rgba(123,92,255,.55)" : "none";

    cell.onclick = () => {
      selectedDate = d;
      renderAgenda();
    };

    const top = document.createElement("div");
    top.className = "agenda-daynum";
    top.innerHTML = `<span>${d.getDate()}</span><span style="opacity:.7">${eventsDay.length ? eventsDay.length : ""}</span>`;

    const dots = document.createElement("div");
    dots.className = "agenda-dots";
    eventsDay.slice(0, 8).forEach(() => {
      const dot = document.createElement("div");
      dot.className = "agenda-dot";
      dots.appendChild(dot);
    });

    cell.appendChild(top);
    cell.appendChild(dots);
    grid.appendChild(cell);
  }

  // lista do dia (lado direito)
  const dayKey = toYMD(selectedDate);
  const dayEvents = cachedEvents
    .filter(ev => ev.data === dayKey)
    .sort((a,b) => (a.hora || "").localeCompare(b.hora || ""));

  if (!dayEvents.length){
    listEl.innerHTML = `<div style="opacity:.75;padding:8px">Nenhum agendamento nesse dia.</div>`;
    return;
  }

  listEl.innerHTML = "";
  dayEvents.forEach(ev => {
    const div = document.createElement("div");
    div.className = "agenda-item";

    const horaTxt = ev.hora ? `🕒 ${ev.hora}` : "🕒 (sem hora)";
    const tipoTxt = ev.tipo ? `• ${ev.tipo}` : "";

    const badge =
  ev.fonte === "google"
    ? `<span style="font-size:11px;background:#2563eb33;padding:2px 6px;border-radius:8px;margin-left:6px">Google</span>`
    : `<span style="font-size:11px;background:#22c55e33;padding:2px 6px;border-radius:8px;margin-left:6px">Sistema</span>`;

div.innerHTML = `
  <strong>${ev.clienteNome} ${badge}</strong>

      <small>${horaTxt} ${tipoTxt}</small>
      ${ev.descricao ? `<div style="margin-top:6px;opacity:.85;font-size:13px">${ev.descricao}</div>` : ""}
      ${ev.googleLink ? `<a class="agenda-link" href="${ev.googleLink}" target="_blank">Abrir Meet</a>` : ""}
      ${ev.calendarLink ? `<a class="agenda-link" href="${ev.calendarLink}" target="_blank">Abrir no Google Agenda</a>` : ""}
    `;

    listEl.appendChild(div);
  });
}

export async function openAgendaModal(){
  // usa teu padrão de abrir modal (classes show + overlay) — se existir no window
  if (window.openModalById) window.openModalById("modal-agenda");
  else document.getElementById("modal-agenda")?.classList.add("show");

  // carrega filtro admin e inicia realtime
  await loadSuportesToFilter();
  startAgendaRealtime();

  // default: mês atual + hoje
  currentMonth = new Date();
  selectedDate = new Date();
  renderAgenda();
}

export function closeAgendaModal(){
  if (agendaUnsub) { agendaUnsub(); agendaUnsub = null; }
  if (window.closeModalById) window.closeModalById("modal-agenda");
  else document.getElementById("modal-agenda")?.classList.remove("show");
}

// navegação
export async function agendaPrevMonth(){
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth()-1, 1);

  // ✅ garante que o dia selecionado exista nesse mês
  selectedDate = new Date(currentMonth);

  await reloadGoogleEventsForCurrentMonth();
  renderAgenda();
}

export async function agendaNextMonth(){
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth()+1, 1);

  // ✅ garante que o dia selecionado exista nesse mês
  selectedDate = new Date(currentMonth);

  await reloadGoogleEventsForCurrentMonth();
  renderAgenda();
}

export async function agendaToday(){
  currentMonth = new Date();
  selectedDate = new Date();
  await reloadGoogleEventsForCurrentMonth();
  renderAgenda();
}


