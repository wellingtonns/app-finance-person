import { useEffect, useState } from "react";
import { CalendarDays, Plus, Settings2, Trash2, X } from "lucide-react";
import { formatCurrency } from "../utils";

const statusClasses = {
  paid: "bg-success/20 text-success border-success/30",
  open: "bg-action/20 text-[#ffd57d] border-action/30",
  late: "bg-danger/20 text-danger border-danger/30",
};

const statusLabels = {
  all: "Todas",
  paid: "Pagas",
  open: "A vencer",
  late: "Atrasadas",
};

function normalizeMonth(value) {
  if (!value || !/\d{2}\/\d{1,2}\/\d{4}/.test(value)) return "";
  const [, month, year] = value.split("/");
  return `${year}-${month.padStart(2, "0")}`;
}

export default function DebtsTable({
  rows,
  people,
  selectedPerson,
  onAddDebt,
  onRemoveDebt,
  onNotify,
}) {
  const [personFilter, setPersonFilter] = useState("selected");
  const [statusFilter, setStatusFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("");
  const [showMonthFilter, setShowMonthFilter] = useState(false);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [form, setForm] = useState({
    person: selectedPerson,
    name: "",
    value: "",
    dueDate: "",
    status: "open",
  });

  useEffect(() => {
    setForm((current) => ({ ...current, person: selectedPerson }));
  }, [selectedPerson]);

  const filteredRows = rows.filter((row) => {
    if (personFilter === "selected" && row.person !== selectedPerson) return false;
    if (personFilter !== "selected" && personFilter !== "all" && row.person !== personFilter) return false;
    if (statusFilter !== "all" && row.status !== statusFilter) return false;
    if (monthFilter && normalizeMonth(row.dueDate) !== monthFilter) return false;
    return true;
  });

  const totalMonth = filteredRows.reduce((sum, row) => sum + row.value, 0);
  const paidMonth = filteredRows
    .filter((row) => row.status === "paid")
    .reduce((sum, row) => sum + row.value, 0);
  const lateMonth = filteredRows
    .filter((row) => row.status === "late")
    .reduce((sum, row) => sum + row.value, 0);
  const openMonth = filteredRows
    .filter((row) => row.status === "open")
    .reduce((sum, row) => sum + row.value, 0);
  const totalGeneral = rows.reduce((sum, row) => sum + row.value, 0);

  const totals = [
    { id: "total-month", label: "Total filtrado", value: formatCurrency(totalMonth) },
    { id: "total-general", label: "Total geral", value: formatCurrency(totalGeneral) },
    { id: "paid-month", label: "Total pagas", value: formatCurrency(paidMonth) },
    { id: "late-month", label: "Total em atraso", value: formatCurrency(lateMonth) },
    { id: "open-month", label: "Total em aberto", value: formatCurrency(openMonth) },
  ];

  function resetFilters() {
    console.log("[dashboard] Debt filters cleared");
    setPersonFilter("selected");
    setStatusFilter("all");
    setMonthFilter("");
    setShowMonthFilter(false);
  }

  function handleSubmit(event) {
    event.preventDefault();
    const name = form.name.trim();
    const value = Number(String(form.value).replace(",", "."));
    console.log("[dashboard] Debt save clicked", { ...form, value });
    if (!name || !Number.isFinite(value) || value <= 0 || !form.person) {
      console.warn("[dashboard] Invalid debt payload", form);
      onNotify?.("Preencha pessoa, nome e valor valido para salvar a conta.");
      return;
    }

    onAddDebt({
      person: form.person,
      name,
      value,
      dueDate: form.dueDate ? form.dueDate.split("-").reverse().join("/") : "A vencer",
      status: form.status,
      statusLabel: statusLabels[form.status],
      delay: form.status === "late" ? 3 : 0,
    });

    setForm({
      person: selectedPerson,
      name: "",
      value: "",
      dueDate: "",
      status: "open",
    });
    setShowAccountForm(false);
  }

  return (
    <section className="premium-panel rounded-[30px] p-5 sm:p-6">
      <h3 className="font-display text-[2rem] font-bold text-white">Dividas</h3>

      <div className="mt-4 grid gap-3 xl:grid-cols-[190px_170px_170px_1fr_auto_auto]">
        <select
          value={personFilter}
          onChange={(event) => setPersonFilter(event.target.value)}
          className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-sm text-white outline-none"
        >
          <option value="selected">Pessoa selecionada</option>
          <option value="all">Todas as pessoas</option>
          {people.map((person) => (
            <option key={person} value={person}>
              {person}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-sm text-white outline-none"
        >
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            console.log("[dashboard] Debt month filter toggle clicked", { open: !showMonthFilter });
            setShowMonthFilter((current) => !current);
          }}
          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-sm text-copy/80"
        >
          <CalendarDays className="h-4 w-4 text-info" />
          {monthFilter ? monthFilter : "Mes"}
        </button>
        <div className="flex items-center justify-end text-sm text-copy/65">
          {filteredRows.length} conta(s) no filtro atual
        </div>
        <button
          type="button"
          onClick={() => {
            console.log("[dashboard] Debt manager toggle clicked", { open: !showAccountForm });
            setShowAccountForm((current) => !current);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-info/35 bg-info/15 px-4 py-3 text-sm font-semibold text-[#dcebff]"
        >
          <Settings2 className="h-4 w-4" />
          {showAccountForm ? "Fechar" : "Gerenciar contas"}
        </button>
        <button
          type="button"
          onClick={resetFilters}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger"
        >
          <Trash2 className="h-4 w-4" />
          Limpar filtros
        </button>
      </div>

      {showMonthFilter ? (
        <div className="mt-4 flex max-w-[220px] items-center gap-3">
          <input
            type="month"
            value={monthFilter}
            onChange={(event) => setMonthFilter(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-sm text-white outline-none"
          />
          <button
            type="button"
            onClick={() => {
              console.log("[dashboard] Debt month filter cleared");
              setMonthFilter("");
            }}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-copy/70"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {showAccountForm ? (
        <form onSubmit={handleSubmit} className="mt-4 grid gap-3 xl:grid-cols-[170px_minmax(0,1fr)_140px_170px_150px_auto]">
          <select
            value={form.person}
            onChange={(event) => setForm((current) => ({ ...current, person: event.target.value }))}
            className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-sm text-white outline-none"
          >
            {people.map((person) => (
              <option key={person} value={person}>
                {person}
              </option>
            ))}
          </select>
          <input
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Nome da conta"
            className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-sm text-white outline-none"
          />
          <input
            value={form.value}
            onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))}
            placeholder="Valor"
            className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-sm text-white outline-none"
          />
          <input
            type="date"
            value={form.dueDate}
            onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))}
            className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-sm text-white outline-none"
          />
          <select
            value={form.status}
            onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
            className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-sm text-white outline-none"
          >
            <option value="open">A vencer</option>
            <option value="paid">Paga</option>
            <option value="late">Atrasada</option>
          </select>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-info/35 bg-info/20 px-4 py-3 text-sm font-semibold text-[#dcebff]"
          >
            <Plus className="h-4 w-4" />
            Salvar conta
          </button>
        </form>
      ) : null}

      <div className="mt-5 overflow-x-auto rounded-[24px] border border-white/10 bg-black/10">
        <table className="min-w-[880px] w-full border-collapse">
          <thead>
            <tr className="bg-white/10 text-left text-sm uppercase tracking-[0.14em] text-copy/70">
              <th className="px-4 py-3">Pessoa</th>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Vencimento</th>
              <th className="px-4 py-3">Atraso</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.id} className="border-t border-white/10 text-[15px] text-copy/90">
                <td className="px-4 py-3">{row.person}</td>
                <td className="px-4 py-3">{row.name}</td>
                <td className="px-4 py-3 font-semibold text-white">{formatCurrency(row.value)}</td>
                <td className="px-4 py-3">{row.dueDate}</td>
                <td className="px-4 py-3">{row.delay}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${statusClasses[row.status]}`}
                  >
                    {row.statusLabel}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => {
                      console.log("[dashboard] Debt remove clicked", row);
                      onRemoveDebt(row.id);
                    }}
                    className="inline-flex rounded-xl border border-white/10 bg-white/5 p-2 text-copy/70"
                    aria-label={`Remover conta ${row.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {totals.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-white/10 bg-[#1a2232] px-4 py-4 text-base text-copy/80"
          >
            {item.label}: <strong className="text-white">{item.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
