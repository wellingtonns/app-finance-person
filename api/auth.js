const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_USERS = [
  { username: "wellington", password: "1234" },
];

const USERS_FILE = process.env.APP_AUTH_USERS_FILE || path.join(__dirname, "auth-users.local.json");

function normalizeUsers(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => ({
      username: String(item.username || "").trim().toLowerCase(),
      password: String(item.password || ""),
    }))
    .filter((item) => item.username && item.password);
}

function readFileUsers() {
  try {
    if (!fs.existsSync(USERS_FILE)) return null;
    const parsed = JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
    const users = normalizeUsers(parsed);
    return users.length ? users : null;
  } catch {
    return null;
  }
}

function parseUsers() {
  const fileUsers = readFileUsers();
  if (fileUsers) return fileUsers;

  const raw = process.env.APP_AUTH_USERS;
  if (!raw) return DEFAULT_USERS;
  try {
    const users = normalizeUsers(JSON.parse(raw));
    return users.length ? users : DEFAULT_USERS;
  } catch {
    return DEFAULT_USERS;
  }
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
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
    sendJson(res, 405, { error: "Método não permitido." });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const username = String(body.username || "").trim().toLowerCase();
    const password = String(body.password || "");
    const match = parseUsers().find((user) => user.username === username && user.password === password);

    if (!match) {
      sendJson(res, 401, { error: "Usuário ou senha inválidos." });
      return;
    }

    sendJson(res, 200, { ok: true, user: username });
  } catch {
    sendJson(res, 400, { error: "Payload inválido." });
  }
};

module.exports.changePassword = async function changePasswordHandler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Método não permitido." });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const username = String(body.username || "").trim().toLowerCase();
    const currentPassword = String(body.currentPassword || "");
    const newPassword = String(body.newPassword || "");

    if (!username || !currentPassword || !newPassword) {
      sendJson(res, 400, { error: "Informe usuário, senha atual e nova senha." });
      return;
    }

    if (newPassword.length < 4) {
      sendJson(res, 400, { error: "A nova senha deve ter pelo menos 4 caracteres." });
      return;
    }

    const users = parseUsers();
    const userIndex = users.findIndex((user) => user.username === username);
    if (userIndex < 0 || users[userIndex].password !== currentPassword) {
      sendJson(res, 401, { error: "Senha atual inválida." });
      return;
    }

    users[userIndex] = { ...users[userIndex], password: newPassword };
    saveUsers(users);
    sendJson(res, 200, { ok: true, user: username });
  } catch {
    sendJson(res, 400, { error: "Payload inválido." });
  }
};
