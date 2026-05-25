import { CalendarClock, CircleAlert, RefreshCcw } from "lucide-react";
import { formatCurrency } from "../utils";

function AlertRow({ icon: Icon, title, subtitle, tone = "danger" }) {
  const toneClass =
    tone === "sync"
      ? "text-info bg-info/15 border-info/20"
      : tone === "warning"
        ? "text-income bg-income/15 border-income/20"
        : "text-danger bg-danger/15 border-danger/20";
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <span className={`rounded-2xl border p-2 ${toneClass}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="font-semibold text-white">{title}</p>
        <p className="truncate text-sm text-copy/65">{subtitle}</p>
      </div>
    </div>
  );
}

export default function AlertsCard({ lateCount, soonCount, lateDebtTotal, openDebtTotal, syncStatus }) {
  return (
    <div className="grid gap-3">
      <AlertRow icon={CircleAlert} title={`${lateCount} contas em atraso`} subtitle={`Total: ${formatCurrency(lateDebtTotal)}`} />
      <AlertRow icon={CalendarClock} title={`${soonCount} contas abertas`} subtitle={`A pagar: ${formatCurrency(openDebtTotal)}`} tone="warning" />
      <AlertRow icon={RefreshCcw} title="Sincronização" subtitle={syncStatus} tone="sync" />
    </div>
  );
}
