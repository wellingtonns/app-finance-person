const { createClient } = require("@libsql/client");

const STATE_PREFIX = process.env.APP_STATE_PREFIX || "financeperson:state:v1:";

function sanitizeUser(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized || "principal";
}

function sendJson(res, status, payload) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.send(JSON.stringify(payload));
}

function getClient() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    throw new Error("Turso nao configurado.");
  }
  return createClient({ url, authToken });
}

async function ensureSchema(client) {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
}

async function readJsonBody(req) {
  if (req && req.body && typeof req.body === "object") {
    return req.body;
  }
  if (req && typeof req.body === "string" && req.body.length) {
    return JSON.parse(req.body);
  }

  const chunks = [];
  await new Promise((resolve, reject) => {
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve());
    req.on("error", (error) => reject(error));
  });

  const raw = Buffer.concat(chunks).toString("utf-8").trim();
  if (!raw) return {};
  return JSON.parse(raw);
}

function getStateKey(user) {
  return `${STATE_PREFIX}${user}`;
}

async function readRemoteState(client, user) {
  const result = await client.execute({
    sql: "SELECT data, updated_at FROM app_state WHERE key = ? LIMIT 1",
    args: [getStateKey(user)],
  });

  const row = result.rows[0];
  if (!row || !row.data) return null;

  let parsed = null;
  try {
    parsed = JSON.parse(String(row.data));
  } catch {
    return null;
  }

  return {
    state: parsed && typeof parsed.state === "object" ? parsed.state : null,
    updatedAt: parsed && typeof parsed.updatedAt === "string" ? parsed.updatedAt : String(row.updated_at || ""),
  };
}

async function writeRemoteState(client, user, state) {
  const updatedAt = new Date().toISOString();
  const payload = JSON.stringify({ state, updatedAt });

  await client.execute({
    sql: `
      INSERT INTO app_state (key, data, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        data = excluded.data,
        updated_at = excluded.updated_at
    `,
    args: [getStateKey(user), payload, updatedAt],
  });

  return updatedAt;
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const user = sanitizeUser(req.query && req.query.user);

  try {
    const client = getClient();
    await ensureSchema(client);

    if (req.method === "GET") {
      const payload = await readRemoteState(client, user);
      sendJson(res, 200, {
        user,
        state: payload && payload.state ? payload.state : null,
        updatedAt: payload && payload.updatedAt ? payload.updatedAt : null,
      });
      return;
    }

    if (req.method === "PUT") {
      const body = await readJsonBody(req);
      const incomingState = body && typeof body.state === "object" ? body.state : null;
      if (!incomingState) {
        sendJson(res, 400, { error: "Campo state obrigatorio." });
        return;
      }

      const updatedAt = await writeRemoteState(client, user, incomingState);
      sendJson(res, 200, { ok: true, user, updatedAt });
      return;
    }

    sendJson(res, 405, { error: "Metodo nao permitido." });
  } catch (error) {
    console.error("Erro em /api/state:", error);
    const message = /Turso nao configurado/i.test(String(error && error.message))
      ? "Persistencia nao configurada no Vercel (Turso)."
      : "Falha ao processar persistencia.";
    sendJson(res, 500, { error: message });
  }
};
