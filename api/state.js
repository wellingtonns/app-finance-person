const statePrefix = "financeperson:state:v1:";

function sanitizeUser(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized || "principal";
}

function sendJson(res, status, payload) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.send(JSON.stringify(payload));
}

function getKvConfig() {
  const url = process.env.KV_REST_API_URL || "";
  const token = process.env.KV_REST_API_TOKEN || "";
  return { url, token };
}

async function kvFetch(path, options = {}) {
  const { url, token } = getKvConfig();
  if (!url || !token) {
    throw new Error("KV nao configurado.");
  }

  const response = await fetch(`${url}${path}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: options.body,
  });

  if (!response.ok) {
    throw new Error(`KV REST falhou: ${response.status}`);
  }
  return response.json();
}

async function readRemoteState(user) {
  const key = `${statePrefix}${user}`;
  const result = await kvFetch(`/get/${encodeURIComponent(key)}`);
  const raw = result && result.result ? result.result : null;
  if (!raw) return null;

  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  return typeof raw === "object" ? raw : null;
}

async function writeRemoteState(user, state) {
  const key = `${statePrefix}${user}`;
  const payload = {
    state,
    updatedAt: new Date().toISOString(),
  };
  const value = encodeURIComponent(JSON.stringify(payload));
  await kvFetch(`/set/${encodeURIComponent(key)}/${value}`);
  return payload.updatedAt;
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const user = sanitizeUser(req.query && req.query.user);

  try {
    if (req.method === "GET") {
      const payload = await readRemoteState(user);
      sendJson(res, 200, {
        user,
        state: payload && typeof payload.state === "object" ? payload.state : null,
        updatedAt: payload && typeof payload.updatedAt === "string" ? payload.updatedAt : null,
      });
      return;
    }

    if (req.method === "PUT") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      const incomingState = body && typeof body.state === "object" ? body.state : null;
      if (!incomingState) {
        sendJson(res, 400, { error: "Campo state obrigatorio." });
        return;
      }

      const updatedAt = await writeRemoteState(user, incomingState);
      sendJson(res, 200, { ok: true, user, updatedAt });
      return;
    }

    sendJson(res, 405, { error: "Metodo nao permitido." });
  } catch (error) {
    console.error("Erro em /api/state:", error);
    const message = /KV nao configurado/i.test(String(error && error.message))
      ? "Persistencia nao configurada no Vercel (KV)."
      : "Falha ao processar persistencia.";
    sendJson(res, 500, { error: message });
  }
};
