export function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function getCurrentUser() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("user");
  const fromStorage = window.localStorage.getItem("controle-gastos-session-v1");
  return String(fromQuery || fromStorage || "wellington").trim().toLowerCase();
}
