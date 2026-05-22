import { formatCurrency } from "../utils";

export default function CategoryChart({ categories }) {
  const safeCategories = categories.length ? categories : [{ label: "Sem gastos", value: 1 }];
  const total = safeCategories.reduce((sum, item) => sum + item.value, 0) || 1;
  let cursor = 0;
  const colors = ["#2f7cff", "#35c981", "#f5b72f", "#9b5cf6", "#30afd7", "#8da3bf"];
  const gradient = safeCategories
    .map((item, index) => {
      const start = cursor;
      const size = (item.value / total) * 100;
      cursor += size;
      return `${colors[index % colors.length]} ${start}% ${cursor}%`;
    })
    .join(", ");

  return (
    <div className="grid gap-5 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center">
      <div
        className="mx-auto flex h-44 w-44 items-center justify-center rounded-full"
        style={{ background: `conic-gradient(${gradient})` }}
      >
        <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-[#09111e] text-center shadow-panel">
          <strong className="text-white">{formatCurrency(categories.length ? total : 0)}</strong>
          <span className="text-xs text-copy/60">Total</span>
        </div>
      </div>
      <div className="grid gap-3">
        {safeCategories.map((item, index) => (
          <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="inline-flex min-w-0 items-center gap-2 text-copy/80">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
              <span className="truncate">{item.label}</span>
            </span>
            <strong className="text-white">{categories.length ? Math.round((item.value / total) * 100) : 0}%</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
