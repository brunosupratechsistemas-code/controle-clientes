// calendar.js
let tokenClient = null;
let accessToken = null;
let tokenExpiresAt = 0;
// 1) Configure com seu Client ID do Google Cloud:
const GOOGLE_CLIENT_ID = "760214687992-9m6fk3drqufd9r5euc7otlibe3vu4t03.apps.googleusercontent.com";

// Escopo para criar/editar eventos
const GOOGLE_SCOPE = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly"
].join(" "); // :contentReference[oaicite:5]{index=5}

export function initGoogleTokenClient() {
  if (tokenClient) return;

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: GOOGLE_SCOPE,
    callback: (resp) => {
      if (resp?.access_token) {
        accessToken = resp.access_token;

        const expiresIn = Number(resp.expires_in || 0);
        tokenExpiresAt = expiresIn ? Date.now() + (expiresIn * 1000) - 60000 : 0;
      }
    }
  });
}

export async function ensureGoogleAccessToken(loginHint = null, forceSelect = false) {
  initGoogleTokenClient();

  if (
  accessToken &&
  tokenExpiresAt &&
  Date.now() < tokenExpiresAt &&
  !forceSelect
) {
  return accessToken;
}

  await new Promise((resolve, reject) => {
    tokenClient.callback = (resp) => {
      if (resp?.access_token) {
        accessToken = resp.access_token;
        resolve(accessToken);
      } else {
        reject(resp);
      }
    };

    const opts = {};

    // Só força escolha de conta quando você realmente quiser trocar de conta
    if (forceSelect) {
      opts.prompt = "select_account";
    } else {
      // tenta reutilizar sessão existente
      opts.prompt = "";
    }

    if (loginHint) {
      opts.login_hint = loginHint;
    }

    tokenClient.requestAccessToken(opts);
  });

  return accessToken;
}


export async function createCalendarEvent({
  title,
  description,
  startISO,
  endISO,
  calendarId = "primary",
  gerarMeet = true
}) {
  const token = await ensureGoogleAccessToken(calendarId);

  const body = {
    summary: title,
    description: description || "",
    start: { dateTime: startISO },
    end: { dateTime: endISO }
  };

  if (gerarMeet) {
    body.conferenceData = {
      createRequest: {
        requestId: crypto.randomUUID(),
        conferenceSolutionKey: { type: "hangoutsMeet" }
      }
    };
  }

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );

  return await res.json();
}


export async function updateCalendarEvent(eventId, payload, calendarId = "primary") {
  const token = await ensureGoogleAccessToken(calendarId);

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
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
    const text = await res.text();
    throw new Error(`Erro ao atualizar evento Google: ${res.status} - ${text}`);
  }

  return await res.json();
}

export async function deleteCalendarEvent(eventId, calendarId = "primary") {
  if (!eventId) return true;

  const token = await ensureGoogleAccessToken(calendarId);

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`Erro ao excluir evento Google: ${res.status} - ${text}`);
  }

  return true;
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


export async function listCalendarEvents(
  { timeMin, timeMax },
  calendarId = "primary",
  loginHint = null
) {
  const token = await ensureGoogleAccessToken(loginHint);

  const url = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`
  );

  url.searchParams.set("timeMin", timeMin);
  url.searchParams.set("timeMax", timeMax);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Erro ao listar eventos: ${res.status} - ${text}`);
  }

  const data = await res.json();
  return data.items || [];
}

