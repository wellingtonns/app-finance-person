export const dashboardStorageKey = "financeperson:dashboard-react:v3";
export const remoteStateApiPath = "/api/state";

export function logDashboard(message, details) {
  console.log(`[dashboard] ${message}`, details || "");
}

export function sanitizeRemoteUser(value) {
  return String(value || "").trim().toLowerCase() || "principal";
}

export function getScopedStorageKey(user) {
  return `${dashboardStorageKey}:${sanitizeRemoteUser(user)}`;
}

export function buildRemoteStateUrl(user) {
  const url = new URL(remoteStateApiPath, window.location.origin);
  url.searchParams.set("user", sanitizeRemoteUser(user));
  return url.toString();
}

export async function pushStateToServer(user, snapshot) {
  const endpoint = buildRemoteStateUrl(user);
  logDashboard("Calling API to save state", { endpoint, user });

  const response = await fetch(endpoint, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state: snapshot }),
  });

  if (response.status === 404) {
    console.warn("[dashboard] /api/state returned 404 while saving", { endpoint });
    throw new Error("Persistencia remota indisponivel");
  }

  if (!response.ok) {
    console.error("[dashboard] API save failed", { status: response.status, endpoint });
    throw new Error(`Falha ao salvar no servidor: ${response.status}`);
  }

  return response;
}

export async function fetchRemoteState(user) {
  const endpoint = buildRemoteStateUrl(user);
  logDashboard("Calling API to load state", { endpoint, user });

  try {
    const response = await fetch(endpoint, { method: "GET" });
    if (response.status === 404) {
      console.warn("[dashboard] /api/state returned 404", { endpoint });
      return undefined;
    }
    if (!response.ok) {
      console.error("[dashboard] API load failed", { status: response.status, endpoint });
      return undefined;
    }

    const payload = await response.json();
    if (!payload || typeof payload !== "object") return null;
    if (!payload.state || typeof payload.state !== "object") return null;
    return payload.state;
  } catch (error) {
    console.error("[dashboard] Failed to load remote state", error);
    return undefined;
  }
}

export function readLocalSnapshot(user) {
  const storageKey = getScopedStorageKey(user);
  const saved = window.localStorage.getItem(storageKey);
  return {
    storageKey,
    saved,
  };
}

export function writeLocalSnapshot(user, snapshot) {
  const storageKey = getScopedStorageKey(user);
  logDashboard("Saving state to localStorage", { storageKey, snapshot });
  window.localStorage.setItem(storageKey, JSON.stringify(snapshot));
  return storageKey;
}
