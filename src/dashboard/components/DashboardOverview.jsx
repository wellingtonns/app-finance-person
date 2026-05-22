import {
  BadgeDollarSign,
  Bell,
  CalendarClock,
  CircleAlert,
  FileText,
  Landmark,
  Plus,
  RefreshCcw,
  TrendingUp,
  Users,
} from "lucide-react";
import { formatCurrency } from "../utils";

function Panel({ title, action, children, className = "" }) {
  return (
    <section className={`premium-panel rounded-[22px] p-4 sm:p-5 ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-display text-lg font-bold text-white">{title}</h3>
        {action ? <div className="text-sm text-info">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

function MiniLineChart({ income, debts, balance }) {
  const rows = [
    { label: "Entradas", value: income, color: "bg-success" },
    { label: "Saidas", value: debts, color: "bg-info" },
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

function CategoryDonut({ categories }) {
  const total = categories.reduce((sum, item) => sum + item.value, 0) || 1;
  let cursor = 0;
  const colors = ["#2f7cff", "#35c981", "#f5b72f", "#9b5cf6", "#30afd7", "#8da3bf"];
  const gradient = categories
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
        style={{ background: `conic-gradient(${gradient || "#2f7cff 0% 100%"})` }}
      >
        <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-[#09111e] text-center shadow-panel">
          <strong className="text-white">{formatCurrency(total)}</strong>
          <span className="text-xs text-copy/60">Total</span>
        </div>
      </div>
      <div className="grid gap-3">
        {categories.map((item, index) => (
          <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="inline-flex min-w-0 items-center gap-2 text-copy/80">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
              <span className="truncate">{item.label}</span>
            </span>
            <strong className="text-white">{Math.round((item.value / total) * 100)}%</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function AlertRow({ icon: Icon, title, subtitle, tone = "danger" }) {
  const toneClass = tone === "warning" ? "text-income bg-income/15 border-income/20" : "text-danger bg-danger/15 border-danger/20";
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

function QuickAction({ icon: Icon, label, onClick, tone = "info" }) {
  const toneClass = tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : tone === "income" ? "text-income" : "text-info";
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

export default function DashboardOverview({
  month,
  people,
  debts,
  capitalItems,
  investmentItems,
  leisureRows,
  incomeTotal,
  paidDebtTotal,
  openDebtTotal,
  lateDebtTotal,
  projectedBalance,
  capitalTotal,
  investmentsTotal,
  onNavigate,
}) {
  const soonDebts = debts
    .filter((row) => row.status !== "paid")
    .slice(0, 4);
  const categoryMap = new Map();
  [...debts, ...leisureRows].forEach((row) => {
    categoryMap.set(row.category, (categoryMap.get(row.category) || 0) + Number(row.value || 0));
  });
  const categories = [...categoryMap.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
  const activePeople = people.length;

  return (
    <>
      <section className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-[1.35fr_0.95fr_0.85fr]">
        <Panel title="Resumo do mes" action={month}>
          <MiniLineChart income={incomeTotal} debts={paidDebtTotal + openDebtTotal} balance={projectedBalance} />
        </Panel>

        <Panel title="Gastos por categoria" action="Mes atual">
          <CategoryDonut categories={categories.length ? categories : [{ label: "Sem gastos", value: 1 }]} />
        </Panel>

        <Panel title="Alertas importantes">
          <div className="grid gap-3">
            <AlertRow
              icon={CircleAlert}
              title={`${debts.filter((row) => row.status === "late").length} contas em atraso`}
              subtitle={`Total: ${formatCurrency(lateDebtTotal)}`}
            />
            <AlertRow
              icon={CalendarClock}
              title={`${soonDebts.length} contas abertas`}
              subtitle={`A pagar: ${formatCurrency(openDebtTotal)}`}
              tone="warning"
            />
            <AlertRow icon={RefreshCcw} title="Sincronizacao monitorada" subtitle="Fallback local ativo quando Turso estiver indisponivel" tone="warning" />
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-[1.35fr_0.95fr_0.85fr]">
        <Panel title="Contas proximas do vencimento" action={<button type="button" onClick={() => onNavigate("contas")}>Ver todas</button>}>
          <div className="grid gap-2">
            {soonDebts.length ? (
              soonDebts.map((row) => (
                <div key={row.id} className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_120px_95px] sm:items-center">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{row.name}</p>
                    <p className="text-xs text-copy/60">Vence em {row.dueDate}</p>
                  </div>
                  <span className="text-copy/75">{row.category}</span>
                  <strong className="text-white sm:text-right">{formatCurrency(row.value)}</strong>
                </div>
              ))
            ) : (
              <p className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-5 text-sm text-copy/65">Nenhuma conta aberta no filtro atual.</p>
            )}
          </div>
        </Panel>

        <Panel title="Visao geral do patrimonio">
          <div className="grid gap-3">
            <AlertRow icon={Landmark} title="Capital acumulado" subtitle={formatCurrency(capitalTotal)} tone="warning" />
            <AlertRow icon={TrendingUp} title="Total investido" subtitle={formatCurrency(investmentsTotal)} tone="warning" />
            <AlertRow icon={BadgeDollarSign} title="Itens patrimoniais" subtitle={`${capitalItems.length + investmentItems.length} registro(s)`} tone="warning" />
          </div>
        </Panel>

        <Panel title="Atalhos rapidos">
          <div className="grid grid-cols-2 gap-3">
            <QuickAction icon={Plus} label="Nova entrada" onClick={() => onNavigate("entradas")} tone="success" />
            <QuickAction icon={FileText} label="Nova conta" onClick={() => onNavigate("contas")} />
            <QuickAction icon={RefreshCcw} label="Recorrentes" onClick={() => onNavigate("contas")} tone="income" />
            <QuickAction icon={TrendingUp} label="Investimento" onClick={() => onNavigate("investimentos")} />
            <QuickAction icon={Users} label={`${activePeople} pessoa(s)`} onClick={() => onNavigate("pessoas")} tone="success" />
            <QuickAction icon={Bell} label="Alertas" onClick={() => onNavigate("dashboard")} tone="danger" />
          </div>
        </Panel>
      </section>
    </>
  );
}
