import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Pencil, Plus, Settings2, Trash2, X } from "lucide-react";
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

function defaultForm(selectedPersonId) {
  return {
    id: "",
    personId: selectedPersonId,
    name: "",
    category: "",
    value: "",
    dueDate: "",
    month: new Date().toISOString().slice(0, 7),
    status: "open",
  };
}

function DebtForm({
  form,
  setForm,
  people,
  editingId,
  onSubmit,
  onCancel,
}) {
  return (
    <form onSubmit={onSubmit} className="mt-4 grid gap-3 xl:grid-cols-[170px_minmax(0,1fr)_150px_140px_170px_150px_auto_auto]">
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
        placeholder="Nome da conta"
        className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-sm text-white outline-none"
      />
      <input
        value={form.category}
        onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
        placeholder="Categoria"
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
        onChange={(event) =>
          setForm((current) => ({
            ...current,
            dueDate: event.target.value,
            month: event.target.value ? event.target.value.slice(0, 7) : current.month,
          }))
        }
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
        {editingId ? "Salvar" : "Adicionar"}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-copy/80"
      >
        <X className="h-4 w-4" />
        Limpar
      </button>
    </form>
  );
}

export default function DebtsTable({
  rows,
  people,
  selectedPersonId,
  onAddDebt,
  onUpdateDebt,
  onRemoveDebt,
  onNotify,
  readOnly = false,
  title = "Contas e dividas",
  description = "Gerencie vencimentos, pagamentos e atrasos por pessoa.",
}) {
  const [personFilter, setPersonFilter] = useState("selected");
  const [statusFilter, setStatusFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("");
  const [showMonthFilter, setShowMonthFilter] = useState(false);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [form, setForm] = useState(() => defaultForm(selectedPersonId));
  const [editingId, setEditingId] = useState("");

  useEffect(() => {
    setForm((current) => ({ ...current, personId: selectedPersonId || current.personId }));
  }, [selectedPersonId]);

  const filteredRows = useMemo(() => {
    if (readOnly) return rows;
    return rows.filter((row) => {
      if (personFilter === "selected" && row.personId !== selectedPersonId) return false;
      if (personFilter !== "selected" && personFilter !== "all" && row.personId !== personFilter) return false;
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (monthFilter && row.month !== monthFilter) return false;
      return true;
    });
  }, [monthFilter, personFilter, readOnly, rows, selectedPersonId, statusFilter]);

  const totals = useMemo(() => {
    const total = filteredRows.reduce((sum, row) => sum + row.value, 0);
    const paid = filteredRows.filter((row) => row.status === "paid").reduce((sum, row) => sum + row.value, 0);
    const late = filteredRows.filter((row) => row.status === "late").reduce((sum, row) => sum + row.value, 0);
    const open = filteredRows.filter((row) => row.status === "open").reduce((sum, row) => sum + row.value, 0);
    return { total, paid, late, open };
  }, [filteredRows]);

  function resetFilters() {
    console.log("[dashboard] Debt filters cleared");
    setPersonFilter("selected");
    setStatusFilter("all");
    setMonthFilter("");
    setShowMonthFilter(false);
  }

  function resetForm() {
    setEditingId("");
    setForm(defaultForm(selectedPersonId));
  }

  function handleEdit(row) {
    console.log("[dashboard] Debt edit clicked", row);
    setEditingId(row.id);
    setShowAccountForm(true);
    setForm({
      id: row.id,
      personId: row.personId,
      name: row.name,
      category: row.category,
      value: String(row.value),
      dueDate: row.dueDate,
      month: row.month,
      status: row.status,
    });
  }

  function handleSubmit(event) {
    event.preventDefault();
    const payload = {
      id: form.id,
      personId: form.personId,
      name: form.name.trim(),
      category: form.category.trim() || "Contas",
      value: Number(String(form.value).replace(",", ".")),
      dueDate: form.dueDate,
      month: form.dueDate ? form.dueDate.slice(0, 7) : form.month,
      status: form.status,
    };
    console.log("[dashboard] Debt save clicked", payload);
    if (!payload.name || !payload.personId || !Number.isFinite(payload.value) || payload.value <= 0) {
      console.warn("[dashboard] Invalid debt payload", payload);
      onNotify?.("Preencha pessoa, conta e valor valido para salvar.");
      return;
    }

    if (editingId) {
      onUpdateDebt?.(payload);
      onNotify?.(`Conta "${payload.name}" atualizada.`);
    } else {
      onAddDebt?.(payload);
      onNotify?.(`Conta "${payload.name}" adicionada.`);
    }
    resetForm();
    setShowAccountForm(false);
  }

  return (
    <section className="premium-panel rounded-[30px] p-5 sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="font-display text-[2rem] font-bold text-white">{title}</h3>
          <p className="mt-1 text-base text-copy/78">{description}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-copy/70">
          Total visivel: <strong className="text-white">{formatCurrency(totals.total)}</strong>
        </div>
      </div>

      {!readOnly ? (
        <>
          <div className="mt-4 grid gap-3 xl:grid-cols-[190px_170px_170px_1fr_auto_auto]">
            <select
              value={personFilter}
              onChange={(event) => setPersonFilter(event.target.value)}
              className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-sm text-white outline-none"
            >
              <option value="selected">Pessoa selecionada</option>
              <option value="all">Todas as pessoas</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
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
              {monthFilter || "Mes"}
            </button>

            <div className="flex items-center justify-end text-sm text-copy/65">
              {filteredRows.length} conta(s) no filtro atual
            </div>

            <button
              type="button"
              onClick={() => {
                console.log("[dashboard] Debt manager toggle clicked", { open: !showAccountForm });
                setShowAccountForm((current) => !current);
                if (showAccountForm) resetForm();
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
            <DebtForm
              form={form}
              setForm={setForm}
              people={people}
              editingId={editingId}
              onSubmit={handleSubmit}
              onCancel={() => {
                console.log("[dashboard] Debt form cleared");
                resetForm();
              }}
            />
          ) : null}
        </>
      ) : null}

      <div className="mt-5 overflow-x-auto rounded-[24px] border border-white/10 bg-black/10">
        <table className="min-w-[880px] w-full border-collapse">
          <thead>
            <tr className="bg-white/10 text-left text-sm uppercase tracking-[0.14em] text-copy/70">
              <th className="px-4 py-3">Pessoa</th>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Vencimento</th>
              <th className="px-4 py-3">Status</th>
              {!readOnly ? <th className="px-4 py-3 text-right">Acoes</th> : null}
            </tr>
          </thead>
          <tbody>
            {filteredRows.length ? (
              filteredRows.map((row) => (
                <tr key={row.id} className="border-t border-white/10 text-[15px] text-copy/90">
                  <td className="px-4 py-3">{people.find((person) => person.id === row.personId)?.name || "Pessoa"}</td>
                  <td className="px-4 py-3">{row.name}</td>
                  <td className="px-4 py-3">{row.category}</td>
                  <td className="px-4 py-3 font-semibold text-white">{formatCurrency(row.value)}</td>
                  <td className="px-4 py-3">{row.dueDate}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${statusClasses[row.status]}`}
                    >
                      {row.statusLabel}
                    </span>
                  </td>
                  {!readOnly ? (
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(row)}
                          className="inline-flex rounded-xl border border-white/10 bg-white/5 p-2 text-copy/70"
                          aria-label={`Editar conta ${row.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            console.log("[dashboard] Debt remove clicked", row);
                            onRemoveDebt?.(row.id);
                          }}
                          className="inline-flex rounded-xl border border-danger/30 bg-danger/10 p-2 text-danger"
                          aria-label={`Remover conta ${row.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))
            ) : (
              <tr className="border-t border-white/10 text-[15px] text-copy/70">
                <td className="px-4 py-5" colSpan={readOnly ? 6 : 7}>
                  Nenhuma conta encontrada para o recorte atual.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-[#1a2232] px-4 py-4 text-base text-copy/80">
          Pagas: <strong className="text-white">{formatCurrency(totals.paid)}</strong>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#1a2232] px-4 py-4 text-base text-copy/80">
          Em aberto: <strong className="text-white">{formatCurrency(totals.open)}</strong>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#1a2232] px-4 py-4 text-base text-copy/80">
          Atrasadas: <strong className="text-white">{formatCurrency(totals.late)}</strong>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#1a2232] px-4 py-4 text-base text-copy/80">
          Registros: <strong className="text-white">{filteredRows.length}</strong>
        </div>
      </div>
    </section>
  );
}
