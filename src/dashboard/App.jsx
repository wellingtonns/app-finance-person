import { useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import Sidebar from "./components/Sidebar";
import HeaderPanel from "./components/HeaderPanel";
import MetricCard from "./components/MetricCard";
import { EntriesModule, LeisureModule, ReadOnlyLedgerSummary } from "./components/LedgerPanel";
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
  createId,
  getAvailableCategories,
  getMonthExtraIncome,
  getPeopleIncomeTotal,
  getPersonName,
  normalizeDashboardState,
  removeCapitalItem,
  removeDebtItem,
  removeEntryItem,
  removeInvestmentItem,
  removeLeisureItem,
  removePersonExtraIncome,
  removePersonItem,
  setCurrentView,
  setDashboardFilter,
  setPersonExtraIncome,
  setSelectedPerson,
  updateCapitalItem,
  updateDebtItem,
  updateEntryItem,
  updateInvestmentItem,
  updateLeisureItem,
  updatePersonItem,
  VIEW_KEYS,
} from "./state-utils.mjs";
import {
  fetchRemoteState,
  logDashboard,
  pushStateToServer,
  readLocalSnapshot,
  sanitizeRemoteUser,
  writeLocalSnapshot,
} from "./persistence.mjs";

const viewTitles = {
  dashboard: "Dashboard financeiro",
  entradas: "Entradas e ganhos",
  contas: "Contas e compromissos",
  capital: "Capital e lazer",
  investimentos: "Investimentos",
  pessoas: "Pessoas e rendas fixas",
};

const viewDescriptions = {
  dashboard:
    "Resumo somente leitura com filtros globais para acompanhar renda, contas, capital e investimentos sem editar registros daqui.",
  entradas:
    "Cadastre ganhos variaveis, revise registros do mes e remova entradas antigas sem misturar isso com o resumo principal.",
  contas:
    "Controle vencimentos, status e valores das contas por pessoa, com filtros e manutencao completa em um unico modulo.",
  capital:
    "Mantenha a composicao do capital e o planejamento de lazer juntos, mas com acoes apenas aqui, sem poluir o dashboard.",
  investimentos:
    "Gerencie a carteira, valores aplicados e categorias dos ativos com edicao direta dentro desta tela.",
  pessoas:
    "Cadastre pessoas, salario fixo e renda extra por mes para enriquecer os totais do painel e manter o fluxo organizado.",
};

function getInitialView() {
  const hash = window.location.hash.replace(/^#/, "").trim().toLowerCase();
  return VIEW_KEYS.includes(hash) ? hash : "dashboard";
}

function parseMoneyInput(value) {
  return Number(String(value || "").replace(",", "."));
}

function getActiveFilterPersonId(filters, selectedPersonId) {
  if (!filters?.personId || filters.personId === "all") return "all";
  if (filters.personId === "selected") return selectedPersonId;
  return filters.personId;
}

function matchesSharedFilters(item, filters, selectedPersonId) {
  const activePersonId = getActiveFilterPersonId(filters, selectedPersonId);
  if (activePersonId !== "all" && item.personId !== activePersonId) return false;
  if (filters.month && item.month !== filters.month) return false;
  if (filters.category !== "all" && item.category !== filters.category) return false;
  return true;
}

function matchesDebtFilters(item, filters, selectedPersonId) {
  if (!matchesSharedFilters(item, filters, selectedPersonId)) return false;
  if (filters.status !== "all" && item.status !== filters.status) return false;
  return true;
}

function sortByMonthDesc(rows) {
  return [...rows].sort((a, b) => String(b.month).localeCompare(String(a.month)));
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

function DashboardMiniChart({ rows }) {
  const maxValue = rows.length ? Math.max(...rows.map((row) => row.value), 1) : 1;

  return (
    <section className="premium-panel rounded-[28px] p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="font-display text-[1.8rem] font-bold text-white">Distribuicao do periodo</h3>
          <p className="mt-1 text-base text-copy/78">Leitura visual rapida dos principais blocos financeiros filtrados.</p>
        </div>
        <p className="text-sm text-copy/60">Visao somente leitura</p>
      </div>

      <div className="mt-6 grid gap-4">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="text-copy/75">{row.label}</span>
              <strong className="text-white">{formatCurrency(row.value)}</strong>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full ${row.barClass}`}
                style={{ width: `${Math.max(10, (row.value / maxValue) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function EmptyState({ message }) {
  return <p className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-copy/65">{message}</p>;
}

function CapitalModule({
  rows,
  people,
  selectedPersonId,
  onAddCapital,
  onUpdateCapital,
  onRemoveCapital,
  onClearCapital,
  onNotify,
}) {
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState({
    id: "",
    personId: selectedPersonId,
    label: "",
    category: "",
    note: "",
    month: new Date().toISOString().slice(0, 7),
    value: "",
  });

  useEffect(() => {
    if (!editingId) {
      setForm((current) => ({ ...current, personId: selectedPersonId || current.personId }));
    }
  }, [editingId, selectedPersonId]);

  const total = rows.reduce((sum, row) => sum + row.value, 0);

  function resetForm() {
    setEditingId("");
    setForm({
      id: "",
      personId: selectedPersonId,
      label: "",
      category: "",
      note: "",
      month: new Date().toISOString().slice(0, 7),
      value: "",
    });
  }

  function handleSubmit(event) {
    event.preventDefault();
    const payload = {
      id: form.id,
      personId: form.personId,
      label: form.label.trim(),
      category: form.category.trim() || "Capital",
      note: form.note.trim() || "Atualizado agora",
      month: form.month,
      value: parseMoneyInput(form.value),
    };
    console.log("[dashboard] Capital save clicked", payload);
    if (!payload.personId || !payload.label || !Number.isFinite(payload.value) || payload.value <= 0) {
      console.warn("[dashboard] Invalid capital payload", payload);
      onNotify("Preencha pessoa, descricao e valor valido para salvar o capital.");
      return;
    }

    if (editingId) {
      onUpdateCapital(payload);
      onNotify(`Capital "${payload.label}" atualizado.`);
    } else {
      onAddCapital(payload);
      onNotify(`Capital "${payload.label}" adicionado.`);
    }
    resetForm();
  }

  return (
    <section className="premium-panel rounded-[28px] p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="font-display text-[1.9rem] font-bold text-white">Composicao do capital</h3>
          <p className="mt-1 text-base text-copy/78">Centralize reservas, caixa e itens patrimoniais por pessoa.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-copy/70">
            Total atual: <strong className="text-white">{formatCurrency(total)}</strong>
          </div>
          <button
            type="button"
            onClick={() => {
              console.log("[dashboard] Capital clear clicked", { rows: rows.length });
              onClearCapital();
              resetForm();
            }}
            className="inline-flex items-center gap-2 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger"
          >
            <Trash2 className="h-4 w-4" />
            Limpar
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-3">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[170px_minmax(0,1fr)_150px_150px_140px_140px]">
          <select
            value={form.personId}
            onChange={(event) => setForm((current) => ({ ...current, personId: event.target.value }))}
            className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-sm text-white outline-none"
          >
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
          <input
            value={form.label}
            onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
            placeholder="Item do capital"
            className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-base text-white outline-none"
          />
          <input
            value={form.category}
            onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
            placeholder="Categoria"
            className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-base text-white outline-none"
          />
          <input
            value={form.note}
            onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
            placeholder="Observacao"
            className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-base text-white outline-none"
          />
          <input
            type="month"
            value={form.month}
            onChange={(event) => setForm((current) => ({ ...current, month: event.target.value }))}
            className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-base text-white outline-none"
          />
          <input
            value={form.value}
            onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))}
            placeholder="Valor"
            className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-base text-white outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-3 md:justify-end">
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-success/30 bg-success/15 px-4 py-3 text-sm font-semibold text-success"
          >
            <Plus className="h-4 w-4" />
            {editingId ? "Salvar" : "Adicionar"}
          </button>
          <button
            type="button"
            onClick={resetForm}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-copy/80"
          >
            Limpar
          </button>
        </div>
      </form>

      <div className="mt-5 overflow-hidden rounded-[22px] border border-white/10 bg-black/10">
        <div className="grid gap-3 bg-white/10 px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-copy/70 lg:grid-cols-[160px_minmax(0,1fr)_140px_140px_140px_auto]">
          <span>Pessoa</span>
          <span>Item</span>
          <span>Categoria</span>
          <span>Mes</span>
          <span>Valor</span>
          <span className="lg:text-right">Acoes</span>
        </div>
        <ul>
          {rows.length ? (
            rows.map((row) => (
              <li
                key={row.id}
                className="grid gap-3 border-b border-white/10 px-4 py-4 text-sm text-copy/90 last:border-b-0 lg:grid-cols-[160px_minmax(0,1fr)_140px_140px_140px_auto] lg:items-center"
              >
                <span>{getPersonName(people, row.personId)}</span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-white">{row.label}</p>
                  <p className="text-xs text-copy/60">{row.note}</p>
                </div>
                <span>{row.category}</span>
                <span>{row.month}</span>
                <strong className="text-white">{formatCurrency(row.value)}</strong>
                <div className="flex gap-2 lg:justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      console.log("[dashboard] Capital edit clicked", row);
                      setEditingId(row.id);
                      setForm({
                        id: row.id,
                        personId: row.personId,
                        label: row.label,
                        category: row.category,
                        note: row.note,
                        month: row.month,
                        value: String(row.value),
                      });
                    }}
                    className="inline-flex rounded-xl border border-white/10 bg-white/5 p-2 text-copy/70"
                    aria-label={`Editar capital ${row.label}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      console.log("[dashboard] Capital remove clicked", row);
                      onRemoveCapital(row.id);
                    }}
                    className="inline-flex rounded-xl border border-danger/30 bg-danger/10 p-2 text-danger"
                    aria-label={`Remover capital ${row.label}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))
          ) : (
            <li className="px-4 py-4">
              <EmptyState message="Nenhum item de capital cadastrado." />
            </li>
          )}
        </ul>
      </div>
    </section>
  );
}

function InvestmentsModule({
  rows,
  people,
  selectedPersonId,
  onAddInvestment,
  onUpdateInvestment,
  onRemoveInvestment,
  onNotify,
}) {
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState({
    id: "",
    personId: selectedPersonId,
    name: "",
    category: "",
    month: new Date().toISOString().slice(0, 7),
    value: "",
    yield: "",
  });

  useEffect(() => {
    if (!editingId) {
      setForm((current) => ({ ...current, personId: selectedPersonId || current.personId }));
    }
  }, [editingId, selectedPersonId]);

  function resetForm() {
    setEditingId("");
    setForm({
      id: "",
      personId: selectedPersonId,
      name: "",
      category: "",
      month: new Date().toISOString().slice(0, 7),
      value: "",
      yield: "",
    });
  }

  function handleSubmit(event) {
    event.preventDefault();
    const payload = {
      id: form.id,
      personId: form.personId,
      name: form.name.trim(),
      category: form.category.trim() || "Carteira",
      month: form.month,
      value: parseMoneyInput(form.value),
      yield: form.yield.trim() || "+0,00%",
    };
    console.log("[dashboard] Investment save clicked", payload);
    if (!payload.personId || !payload.name || !Number.isFinite(payload.value) || payload.value <= 0) {
      console.warn("[dashboard] Invalid investment payload", payload);
      onNotify("Preencha pessoa, ativo e valor valido para salvar o investimento.");
      return;
    }

    if (editingId) {
      onUpdateInvestment(payload);
      onNotify(`Ativo "${payload.name}" atualizado.`);
    } else {
      onAddInvestment(payload);
      onNotify(`Ativo "${payload.name}" adicionado.`);
    }
    resetForm();
  }

  return (
    <section className="premium-panel rounded-[28px] p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="font-display text-[1.9rem] font-bold text-white">Carteira de investimentos</h3>
          <p className="mt-1 text-base text-copy/78">Gerencie ativos, categorias e rendimento esperado em um so lugar.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-copy/70">
          Ativos: <strong className="text-white">{rows.length}</strong>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-3 xl:grid-cols-[170px_minmax(0,1fr)_150px_140px_140px_140px_auto_auto]">
        <select
          value={form.personId}
          onChange={(event) => setForm((current) => ({ ...current, personId: event.target.value }))}
          className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-sm text-white outline-none"
        >
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
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
          type="month"
          value={form.month}
          onChange={(event) => setForm((current) => ({ ...current, month: event.target.value }))}
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
          placeholder="+0,80%"
          className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-base text-white outline-none"
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-info/35 bg-info/20 px-4 py-3 text-sm font-semibold text-[#dcebff]"
        >
          <Plus className="h-4 w-4" />
          {editingId ? "Salvar" : "Adicionar"}
        </button>
        <button
          type="button"
          onClick={resetForm}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-copy/80"
        >
          Limpar
        </button>
      </form>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.length ? (
          rows.map((row) => (
            <article
              key={row.id}
              className="rounded-[22px] border border-white/10 bg-[#111927] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-copy/55">
                    {getPersonName(people, row.personId)} - {row.category}
                  </p>
                  <h4 className="mt-2 font-display text-[1.35rem] font-bold text-white">{row.name}</h4>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      console.log("[dashboard] Investment edit clicked", row);
                      setEditingId(row.id);
                      setForm({
                        id: row.id,
                        personId: row.personId,
                        name: row.name,
                        category: row.category,
                        month: row.month,
                        value: String(row.value),
                        yield: row.yield,
                      });
                    }}
                    className="inline-flex rounded-xl border border-white/10 bg-white/5 p-2 text-copy/70"
                    aria-label={`Editar investimento ${row.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      console.log("[dashboard] Investment remove clicked", row);
                      onRemoveInvestment(row.id);
                    }}
                    className="inline-flex rounded-xl border border-danger/30 bg-danger/10 p-2 text-danger"
                    aria-label={`Remover investimento ${row.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="mt-4 text-sm text-copy/70">Mes de referencia</p>
              <strong className="mt-1 block text-white">{row.month}</strong>
              <p className="mt-4 text-sm text-copy/70">Posicao atual</p>
              <strong className="mt-1 block text-2xl font-bold text-white">{formatCurrency(row.value)}</strong>
              <p className="mt-4 text-sm text-copy/70">Rendimento estimado</p>
              <span className="mt-1 inline-flex rounded-full border border-success/30 bg-success/15 px-3 py-1 text-sm font-semibold text-success">
                {row.yield}
              </span>
            </article>
          ))
        ) : (
          <EmptyState message="Nenhum investimento cadastrado." />
        )}
      </div>
    </section>
  );
}

function PeopleModule({
  people,
  selectedPersonId,
  currentMonth,
  onAddPerson,
  onUpdatePerson,
  onRemovePerson,
  onSetExtraIncome,
  onRemoveExtraIncome,
  onNotify,
}) {
  const [editingId, setEditingId] = useState("");
  const [personForm, setPersonForm] = useState({ id: "", name: "", fixedSalary: "" });
  const [extraForm, setExtraForm] = useState({
    personId: selectedPersonId,
    month: currentMonth,
    value: "",
  });

  useEffect(() => {
    setExtraForm((current) => ({ ...current, personId: selectedPersonId || current.personId, month: currentMonth }));
  }, [currentMonth, selectedPersonId]);

  function resetPersonForm() {
    setEditingId("");
    setPersonForm({ id: "", name: "", fixedSalary: "" });
  }

  function handleSavePerson(event) {
    event.preventDefault();
    const payload = {
      id: personForm.id,
      name: personForm.name.trim(),
      fixedSalary: parseMoneyInput(personForm.fixedSalary),
    };
    console.log("[dashboard] Person save clicked", payload);
    if (!payload.name || !Number.isFinite(payload.fixedSalary) || payload.fixedSalary < 0) {
      console.warn("[dashboard] Invalid person payload", payload);
      onNotify("Informe nome e salario fixo valido para salvar a pessoa.");
      return;
    }

    const duplicated = people.some(
      (person) => person.id !== payload.id && person.name.toLowerCase() === payload.name.toLowerCase()
    );
    if (duplicated) {
      onNotify(`Ja existe uma pessoa chamada "${payload.name}".`);
      return;
    }

    if (editingId) {
      onUpdatePerson(payload);
      onNotify(`Pessoa "${payload.name}" atualizada.`);
    } else {
      onAddPerson(payload);
      onNotify(`Pessoa "${payload.name}" adicionada.`);
    }
    resetPersonForm();
  }

  function handleSaveExtraIncome(event) {
    event.preventDefault();
    const payload = {
      personId: extraForm.personId,
      month: extraForm.month,
      value: parseMoneyInput(extraForm.value),
    };
    console.log("[dashboard] Extra income save clicked", payload);
    if (!payload.personId || !payload.month || !Number.isFinite(payload.value) || payload.value < 0) {
      console.warn("[dashboard] Invalid extra income payload", payload);
      onNotify("Informe pessoa, mes e valor valido para registrar a renda extra.");
      return;
    }
    onSetExtraIncome(payload);
    onNotify(`Renda extra salva para ${getPersonName(people, payload.personId)} em ${payload.month}.`);
    setExtraForm((current) => ({ ...current, value: "" }));
  }

  return (
    <section className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <section className="premium-panel rounded-[28px] p-5 sm:p-6">
          <h3 className="font-display text-[1.9rem] font-bold text-white">Cadastro de pessoas</h3>
          <p className="mt-1 text-base text-copy/78">Nome e salario fixo entram aqui. A renda extra fica separada por mes.</p>

          <form
            onSubmit={handleSavePerson}
            className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_180px_auto_auto]"
          >
            <input
              value={personForm.name}
              onChange={(event) => setPersonForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Nome da pessoa"
              className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-base text-white outline-none"
            />
            <input
              value={personForm.fixedSalary}
              onChange={(event) => setPersonForm((current) => ({ ...current, fixedSalary: event.target.value }))}
              placeholder="Salario fixo"
              className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-base text-white outline-none"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-info/35 bg-info/20 px-4 py-3 text-sm font-semibold text-[#dcebff]"
            >
              <Plus className="h-4 w-4" />
              {editingId ? "Salvar" : "Adicionar"}
            </button>
            <button
              type="button"
              onClick={resetPersonForm}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-copy/80"
            >
              Limpar
            </button>
          </form>
        </section>

        <section className="premium-panel rounded-[28px] p-5 sm:p-6">
          <h3 className="font-display text-[1.9rem] font-bold text-white">Renda extra mensal</h3>
          <p className="mt-1 text-base text-copy/78">Cada pessoa pode ter meses com renda extra diferente, ou nenhum valor.</p>

          <form onSubmit={handleSaveExtraIncome} className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-[170px_150px_160px_auto]">
            <select
              value={extraForm.personId}
              onChange={(event) => setExtraForm((current) => ({ ...current, personId: event.target.value }))}
              className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-sm text-white outline-none"
            >
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
            <input
              type="month"
              value={extraForm.month}
              onChange={(event) => setExtraForm((current) => ({ ...current, month: event.target.value }))}
              className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-sm text-white outline-none"
            />
            <input
              value={extraForm.value}
              onChange={(event) => setExtraForm((current) => ({ ...current, value: event.target.value }))}
              placeholder="Valor extra"
              className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-sm text-white outline-none"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-success/30 bg-success/15 px-4 py-3 text-sm font-semibold text-success"
            >
              <Plus className="h-4 w-4" />
              Salvar extra
            </button>
          </form>
        </section>
      </div>

      <section className="grid gap-4 xl:grid-cols-3">
        {people.map((person) => {
          const extraEntries = Object.entries(person.extraIncomeByMonth || {}).sort(([a], [b]) => b.localeCompare(a));
          return (
            <article key={person.id} className="premium-panel rounded-[28px] p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-copy/55">Pessoa</p>
                  <h3 className="mt-2 font-display text-[1.7rem] font-bold text-white">{person.name}</h3>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      console.log("[dashboard] Person edit clicked", person);
                      setEditingId(person.id);
                      setPersonForm({
                        id: person.id,
                        name: person.name,
                        fixedSalary: String(person.fixedSalary),
                      });
                    }}
                    className="inline-flex rounded-xl border border-white/10 bg-white/5 p-2 text-copy/70"
                    aria-label={`Editar pessoa ${person.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      console.log("[dashboard] Person remove clicked", person);
                      onRemovePerson(person.id);
                    }}
                    disabled={people.length === 1}
                    className="inline-flex rounded-xl border border-danger/30 bg-danger/10 p-2 text-danger disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={`Remover pessoa ${person.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-copy/70">
                  Salario fixo: <strong className="text-white">{formatCurrency(person.fixedSalary)}</strong>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-copy/70">
                  Renda extra em {currentMonth}:{" "}
                  <strong className="text-white">{formatCurrency(getMonthExtraIncome(person, currentMonth))}</strong>
                </div>
              </div>

              <div className="mt-5">
                <p className="text-sm font-semibold text-white">Historico de extras</p>
                <div className="mt-3 grid gap-2">
                  {extraEntries.length ? (
                    extraEntries.map(([month, value]) => (
                      <div
                        key={month}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-sm text-copy/80"
                      >
                        <div>
                          <p className="font-medium text-white">{month}</p>
                          <p>{formatCurrency(value)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            console.log("[dashboard] Extra income remove clicked", { personId: person.id, month });
                            onRemoveExtraIncome(person.id, month);
                            onNotify(`Renda extra removida de ${person.name} em ${month}.`);
                          }}
                          className="inline-flex rounded-xl border border-danger/30 bg-danger/10 p-2 text-danger"
                          aria-label={`Remover renda extra de ${person.name} em ${month}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <EmptyState message="Nenhuma renda extra registrada para essa pessoa." />
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </section>
  );
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState(() => {
    const initial = createDefaultDashboardState();
    return setCurrentView(initial, getInitialView());
  });
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
    if (!actionMessage) return undefined;
    const timeoutId = window.setTimeout(() => setActionMessage(""), 4500);
    return () => window.clearTimeout(timeoutId);
  }, [actionMessage]);

  useEffect(() => {
    const closeOnDesktop = () => {
      if (window.innerWidth >= 768) setSidebarOpen(false);
    };

    const syncViewFromHash = () => {
      const nextView = getInitialView();
      logDashboard("Hash navigation detected", { nextView });
      setDashboardData((current) => setCurrentView(current, nextView));
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
      const { storageKey, saved } = readLocalSnapshot(currentUser);
      let localLoaded = false;

      if (saved) {
        try {
          const localState = normalizeDashboardState(JSON.parse(saved));
          const withRequestedView = setCurrentView(localState, getInitialView());
          logDashboard("Loading state from localStorage", { storageKey, localState: withRequestedView });
          setDashboardData(withRequestedView);
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
        const normalized = setCurrentView(normalizeDashboardState(remoteState), getInitialView());
        logDashboard("Loading state from backend", normalized);
        setDashboardData(normalized);
        writeLocalSnapshot(currentUser, normalized);
        setSyncStatus("Dados carregados do banco.");
      } else if (remoteState === null) {
        setSyncStatus(
          localLoaded
            ? "Dados locais prontos. Sincronizacao remota disponivel."
            : "Novo painel iniciado. Sincronizacao remota disponivel."
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
    writeLocalSnapshot(currentUser, snapshot);

    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }

    if (!dashboardData.preferences.autoSync) {
      setSyncStatus("Sincronizacao automatica desativada. Dados salvos localmente.");
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

  const selectedPersonName = useMemo(
    () => getPersonName(dashboardData.people, dashboardData.selectedPersonId),
    [dashboardData.people, dashboardData.selectedPersonId]
  );

  const availableCategories = useMemo(() => getAvailableCategories(dashboardData), [dashboardData]);
  const activeDashboardPersonId = getActiveFilterPersonId(
    dashboardData.dashboardFilters,
    dashboardData.selectedPersonId
  );

  const dashboardEntries = useMemo(
    () => sortByMonthDesc(dashboardData.entries.filter((item) => matchesSharedFilters(item, dashboardData.dashboardFilters, dashboardData.selectedPersonId))),
    [dashboardData.dashboardFilters, dashboardData.entries, dashboardData.selectedPersonId]
  );
  const dashboardLeisure = useMemo(
    () => sortByMonthDesc(dashboardData.leisureRows.filter((item) => matchesSharedFilters(item, dashboardData.dashboardFilters, dashboardData.selectedPersonId))),
    [dashboardData.dashboardFilters, dashboardData.leisureRows, dashboardData.selectedPersonId]
  );
  const dashboardDebts = useMemo(
    () => sortByMonthDesc(dashboardData.debtRows.filter((item) => matchesDebtFilters(item, dashboardData.dashboardFilters, dashboardData.selectedPersonId))),
    [dashboardData.dashboardFilters, dashboardData.debtRows, dashboardData.selectedPersonId]
  );
  const dashboardCapital = useMemo(
    () => sortByMonthDesc(dashboardData.capitalItems.filter((item) => matchesSharedFilters(item, dashboardData.dashboardFilters, dashboardData.selectedPersonId))),
    [dashboardData.capitalItems, dashboardData.dashboardFilters, dashboardData.selectedPersonId]
  );
  const dashboardInvestments = useMemo(
    () =>
      sortByMonthDesc(
        dashboardData.investmentItems.filter((item) =>
          matchesSharedFilters(item, dashboardData.dashboardFilters, dashboardData.selectedPersonId)
        )
      ),
    [dashboardData.dashboardFilters, dashboardData.investmentItems, dashboardData.selectedPersonId]
  );

  const peopleIncome = useMemo(
    () =>
      getPeopleIncomeTotal(
        dashboardData.people,
        dashboardData.dashboardFilters.month,
        dashboardData.preferences.includeFixedSalary,
        activeDashboardPersonId
      ),
    [
      activeDashboardPersonId,
      dashboardData.dashboardFilters.month,
      dashboardData.people,
      dashboardData.preferences.includeFixedSalary,
    ]
  );

  const entriesTotal = dashboardEntries.reduce((sum, row) => sum + row.value, 0);
  const leisureTotal = dashboardLeisure.reduce((sum, row) => sum + row.value, 0);
  const openDebtTotal = dashboardDebts
    .filter((row) => row.status === "open" || row.status === "late")
    .reduce((sum, row) => sum + row.value, 0);
  const capitalTotal = dashboardCapital.reduce((sum, row) => sum + row.value, 0);
  const investmentsTotal = dashboardInvestments.reduce((sum, row) => sum + row.value, 0);

  function handleNavigate(view) {
    logDashboard("Sidebar navigation clicked", { view });
    updateDashboardData("navigate-view", (current) => setCurrentView(current, view));
    setSidebarOpen(false);
    window.location.hash = view;
  }

  function handleNavigateSettings() {
    const user = sanitizeRemoteUser(currentUser);
    window.location.href = `/settings?user=${encodeURIComponent(user)}`;
  }

  function handleAddEntry(payload) {
    updateDashboardData("add-entry", (current) => addEntryItem(current, payload, () => createId("entry")));
  }

  function handleUpdateEntry(payload) {
    updateDashboardData("update-entry", (current) => updateEntryItem(current, payload));
  }

  function handleRemoveEntry(id) {
    const item = dashboardData.entries.find((current) => current.id === id);
    updateDashboardData("remove-entry", (current) => removeEntryItem(current, id));
    notify(item ? `Entrada "${item.label}" removida.` : "Entrada removida.");
  }

  function handleAddDebt(payload) {
    updateDashboardData("add-debt", (current) => addDebtItem(current, payload, () => createId("debt")));
  }

  function handleUpdateDebt(payload) {
    updateDashboardData("update-debt", (current) => updateDebtItem(current, payload));
  }

  function handleRemoveDebt(id) {
    const item = dashboardData.debtRows.find((current) => current.id === id);
    updateDashboardData("remove-debt", (current) => removeDebtItem(current, id));
    notify(item ? `Conta "${item.name}" removida.` : "Conta removida.");
  }

  function handleAddCapital(payload) {
    updateDashboardData("add-capital", (current) => addCapitalItem(current, payload, () => createId("capital")));
  }

  function handleUpdateCapital(payload) {
    updateDashboardData("update-capital", (current) => updateCapitalItem(current, payload));
  }

  function handleRemoveCapital(id) {
    const item = dashboardData.capitalItems.find((current) => current.id === id);
    updateDashboardData("remove-capital", (current) => removeCapitalItem(current, id));
    notify(item ? `Item "${item.label}" removido do capital.` : "Item removido do capital.");
  }

  function handleClearCapital() {
    updateDashboardData("clear-capital", (current) => clearCapitalItems(current));
    notify("Itens de capital limpos.");
  }

  function handleAddLeisure(payload) {
    updateDashboardData("add-leisure", (current) => addLeisureItem(current, payload, () => createId("leisure")));
  }

  function handleUpdateLeisure(payload) {
    updateDashboardData("update-leisure", (current) => updateLeisureItem(current, payload));
  }

  function handleRemoveLeisure(id) {
    const item = dashboardData.leisureRows.find((current) => current.id === id);
    updateDashboardData("remove-leisure", (current) => removeLeisureItem(current, id));
    notify(item ? `Lazer "${item.label}" removido.` : "Lazer removido.");
  }

  function handleClearLeisure() {
    updateDashboardData("clear-leisure", (current) => clearLeisureItems(current));
    notify("Lista de lazer limpa.");
  }

  function handleAddInvestment(payload) {
    updateDashboardData("add-investment", (current) =>
      addInvestmentItem(current, payload, () => createId("investment"))
    );
  }

  function handleUpdateInvestment(payload) {
    updateDashboardData("update-investment", (current) => updateInvestmentItem(current, payload));
  }

  function handleRemoveInvestment(id) {
    const item = dashboardData.investmentItems.find((current) => current.id === id);
    updateDashboardData("remove-investment", (current) => removeInvestmentItem(current, id));
    notify(item ? `Ativo "${item.name}" removido.` : "Ativo removido.");
  }

  function handleAddPerson(payload) {
    updateDashboardData("add-person", (current) => addPersonItem(current, payload, () => createId("person")));
  }

  function handleUpdatePerson(payload) {
    updateDashboardData("update-person", (current) => updatePersonItem(current, payload));
  }

  function handleRemovePerson(personId) {
    if (dashboardData.people.length <= 1) {
      notify("Nao e possivel remover a ultima pessoa.");
      return;
    }
    const name = getPersonName(dashboardData.people, personId);
    updateDashboardData("remove-person", (current) => removePersonItem(current, personId));
    notify(`Pessoa "${name}" removida.`);
  }

  function handleSetPersonExtraIncome(payload) {
    updateDashboardData("set-person-extra-income", (current) => setPersonExtraIncome(current, payload));
  }

  function handleRemovePersonExtraIncome(personId, month) {
    updateDashboardData("remove-person-extra-income", (current) => removePersonExtraIncome(current, personId, month));
  }

  function handleSetSelectedPerson(personId) {
    updateDashboardData("set-selected-person", (current) => setSelectedPerson(current, personId));
  }

  function handleSetDashboardFilter(key, value) {
    updateDashboardData(`set-dashboard-filter:${key}`, (current) => setDashboardFilter(current, key, value));
  }

  const dashboardCards = [
    {
      title: "Renda do periodo",
      value: peopleIncome + entriesTotal,
      tone: "income",
    },
    {
      title: "Saidas do periodo",
      value: leisureTotal + openDebtTotal,
      tone: "danger",
    },
    {
      title: "Capital filtrado",
      value: capitalTotal,
      tone: "success",
    },
    {
      title: "Investimentos",
      value: investmentsTotal,
      tone: "info",
    },
  ];

  const entriesCards = [
    { title: "Entradas variaveis", value: dashboardData.entries.reduce((sum, row) => sum + row.value, 0), tone: "income" },
    {
      title: "Renda fixa ativa",
      value: getPeopleIncomeTotal(
        dashboardData.people,
        dashboardData.dashboardFilters.month,
        dashboardData.preferences.includeFixedSalary,
        "all"
      ),
      tone: "success",
    },
    { title: "Registros", value: dashboardData.entries.length, tone: "info", format: "number" },
    { title: "Pessoa ativa", value: selectedPersonName, tone: "danger", format: "text" },
  ];

  const accountsCards = [
    {
      title: "Contas em aberto",
      value: dashboardData.debtRows.filter((row) => row.status === "open").reduce((sum, row) => sum + row.value, 0),
      tone: "danger",
    },
    {
      title: "Contas pagas",
      value: dashboardData.debtRows.filter((row) => row.status === "paid").reduce((sum, row) => sum + row.value, 0),
      tone: "success",
    },
    {
      title: "Atrasadas",
      value: dashboardData.debtRows.filter((row) => row.status === "late").length,
      tone: "info",
      format: "number",
    },
    {
      title: "Titulares",
      value: dashboardData.people.length,
      tone: "income",
      format: "number",
    },
  ];

  const capitalCards = [
    {
      title: "Capital atual",
      value: dashboardData.capitalItems.reduce((sum, row) => sum + row.value, 0),
      tone: "success",
    },
    {
      title: "Itens de capital",
      value: dashboardData.capitalItems.length,
      tone: "income",
      format: "number",
    },
    {
      title: "Lazer planejado",
      value: dashboardData.leisureRows.reduce((sum, row) => sum + row.value, 0),
      tone: "info",
    },
    {
      title: "Saldo pos-contas",
      value:
        dashboardData.capitalItems.reduce((sum, row) => sum + row.value, 0) -
        dashboardData.debtRows
          .filter((row) => row.status === "open" || row.status === "late")
          .reduce((sum, row) => sum + row.value, 0),
      tone: "danger",
    },
  ];

  const investmentsCards = [
    {
      title: "Total investido",
      value: dashboardData.investmentItems.reduce((sum, row) => sum + row.value, 0),
      tone: "success",
    },
    {
      title: "Ativos na carteira",
      value: dashboardData.investmentItems.length,
      tone: "income",
      format: "number",
    },
    {
      title: "Maior posicao",
      value: dashboardData.investmentItems.length
        ? Math.max(...dashboardData.investmentItems.map((item) => item.value))
        : 0,
      tone: "info",
    },
    { title: "Pessoa ativa", value: selectedPersonName, tone: "danger", format: "text" },
  ];

  const peopleCards = [
    { title: "Pessoas cadastradas", value: dashboardData.people.length, tone: "income", format: "number" },
    {
      title: "Salarios fixos",
      value: dashboardData.people.reduce((sum, person) => sum + person.fixedSalary, 0),
      tone: "success",
    },
    {
      title: "Extras no mes",
      value: dashboardData.people.reduce(
        (sum, person) => sum + getMonthExtraIncome(person, dashboardData.dashboardFilters.month),
        0
      ),
      tone: "info",
    },
    { title: "Pessoa ativa", value: selectedPersonName, tone: "danger", format: "text" },
  ];

  const headerControls = (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <label className="grid gap-2">
        <span className="text-xs uppercase tracking-[0.16em] text-copy/55">Pessoa ativa</span>
        <select
          value={dashboardData.selectedPersonId}
          onChange={(event) => handleSetSelectedPerson(event.target.value)}
          className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-sm text-white outline-none"
        >
          {dashboardData.people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
      </label>

      {dashboardData.currentView === "dashboard" ? (
        <>
          <label className="grid gap-2">
            <span className="text-xs uppercase tracking-[0.16em] text-copy/55">Filtro pessoa</span>
            <select
              value={dashboardData.dashboardFilters.personId}
              onChange={(event) => handleSetDashboardFilter("personId", event.target.value)}
              className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-sm text-white outline-none"
            >
              <option value="all">Todas</option>
              {dashboardData.people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-xs uppercase tracking-[0.16em] text-copy/55">Mes</span>
            <input
              type="month"
              value={dashboardData.dashboardFilters.month}
              onChange={(event) => handleSetDashboardFilter("month", event.target.value)}
              className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-sm text-white outline-none"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs uppercase tracking-[0.16em] text-copy/55">Categoria</span>
            <select
              value={dashboardData.dashboardFilters.category}
              onChange={(event) => handleSetDashboardFilter("category", event.target.value)}
              className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-sm text-white outline-none"
            >
              {availableCategories.map((category) => (
                <option key={category} value={category}>
                  {category === "all" ? "Todas" : category}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-xs uppercase tracking-[0.16em] text-copy/55">Status das contas</span>
            <select
              value={dashboardData.dashboardFilters.status}
              onChange={(event) => handleSetDashboardFilter("status", event.target.value)}
              className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-sm text-white outline-none"
            >
              <option value="all">Todos</option>
              <option value="paid">Pagas</option>
              <option value="open">A vencer</option>
              <option value="late">Atrasadas</option>
            </select>
          </label>
        </>
      ) : (
        <>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-copy/80">
            Mes base do resumo: <strong className="text-white">{dashboardData.dashboardFilters.month}</strong>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-copy/80">
            Salario fixo no resumo:{" "}
            <strong className="text-white">
              {dashboardData.preferences.includeFixedSalary ? "incluido" : "desligado"}
            </strong>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-copy/80">
            Auto-sync:{" "}
            <strong className="text-white">{dashboardData.preferences.autoSync ? "ativo" : "desligado"}</strong>
          </div>
        </>
      )}
    </div>
  );

  const statusNote =
    dashboardData.currentView === "dashboard"
      ? `Filtros ativos: pessoa ${
          activeDashboardPersonId === "all" ? "todas" : getPersonName(dashboardData.people, activeDashboardPersonId)
        }, mes ${dashboardData.dashboardFilters.month}, categoria ${dashboardData.dashboardFilters.category}, status ${
          dashboardData.dashboardFilters.status
        }.`
      : `Pessoa ativa: ${selectedPersonName}. Ajustes de sincronizacao e preferencias ficam em /settings.`;

  function renderView() {
    if (dashboardData.currentView === "entradas") {
      return (
        <>
          <OverviewCards cards={entriesCards} />
          <EntriesModule
            rows={sortByMonthDesc(dashboardData.entries)}
            people={dashboardData.people}
            selectedPersonId={dashboardData.selectedPersonId}
            onAddEntry={handleAddEntry}
            onUpdateEntry={handleUpdateEntry}
            onRemoveEntry={handleRemoveEntry}
            onNotify={notify}
          />
        </>
      );
    }

    if (dashboardData.currentView === "contas") {
      return (
        <>
          <OverviewCards cards={accountsCards} />
          <DebtsTable
            rows={sortByMonthDesc(dashboardData.debtRows)}
            people={dashboardData.people}
            selectedPersonId={dashboardData.selectedPersonId}
            onAddDebt={handleAddDebt}
            onUpdateDebt={handleUpdateDebt}
            onRemoveDebt={handleRemoveDebt}
            onNotify={notify}
          />
        </>
      );
    }

    if (dashboardData.currentView === "capital") {
      return (
        <>
          <OverviewCards cards={capitalCards} />
          <section className="grid gap-4 xl:grid-cols-[1.02fr_0.98fr]">
            <CapitalModule
              rows={sortByMonthDesc(dashboardData.capitalItems)}
              people={dashboardData.people}
              selectedPersonId={dashboardData.selectedPersonId}
              onAddCapital={handleAddCapital}
              onUpdateCapital={handleUpdateCapital}
              onRemoveCapital={handleRemoveCapital}
              onClearCapital={handleClearCapital}
              onNotify={notify}
            />
            <LeisureModule
              rows={sortByMonthDesc(dashboardData.leisureRows)}
              people={dashboardData.people}
              selectedPersonId={dashboardData.selectedPersonId}
              onAddLeisure={handleAddLeisure}
              onUpdateLeisure={handleUpdateLeisure}
              onRemoveLeisure={handleRemoveLeisure}
              onClearLeisure={handleClearLeisure}
              onNotify={notify}
            />
          </section>
        </>
      );
    }

    if (dashboardData.currentView === "investimentos") {
      return (
        <>
          <OverviewCards cards={investmentsCards} />
          <InvestmentsModule
            rows={sortByMonthDesc(dashboardData.investmentItems)}
            people={dashboardData.people}
            selectedPersonId={dashboardData.selectedPersonId}
            onAddInvestment={handleAddInvestment}
            onUpdateInvestment={handleUpdateInvestment}
            onRemoveInvestment={handleRemoveInvestment}
            onNotify={notify}
          />
        </>
      );
    }

    if (dashboardData.currentView === "pessoas") {
      return (
        <>
          <OverviewCards cards={peopleCards} />
          <PeopleModule
            people={dashboardData.people}
            selectedPersonId={dashboardData.selectedPersonId}
            currentMonth={dashboardData.dashboardFilters.month}
            onAddPerson={handleAddPerson}
            onUpdatePerson={handleUpdatePerson}
            onRemovePerson={handleRemovePerson}
            onSetExtraIncome={handleSetPersonExtraIncome}
            onRemoveExtraIncome={handleRemovePersonExtraIncome}
            onNotify={notify}
          />
        </>
      );
    }

    return (
      <>
        <OverviewCards cards={dashboardCards} />

        <section className="grid gap-4 xl:grid-cols-[1.02fr_0.98fr]">
          <DashboardMiniChart
            rows={[
              { label: "Renda fixa e extras", value: peopleIncome, barClass: "bg-success" },
              { label: "Entradas variaveis", value: entriesTotal, barClass: "bg-info" },
              { label: "Contas abertas", value: openDebtTotal, barClass: "bg-danger" },
              { label: "Capital", value: capitalTotal, barClass: "bg-income" },
            ]}
          />

          <ReadOnlyLedgerSummary
            title="Entradas em destaque"
            description="Ultimos ganhos conforme os filtros globais do dashboard."
            rows={dashboardEntries.slice(0, 5).map((item) => ({
              ...item,
              subtitle: `${getPersonName(dashboardData.people, item.personId)} - ${item.month}`,
            }))}
            emptyMessage="Nenhuma entrada encontrada para os filtros atuais."
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.98fr_1.02fr]">
          <ReadOnlyLedgerSummary
            title="Capital filtrado"
            description="Snapshot patrimonial somente leitura com base nos filtros aplicados."
            rows={dashboardCapital.slice(0, 5).map((item) => ({
              id: item.id,
              label: item.label,
              category: item.category,
              subtitle: `${getPersonName(dashboardData.people, item.personId)} - ${item.month}`,
              value: item.value,
            }))}
            emptyMessage="Nenhum item de capital no recorte atual."
          />

          <ReadOnlyLedgerSummary
            title="Investimentos filtrados"
            description="Visual rapido dos ativos acompanhados no periodo."
            rows={dashboardInvestments.slice(0, 5).map((item) => ({
              id: item.id,
              label: item.name,
              category: item.category,
              subtitle: `${getPersonName(dashboardData.people, item.personId)} - rendimento ${item.yield}`,
              value: item.value,
            }))}
            emptyMessage="Nenhum investimento corresponde aos filtros atuais."
          />
        </section>

        <DebtsTable
          rows={dashboardDebts}
          people={dashboardData.people}
          selectedPersonId={dashboardData.selectedPersonId}
          readOnly
          title="Contas no resumo"
          description="Tabela somente leitura respeitando os filtros globais do dashboard."
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-shell font-body text-copy">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-24 top-[-80px] h-72 w-72 rounded-full bg-info/15 blur-3xl" />
        <div className="absolute bottom-[-120px] right-[-80px] h-80 w-80 rounded-full bg-success/10 blur-3xl" />
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-[1540px] gap-4 px-3 py-4 md:grid-cols-[290px_minmax(0,1fr)] md:px-4">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          currentUser={currentUser}
          currentView={dashboardData.currentView}
          onNavigate={handleNavigate}
          selectedPersonName={selectedPersonName}
          syncStatus={syncStatus}
          onLogout={logoutCurrentUser}
          onNavigateSettings={handleNavigateSettings}
        />

        <main className="min-w-0 space-y-4">
          <HeaderPanel
            title={viewTitles[dashboardData.currentView]}
            description={viewDescriptions[dashboardData.currentView]}
            statusNote={statusNote}
            controls={headerControls}
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
