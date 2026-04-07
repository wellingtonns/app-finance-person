const sessionKey = "controle-gastos-session-v1";

const allowedUsers = [
  { username: "andressa", password: "Wellington@15" },
  { username: "wellington", password: "Andress@15" },
];

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function setSession(username) {
  const user = normalize(username);
  localStorage.setItem(sessionKey, user);
  sessionStorage.setItem(sessionKey, user);
  document.cookie = `${sessionKey}=${encodeURIComponent(user)}; path=/; max-age=2592000; SameSite=Lax`;
}

function getCookie(name) {
  const prefix = `${name}=`;
  const parts = document.cookie.split(";");
  for (const part of parts) {
    const item = part.trim();
    if (item.startsWith(prefix)) return decodeURIComponent(item.slice(prefix.length));
  }
  return "";
}

function getSession() {
  return normalize(localStorage.getItem(sessionKey) || sessionStorage.getItem(sessionKey) || getCookie(sessionKey));
}

function isAllowedUser(username) {
  return allowedUsers.some((item) => item.username === username);
}

function goDashboard() {
  const user = getSession();
  const targetUrl = new URL("dashboard.html", window.location.href);
  if (user) targetUrl.searchParams.set("user", user);
  targetUrl.searchParams.set("ts", String(Date.now()));
  const target = targetUrl.toString();
  window.location.href = target;
  setTimeout(() => {
    if (window.location.pathname.endsWith("/index.html") || window.location.pathname === "/") {
      window.location.href = target;
    }
  }, 300);
}

function bootstrapAuth() {
  const status = document.getElementById("auth-status");
  const form = document.getElementById("login-form");
  const userInput = document.getElementById("login-username");
  const passInput = document.getElementById("login-password");

  const existing = getSession();
  if (isAllowedUser(existing)) {
    goDashboard();
    return;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const username = normalize(userInput.value);
    const password = String(passInput.value || "");
    const isValid = allowedUsers.some((item) => item.username === username && item.password === password);

    if (!isValid) {
      status.textContent = "Usuário ou senha inválidos.";
      return;
    }

    setSession(username);
    status.textContent = "Login realizado. Abrindo dashboard...";
    goDashboard();
  });
}

bootstrapAuth();
