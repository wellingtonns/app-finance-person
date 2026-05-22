import AlertsCard from "./AlertsCard";
import CategoryChart from "./CategoryChart";
import DashboardChart from "./DashboardChart";
import QuickActionsCard from "./QuickActionsCard";
import UpcomingBillsCard from "./UpcomingBillsCard";

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

function getTodayKey() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
    today.getDate()
  ).padStart(2, "0")}`;
}

export default function DashboardOverview({
  month,
  debts,
  leisureRows,
  incomeTotal,
  paidDebtTotal,
  openDebtTotal,
  lateDebtTotal,
  projectedBalance,
  syncStatus,
  onNavigate,
}) {
  const todayKey = getTodayKey();
  const openDebts = debts
    .filter((row) => row.status !== "paid")
    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));
  const todayDebts = openDebts.filter((row) => row.dueDate === todayKey).slice(0, 4);
  const soonDebts = openDebts.filter((row) => row.dueDate !== todayKey).slice(0, 4);
  const lateCount = debts.filter((row) => row.status === "late").length;
  const categoryMap = new Map();
  [...debts, ...leisureRows].forEach((row) => {
    categoryMap.set(row.category, (categoryMap.get(row.category) || 0) + Number(row.value || 0));
  });
  const categories = [...categoryMap.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  return (
    <>
      <section className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-[1.35fr_0.95fr_0.85fr]">
        <Panel title="Resumo do mes" action={month}>
          <DashboardChart income={incomeTotal} debts={paidDebtTotal + openDebtTotal} balance={projectedBalance} />
        </Panel>

        <Panel title="Gastos por categoria" action="Mes atual">
          <CategoryChart categories={categories} />
        </Panel>

        <Panel title="Alertas importantes">
          <AlertsCard
            lateCount={lateCount}
            soonCount={soonDebts.length}
            lateDebtTotal={lateDebtTotal}
            openDebtTotal={openDebtTotal}
            syncStatus={syncStatus}
          />
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-[1fr_1fr_0.85fr]">
        <Panel title="Vencem hoje" action={todayKey}>
          <UpcomingBillsCard rows={todayDebts} emptyMessage="Nenhuma conta vence hoje no filtro atual." />
        </Panel>

        <Panel title="Contas proximas do vencimento" action={<button type="button" onClick={() => onNavigate("contas")}>Ver todas</button>}>
          <UpcomingBillsCard rows={soonDebts} emptyMessage="Nenhuma proxima conta aberta no filtro atual." />
        </Panel>

        <Panel title="Atalhos rapidos">
          <QuickActionsCard onNavigate={onNavigate} />
        </Panel>
      </section>
    </>
  );
}
