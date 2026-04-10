import { Menu, Settings } from "lucide-react";

export default function HeaderPanel({
  selectedPerson,
  setSelectedPerson,
  sumSalaries,
  setSumSalaries,
  consolidateDebts,
  setConsolidateDebts,
  onOpenSidebar,
}) {
  return (
    <section className="premium-panel rounded-[28px] p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between md:hidden">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-copy"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <h2 className="font-display text-3xl font-bold text-white sm:text-[2.15rem]">
            Dashboard - Abril de 2026
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-copy/78">
            Dashboard de visualizacao por pessoa e mes atual.
          </p>
          <p className="text-base leading-7 text-copy/78">
            Modo individual ativo (2026-64): salario de Andressa | Dividas em modo separado
            (pessoa selecionada).
          </p>
        </div>

        <div className="grid w-full max-w-[420px] gap-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <select
              value={selectedPerson}
              onChange={(event) => setSelectedPerson(event.target.value)}
              className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-base text-white outline-none ring-0"
            >
              <option>Andressa</option>
              <option>Wellington</option>
              <option>Casal</option>
            </select>

            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-copy/80">
              <input
                type="checkbox"
                checked={sumSalaries}
                onChange={(event) => setSumSalaries(event.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-transparent text-info focus:ring-info"
              />
              <span>Somar salarios marcados</span>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-copy/80">
              <input
                type="checkbox"
                checked={consolidateDebts}
                onChange={(event) => setConsolidateDebts(event.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-transparent text-info focus:ring-info"
              />
              <span>Consolidar dividas do casal</span>
            </label>

            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-info/35 bg-info/20 px-4 py-3 text-sm font-semibold text-[#dcebff]"
            >
              <Settings className="h-4 w-4" />
              Gerenciar pessoas
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
