import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { formatCurrency } from "../utils";

function EmptyState({ message }) {
  return <p className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-copy/65">{message}</p>;
}

function PersonSelect({ people, value, onChange }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-sm text-white outline-none"
    >
      {people.map((person) => (
        <option key={person.id} value={person.id}>
          {person.name}
        </option>
      ))}
    </select>
  );
}

function InlineActionButton({ icon: Icon, label, tone = "default", onClick, type = "button" }) {
  const toneMap = {
    default: "border-white/10 bg-white/5 text-copy/80",
    info: "border-info/35 bg-info/15 text-[#dcebff]",
    danger: "border-danger/30 bg-danger/10 text-danger",
    action: "border-action/40 bg-action text-[#231400]",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ${toneMap[tone]}`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function ReadonlyRow({ label, category, subtitle, value }) {
  return (
    <li className="grid gap-2 border-b border-white/10 px-4 py-3 text-sm text-copy/90 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_140px_auto] sm:items-center">
      <div className="min-w-0">
        <p className="truncate font-medium text-white">{label}</p>
        <p className="text-xs text-copy/60">{subtitle}</p>
      </div>
      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-copy/75">{category}</span>
      <strong className="font-semibold text-white sm:text-right">{formatCurrency(value)}</strong>
    </li>
  );
}

export function ReadOnlyLedgerSummary({ title, description, rows, emptyMessage }) {
  const total = rows.reduce((sum, row) => sum + Number(row.value || 0), 0);

  return (
    <section className="premium-panel rounded-[28px] p-5 sm:p-6">
      <div className="mb-4">
        <h3 className="font-display text-[1.8rem] font-bold text-white">{title}</h3>
        <p className="mt-1 text-base text-copy/78">{description}</p>
        <p className="mt-2 text-sm text-copy/65">
          Total filtrado: <strong className="text-white">{formatCurrency(total)}</strong>
        </p>
      </div>

      <div className="overflow-hidden rounded-[22px] border border-white/10 bg-black/10">
        <ul>
          {rows.length ? (
            rows.map((row) => (
              <ReadonlyRow
                key={row.id}
                label={row.label}
                category={row.category}
                subtitle={row.subtitle}
                value={row.value}
              />
            ))
          ) : (
            <li className="px-4 py-4">
              <EmptyState message={emptyMessage} />
            </li>
          )}
        </ul>
      </div>
    </section>
  );
}

function normalizeFormFromEntry(entry, selectedPersonId) {
  return {
    id: entry?.id || "",
    personId: entry?.personId || selectedPersonId,
    label: entry?.label || "",
    category: entry?.category || "",
    month: entry?.month || new Date().toISOString().slice(0, 7),
    value: entry?.value ? String(entry.value) : "",
  };
}

function EntryRow({ item, personName, onEdit, onRemove }) {
  return (
    <li className="grid gap-3 border-b border-white/10 px-4 py-4 text-sm text-copy/90 last:border-b-0 lg:grid-cols-[160px_minmax(0,1fr)_140px_110px_auto] lg:items-center">
      <div>
        <p className="font-semibold text-white">{personName}</p>
        <p className="text-xs text-copy/60">{item.month}</p>
      </div>
      <div className="min-w-0">
        <p className="truncate font-medium text-white">{item.label}</p>
        <p className="text-xs text-copy/60">{item.category}</p>
      </div>
      <strong className="font-semibold text-white">{formatCurrency(item.value)}</strong>
      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-center text-xs text-copy/75">
        {item.category}
      </span>
      <div className="flex gap-2 lg:justify-end">
        <button
          type="button"
          onClick={() => onEdit(item)}
          className="inline-flex rounded-xl border border-white/10 bg-white/5 p-2 text-copy/75"
          aria-label={`Editar entrada ${item.label}`}
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="inline-flex rounded-xl border border-danger/30 bg-danger/10 p-2 text-danger"
          aria-label={`Remover entrada ${item.label}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}

export function EntriesModule({
  rows,
  people,
  selectedPersonId,
  onAddEntry,
  onUpdateEntry,
  onRemoveEntry,
  onNotify,
}) {
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(() => normalizeFormFromEntry(null, selectedPersonId));
  const total = useMemo(() => rows.reduce((sum, row) => sum + Number(row.value || 0), 0), [rows]);

  useEffect(() => {
    if (!editingItem) {
      setForm((current) => ({ ...current, personId: selectedPersonId || current.personId }));
    }
  }, [editingItem, selectedPersonId]);

  function resetForm() {
    setEditingItem(null);
    setForm(normalizeFormFromEntry(null, selectedPersonId));
  }

  function handleEdit(item) {
    console.log("[dashboard] Entry edit clicked", item);
    setEditingItem(item);
    setForm(normalizeFormFromEntry(item, selectedPersonId));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const payload = {
      id: form.id,
      personId: form.personId,
      label: form.label.trim(),
      category: form.category.trim() || "Outros ganhos",
      month: form.month,
      value: Number(String(form.value).replace(",", ".")),
    };
    console.log("[dashboard] Entry save clicked", payload);
    if (!payload.label || !payload.personId || !Number.isFinite(payload.value) || payload.value <= 0) {
      console.warn("[dashboard] Invalid entry payload", payload);
      onNotify?.("Preencha pessoa, descricao e valor valido para salvar a entrada.");
      return;
    }

    if (editingItem) {
      onUpdateEntry(payload);
      onNotify?.(`Entrada "${payload.label}" atualizada.`);
    } else {
      onAddEntry(payload);
      onNotify?.(`Entrada "${payload.label}" adicionada.`);
    }
    resetForm();
  }

  return (
    <section className="premium-panel rounded-[28px] p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="font-display text-[1.9rem] font-bold text-white">Entradas e ganhos</h3>
          <p className="mt-1 text-base text-copy/78">Cadastre ganhos variaveis e acompanhe o total do mes.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-copy/70">
          Total do modulo: <strong className="text-white">{formatCurrency(total)}</strong>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-3 xl:grid-cols-[170px_minmax(0,1fr)_150px_140px_150px_auto_auto]">
        <PersonSelect
          people={people}
          value={form.personId}
          onChange={(event) => setForm((current) => ({ ...current, personId: event.target.value }))}
        />
        <input
          value={form.label}
          onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
          placeholder="Descricao da entrada"
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
        <InlineActionButton type="submit" icon={Plus} label={editingItem ? "Salvar" : "Adicionar"} tone="info" />
        <InlineActionButton icon={X} label="Limpar" onClick={resetForm} />
      </form>

      <div className="mt-5 overflow-hidden rounded-[22px] border border-white/10 bg-black/10">
        <ul>
          {rows.length ? (
            rows.map((item) => (
              <EntryRow
                key={item.id}
                item={item}
                personName={people.find((person) => person.id === item.personId)?.name || "Pessoa"}
                onEdit={handleEdit}
                onRemove={onRemoveEntry}
              />
            ))
          ) : (
            <li className="px-4 py-4">
              <EmptyState message="Nenhuma entrada cadastrada ainda." />
            </li>
          )}
        </ul>
      </div>
    </section>
  );
}

function LeisureRow({ item, personName, onEdit, onRemove }) {
  return (
    <li className="grid gap-3 border-b border-white/10 px-4 py-4 text-sm text-copy/90 last:border-b-0 lg:grid-cols-[160px_minmax(0,1fr)_140px_110px_auto] lg:items-center">
      <div>
        <p className="font-semibold text-white">{personName}</p>
        <p className="text-xs text-copy/60">{item.month}</p>
      </div>
      <div className="min-w-0">
        <p className="truncate font-medium text-white">{item.label}</p>
        <p className="text-xs text-copy/60">{item.category}</p>
      </div>
      <strong className="font-semibold text-white">{formatCurrency(item.value)}</strong>
      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-center text-xs text-copy/75">
        {item.category}
      </span>
      <div className="flex gap-2 lg:justify-end">
        <button
          type="button"
          onClick={() => onEdit(item)}
          className="inline-flex rounded-xl border border-white/10 bg-white/5 p-2 text-copy/75"
          aria-label={`Editar lazer ${item.label}`}
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="inline-flex rounded-xl border border-danger/30 bg-danger/10 p-2 text-danger"
          aria-label={`Remover lazer ${item.label}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}

export function LeisureModule({
  rows,
  people,
  selectedPersonId,
  onAddLeisure,
  onUpdateLeisure,
  onRemoveLeisure,
  onClearLeisure,
  onNotify,
}) {
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(() => normalizeFormFromEntry(null, selectedPersonId));

  useEffect(() => {
    if (!editingItem) {
      setForm((current) => ({ ...current, personId: selectedPersonId || current.personId }));
    }
  }, [editingItem, selectedPersonId]);

  function resetForm() {
    setEditingItem(null);
    setForm(normalizeFormFromEntry(null, selectedPersonId));
  }

  function handleEdit(item) {
    console.log("[dashboard] Leisure edit clicked", item);
    setEditingItem(item);
    setForm(normalizeFormFromEntry(item, selectedPersonId));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const payload = {
      id: form.id,
      personId: form.personId,
      label: form.label.trim(),
      category: form.category.trim() || "Lazer",
      month: form.month,
      value: Number(String(form.value).replace(",", ".")),
    };
    console.log("[dashboard] Leisure save clicked", payload);
    if (!payload.label || !payload.personId || !Number.isFinite(payload.value) || payload.value <= 0) {
      console.warn("[dashboard] Invalid leisure payload", payload);
      onNotify?.("Preencha pessoa, descricao e valor valido para salvar o lazer.");
      return;
    }

    if (editingItem) {
      onUpdateLeisure(payload);
      onNotify?.(`Lazer "${payload.label}" atualizado.`);
    } else {
      onAddLeisure(payload);
      onNotify?.(`Lazer "${payload.label}" adicionado.`);
    }
    resetForm();
  }

  return (
    <section className="premium-panel rounded-[28px] p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="font-display text-[1.9rem] font-bold text-white">Lazer planejado</h3>
          <p className="mt-1 text-base text-copy/78">Organize gastos de lazer sem poluir o dashboard principal.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <InlineActionButton
            icon={Trash2}
            label="Limpar"
            tone="danger"
            onClick={() => {
              console.log("[dashboard] Leisure clear clicked", { rows: rows.length });
              onClearLeisure();
              resetForm();
            }}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-3">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[170px_minmax(0,1fr)_150px_140px_150px]">
          <PersonSelect
            people={people}
            value={form.personId}
            onChange={(event) => setForm((current) => ({ ...current, personId: event.target.value }))}
          />
          <input
            value={form.label}
            onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
            placeholder="Descricao do lazer"
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
        </div>

        <div className="flex flex-wrap gap-3 md:justify-end">
          <InlineActionButton type="submit" icon={Plus} label={editingItem ? "Salvar" : "Adicionar"} tone="action" />
          <InlineActionButton icon={X} label="Limpar" onClick={resetForm} />
        </div>
      </form>

      <div className="mt-5 overflow-hidden rounded-[22px] border border-white/10 bg-black/10">
        <ul>
          {rows.length ? (
            rows.map((item) => (
              <LeisureRow
                key={item.id}
                item={item}
                personName={people.find((person) => person.id === item.personId)?.name || "Pessoa"}
                onEdit={handleEdit}
                onRemove={onRemoveLeisure}
              />
            ))
          ) : (
            <li className="px-4 py-4">
              <EmptyState message="Nenhum lazer planejado no momento." />
            </li>
          )}
        </ul>
      </div>
    </section>
  );
}
