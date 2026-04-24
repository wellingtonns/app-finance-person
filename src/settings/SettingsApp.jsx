import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Database, RefreshCcw, Settings, ShieldCheck } from "lucide-react";
import { createDashboardSnapshot, normalizeDashboardState, setDashboardFilter, setPreferenceValue } from "../dashboard/state-utils.mjs";
import { getCurrentUser } from "../dashboard/utils";
import {
  fetchRemoteState,
  logDashboard,
  pushStateToServer,
  readLocalSnapshot,
  sanitizeRemoteUser,
  writeLocalSnapshot,
} from "../dashboard/persistence.mjs";

function PreferenceToggle({ label, description, checked, onChange }) {
  return (
    <label className="rounded-[24px] border border-white/10 bg-white/5 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-base font-semibold text-white">{label}</p>
          <p className="mt-1 text-sm text-copy/70">{description}</p>
        </div>
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-1 h-5 w-5 rounded border-white/20 bg-transparent text-info focus:ring-info"
        />
      </div>
    </label>
  );
}

export default function SettingsApp() {
  const [currentUser] = useState(getCurrentUser);
  const [dashboardData, setDashboardData] = useState(() => normalizeDashboardState(undefined));
  const [syncStatus, setSyncStatus] = useState("Carregando configuracoes...");
  const [message, setMessage] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);
  const saveTimeoutRef = useRef(null);
  const saveInFlightRef = useRef(false);
  const saveQueuedRef = useRef(false);
  const latestSnapshotRef = useRef(null);

  const dashboardUrl = useMemo(
    () => `/dashboard?user=${encodeURIComponent(sanitizeRemoteUser(currentUser))}#dashboard`,
    [currentUser]
  );

  useEffect(() => {
    if (!message) return undefined;
    const timeoutId = window.setTimeout(() => setMessage(""), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [message]);

  function notify(nextMessage) {
    setMessage(nextMessage);
  }

  function updateSettings(actionName, updater) {
    console.log("[dashboard] Settings button clicked", { actionName });
    setDashboardData((current) => {
      const next = updater(current);
      logDashboard("Settings state changed", { actionName, before: current, after: next });
      return next;
    });
  }

  useEffect(() => {
    let cancelled = false;
    setIsHydrated(false);
    setSyncStatus("Carregando configuracoes...");

    async function bootstrapSettings() {
      const { storageKey, saved } = readLocalSnapshot(currentUser);
      let localLoaded = false;

      if (saved) {
        try {
          const normalized = normalizeDashboardState(JSON.parse(saved));
          setDashboardData(normalized);
          localLoaded = true;
          setSyncStatus("Configuracoes locais carregadas.");
          logDashboard("Settings loaded from localStorage", { storageKey, normalized });
        } catch (error) {
          console.error("[dashboard] Invalid settings state in localStorage", error);
          window.localStorage.removeItem(storageKey);
        }
      }

      const remoteState = await fetchRemoteState(currentUser);
      if (cancelled) return;

      if (remoteState && typeof remoteState === "object") {
        const normalized = normalizeDashboardState(remoteState);
        setDashboardData(normalized);
        writeLocalSnapshot(currentUser, normalized);
        setSyncStatus("Configuracoes carregadas do banco.");
      } else if (remoteState === null) {
        setSyncStatus(
          localLoaded
            ? "Configuracoes locais prontas. Sincronizacao remota disponivel."
            : "Preferencias novas prontas para uso."
        );
      } else {
        setSyncStatus("Persistencia remota indisponivel. Preferencias locais ativas.");
      }

      setIsHydrated(true);
    }

    bootstrapSettings();

    return () => {
      cancelled = true;
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [currentUser]);

  useEffect(() => {
    if (!isHydrated) return;

    const snapshot = createDashboardSnapshot(dashboardData);
    latestSnapshotRef.current = snapshot;
    writeLocalSnapshot(currentUser, snapshot);

    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }

    if (!dashboardData.preferences.autoSync) {
      setSyncStatus("Sincronizacao automatica desativada. Preferencias salvas localmente.");
      return;
    }

    saveTimeoutRef.current = window.setTimeout(async () => {
      if (saveInFlightRef.current) {
        saveQueuedRef.current = true;
        return;
      }

      saveInFlightRef.current = true;
      try {
        do {
          saveQueuedRef.current = false;
          await pushStateToServer(currentUser, latestSnapshotRef.current);
        } while (saveQueuedRef.current);
        setSyncStatus("Preferencias sincronizadas com o banco.");
      } catch (error) {
        console.error("[dashboard] Settings remote sync failed", error);
        setSyncStatus("Persistencia remota indisponivel. Preferencias locais ativas.");
      } finally {
        saveInFlightRef.current = false;
      }
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [currentUser, dashboardData, isHydrated]);

  return (
    <div className="min-h-screen bg-shell font-body text-copy">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-40px] top-[-40px] h-64 w-64 rounded-full bg-info/15 blur-3xl" />
        <div className="absolute bottom-[-100px] right-[-40px] h-80 w-80 rounded-full bg-success/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-[1100px] px-4 py-5">
        <section className="premium-panel rounded-[30px] p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.18em] text-copy/65">
                <Settings className="h-4 w-4 text-info" />
                Configuracoes
              </div>
              <h1 className="mt-4 font-display text-3xl font-bold text-white sm:text-[2.4rem]">Preferencias da conta</h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-copy/78">
                Esta tela concentra preferencias de uso, sincronizacao e comportamento do painel sem misturar com as acoes financeiras do dia a dia.
              </p>
            </div>

            <a
              href={dashboardUrl}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao dashboard
            </a>
          </div>
        </section>

        {message ? (
          <section className="mt-4 rounded-[22px] border border-info/30 bg-info/10 px-4 py-3 text-sm text-[#dcebff]">
            {message}
          </section>
        ) : null}

        <div className="mt-4 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="premium-panel rounded-[28px] p-5 sm:p-6">
            <h2 className="font-display text-[1.9rem] font-bold text-white">Preferencias basicas</h2>
            <div className="mt-5 grid gap-3">
              <PreferenceToggle
                label="Incluir salario fixo no resumo"
                description="Soma os salarios fixos cadastrados em Pessoas dentro da leitura do dashboard."
                checked={dashboardData.preferences.includeFixedSalary}
                onChange={(value) => {
                  updateSettings("toggle-include-fixed-salary", (current) =>
                    setPreferenceValue(current, "includeFixedSalary", value)
                  );
                  notify("Preferencia de salario fixo atualizada.");
                }}
              />
              <PreferenceToggle
                label="Consolidar contas do casal"
                description="Mantem a preferencia salva para uso futuro em consolidacoes mais avancadas."
                checked={dashboardData.preferences.consolidateHouseholdDebts}
                onChange={(value) => {
                  updateSettings("toggle-consolidate-household-debts", (current) =>
                    setPreferenceValue(current, "consolidateHouseholdDebts", value)
                  );
                  notify("Preferencia de consolidacao atualizada.");
                }}
              />
              <PreferenceToggle
                label="Sincronizacao automatica"
                description="Quando desativada, o app continua salvando no navegador e deixa de tentar o backend."
                checked={dashboardData.preferences.autoSync}
                onChange={(value) => {
                  updateSettings("toggle-auto-sync", (current) => setPreferenceValue(current, "autoSync", value));
                  notify("Preferencia de sincronizacao atualizada.");
                }}
              />
              <PreferenceToggle
                label="Numeros compactos"
                description="Reserva a preferencia para futuras views com cards compactados e leituras resumidas."
                checked={dashboardData.preferences.compactNumbers}
                onChange={(value) => {
                  updateSettings("toggle-compact-numbers", (current) =>
                    setPreferenceValue(current, "compactNumbers", value)
                  );
                  notify("Preferencia visual atualizada.");
                }}
              />
            </div>
          </section>

          <section className="premium-panel rounded-[28px] p-5 sm:p-6">
            <h2 className="font-display text-[1.9rem] font-bold text-white">Comportamento do dashboard</h2>

            <div className="mt-5 grid gap-4">
              <label className="grid gap-2">
                <span className="text-xs uppercase tracking-[0.16em] text-copy/55">Mes padrao do painel</span>
                <input
                  type="month"
                  value={dashboardData.dashboardFilters.month}
                  onChange={(event) => {
                    updateSettings("set-default-month", (current) =>
                      setDashboardFilter(current, "month", event.target.value)
                    );
                    notify("Mes padrao do painel atualizado.");
                  }}
                  className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-sm text-white outline-none"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-3">
                    <span className="rounded-2xl border border-success/30 bg-success/15 p-3 text-success">
                      <ShieldCheck className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm text-copy/70">Usuario atual</p>
                      <strong className="text-white">{currentUser}</strong>
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-3">
                    <span className="rounded-2xl border border-info/35 bg-info/15 p-3 text-info">
                      <Database className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm text-copy/70">Status da persistencia</p>
                      <strong className="text-white">{syncStatus}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  console.log("[dashboard] Settings manual sync clicked");
                  notify("Sincronizacao sera tentada automaticamente apos qualquer alteracao.");
                  updateSettings("touch-settings", (current) => ({ ...current }));
                }}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-info/35 bg-info/15 px-4 py-3 text-sm font-semibold text-[#dcebff]"
              >
                <RefreshCcw className="h-4 w-4" />
                Revalidar persistencia
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
