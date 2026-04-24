import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { formatCurrency } from "../utils";

function LedgerRow({ label, value }) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-b border-white/10 px-4 py-3 text-sm text-copy/90 last:border-b-0">
      <span className="truncate">{label}</span>
      <strong className="font-semibold text-white">{formatCurrency(value)}</strong>
    </li>
  );
}

export function EntriesPanel({ rows, onAddEntry, onNotify }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ description: "", value: "" });
  const total = rows.reduce((sum, row) => sum + Number(row.value || 0), 0);

  function handleSubmit(event) {
    event.preventDefault();
    const description = form.description.trim();
    const value = Number(String(form.value).replace(",", "."));
    console.log("[dashboard] Entry save clicked", { description, value });
    if (!description || !Number.isFinite(value) || value <= 0) {
      console.warn("[dashboard] Invalid entry payload", form);
      onNotify?.("Preencha descricao e valor valido para adicionar a entrada.");
      return;
    }

    onAddEntry({ description, value });
    setForm({ description: "", value: "" });
    setShowForm(false);
  }

  return (
    <section className="premium-panel rounded-[28px] p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h3 className="font-display text-[1.8rem] font-bold text-white">Entradas & Ganhos</h3>
          <p className="mt-1 text-base text-copy/80">
            Total renda extra: <strong className="text-white">{formatCurrency(total)}</strong>
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            console.log("[dashboard] Entry toggle clicked", { open: !showForm });
            setShowForm((current) => !current);
          }}
          className="hidden rounded-2xl border border-cyan-300/25 bg-cyan-400/15 px-4 py-2 text-sm font-semibold text-cyan-200 sm:inline-flex"
        >
          {showForm ? "Fechar" : "Adicionar entrada"}
        </button>
      </div>

      {showForm ? (
        <form onSubmit={handleSubmit} className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto_auto]">
          <input
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            placeholder="Descricao da entrada"
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
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-300/25 bg-cyan-400/15 px-4 py-3 text-sm font-semibold text-cyan-200"
          >
            <Plus className="h-4 w-4" />
            Salvar
          </button>
          <button
            type="button"
            onClick={() => {
              console.log("[dashboard] Entry cancel clicked");
              setForm({ description: "", value: "" });
              setShowForm(false);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-copy/80"
          >
            <X className="h-4 w-4" />
            Cancelar
          </button>
        </form>
      ) : null}

      <div className="overflow-hidden rounded-[22px] border border-white/10 bg-black/10">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 bg-white/10 px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-copy/70">
          <span>Renda Extra</span>
          <span>Valor</span>
        </div>
        <ul>
          {rows.map((row) => (
            <LedgerRow key={row.id} label={row.label} value={row.value} />
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={() => {
          console.log("[dashboard] Entry footer toggle clicked", { open: !showForm });
          setShowForm((current) => !current);
        }}
        className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-cyan-300/25 bg-cyan-400/15 px-4 py-2 text-sm font-semibold text-cyan-200"
      >
        <Plus className="h-4 w-4" />
        {showForm ? "Fechar entrada" : "Adicionar entrada"}
      </button>
    </section>
  );
}

export function LeisurePanel({ rows, form, setForm, onSubmit, onClear }) {
  return (
    <section className="premium-panel rounded-[28px] p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h3 className="font-display text-[1.8rem] font-bold text-white">Lazer</h3>
        <button
          type="button"
          onClick={() => {
            console.log("[dashboard] Leisure clear clicked", { rows: rows.length });
            onClear();
          }}
          className="inline-flex items-center gap-2 rounded-2xl border border-action/40 bg-action/80 px-4 py-2 text-sm font-semibold text-[#231400]"
        >
          <Trash2 className="h-4 w-4" />
          Limpar
        </button>
      </div>

      <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto]">
        <input
          value={form.description}
          onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          placeholder="Descricao do lazer"
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
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-action/40 bg-action px-4 py-3 text-sm font-semibold text-[#231400]"
        >
          <Plus className="h-4 w-4" />
          Adicionar
        </button>
      </form>

      <p className="mt-4 text-base text-copy/78">Total lazer adicionados por mes:</p>

      <div className="mt-4 overflow-hidden rounded-[22px] border border-white/10 bg-black/10">
        <ul>
          {rows.map((row) => (
            <LedgerRow key={row.id} label={row.label} value={row.value} />
          ))}
        </ul>
      </div>
    </section>
  );
}
