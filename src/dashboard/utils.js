export const sessionKey = "controle-gastos-session-v1";

export function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function getCurrentUser() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("user");
  const fromStorage = window.localStorage.getItem(sessionKey);
  return String(fromQuery || fromStorage || "wellington").trim().toLowerCase();
}

export function logoutCurrentUser() {
  window.localStorage.removeItem(sessionKey);
  window.sessionStorage.removeItem(sessionKey);
  document.cookie = `${sessionKey}=; path=/; max-age=0; SameSite=Lax`;
  window.location.href = "/index.html";
}
