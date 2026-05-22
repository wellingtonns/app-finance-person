import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatCurrency } from "../utils";

function emptyForm(selectedPersonId, currentMonth) {
  return {
    id: "",
    personId: selectedPersonId,
    name: "",
    category: "Contas recorrentes",
    value: "",
    dueDay: "10",
    startMonth: currentMonth,
    repeatMonths: "1",
    active: true,
  };
}

export default function RecurringBillsPanel({
  rows,
  people,
  selectedPersonId,
  currentMonth,
  onAdd,
  onUpdate,
  onRemove,
  onNotify,
}) {
  const [editingId, setEditingId] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(() => emptyForm(selectedPersonId, currentMonth));
  const total = useMemo(
    () => rows.filter((row) => row.active).reduce((sum, row) => sum + Number(row.value || 0), 0),
    [rows]
  );

  useEffect(() => {
    if (!editingId) {
      setForm((current) => ({
        ...current,
        personId: selectedPersonId || current.personId,
        startMonth: currentMonth || current.startMonth,
      }));
    }
  }, [currentMonth, editingId, selectedPersonId]);

  function resetForm() {
    setEditingId("");
    setForm(emptyForm(selectedPersonId, currentMonth));
  }

  function closeModal() {
    resetForm();
    setModalOpen(false);
  }

  function openAddModal() {
    resetForm();
    setModalOpen(true);
  }

  function openEditModal(row) {
    setEditingId(row.id);
    setForm({
      ...row,
      value: String(row.value),
      dueDay: String(row.dueDay),
      startMonth: row.startMonth || currentMonth,
      repeatMonths: String(row.repeatMonths || 1),
    });
    setModalOpen(true);
  }

  function handleSubmit(event) {
    event.preventDefault();
    const payload = {
      ...form,
      name: form.name.trim(),
      category: form.category.trim() || "Contas recorrentes",
      value: Number(String(form.value).replace(",", ".")),
      dueDay: Number(form.dueDay),
      startMonth: form.startMonth || currentMonth,
      repeatMonths: Number(form.repeatMonths),
    };
    if (!payload.personId || !payload.name || !Number.isFinite(payload.value) || payload.value <= 0) {
      onNotify?.("Preencha pessoa, nome e valor valido para a conta recorrente.");
      return;
    }
    if (!Number.isFinite(payload.repeatMonths) || payload.repeatMonths < 1) {
      onNotify?.("Informe por quantos meses essa conta deve repetir.");
      return;
    }
    if (editingId) {
      onUpdate(payload);
      onNotify?.(`Conta recorrente "${payload.name}" atualizada.`);
    } else {
      onAdd(payload);
      onNotify?.(`Conta recorrente "${payload.name}" cadastrada e gerada por ${payload.repeatMonths} mes(es).`);
    }
    closeModal();
  }

  return (
    <section className="premium-panel rounded-[22px] p-4 sm:p-5">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="font-display text-[1.9rem] font-bold text-white">Contas recorrentes</h3>
          <p className="mt-1 text-base text-copy/78">
            Contas fixas cadastradas ficam aqui. Ao adicionar, os meses escolhidos sao criados automaticamente.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-copy/70">
            Mensal ativo: <strong className="text-white">{formatCurrency(total)}</strong>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-success/30 bg-success/15 px-4 py-3 text-sm font-semibold text-success"
          >
            <Plus className="h-4 w-4" />
            Adicionar conta
          </button>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-[22px] border border-white/10 bg-black/10">
        {rows.length ? rows.map((row) => (
          <div key={row.id} className="grid gap-3 border-b border-white/10 px-4 py-4 text-sm text-copy/90 last:border-b-0 lg:grid-cols-[150px_minmax(0,1fr)_150px_90px_90px_110px_auto] lg:items-center">
            <span>{people.find((person) => person.id === row.personId)?.name || "Pessoa"}</span>
            <strong className="text-white">{row.name}</strong>
            <span>{row.category}</span>
            <span>Dia {row.dueDay}</span>
            <span>{row.repeatMonths || 1} mes(es)</span>
            <span className={row.active ? "text-success" : "text-copy/55"}>{row.active ? "Ativa" : "Pausada"}</span>
            <div className="flex gap-2 lg:justify-end">
              <button type="button" onClick={() => openEditModal(row)} className="inline-flex rounded-xl border border-white/10 bg-white/5 p-2 text-copy/70" aria-label={`Editar ${row.name}`}>
                <Pencil className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => onRemove(row.id)} className="inline-flex rounded-xl border border-danger/30 bg-danger/10 p-2 text-danger" aria-label={`Remover ${row.name}`}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        )) : <p className="px-4 py-5 text-sm text-copy/65">Nenhuma conta recorrente cadastrada.</p>}
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[24px] border border-white/12 bg-[#101826] p-4 shadow-2xl shadow-black/40 sm:p-5">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h4 className="font-display text-[1.45rem] font-bold text-white">
                  {editingId ? "Editar conta recorrente" : "Adicionar conta recorrente"}
                </h4>
                <p className="mt-1 text-sm text-copy/65">
                  Informe os dados da conta fixa e quantos meses devem ser criados.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex rounded-xl border border-white/10 bg-white/5 p-2 text-copy/70"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2 text-xs uppercase tracking-[0.14em] text-copy/55">
                  Pessoa
                  <select
                    value={form.personId}
                    onChange={(event) => setForm((current) => ({ ...current, personId: event.target.value }))}
                    className="field-control"
                  >
                    {people.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-xs uppercase tracking-[0.14em] text-copy/55">
                  Nome
                  <input
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Ex: Aluguel, Internet, Cartao"
                    className="field-control"
                  />
                </label>
                <label className="grid gap-2 text-xs uppercase tracking-[0.14em] text-copy/55">
                  Categoria
                  <input
                    value={form.category}
                    onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                    placeholder="Categoria"
                    className="field-control"
                  />
                </label>
                <label className="grid gap-2 text-xs uppercase tracking-[0.14em] text-copy/55">
                  Valor
                  <input
                    value={form.value}
                    onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))}
                    placeholder="0,00"
                    className="field-control"
                  />
                </label>
                <label className="grid gap-2 text-xs uppercase tracking-[0.14em] text-copy/55">
                  Dia do vencimento
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={form.dueDay}
                    onChange={(event) => setForm((current) => ({ ...current, dueDay: event.target.value }))}
                    className="field-control"
                  />
                </label>
                <label className="grid gap-2 text-xs uppercase tracking-[0.14em] text-copy/55">
                  Mes inicial
                  <input
                    type="month"
                    value={form.startMonth}
                    onChange={(event) => setForm((current) => ({ ...current, startMonth: event.target.value }))}
                    className="field-control"
                  />
                </label>
                <label className="grid gap-2 text-xs uppercase tracking-[0.14em] text-copy/55">
                  Repetir por meses
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={form.repeatMonths}
                    onChange={(event) => setForm((current) => ({ ...current, repeatMonths: event.target.value }))}
                    className="field-control"
                  />
                </label>
                <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-sm text-copy/80">
                  Conta ativa
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}
                  />
                </label>
              </div>

              <div className="mt-2 flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-copy/80"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-success/30 bg-success/15 px-4 py-3 text-sm font-semibold text-success"
                >
                  <Plus className="h-4 w-4" />
                  {editingId ? "Salvar" : "Adicionar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
