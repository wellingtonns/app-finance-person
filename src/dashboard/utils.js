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
  const fromSession = window.sessionStorage.getItem(sessionKey);
  const cookieValue = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${sessionKey}=`));
  const fromCookie = cookieValue ? decodeURIComponent(cookieValue.slice(sessionKey.length + 1)) : "";
  return String(fromQuery || fromStorage || fromSession || fromCookie || "").trim().toLowerCase();
}

export function logoutCurrentUser() {
  window.localStorage.removeItem(sessionKey);
  window.sessionStorage.removeItem(sessionKey);
  document.cookie = `${sessionKey}=; path=/; max-age=0; SameSite=Lax`;
  window.location.href = "/index.html";
}
