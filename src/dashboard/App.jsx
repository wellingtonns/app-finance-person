import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import HeaderPanel from "./components/HeaderPanel";
import MetricCard from "./components/MetricCard";
import { EntriesPanel, LeisurePanel } from "./components/LedgerPanel";
import DebtsTable from "./components/DebtsTable";
import {
  debtRows,
  debtTotals,
  entryRows,
  initialLeisureRows,
  summaryCards,
} from "./mockData";
import { getCurrentUser } from "./utils";

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState("Andressa");
  const [sumSalaries, setSumSalaries] = useState(true);
  const [consolidateDebts, setConsolidateDebts] = useState(true);
  const [leisureRows, setLeisureRows] = useState(initialLeisureRows);
  const [leisureForm, setLeisureForm] = useState({ description: "", value: "" });
  const [currentUser] = useState(getCurrentUser);

  useEffect(() => {
    const closeOnDesktop = () => {
      if (window.innerWidth >= 768) setSidebarOpen(false);
    };

    window.addEventListener("resize", closeOnDesktop);
    return () => window.removeEventListener("resize", closeOnDesktop);
  }, []);

  function handleLeisureSubmit(event) {
    event.preventDefault();

    const description = leisureForm.description.trim();
    const value = Number(String(leisureForm.value).replace(",", "."));
    if (!description || !value) return;

    setLeisureRows((current) => [
      ...current,
      { id: `leisure-${Date.now()}`, label: description, value },
    ]);
    setLeisureForm({ description: "", value: "" });
  }

  return (
    <div className="min-h-screen bg-shell font-body text-copy">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-24 top-[-80px] h-72 w-72 rounded-full bg-info/15 blur-3xl" />
        <div className="absolute bottom-[-120px] right-[-80px] h-80 w-80 rounded-full bg-success/10 blur-3xl" />
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-[1500px] gap-4 px-3 py-4 md:grid-cols-[280px_minmax(0,1fr)] md:px-4">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} currentUser={currentUser} />

        <main className="min-w-0 space-y-4">
          <HeaderPanel
            selectedPerson={selectedPerson}
            setSelectedPerson={setSelectedPerson}
            sumSalaries={sumSalaries}
            setSumSalaries={setSumSalaries}
            consolidateDebts={consolidateDebts}
            setConsolidateDebts={setConsolidateDebts}
            onOpenSidebar={() => setSidebarOpen(true)}
          />

          <section className="grid gap-3 xl:grid-cols-4 md:grid-cols-2">
            {summaryCards.map((card) => (
              <MetricCard key={card.title} {...card} />
            ))}
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <EntriesPanel rows={entryRows} />
            <LeisurePanel
              rows={leisureRows}
              form={leisureForm}
              setForm={setLeisureForm}
              onSubmit={handleLeisureSubmit}
              onClear={() => setLeisureRows([])}
            />
          </section>

          <DebtsTable rows={debtRows} totals={debtTotals} />
        </main>
      </div>
    </div>
  );
}
