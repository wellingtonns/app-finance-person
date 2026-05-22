const DEFAULT_USERS = [
  { username: "wellington", password: "change-me" },
];

function parseUsers() {
  const raw = process.env.APP_AUTH_USERS;
  if (!raw) return DEFAULT_USERS;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_USERS;
    return parsed
      .map((item) => ({
        username: String(item.username || "").trim().toLowerCase(),
        password: String(item.password || ""),
      }))
      .filter((item) => item.username && item.password);
  } catch {
    return DEFAULT_USERS;
  }
}

function sendJson(res, status, payload) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.send(JSON.stringify(payload));
}

async function readJsonBody(req) {
  if (req && req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  await new Promise((resolve, reject) => {
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", resolve);
    req.on("error", reject);
  });
  const raw = Buffer.concat(chunks).toString("utf-8").trim();
  return raw ? JSON.parse(raw) : {};
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Metodo nao permitido." });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const username = String(body.username || "").trim().toLowerCase();
    const password = String(body.password || "");
    const match = parseUsers().find((user) => user.username === username && user.password === password);

    if (!match) {
      sendJson(res, 401, { error: "Usuario ou senha invalidos." });
      return;
    }

    sendJson(res, 200, { ok: true, user: username });
  } catch {
    sendJson(res, 400, { error: "Payload invalido." });
  }
};
