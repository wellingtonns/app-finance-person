import { FileText, Plus, RefreshCcw, TrendingUp, Users, BarChart3 } from "lucide-react";

function QuickAction({ icon: Icon, label, onClick, tone = "info" }) {
  const toneClass =
    tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : tone === "income" ? "text-income" : "text-info";
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid min-h-[92px] place-items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-4 text-center text-sm font-semibold text-white transition hover:border-info/40 hover:bg-white/[0.08]"
    >
      <Icon className={`h-6 w-6 ${toneClass}`} />
      {label}
    </button>
  );
}

export default function QuickActionsCard({ onNavigate }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <QuickAction icon={Plus} label="Nova entrada" onClick={() => onNavigate("entradas")} tone="success" />
      <QuickAction icon={FileText} label="Nova conta" onClick={() => onNavigate("contas")} />
      <QuickAction icon={RefreshCcw} label="Nova recorrente" onClick={() => onNavigate("contas")} tone="income" />
      <QuickAction icon={TrendingUp} label="Investimento" onClick={() => onNavigate("investimentos")} />
      <QuickAction icon={Users} label="Nova pessoa" onClick={() => onNavigate("pessoas")} tone="success" />
      <QuickAction icon={BarChart3} label="Relatorios" onClick={() => onNavigate("dashboard")} tone="danger" />
    </div>
  );
}
