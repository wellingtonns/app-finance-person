import { useEffect, useRef, useState } from "react";
import { Landmark, Plus, TrendingUp, Trash2 } from "lucide-react";
import Sidebar from "./components/Sidebar";
import HeaderPanel from "./components/HeaderPanel";
import MetricCard from "./components/MetricCard";
import { EntriesPanel, LeisurePanel } from "./components/LedgerPanel";
import DebtsTable from "./components/DebtsTable";
import {
  capitalRows as initialCapitalRows,
  entryRows as initialEntryRows,
  initialLeisureRows,
  investmentRows as initialInvestmentRows,
} from "./mockData";
import { formatCurrency, getCurrentUser } from "./utils";

const initialPeople = ["Andressa", "Wellington", "Casal"];

const initialDebtRows = [
  {
    id: "debt-1",
    person: "Andressa",
    name: "Cartao Nubank",
    value: 1200,
    dueDate: "07/04/2026",
    delay: 0,
    status: "paid",
    statusLabel: "Paga",
  },
  {
    id: "debt-2",
    person: "Wellington",
    name: "Financiamento",
    value: 1000,
    dueDate: "22/04/2026",
    delay: 0,
    status: "open",
    statusLabel: "A vencer",
  },
  {
    id: "debt-3",
    person: "Casal",
    name: "Mercado parcelado",
    value: 500,
    dueDate: "03/04/2026",
    delay: 3,
    status: "late",
    statusLabel: "Atrasada",
  },
];

const viewTitles = {
  dashboard: "Dashboard - Abril de 2026",
  contas: "Contas - Abril de 2026",
  capital: "Capital - Abril de 2026",
  investimentos: "Investimentos - Abril de 2026",
};

const dashboardStorageKey = "financeperson:dashboard-react:v1";
const remoteStateApiPath = "/api/state";

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
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
  const response = await fetch(buildRemoteStateUrl(user), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state: snapshot }),
  });
  if (!response.ok) {
    throw new Error(`Falha ao salvar no servidor: ${response.status}`);
  }
}

async function fetchRemoteState(user) {
  try {
    const response = await fetch(buildRemoteStateUrl(user), { method: "GET" });
    if (!response.ok) return undefined;
    const payload = await response.json();
    if (!payload || typeof payload !== "object") return null;
    if (!payload.state || typeof payload.state !== "object") return null;
    return payload.state;
  } catch (error) {
    console.warn("Nao foi possivel carregar dados do servidor.", error);
    return undefined;
  }
}

function normalizeTextList(list, fallback) {
  if (!Array.isArray(list)) return [...fallback];
  const seen = new Set();
  const normalized = list
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  return normalized.length ? normalized : [...fallback];
}

function normalizeMoneyRows(rows, fallback, prefix) {
  const source = Array.isArray(rows) ? rows : fallback;
  return source
    .map((row) => {
      const label = String(row && row.label ? row.label : "").trim();
      const value = Number(row && row.value);
      if (!label || !Number.isFinite(value)) return null;
      return {
        id: String((row && row.id) || createId(prefix)),
        label,
        value,
      };
    })
    .filter(Boolean);
}

function normalizeCapitalRows(rows, fallback) {
  const source = Array.isArray(rows) ? rows : fallback;
  return source
    .map((row) => {
      const label = String(row && row.label ? row.label : "").trim();
      const value = Number(row && row.value);
      if (!label || !Number.isFinite(value)) return null;
      return {
        id: String((row && row.id) || createId("capital")),
        label,
        note: String(row && row.note ? row.note : "Atualizado agora").trim() || "Atualizado agora",
        value,
      };
    })
    .filter(Boolean);
}

function normalizeInvestmentRows(rows, fallback) {
  const source = Array.isArray(rows) ? rows : fallback;
  return source
    .map((row) => {
      const name = String(row && row.name ? row.name : "").trim();
      const value = Number(row && row.value);
      if (!name || !Number.isFinite(value)) return null;
      return {
        id: String((row && row.id) || createId("investment")),
        name,
        category: String(row && row.category ? row.category : "Carteira").trim() || "Carteira",
        value,
        yield: String(row && row.yield ? row.yield : "+0,00%").trim() || "+0,00%",
      };
    })
    .filter(Boolean);
}

function normalizeDebtRows(rows, fallback, people) {
  const source = Array.isArray(rows) ? rows : fallback;
  return source
    .map((row) => {
      const person = String(row && row.person ? row.person : people[0]).trim();
      const name = String(row && row.name ? row.name : "").trim();
      const value = Number(row && row.value);
      if (!person || !name || !Number.isFinite(value)) return null;
      const status = ["paid", "open", "late"].includes(row && row.status) ? row.status : "open";
      const statusLabel = status === "paid" ? "Paga" : status === "late" ? "Atrasada" : "A vencer";
      return {
        id: String((row && row.id) || createId("debt")),
        person,
        name,
        value,
        dueDate: String(row && row.dueDate ? row.dueDate : "A vencer").trim() || "A vencer",
        delay: Number.isFinite(Number(row && row.delay)) ? Number(row.delay) : 0,
        status,
        statusLabel: String(row && row.statusLabel ? row.statusLabel : statusLabel).trim() || statusLabel,
      };
    })
    .filter(Boolean);
}

function normalizeDashboardState(snapshot) {
  const people = normalizeTextList(snapshot && snapshot.people, initialPeople);
  const selectedPerson = people.includes(snapshot && snapshot.selectedPerson) ? snapshot.selectedPerson : people[0];

  return {
    people,
    selectedPerson,
    sumSalaries: snapshot && typeof snapshot.sumSalaries === "boolean" ? snapshot.sumSalaries : true,
    consolidateDebts: snapshot && typeof snapshot.consolidateDebts === "boolean" ? snapshot.consolidateDebts : true,
    entries: normalizeMoneyRows(snapshot && snapshot.entries, initialEntryRows, "entry"),
    leisureRows: normalizeMoneyRows(snapshot && snapshot.leisureRows, initialLeisureRows, "leisure"),
    debtRows: normalizeDebtRows(snapshot && snapshot.debtRows, initialDebtRows, people),
    capitalItems: normalizeCapitalRows(snapshot && snapshot.capitalItems, initialCapitalRows),
    investmentItems: normalizeInvestmentRows(snapshot && snapshot.investmentItems, initialInvestmentRows),
    currentView: viewTitles[snapshot && snapshot.currentView] ? snapshot.currentView : "dashboard",
  };
}

function createDashboardSnapshot({
  people,
  selectedPerson,
  sumSalaries,
  consolidateDebts,
  entries,
  leisureRows,
  debtRows,
  capitalItems,
  investmentItems,
  currentView,
}) {
  return {
    people,
    selectedPerson,
    sumSalaries,
    consolidateDebts,
    entries,
    leisureRows,
    debtRows,
    capitalItems,
    investmentItems,
    currentView,
  };
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

function CapitalPanel({ rows, onAddCapital, onRemoveCapital, onClearCapital }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ label: "", note: "", value: "" });
  const total = rows.reduce((sum, row) => sum + row.value, 0);

  function handleSubmit(event) {
    event.preventDefault();
    const label = form.label.trim();
    const value = Number(String(form.value).replace(",", "."));
    if (!label || !value) return;

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
            onClick={() => setShowForm((current) => !current)}
            className="inline-flex items-center gap-2 rounded-2xl border border-success/30 bg-success/15 px-4 py-2 text-sm font-semibold text-success"
          >
            <Plus className="h-4 w-4" />
            {showForm ? "Fechar" : "Adicionar"}
          </button>
          <button
            type="button"
            onClick={onClearCapital}
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
                  onClick={() => onRemoveCapital(row.id)}
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

function InvestmentsPanel({ rows, onAddInvestment, onRemoveInvestment }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", category: "", value: "", yield: "" });

  function handleSubmit(event) {
    event.preventDefault();
    const name = form.name.trim();
    const value = Number(String(form.value).replace(",", "."));
    if (!name || !value) return;

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
          onClick={() => setShowForm((current) => !current)}
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
                onClick={() => onRemoveInvestment(row.id)}
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
  entryRows,
  leisureRows,
  leisureForm,
  setLeisureForm,
  onLeisureSubmit,
  onClearLeisure,
  onAddEntry,
  debtRows,
  people,
  selectedPerson,
  onAddDebt,
  onRemoveDebt,
  cards,
}) {
  return (
    <>
      <OverviewCards cards={cards} />

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <EntriesPanel rows={entryRows} onAddEntry={onAddEntry} />
        <LeisurePanel
          rows={leisureRows}
          form={leisureForm}
          setForm={setLeisureForm}
          onSubmit={onLeisureSubmit}
          onClear={onClearLeisure}
        />
      </section>

      <DebtsTable
        rows={debtRows}
        people={people}
        selectedPerson={selectedPerson}
        onAddDebt={onAddDebt}
        onRemoveDebt={onRemoveDebt}
      />
    </>
  );
}

function AccountsView({ cards, debtRows, people, selectedPerson, onAddDebt, onRemoveDebt }) {
  return (
    <>
      <OverviewCards cards={cards} />
      <DebtsTable
        rows={debtRows}
        people={people}
        selectedPerson={selectedPerson}
        onAddDebt={onAddDebt}
        onRemoveDebt={onRemoveDebt}
      />
    </>
  );
}

function CapitalView({
  cards,
  capitalRows,
  onAddCapital,
  onRemoveCapital,
  onClearCapital,
  leisureRows,
  leisureForm,
  setLeisureForm,
  onLeisureSubmit,
  onClearLeisure,
}) {
  return (
    <>
      <OverviewCards cards={cards} />

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <CapitalPanel
          rows={capitalRows}
          onAddCapital={onAddCapital}
          onRemoveCapital={onRemoveCapital}
          onClearCapital={onClearCapital}
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

function InvestmentsView({ cards, investmentRows, onAddInvestment, onRemoveInvestment }) {
  return (
    <>
      <OverviewCards cards={cards} />
      <InvestmentsPanel
        rows={investmentRows}
        onAddInvestment={onAddInvestment}
        onRemoveInvestment={onRemoveInvestment}
      />
    </>
  );
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [people, setPeople] = useState(initialPeople);
  const [selectedPerson, setSelectedPerson] = useState("Andressa");
  const [sumSalaries, setSumSalaries] = useState(true);
  const [consolidateDebts, setConsolidateDebts] = useState(true);
  const [entries, setEntries] = useState(initialEntryRows);
  const [leisureRows, setLeisureRows] = useState(initialLeisureRows);
  const [leisureForm, setLeisureForm] = useState({ description: "", value: "" });
  const [debtRows, setDebtRows] = useState(initialDebtRows);
  const [capitalItems, setCapitalItems] = useState(initialCapitalRows);
  const [investmentItems, setInvestmentItems] = useState(initialInvestmentRows);
  const [currentUser] = useState(getCurrentUser);
  const [currentView, setCurrentView] = useState(getInitialView);
  const [actionMessage, setActionMessage] = useState("");
  const [syncStatus, setSyncStatus] = useState("Carregando dados...");
  const [isHydrated, setIsHydrated] = useState(false);
  const saveTimeoutRef = useRef(null);
  const saveInFlightRef = useRef(false);
  const saveQueuedRef = useRef(false);
  const latestSnapshotRef = useRef(null);

  function applyDashboardState(snapshot) {
    const normalized = normalizeDashboardState(snapshot);
    setPeople(normalized.people);
    setSelectedPerson(normalized.selectedPerson);
    setSumSalaries(normalized.sumSalaries);
    setConsolidateDebts(normalized.consolidateDebts);
    setEntries(normalized.entries);
    setLeisureRows(normalized.leisureRows);
    setDebtRows(normalized.debtRows);
    setCapitalItems(normalized.capitalItems);
    setInvestmentItems(normalized.investmentItems);
    setCurrentView(normalized.currentView);
  }

  useEffect(() => {
    const closeOnDesktop = () => {
      if (window.innerWidth >= 768) setSidebarOpen(false);
    };
    const syncViewFromHash = () => {
      setCurrentView(getInitialView());
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
          applyDashboardState(JSON.parse(localSaved));
          localLoaded = true;
          if (!cancelled) setSyncStatus("Dados locais carregados.");
        } catch {
          window.localStorage.removeItem(storageKey);
        }
      }

      const remoteState = await fetchRemoteState(currentUser);
      if (cancelled) return;

      if (remoteState && typeof remoteState === "object") {
        const normalized = normalizeDashboardState(remoteState);
        applyDashboardState(normalized);
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

  function announce(message) {
    setActionMessage(message);
  }

  function handleNavigate(view) {
    setCurrentView(view);
    setSidebarOpen(false);
    window.location.hash = view;
  }

  function handleLeisureSubmit(event) {
    event.preventDefault();

    const description = leisureForm.description.trim();
    const value = Number(String(leisureForm.value).replace(",", "."));
    if (!description || !value) return;

    setLeisureRows((current) => [...current, { id: createId("leisure"), label: description, value }]);
    setLeisureForm({ description: "", value: "" });
    announce(`Lazer "${description}" adicionado.`);
  }

  function handleAddEntry({ description, value }) {
    setEntries((current) => [...current, { id: createId("entry"), label: description, value }]);
    announce(`Entrada "${description}" adicionada.`);
  }

  function handleAddPerson(name) {
    const formatted = name.charAt(0).toUpperCase() + name.slice(1).trim();
    if (people.some((person) => person.toLowerCase() === formatted.toLowerCase())) {
      announce(`A pessoa "${formatted}" ja existe.`);
      return;
    }
    setPeople((current) => [...current, formatted]);
    announce(`Pessoa "${formatted}" adicionada ao painel.`);
  }

  function handleRemovePerson(person) {
    if (people.length === 1) {
      announce("Nao e possivel remover a ultima pessoa.");
      return;
    }

    const nextPeople = people.filter((item) => item !== person);
    setPeople(nextPeople);
    setDebtRows((current) => current.filter((row) => row.person !== person));
    if (selectedPerson === person) setSelectedPerson(nextPeople[0]);
    announce(`Pessoa "${person}" removida.`);
  }

  function handleAddDebt(debt) {
    setDebtRows((current) => [...current, { id: createId("debt"), ...debt }]);
    announce(`Conta "${debt.name}" adicionada para ${debt.person}.`);
  }

  function handleRemoveDebt(id) {
    const debt = debtRows.find((item) => item.id === id);
    setDebtRows((current) => current.filter((item) => item.id !== id));
    announce(debt ? `Conta "${debt.name}" removida.` : "Conta removida.");
  }

  function handleAddCapital(item) {
    setCapitalItems((current) => [...current, { id: createId("capital"), ...item }]);
    announce(`Capital "${item.label}" registrado.`);
  }

  function handleRemoveCapital(id) {
    const item = capitalItems.find((current) => current.id === id);
    setCapitalItems((current) => current.filter((row) => row.id !== id));
    announce(item ? `Item "${item.label}" removido do capital.` : "Item removido do capital.");
  }

  function handleClearCapital() {
    setCapitalItems([]);
    announce("Lista de capital limpa.");
  }

  function handleAddInvestment(item) {
    setInvestmentItems((current) => [...current, { id: createId("investment"), ...item }]);
    announce(`Ativo "${item.name}" adicionado.`);
  }

  function handleRemoveInvestment(id) {
    const item = investmentItems.find((current) => current.id === id);
    setInvestmentItems((current) => current.filter((row) => row.id !== id));
    announce(item ? `Ativo "${item.name}" removido.` : "Ativo removido.");
  }

  useEffect(() => {
    if (!isHydrated) return;

    const snapshot = createDashboardSnapshot({
      people,
      selectedPerson,
      sumSalaries,
      consolidateDebts,
      entries,
      leisureRows,
      debtRows,
      capitalItems,
      investmentItems,
      currentView,
    });
    latestSnapshotRef.current = snapshot;

    const storageKey = getScopedStorageKey(currentUser);
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
        console.warn("Nao foi possivel sincronizar no banco.", error);
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
  }, [
    capitalItems,
    consolidateDebts,
    currentUser,
    currentView,
    debtRows,
    entries,
    investmentItems,
    isHydrated,
    leisureRows,
    people,
    selectedPerson,
    sumSalaries,
  ]);

  const totalEntries = entries.reduce((sum, row) => sum + row.value, 0);
  const totalLeisure = leisureRows.reduce((sum, row) => sum + row.value, 0);
  const totalPaid = totalByStatus(debtRows, "paid");
  const totalOpen = totalByStatus(debtRows, "open");
  const totalLate = totalByStatus(debtRows, "late");
  const totalCapital = capitalItems.reduce((sum, row) => sum + row.value, 0);
  const totalInvestments = investmentItems.reduce((sum, row) => sum + row.value, 0);

  const dashboardCards = [
    { title: "Renda total", value: totalEntries, tone: "income" },
    { title: "Saidas de lazer", value: totalLeisure, tone: "danger" },
    { title: "Contas pagas", value: totalPaid, tone: "info" },
    { title: "Saldo geral atual", value: totalEntries - totalLeisure - totalOpen - totalLate, tone: "success" },
  ];

  const accountCards = [
    { title: "Contas em aberto", value: totalOpen, tone: "danger" },
    { title: "Contas pagas", value: totalPaid, tone: "success" },
    { title: "Contas atrasadas", value: debtRows.filter((row) => row.status === "late").length, tone: "info", format: "number" },
    { title: "Titulares ativos", value: people.length, tone: "income", format: "number" },
  ];

  const capitalCards = [
    { title: "Capital atual", value: totalCapital, tone: "success" },
    { title: "Itens no capital", value: capitalItems.length, tone: "income", format: "number" },
    { title: "Lazer planejado", value: totalLeisure, tone: "info" },
    { title: "Saldo apos contas", value: totalCapital - totalOpen - totalLate, tone: "danger" },
  ];

  const investmentsCards = [
    { title: "Total investido", value: totalInvestments, tone: "success" },
    { title: "Ativos na carteira", value: investmentItems.length, tone: "income", format: "number" },
    {
      title: "Maior posicao",
      value: investmentItems.length ? Math.max(...investmentItems.map((item) => item.value)) : 0,
      tone: "info",
    },
    { title: "Pessoa ativa", value: selectedPerson, tone: "danger", format: "text" },
  ];

  const descriptionMap = {
    dashboard: "Resumo geral com indicadores, entradas, lazer e dividas do periodo.",
    contas: "Acompanhe vencimentos, pagamentos, filtros e cadastro das contas do mes.",
    capital: "Controle entradas de capital, reservas e saidas projetadas no mesmo painel.",
    investimentos: "Monitore a carteira e ajuste a lista de ativos diretamente na tela.",
  };

  const statusNoteMap = {
    dashboard: `Pessoa ativa: ${selectedPerson} | Entradas registradas: ${entries.length} | Usuarios no painel: ${people.length}`,
    contas: `Dividas consolidadas: ${consolidateDebts ? "sim" : "nao"} | Contas cadastradas: ${debtRows.length}`,
    capital: `Somar salarios marcados: ${sumSalaries ? "ativo" : "desligado"} | Itens de capital: ${capitalItems.length}`,
    investimentos: `Carteira monitorada por ${selectedPerson} | Ativos acompanhados: ${investmentItems.length}`,
  };

  function renderView() {
    if (currentView === "contas") {
      return (
        <AccountsView
          cards={accountCards}
          debtRows={debtRows}
          people={people}
          selectedPerson={selectedPerson}
          onAddDebt={handleAddDebt}
          onRemoveDebt={handleRemoveDebt}
        />
      );
    }

    if (currentView === "capital") {
      return (
        <CapitalView
          cards={capitalCards}
          capitalRows={capitalItems}
          onAddCapital={handleAddCapital}
          onRemoveCapital={handleRemoveCapital}
          onClearCapital={handleClearCapital}
          leisureRows={leisureRows}
          leisureForm={leisureForm}
          setLeisureForm={setLeisureForm}
          onLeisureSubmit={handleLeisureSubmit}
          onClearLeisure={() => {
            setLeisureRows([]);
            announce("Lista de lazer limpa.");
          }}
        />
      );
    }

    if (currentView === "investimentos") {
      return (
        <InvestmentsView
          cards={investmentsCards}
          investmentRows={investmentItems}
          onAddInvestment={handleAddInvestment}
          onRemoveInvestment={handleRemoveInvestment}
        />
      );
    }

    return (
      <DashboardView
        entryRows={entries}
        leisureRows={leisureRows}
        leisureForm={leisureForm}
        setLeisureForm={setLeisureForm}
        onLeisureSubmit={handleLeisureSubmit}
        onClearLeisure={() => {
          setLeisureRows([]);
          announce("Lista de lazer limpa.");
        }}
        onAddEntry={handleAddEntry}
        debtRows={debtRows}
        people={people}
        selectedPerson={selectedPerson}
        onAddDebt={handleAddDebt}
        onRemoveDebt={handleRemoveDebt}
        cards={dashboardCards}
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
          currentView={currentView}
          onNavigate={handleNavigate}
        />

        <main className="min-w-0 space-y-4">
          <HeaderPanel
            title={viewTitles[currentView]}
            description={descriptionMap[currentView]}
            statusNote={statusNoteMap[currentView]}
            people={people}
            selectedPerson={selectedPerson}
            setSelectedPerson={setSelectedPerson}
            sumSalaries={sumSalaries}
            setSumSalaries={setSumSalaries}
            consolidateDebts={consolidateDebts}
            setConsolidateDebts={setConsolidateDebts}
            onOpenSidebar={() => setSidebarOpen(true)}
            onAddPerson={handleAddPerson}
            onRemovePerson={handleRemovePerson}
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
