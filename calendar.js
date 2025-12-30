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
    end: { dateTime: endISO }
  };

  // events.insert: POST /calendar/v3/calendars/primary/events :contentReference[oaicite:7]{index=7}
  const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Calendar API erro: ${res.status} - ${text}`);
  }

  return await res.json(); // retorna id, htmlLink, etc.
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

