import { CalendarPlus, Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatCurrency } from "../utils";

function emptyForm(selectedPersonId) {
  return {
    id: "",
    personId: selectedPersonId,
    name: "",
    category: "Contas recorrentes",
    value: "",
    dueDay: "10",
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
  onGenerateMonth,
  onNotify,
}) {
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(() => emptyForm(selectedPersonId));
  const total = useMemo(
    () => rows.filter((row) => row.active).reduce((sum, row) => sum + Number(row.value || 0), 0),
    [rows]
  );

  useEffect(() => {
    if (!editingId) setForm((current) => ({ ...current, personId: selectedPersonId || current.personId }));
  }, [editingId, selectedPersonId]);

  function resetForm() {
    setEditingId("");
    setForm(emptyForm(selectedPersonId));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const payload = {
      ...form,
      name: form.name.trim(),
      category: form.category.trim() || "Contas recorrentes",
      value: Number(String(form.value).replace(",", ".")),
      dueDay: Number(form.dueDay),
    };
    if (!payload.personId || !payload.name || !Number.isFinite(payload.value) || payload.value <= 0) {
      onNotify?.("Preencha pessoa, nome e valor valido para a conta recorrente.");
      return;
    }
    if (editingId) {
      onUpdate(payload);
      onNotify?.(`Conta recorrente "${payload.name}" atualizada.`);
    } else {
      onAdd(payload);
      onNotify?.(`Conta recorrente "${payload.name}" cadastrada.`);
    }
    resetForm();
  }

  return (
    <section className="premium-panel rounded-[22px] p-4 sm:p-5">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="font-display text-[1.9rem] font-bold text-white">Contas recorrentes</h3>
          <p className="mt-1 text-base text-copy/78">Cadastre despesas mensais e gere as contas do mes quando quiser.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-copy/70">
            Mensal ativo: <strong className="text-white">{formatCurrency(total)}</strong>
          </div>
          <button
            type="button"
            onClick={() => onGenerateMonth(currentMonth)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-info/35 bg-info/15 px-4 py-3 text-sm font-semibold text-[#dcebff]"
          >
            <CalendarPlus className="h-4 w-4" />
            Gerar mes
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-[150px_minmax(180px,1fr)_150px_110px_100px_105px_auto_auto]">
        <select value={form.personId} onChange={(event) => setForm((current) => ({ ...current, personId: event.target.value }))} className="field-control">
          {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
        </select>
        <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Nome" className="field-control" />
        <input value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} placeholder="Categoria" className="field-control" />
        <input value={form.value} onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))} placeholder="Valor" className="field-control" />
        <input type="number" min="1" max="31" value={form.dueDay} onChange={(event) => setForm((current) => ({ ...current, dueDay: event.target.value }))} className="field-control" />
        <label className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[#0b1220] px-3 py-3 text-sm text-copy/80">
          <input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} />
          Ativa
        </label>
        <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-success/30 bg-success/15 px-4 py-3 text-sm font-semibold text-success">
          <Plus className="h-4 w-4" />
          {editingId ? "Salvar" : "Adicionar"}
        </button>
        <button type="button" onClick={resetForm} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-copy/80">
          <X className="h-4 w-4" />
          Limpar
        </button>
      </form>

      <div className="mt-5 overflow-hidden rounded-[22px] border border-white/10 bg-black/10">
        {rows.length ? rows.map((row) => (
          <div key={row.id} className="grid gap-3 border-b border-white/10 px-4 py-4 text-sm text-copy/90 last:border-b-0 lg:grid-cols-[150px_minmax(0,1fr)_150px_90px_110px_auto] lg:items-center">
            <span>{people.find((person) => person.id === row.personId)?.name || "Pessoa"}</span>
            <strong className="text-white">{row.name}</strong>
            <span>{row.category}</span>
            <span>Dia {row.dueDay}</span>
            <span className={row.active ? "text-success" : "text-copy/55"}>{row.active ? "Ativa" : "Pausada"}</span>
            <div className="flex gap-2 lg:justify-end">
              <button type="button" onClick={() => { setEditingId(row.id); setForm({ ...row, value: String(row.value), dueDay: String(row.dueDay) }); }} className="inline-flex rounded-xl border border-white/10 bg-white/5 p-2 text-copy/70" aria-label={`Editar ${row.name}`}>
                <Pencil className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => onRemove(row.id)} className="inline-flex rounded-xl border border-danger/30 bg-danger/10 p-2 text-danger" aria-label={`Remover ${row.name}`}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        )) : <p className="px-4 py-5 text-sm text-copy/65">Nenhuma conta recorrente cadastrada.</p>}
      </div>
    </section>
  );
}
