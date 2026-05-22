import { formatCurrency } from "../utils";

export default function UpcomingBillsCard({ rows, emptyMessage = "Nenhuma conta aberta no filtro atual." }) {
  return (
    <div className="grid gap-2">
      {rows.length ? (
        rows.map((row) => (
          <div
            key={row.id}
            className={`grid gap-3 rounded-2xl border px-4 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_120px_95px] sm:items-center ${
              row.status === "late" ? "border-danger/35 bg-danger/10" : "border-white/10 bg-white/[0.04]"
            }`}
          >
            <div className="min-w-0">
              <p className="truncate font-semibold text-white">{row.name}</p>
              <p className="text-xs text-copy/60">Vence em {row.dueDate}</p>
            </div>
            <span className="text-copy/75">{row.category}</span>
            <strong className="text-white sm:text-right">{formatCurrency(row.value)}</strong>
          </div>
        ))
      ) : (
        <p className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-5 text-sm text-copy/65">
          {emptyMessage}
        </p>
      )}
    </div>
  );
}
