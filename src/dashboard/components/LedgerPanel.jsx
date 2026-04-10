import { Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "../utils";

function LedgerRow({ label, value }) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-b border-white/10 px-4 py-3 text-sm text-copy/90 last:border-b-0">
      <span className="truncate">{label}</span>
      <strong className="font-semibold text-white">{formatCurrency(value)}</strong>
    </li>
  );
}

export function EntriesPanel({ rows }) {
  return (
    <section className="premium-panel rounded-[28px] p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h3 className="font-display text-[1.8rem] font-bold text-white">Entradas & Ganhos</h3>
          <p className="mt-1 text-base text-copy/80">
            Total renda extra: <strong className="text-white">{formatCurrency(0)}</strong>
          </p>
        </div>
        <button
          type="button"
          className="hidden rounded-2xl border border-cyan-300/25 bg-cyan-400/15 px-4 py-2 text-sm font-semibold text-cyan-200 sm:inline-flex"
        >
          Adicionar entrada
        </button>
      </div>

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
        className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-cyan-300/25 bg-cyan-400/15 px-4 py-2 text-sm font-semibold text-cyan-200"
      >
        <Plus className="h-4 w-4" />
        Adicionar entrada
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
          onClick={onClear}
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
