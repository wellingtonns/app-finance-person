import { useEffect, useRef, useState } from "react";
import { Landmark, Plus, TrendingUp, Trash2 } from "lucide-react";
import Sidebar from "./components/Sidebar";
import HeaderPanel from "./components/HeaderPanel";
import MetricCard from "./components/MetricCard";
import { EntriesPanel, LeisurePanel } from "./components/LedgerPanel";
import DebtsTable from "./components/DebtsTable";
import { formatCurrency, getCurrentUser, logoutCurrentUser } from "./utils";
import {
  addCapitalItem,
  addDebtItem,
  addEntryItem,
  addInvestmentItem,
  addLeisureItem,
  addPersonItem,
  clearCapitalItems,
  clearLeisureItems,
  createDashboardSnapshot,
  createDefaultDashboardState,
  normalizeDashboardState,
  removeCapitalItem,
  removeDebtItem,
  removeInvestmentItem,
  removePersonItem,
} from "./state-utils.mjs";

const viewTitles = {
  dashboard: "Dashboard - Abril de 2026",
  contas: "Contas - Abril de 2026",
  capital: "Capital - Abril de 2026",
  investimentos: "Investimentos - Abril de 2026",
};

const dashboardStorageKey = "financeperson:dashboard-react:v2";
const remoteStateApiPath = "/api/state";

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function logDashboard(message, details) {
  console.log(`[dashboard] ${message}`, details || "");
}

function sanitizeRemoteUser(value) {
  return String(value || "").trim().toLowerCase() || "principal";
}

function getScopedStorageKey(user) {
  return `${dashboardStorageKey}:${sanitizeRemoteUser(user)}`;
}

function buildRemoteStateUrl(user) {
  const url = new URL(remoteStateApiPath, window.location.origin);
  url.searchParams.set("user", sanitizeRemoteUser(user));
  return url.toString();
}

async function pushStateToServer(user, snapshot) {
  const endpoint = buildRemoteStateUrl(user);
  logDashboard("Calling API to save state", { endpoint, user });

  const response = await fetch(endpoint, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state: snapshot }),
  });

  if (!response.ok) {
    console.error("[dashboard] API save failed", { status: response.status, endpoint });
    throw new Error(`Falha ao salvar no servidor: ${response.status}`);
  }
}

async function fetchRemoteState(user) {
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

function getInitialView() {
  const hash = window.location.hash.replace(/^#/, "").trim().toLowerCase();
  return viewTitles[hash] ? hash : "dashboard";
}

function totalByStatus(rows, status) {
  return rows.filter((row) => row.status === status).reduce((sum, row) => sum + row.value, 0);
}

function OverviewCards({ cards }) {
  return (
    <section className="grid gap-3 xl:grid-cols-4 md:grid-cols-2">
      {cards.map((card) => (
        <MetricCard key={card.title} {...card} />
      ))}
    </section>
  );
}

function CapitalPanel({ rows, onAddCapital, onRemoveCapital, onClearCapital, onNotify }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ label: "", note: "", value: "" });
  const total = rows.reduce((sum, row) => sum + row.value, 0);

  function handleToggleForm() {
    logDashboard("Capital button clicked", { action: showForm ? "close-form" : "open-form" });
    setShowForm((current) => !current);
  }

  function handleSubmit(event) {
    event.preventDefault();
    const label = form.label.trim();
    const value = Number(String(form.value).replace(",", "."));

    logDashboard("Capital save clicked", { label, value });

    if (!label || !Number.isFinite(value) || value <= 0) {
      onNotify("Preencha descricao e valor valido para adicionar ao capital.");
      console.warn("[dashboard] Invalid capital payload", form);
      return;
    }

    onAddCapital({
      label,
      note: form.note.trim() || "Atualizado agora",
      value,
    });
    setForm({ label: "", note: "", value: "" });
    setShowForm(false);
  }

  return (
    <section className="premium-panel rounded-[28px] p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="rounded-2xl border border-success/30 bg-success/15 p-3 text-success">
            <Landmark className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-display text-[1.8rem] font-bold text-white">Composicao do capital</h3>
            <p className="text-base text-copy/78">Total atual: {formatCurrency(total)}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleToggleForm}
            className="inline-flex items-center gap-2 rounded-2xl border border-success/30 bg-success/15 px-4 py-2 text-sm font-semibold text-success"
          >
            <Plus className="h-4 w-4" />
            {showForm ? "Fechar" : "Adicionar"}
          </button>
          <button
            type="button"
            onClick={() => {
              logDashboard("Capital clear clicked", { rows: rows.length });
              onClearCapital();
            }}
            className="inline-flex items-center gap-2 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-2 text-sm font-semibold text-danger"
          >
            <Trash2 className="h-4 w-4" />
            Limpar
          </button>
        </div>
      </div>

      {showForm ? (
        <form onSubmit={handleSubmit} className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_140px_auto]">
          <input
            value={form.label}
            onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
            placeholder="Descricao"
            className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-base text-white outline-none"
          />
          <input
            value={form.note}
            onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
            placeholder="Referencia"
            className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-base text-white outline-none"
          />
          <input
            value={form.value}
            onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))}
            placeholder="Valor"
            className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-base text-white outline-none"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-success/30 bg-success/15 px-4 py-3 text-sm font-semibold text-success"
          >
            <Plus className="h-4 w-4" />
            Salvar
          </button>
        </form>
      ) : null}

      <div className="overflow-hidden rounded-[22px] border border-white/10 bg-black/10">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-4 bg-white/10 px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-copy/70">
          <span>Item</span>
          <span>Referencia</span>
          <span>Valor</span>
          <span className="text-right">Acoes</span>
        </div>
        <ul>
          {rows.map((row) => (
            <li
              key={row.id}
              className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-4 border-b border-white/10 px-4 py-3 text-sm text-copy/90 last:border-b-0"
            >
              <span className="truncate">{row.label}</span>
              <span className="text-copy/65">{row.note}</span>
              <strong className="font-semibold text-white">{formatCurrency(row.value)}</strong>
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => {
                    logDashboard("Capital remove clicked", row);
                    onRemoveCapital(row.id);
                  }}
                  className="inline-flex rounded-xl border border-white/10 bg-white/5 p-2 text-copy/70"
                  aria-label={`Remover item ${row.label}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function InvestmentsPanel({ rows, onAddInvestment, onRemoveInvestment, onNotify }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", category: "", value: "", yield: "" });

  function handleToggleForm() {
    logDashboard("Investment button clicked", { action: showForm ? "close-form" : "open-form" });
    setShowForm((current) => !current);
  }

  function handleSubmit(event) {
    event.preventDefault();
    const name = form.name.trim();
    const value = Number(String(form.value).replace(",", "."));

    logDashboard("Investment save clicked", { name, value });

    if (!name || !Number.isFinite(value) || value <= 0) {
      onNotify("Preencha nome e valor valido para salvar o investimento.");
      console.warn("[dashboard] Invalid investment payload", form);
      return;
    }

    onAddInvestment({
      name,
      category: form.category.trim() || "Carteira",
      value,
      yield: form.yield.trim() || "+0,00%",
    });
    setForm({ name: "", category: "", value: "", yield: "" });
    setShowForm(false);
  }

  return (
    <section className="premium-panel rounded-[28px] p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="rounded-2xl border border-info/30 bg-info/15 p-3 text-info">
            <TrendingUp className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-display text-[1.8rem] font-bold text-white">Carteira de investimentos</h3>
            <p className="text-base text-copy/78">Adicione ou remova ativos acompanhados no painel.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleForm}
          className="inline-flex items-center gap-2 rounded-2xl border border-info/35 bg-info/20 px-4 py-2 text-sm font-semibold text-[#dcebff]"
        >
          <Plus className="h-4 w-4" />
          {showForm ? "Fechar" : "Adicionar ativo"}
        </button>
      </div>

      {showForm ? (
        <form onSubmit={handleSubmit} className="mb-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_170px_140px_140px_auto]">
          <input
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Nome do ativo"
            className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-base text-white outline-none"
          />
          <input
            value={form.category}
            onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
            placeholder="Categoria"
            className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-base text-white outline-none"
          />
          <input
            value={form.value}
            onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))}
            placeholder="Valor"
            className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-base text-white outline-none"
          />
          <input
            value={form.yield}
            onChange={(event) => setForm((current) => ({ ...current, yield: event.target.value }))}
            placeholder="+0,90%"
            className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-base text-white outline-none"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-info/35 bg-info/20 px-4 py-3 text-sm font-semibold text-[#dcebff]"
          >
            <Plus className="h-4 w-4" />
            Salvar
          </button>
        </form>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <article
            key={row.id}
            className="rounded-[22px] border border-white/10 bg-[#111927] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-copy/55">{row.category}</p>
                <h4 className="mt-2 font-display text-[1.35rem] font-bold text-white">{row.name}</h4>
              </div>
              <button
                type="button"
                onClick={() => {
                  logDashboard("Investment remove clicked", row);
                  onRemoveInvestment(row.id);
                }}
                className="inline-flex rounded-xl border border-white/10 bg-white/5 p-2 text-copy/70"
                aria-label={`Remover investimento ${row.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-4 text-sm text-copy/70">Posicao atual</p>
            <strong className="mt-1 block text-2xl font-bold text-white">{formatCurrency(row.value)}</strong>
            <p className="mt-4 text-sm text-copy/70">Rendimento estimado</p>
            <span className="mt-1 inline-flex rounded-full border border-success/30 bg-success/15 px-3 py-1 text-sm font-semibold text-success">
              {row.yield}
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}

function DashboardView({
  dashboardData,
  leisureForm,
  setLeisureForm,
  onLeisureSubmit,
  onClearLeisure,
  onAddEntry,
  onAddDebt,
  onRemoveDebt,
  cards,
  onNotify,
}) {
  return (
    <>
      <OverviewCards cards={cards} />

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <EntriesPanel rows={dashboardData.entries} onAddEntry={onAddEntry} onNotify={onNotify} />
        <LeisurePanel
          rows={dashboardData.leisureRows}
          form={leisureForm}
          setForm={setLeisureForm}
          onSubmit={onLeisureSubmit}
          onClear={onClearLeisure}
        />
      </section>

      <DebtsTable
        rows={dashboardData.debtRows}
        people={dashboardData.people}
        selectedPerson={dashboardData.selectedPerson}
        onAddDebt={onAddDebt}
        onRemoveDebt={onRemoveDebt}
        onNotify={onNotify}
      />
    </>
  );
}

function AccountsView({ dashboardData, cards, onAddDebt, onRemoveDebt, onNotify }) {
  return (
    <>
      <OverviewCards cards={cards} />
      <DebtsTable
        rows={dashboardData.debtRows}
        people={dashboardData.people}
        selectedPerson={dashboardData.selectedPerson}
        onAddDebt={onAddDebt}
        onRemoveDebt={onRemoveDebt}
        onNotify={onNotify}
      />
    </>
  );
}

function CapitalView({
  cards,
  dashboardData,
  onAddCapital,
  onRemoveCapital,
  onClearCapital,
  leisureRows,
  leisureForm,
  setLeisureForm,
  onLeisureSubmit,
  onClearLeisure,
  onNotify,
}) {
  return (
    <>
      <OverviewCards cards={cards} />

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <CapitalPanel
          rows={dashboardData.capitalItems}
          onAddCapital={onAddCapital}
          onRemoveCapital={onRemoveCapital}
          onClearCapital={onClearCapital}
          onNotify={onNotify}
        />
        <LeisurePanel
          rows={leisureRows}
          form={leisureForm}
          setForm={setLeisureForm}
          onSubmit={onLeisureSubmit}
          onClear={onClearLeisure}
        />
      </section>
    </>
  );
}

function InvestmentsView({ cards, dashboardData, onAddInvestment, onRemoveInvestment, onNotify }) {
  return (
    <>
      <OverviewCards cards={cards} />
      <InvestmentsPanel
        rows={dashboardData.investmentItems}
        onAddInvestment={onAddInvestment}
        onRemoveInvestment={onRemoveInvestment}
        onNotify={onNotify}
      />
    </>
  );
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState(() => {
    const initial = createDefaultDashboardState();
    return { ...initial, currentView: getInitialView() };
  });
  const [leisureForm, setLeisureForm] = useState({ description: "", value: "" });
  const [currentUser] = useState(getCurrentUser);
  const [actionMessage, setActionMessage] = useState("");
  const [syncStatus, setSyncStatus] = useState("Carregando dados...");
  const [isHydrated, setIsHydrated] = useState(false);
  const saveTimeoutRef = useRef(null);
  const saveInFlightRef = useRef(false);
  const saveQueuedRef = useRef(false);
  const latestSnapshotRef = useRef(null);

  function notify(message) {
    setActionMessage(message);
  }

  function updateDashboardData(actionName, updater) {
    logDashboard("Button clicked", { actionName });
    setDashboardData((current) => {
      const next = updater(current);
      logDashboard("State changed", { actionName, before: current, after: next });
      return next;
    });
  }

  useEffect(() => {
    const closeOnDesktop = () => {
      if (window.innerWidth >= 768) setSidebarOpen(false);
    };
    const syncViewFromHash = () => {
      const nextView = getInitialView();
      logDashboard("Hash navigation detected", { nextView });
      setDashboardData((current) => ({ ...current, currentView: nextView }));
    };

    window.addEventListener("resize", closeOnDesktop);
    window.addEventListener("hashchange", syncViewFromHash);

    return () => {
      window.removeEventListener("resize", closeOnDesktop);
      window.removeEventListener("hashchange", syncViewFromHash);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsHydrated(false);
    setSyncStatus("Carregando dados...");

    async function bootstrapState() {
      const storageKey = getScopedStorageKey(currentUser);
      const localSaved = window.localStorage.getItem(storageKey);
      let localLoaded = false;

      if (localSaved) {
        try {
          const localState = normalizeDashboardState(JSON.parse(localSaved));
          logDashboard("Loading state from localStorage", localState);
          setDashboardData(localState);
          localLoaded = true;
          if (!cancelled) setSyncStatus("Dados locais carregados.");
        } catch (error) {
          console.error("[dashboard] Invalid localStorage state", error);
          window.localStorage.removeItem(storageKey);
        }
      }

      const remoteState = await fetchRemoteState(currentUser);
      if (cancelled) return;

      if (remoteState && typeof remoteState === "object") {
        const normalized = normalizeDashboardState(remoteState);
        logDashboard("Loading state from backend", normalized);
        setDashboardData(normalized);
        window.localStorage.setItem(storageKey, JSON.stringify(normalized));
        setSyncStatus("Dados carregados do banco.");
      } else if (remoteState === null) {
        setSyncStatus(
          localLoaded
            ? "Dados locais prontos. Sincronizacao com banco habilitada."
            : "Novo painel iniciado. Sincronizacao com banco habilitada."
        );
      } else {
        setSyncStatus("Persistencia remota indisponivel. Dados salvos localmente.");
      }

      setIsHydrated(true);
    }

    bootstrapState();

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

    logDashboard("Dashboard snapshot changed", snapshot);

    const storageKey = getScopedStorageKey(currentUser);
    logDashboard("Saving state to localStorage", { storageKey, snapshot });
    window.localStorage.setItem(storageKey, JSON.stringify(snapshot));

    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
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
        setSyncStatus("Dados sincronizados com o banco.");
      } catch (error) {
        console.error("[dashboard] Remote sync failed", error);
        setSyncStatus("Persistencia remota indisponivel. Dados salvos localmente.");
      } finally {
        saveInFlightRef.current = false;
      }
    }, 700);

    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [currentUser, dashboardData, isHydrated]);

  function handleNavigate(view) {
    logDashboard("Sidebar navigation clicked", { view });
    updateDashboardData("navigate-view", (current) => ({ ...current, currentView: view }));
    setSidebarOpen(false);
    window.location.hash = view;
  }

  function handleLeisureSubmit(event) {
    event.preventDefault();
    const description = leisureForm.description.trim();
    const value = Number(String(leisureForm.value).replace(",", "."));

    logDashboard("Leisure save clicked", { description, value });

    if (!description || !Number.isFinite(value) || value <= 0) {
      notify("Preencha descricao e valor valido para salvar o lazer.");
      console.warn("[dashboard] Invalid leisure payload", leisureForm);
      return;
    }

    updateDashboardData("add-leisure", (current) =>
      addLeisureItem(current, { description, value }, () => createId("leisure"))
    );
    setLeisureForm({ description: "", value: "" });
    notify(`Lazer "${description}" adicionado.`);
  }

  function handleClearLeisure() {
    logDashboard("Leisure clear clicked", { rows: dashboardData.leisureRows.length });
    updateDashboardData("clear-leisure", (current) => clearLeisureItems(current));
    notify("Lista de lazer limpa.");
  }

  function handleAddEntry({ description, value }) {
    updateDashboardData("add-entry", (current) =>
      addEntryItem(current, { description, value }, () => createId("entry"))
    );
    notify(`Entrada "${description}" adicionada.`);
  }

  function handleAddPerson(name) {
    const formatted = String(name || "").trim();
    if (!formatted) {
      notify("Informe um nome valido para adicionar pessoa.");
      return;
    }
    if (dashboardData.people.some((item) => item.toLowerCase() === formatted.toLowerCase())) {
      notify(`A pessoa "${formatted}" ja existe.`);
      return;
    }
    updateDashboardData("add-person", (current) => addPersonItem(current, formatted));
    notify(`Pessoa "${formatted}" adicionada ao painel.`);
  }

  function handleRemovePerson(person) {
    if (dashboardData.people.length <= 1) {
      notify("Nao e possivel remover a ultima pessoa.");
      return;
    }
    logDashboard("Remove person clicked", { person });
    updateDashboardData("remove-person", (current) => removePersonItem(current, person));
    notify(`Pessoa "${person}" removida.`);
  }

  function handleAddDebt(debt) {
    updateDashboardData("add-debt", (current) =>
      addDebtItem(current, debt, () => createId("debt"))
    );
    notify(`Conta "${debt.name}" adicionada para ${debt.person}.`);
  }

  function handleRemoveDebt(id) {
    const debt = dashboardData.debtRows.find((item) => item.id === id);
    updateDashboardData("remove-debt", (current) => removeDebtItem(current, id));
    notify(debt ? `Conta "${debt.name}" removida.` : "Conta removida.");
  }

  function handleAddCapital(item) {
    updateDashboardData("add-capital", (current) =>
      addCapitalItem(current, item, () => createId("capital"))
    );
    notify(`Capital "${item.label}" registrado.`);
  }

  function handleRemoveCapital(id) {
    const item = dashboardData.capitalItems.find((current) => current.id === id);
    updateDashboardData("remove-capital", (current) => removeCapitalItem(current, id));
    notify(item ? `Item "${item.label}" removido do capital.` : "Item removido do capital.");
  }

  function handleClearCapital() {
    updateDashboardData("clear-capital", (current) => clearCapitalItems(current));
    notify("Lista de capital limpa.");
  }

  function handleAddInvestment(item) {
    updateDashboardData("add-investment", (current) =>
      addInvestmentItem(current, item, () => createId("investment"))
    );
    notify(`Ativo "${item.name}" adicionado.`);
  }

  function handleRemoveInvestment(id) {
    const item = dashboardData.investmentItems.find((current) => current.id === id);
    updateDashboardData("remove-investment", (current) => removeInvestmentItem(current, id));
    notify(item ? `Ativo "${item.name}" removido.` : "Ativo removido.");
  }

  function setSelectedPerson(person) {
    updateDashboardData("set-selected-person", (current) => ({ ...current, selectedPerson: person }));
  }

  function setSumSalaries(value) {
    updateDashboardData("set-sum-salaries", (current) => ({ ...current, sumSalaries: value }));
  }

  function setConsolidateDebts(value) {
    updateDashboardData("set-consolidate-debts", (current) => ({ ...current, consolidateDebts: value }));
  }

  const totalEntries = dashboardData.entries.reduce((sum, row) => sum + row.value, 0);
  const totalLeisure = dashboardData.leisureRows.reduce((sum, row) => sum + row.value, 0);
  const totalPaid = totalByStatus(dashboardData.debtRows, "paid");
  const totalOpen = totalByStatus(dashboardData.debtRows, "open");
  const totalLate = totalByStatus(dashboardData.debtRows, "late");
  const totalCapital = dashboardData.capitalItems.reduce((sum, row) => sum + row.value, 0);
  const totalInvestments = dashboardData.investmentItems.reduce((sum, row) => sum + row.value, 0);

  const dashboardCards = [
    { title: "Renda total", value: totalEntries, tone: "income" },
    { title: "Saidas de lazer", value: totalLeisure, tone: "danger" },
    { title: "Contas pagas", value: totalPaid, tone: "info" },
    { title: "Saldo geral atual", value: totalEntries - totalLeisure - totalOpen - totalLate, tone: "success" },
  ];

  const accountCards = [
    { title: "Contas em aberto", value: totalOpen, tone: "danger" },
    { title: "Contas pagas", value: totalPaid, tone: "success" },
    {
      title: "Contas atrasadas",
      value: dashboardData.debtRows.filter((row) => row.status === "late").length,
      tone: "info",
      format: "number",
    },
    { title: "Titulares ativos", value: dashboardData.people.length, tone: "income", format: "number" },
  ];

  const capitalCards = [
    { title: "Capital atual", value: totalCapital, tone: "success" },
    { title: "Itens no capital", value: dashboardData.capitalItems.length, tone: "income", format: "number" },
    { title: "Lazer planejado", value: totalLeisure, tone: "info" },
    { title: "Saldo apos contas", value: totalCapital - totalOpen - totalLate, tone: "danger" },
  ];

  const investmentsCards = [
    { title: "Total investido", value: totalInvestments, tone: "success" },
    { title: "Ativos na carteira", value: dashboardData.investmentItems.length, tone: "income", format: "number" },
    {
      title: "Maior posicao",
      value: dashboardData.investmentItems.length ? Math.max(...dashboardData.investmentItems.map((item) => item.value)) : 0,
      tone: "info",
    },
    { title: "Pessoa ativa", value: dashboardData.selectedPerson, tone: "danger", format: "text" },
  ];

  const descriptionMap = {
    dashboard: "Resumo geral com indicadores, entradas, lazer e dividas do periodo.",
    contas: "Acompanhe vencimentos, pagamentos, filtros e cadastro das contas do mes.",
    capital: "Controle entradas de capital, reservas e saidas projetadas no mesmo painel.",
    investimentos: "Monitore a carteira e ajuste a lista de ativos diretamente na tela.",
  };

  const statusNoteMap = {
    dashboard: `Pessoa ativa: ${dashboardData.selectedPerson} | Entradas registradas: ${dashboardData.entries.length} | Usuarios no painel: ${dashboardData.people.length}`,
    contas: `Dividas consolidadas: ${dashboardData.consolidateDebts ? "sim" : "nao"} | Contas cadastradas: ${dashboardData.debtRows.length}`,
    capital: `Somar salarios marcados: ${dashboardData.sumSalaries ? "ativo" : "desligado"} | Itens de capital: ${dashboardData.capitalItems.length}`,
    investimentos: `Carteira monitorada por ${dashboardData.selectedPerson} | Ativos acompanhados: ${dashboardData.investmentItems.length}`,
  };

  function renderView() {
    if (dashboardData.currentView === "contas") {
      return (
        <AccountsView
          dashboardData={dashboardData}
          cards={accountCards}
          onAddDebt={handleAddDebt}
          onRemoveDebt={handleRemoveDebt}
          onNotify={notify}
        />
      );
    }

    if (dashboardData.currentView === "capital") {
      return (
        <CapitalView
          cards={capitalCards}
          dashboardData={dashboardData}
          onAddCapital={handleAddCapital}
          onRemoveCapital={handleRemoveCapital}
          onClearCapital={handleClearCapital}
          leisureRows={dashboardData.leisureRows}
          leisureForm={leisureForm}
          setLeisureForm={setLeisureForm}
          onLeisureSubmit={handleLeisureSubmit}
          onClearLeisure={handleClearLeisure}
          onNotify={notify}
        />
      );
    }

    if (dashboardData.currentView === "investimentos") {
      return (
        <InvestmentsView
          cards={investmentsCards}
          dashboardData={dashboardData}
          onAddInvestment={handleAddInvestment}
          onRemoveInvestment={handleRemoveInvestment}
          onNotify={notify}
        />
      );
    }

    return (
      <DashboardView
        dashboardData={dashboardData}
        leisureForm={leisureForm}
        setLeisureForm={setLeisureForm}
        onLeisureSubmit={handleLeisureSubmit}
        onClearLeisure={handleClearLeisure}
        onAddEntry={handleAddEntry}
        onAddDebt={handleAddDebt}
        onRemoveDebt={handleRemoveDebt}
        cards={dashboardCards}
        onNotify={notify}
      />
    );
  }

  return (
    <div className="min-h-screen bg-shell font-body text-copy">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-24 top-[-80px] h-72 w-72 rounded-full bg-info/15 blur-3xl" />
        <div className="absolute bottom-[-120px] right-[-80px] h-80 w-80 rounded-full bg-success/10 blur-3xl" />
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-[1500px] gap-4 px-3 py-4 md:grid-cols-[280px_minmax(0,1fr)] md:px-4">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          currentUser={currentUser}
          currentView={dashboardData.currentView}
          onNavigate={handleNavigate}
          people={dashboardData.people}
          selectedPerson={dashboardData.selectedPerson}
          onAddPerson={handleAddPerson}
          onRemovePerson={handleRemovePerson}
          onLogout={logoutCurrentUser}
          onNotify={notify}
        />

        <main className="min-w-0 space-y-4">
          <HeaderPanel
            title={viewTitles[dashboardData.currentView]}
            description={descriptionMap[dashboardData.currentView]}
            statusNote={statusNoteMap[dashboardData.currentView]}
            people={dashboardData.people}
            selectedPerson={dashboardData.selectedPerson}
            setSelectedPerson={setSelectedPerson}
            sumSalaries={dashboardData.sumSalaries}
            setSumSalaries={setSumSalaries}
            consolidateDebts={dashboardData.consolidateDebts}
            setConsolidateDebts={setConsolidateDebts}
            onOpenSidebar={() => setSidebarOpen(true)}
          />

          {actionMessage ? (
            <section className="rounded-[22px] border border-info/30 bg-info/10 px-4 py-3 text-sm text-[#dcebff]">
              {actionMessage}
            </section>
          ) : null}

          <section className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-copy/80">
            Status de sincronizacao: <strong className="text-white">{syncStatus}</strong>
          </section>

          {renderView()}
        </main>
      </div>
    </div>
  );
}
