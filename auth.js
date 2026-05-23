const sessionKey = "controle-gastos-session-v1";

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function setSession(username, remember = true) {
  const user = normalize(username);
  sessionStorage.setItem(sessionKey, user);
  if (remember) {
    localStorage.setItem(sessionKey, user);
    document.cookie = `${sessionKey}=${encodeURIComponent(user)}; path=/; max-age=2592000; SameSite=Lax`;
  } else {
    localStorage.removeItem(sessionKey);
    document.cookie = `${sessionKey}=; path=/; max-age=0; SameSite=Lax`;
  }
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
  const rememberInput = document.getElementById("login-remember");
  const ssoButton = document.querySelector(".auth-sso");

  const existing = getSession();
  if (existing) {
    goDashboard();
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = normalize(userInput.value);
    const password = String(passInput.value || "");
    status.textContent = "Validando acesso...";

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.ok) {
        status.textContent = payload.error || "Usuario ou senha invalidos.";
        return;
      }

      setSession(payload.user || username, Boolean(rememberInput?.checked));
      status.textContent = "Login realizado. Abrindo dashboard...";
      goDashboard();
    } catch {
      status.textContent = "Nao foi possivel validar o login agora.";
      return;
    }
  });

  ssoButton?.addEventListener("click", () => {
    status.textContent = "SSO ainda nao esta configurado para este ambiente.";
  });
}

bootstrapAuth();
