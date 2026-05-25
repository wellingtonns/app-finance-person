import { formatCurrency } from "../utils";

export default function DashboardChart({ income, debts, balance }) {
  const rows = [
    { label: "Entradas", value: income, color: "bg-success" },
    { label: "Saídas", value: debts, color: "bg-info" },
    { label: "Saldo", value: balance, color: "bg-[#9f6bff]" },
  ];
  const maxValue = Math.max(...rows.map((row) => Math.abs(row.value)), 1);

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-4 text-xs text-copy/70">
        {rows.map((row) => (
          <span key={row.label} className="inline-flex items-center gap-2">
            <span className={`h-1.5 w-5 rounded-full ${row.color}`} />
            {row.label}
          </span>
        ))}
      </div>
      <div className="grid gap-4">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-2 flex items-center justify-between text-sm text-copy/75">
              <span>{row.label}</span>
              <strong className="text-white">{formatCurrency(row.value)}</strong>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full ${row.color}`}
                style={{ width: `${Math.max(8, (Math.abs(row.value) / maxValue) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
