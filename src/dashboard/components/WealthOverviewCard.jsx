import { BadgeDollarSign, Landmark, ShieldCheck, TrendingUp } from "lucide-react";
import { formatCurrency } from "../utils";

function WealthRow({ icon: Icon, label, value, tone = "text-success" }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <span className="inline-flex min-w-0 items-center gap-3 text-sm text-copy/80">
        <span className="rounded-2xl border border-white/10 bg-white/5 p-2">
          <Icon className={`h-4 w-4 ${tone}`} />
        </span>
        <span className="truncate">{label}</span>
      </span>
      <strong className={`text-right ${tone}`}>{value}</strong>
    </div>
  );
}

export default function WealthOverviewCard({ capitalTotal, investmentsTotal, capitalCount, investmentCount }) {
  return (
    <div className="grid gap-3">
      <WealthRow icon={Landmark} label="Capital acumulado" value={formatCurrency(capitalTotal)} />
      <WealthRow icon={TrendingUp} label="Total investido" value={formatCurrency(investmentsTotal)} tone="text-info" />
      <WealthRow icon={BadgeDollarSign} label="Rendimento do mes" value={formatCurrency(0)} tone="text-success" />
      <WealthRow
        icon={ShieldCheck}
        label="Reserva de emergencia"
        value={`${capitalCount + investmentCount} registro(s)`}
        tone="text-[#9f6bff]"
      />
    </div>
  );
}
