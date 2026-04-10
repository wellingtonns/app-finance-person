import { CalendarDays, Settings2, Trash2 } from "lucide-react";
import { formatCurrency } from "../utils";

const statusClasses = {
  paid: "bg-success/20 text-success border-success/30",
  open: "bg-action/20 text-[#ffd57d] border-action/30",
  late: "bg-danger/20 text-danger border-danger/30",
};

export default function DebtsTable({ rows, totals }) {
  return (
    <section className="premium-panel rounded-[30px] p-5 sm:p-6">
      <h3 className="font-display text-[2rem] font-bold text-white">Dividas</h3>

      <div className="mt-4 grid gap-3 xl:grid-cols-[190px_170px_170px_1fr_auto_auto]">
        <select className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-sm text-white outline-none">
          <option>Pessoa selecionada</option>
        </select>
        <select className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-sm text-white outline-none">
          <option>Todas</option>
        </select>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-sm text-copy/80"
        >
          <CalendarDays className="h-4 w-4 text-info" />
          Mes
        </button>
        <div />
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-info/35 bg-info/15 px-4 py-3 text-sm font-semibold text-[#dcebff]"
        >
          <Settings2 className="h-4 w-4" />
          Gerenciar contas
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger"
        >
          <Trash2 className="h-4 w-4" />
          Limpar filtros
        </button>
      </div>

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
            {rows.map((row) => (
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
                    className="inline-flex rounded-xl border border-white/10 bg-white/5 p-2 text-copy/70"
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
