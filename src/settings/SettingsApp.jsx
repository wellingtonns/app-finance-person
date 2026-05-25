import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Database, KeyRound, RefreshCcw, Settings, ShieldCheck, Trash2 } from "lucide-react";
import {
  clearFinancialData,
  createDashboardSnapshot,
  normalizeDashboardState,
  setDashboardFilter,
  setPreferenceValue,
} from "../dashboard/state-utils.mjs";
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

function PasswordPanel({ currentUser, onNotify }) {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const currentPassword = form.currentPassword.trim();
    const newPassword = form.newPassword.trim();
    const confirmPassword = form.confirmPassword.trim();

    if (!currentPassword || !newPassword || !confirmPassword) {
      onNotify("Preencha a senha atual, a nova senha e a confirmação.");
      return;
    }
    if (newPassword !== confirmPassword) {
      onNotify("A confirmação da senha não confere.");
      return;
    }
    if (newPassword.length < 4) {
      onNotify("A nova senha deve ter pelo menos 4 caracteres.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: currentUser,
          currentPassword,
          newPassword,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        onNotify(payload.error || "Não foi possível alterar a senha.");
        return;
      }
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      onNotify("Senha alterada com sucesso.");
    } catch {
      onNotify("Não foi possível comunicar com a API de autenticação.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="premium-panel rounded-[28px] p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="rounded-2xl border border-info/35 bg-info/15 p-3 text-info">
          <KeyRound className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-display text-[1.6rem] font-bold text-white sm:text-[1.9rem]">Alterar senha</h2>
          <p className="mt-1 text-sm text-copy/70">Atualize a senha do usuário atual neste ambiente.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 grid gap-3">
        <label className="grid gap-2">
          <span className="text-xs uppercase tracking-[0.16em] text-copy/55">Senha atual</span>
          <input
            type="password"
            value={form.currentPassword}
            onChange={(event) => setForm((current) => ({ ...current, currentPassword: event.target.value }))}
            className="field-control"
            autoComplete="current-password"
          />
        </label>
        <label className="grid gap-2">
          <span className="text-xs uppercase tracking-[0.16em] text-copy/55">Nova senha</span>
          <input
            type="password"
            value={form.newPassword}
            onChange={(event) => setForm((current) => ({ ...current, newPassword: event.target.value }))}
            className="field-control"
            autoComplete="new-password"
          />
        </label>
        <label className="grid gap-2">
          <span className="text-xs uppercase tracking-[0.16em] text-copy/55">Confirmar nova senha</span>
          <input
            type="password"
            value={form.confirmPassword}
            onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
            className="field-control"
            autoComplete="new-password"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-info/35 bg-info/15 px-4 py-3 text-sm font-semibold text-[#dcebff] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <KeyRound className="h-4 w-4" />
          {saving ? "Salvando..." : "Salvar nova senha"}
        </button>
      </form>
    </section>
  );
}

export default function SettingsApp() {
  const [currentUser] = useState(getCurrentUser);
  const [dashboardData, setDashboardData] = useState(() => normalizeDashboardState(undefined));
  const [syncStatus, setSyncStatus] = useState("Carregando configurações...");
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
    setSyncStatus("Carregando configurações...");

    async function bootstrapSettings() {
      const { storageKey, saved } = readLocalSnapshot(currentUser);
      let localLoaded = false;

      if (saved) {
        try {
          const normalized = normalizeDashboardState(JSON.parse(saved));
          setDashboardData(normalized);
          localLoaded = true;
          setSyncStatus("Configurações locais carregadas.");
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
        setSyncStatus("Configurações carregadas do banco.");
      } else if (remoteState === null) {
        setSyncStatus(
          localLoaded
            ? "Configurações locais prontas. Sincronização remota disponível."
            : "Preferências novas prontas para uso."
        );
      } else {
        setSyncStatus("Persistência remota indisponível. Preferências locais ativas.");
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
      setSyncStatus("Sincronização automática desativada. Preferências salvas localmente.");
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
        setSyncStatus("Preferências sincronizadas com o banco.");
      } catch (error) {
        console.error("[dashboard] Settings remote sync failed", error);
        setSyncStatus("Persistência remota indisponível. Preferências locais ativas.");
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
                Configurações
              </div>
              <h1 className="mt-4 font-display text-3xl font-bold text-white sm:text-[2.4rem]">Preferências da conta</h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-copy/78">
                Esta tela concentra preferências de uso, sincronização, segurança e comportamento do painel sem misturar com as ações financeiras do dia a dia.
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
            <h2 className="font-display text-[1.9rem] font-bold text-white">Preferências básicas</h2>
            <div className="mt-5 grid gap-3">
              <PreferenceToggle
                label="Incluir salário fixo no resumo"
                description="Soma os salários fixos cadastrados em Pessoas dentro da leitura do dashboard."
                checked={dashboardData.preferences.includeFixedSalary}
                onChange={(value) => {
                  updateSettings("toggle-include-fixed-salary", (current) =>
                    setPreferenceValue(current, "includeFixedSalary", value)
                  );
                  notify("Preferência de salário fixo atualizada.");
                }}
              />
              <PreferenceToggle
                label="Consolidar contas do casal"
                description="Mantém a preferência salva para uso futuro em consolidações mais avançadas."
                checked={dashboardData.preferences.consolidateHouseholdDebts}
                onChange={(value) => {
                  updateSettings("toggle-consolidate-household-debts", (current) =>
                    setPreferenceValue(current, "consolidateHouseholdDebts", value)
                  );
                  notify("Preferência de consolidação atualizada.");
                }}
              />
              <PreferenceToggle
                label="Sincronização automática"
                description="Quando desativada, o app continua salvando no navegador e deixa de tentar o backend."
                checked={dashboardData.preferences.autoSync}
                onChange={(value) => {
                  updateSettings("toggle-auto-sync", (current) => setPreferenceValue(current, "autoSync", value));
                  notify("Preferência de sincronização atualizada.");
                }}
              />
              <PreferenceToggle
                label="Números compactos"
                description="Reserva a preferência para futuras telas com cards compactados e leituras resumidas."
                checked={dashboardData.preferences.compactNumbers}
                onChange={(value) => {
                  updateSettings("toggle-compact-numbers", (current) =>
                    setPreferenceValue(current, "compactNumbers", value)
                  );
                  notify("Preferência visual atualizada.");
                }}
              />
            </div>
          </section>

          <section className="premium-panel rounded-[28px] p-5 sm:p-6">
            <h2 className="font-display text-[1.9rem] font-bold text-white">Comportamento do dashboard</h2>

            <div className="mt-5 grid gap-4">
              <label className="grid gap-2">
                <span className="text-xs uppercase tracking-[0.16em] text-copy/55">Mês padrão do painel</span>
                <input
                  type="month"
                  value={dashboardData.dashboardFilters.month}
                  onChange={(event) => {
                    updateSettings("set-default-month", (current) =>
                      setDashboardFilter(current, "month", event.target.value)
                    );
                    notify("Mês padrão do painel atualizado.");
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
                      <p className="text-sm text-copy/70">Usuário atual</p>
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
                      <p className="text-sm text-copy/70">Status da persistência</p>
                      <strong className="text-white">{syncStatus}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  console.log("[dashboard] Settings manual sync clicked");
                  notify("A sincronização será tentada automaticamente após qualquer alteração.");
                  updateSettings("touch-settings", (current) => ({ ...current }));
                }}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-info/35 bg-info/15 px-4 py-3 text-sm font-semibold text-[#dcebff]"
              >
                <RefreshCcw className="h-4 w-4" />
                Revalidar persistência
              </button>

              <button
                type="button"
                onClick={() => {
                  const confirmed = window.confirm(
                    "Deseja zerar todos os valores financeiros para iniciar os testes por pessoa?"
                  );
                  if (!confirmed) return;
                  updateSettings("clear-financial-data", (current) => clearFinancialData(current));
                  notify("Dados financeiros zerados. Pessoas e preferências foram mantidas.");
                }}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger"
              >
                <Trash2 className="h-4 w-4" />
                Zerar dados financeiros
              </button>
            </div>
          </section>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <PasswordPanel currentUser={currentUser} onNotify={notify} />
        </div>
      </div>
    </div>
  );
}
