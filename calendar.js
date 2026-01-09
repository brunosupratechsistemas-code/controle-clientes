// calendar.js
let tokenClient = null;
let accessToken = null;

// 1) Configure com seu Client ID do Google Cloud:
const GOOGLE_CLIENT_ID = "760214687992-9m6fk3drqufd9r5euc7otlibe3vu4t03.apps.googleusercontent.com";

// Escopo para criar/editar eventos
const GOOGLE_SCOPE = "https://www.googleapis.com/auth/calendar.events"; // :contentReference[oaicite:5]{index=5}

export function initGoogleTokenClient() {
  if (tokenClient) return;

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: GOOGLE_SCOPE,
    callback: (resp) => {
      if (resp?.access_token) {
        accessToken = resp.access_token;
      }
    }
  }); // :contentReference[oaicite:6]{index=6}
}

export async function ensureGoogleAccessToken(loginHint = null) {
  initGoogleTokenClient();

  // ✅ Se já tem token, reutiliza (evita escolher outra conta toda hora)
  if (accessToken) return accessToken;

  await new Promise((resolve, reject) => {
    tokenClient.callback = (resp) => {
      if (resp?.access_token) {
        accessToken = resp.access_token;
        resolve(accessToken);
      } else {
        reject(resp);
      }
    };

    const opts = {
      prompt: "select_account"
    };

    // ✅ Ajuda o usuário a escolher a conta certa (se suportado)
    if (loginHint) opts.login_hint = loginHint;

    tokenClient.requestAccessToken(opts);
  });

  return accessToken;
}


export async function createCalendarEvent({ title, description, startISO, endISO }) {
  const token = await ensureGoogleAccessToken();

  const body = {
    summary: title,
    description: description || "",
    start: { dateTime: startISO },
    end: { dateTime: endISO },

    // ✅ Gera Google Meet automaticamente
    conferenceData: {
      createRequest: {
        requestId: crypto.randomUUID(),
        conferenceSolutionKey: { type: "hangoutsMeet" }
      }
    }
  };

  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Calendar API erro: ${res.status} - ${text}`);
  }

  return await res.json();
}



export async function updateCalendarEvent(eventId, payload, googleCreatorEmail = null) {
  const token = await ensureGoogleAccessToken(googleCreatorEmail);
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );

  if (!res.ok) {
    throw new Error("Erro ao atualizar evento no Google Agenda");
  }

  return await res.json();
}

export async function carregarFinalizadosPorMes(mesSelecionado = null) {
  const container = document.getElementById("finalizados-container");
  const tabs = document.getElementById("finalizados-meses");

  if (!container || !tabs) return;

  container.innerHTML = "";
  tabs.innerHTML = "";

  const q = query(
    collection(db, "clientes"),
    where("status", "==", "finalizado"),
    orderBy("finalizadoMes", "desc")
  );

  const snap = await getDocs(q);

  const porMes = {};

  snap.forEach(d => {
    const c = { id: d.id, ...d.data() };
    if (!c.finalizadoMes) return;

    if (!porMes[c.finalizadoMes]) {
      porMes[c.finalizadoMes] = [];
    }
    porMes[c.finalizadoMes].push(c);
  });

  const meses = Object.keys(porMes).sort().reverse();
  const mesAtivo = mesSelecionado || meses[0];

  meses.forEach(mes => {
    const btn = document.createElement("button");
    btn.className = "tab-btn";
    btn.innerText = mes;
    btn.onclick = () => carregarFinalizadosPorMes(mes);

    if (mes === mesAtivo) btn.classList.add("active");
    tabs.appendChild(btn);
  });

  porMes[mesAtivo]?.forEach(c => {
    container.appendChild(createCard(c));
  });
}
export function extrairMeetLink(event) {
  return (
    event?.hangoutLink ||
    event?.conferenceData?.entryPoints?.find(
      e => e.entryPointType === "video"
    )?.uri ||
    ""
  );
}

export async function deleteCalendarEvent(eventId, googleCreatorEmail = null) {
  if (!eventId) return true;

  const token = await ensureGoogleAccessToken(googleCreatorEmail);

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  // 404 = já não existe, então tudo bem
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`Erro ao excluir evento Google: ${text}`);
  }

  return true;
}

