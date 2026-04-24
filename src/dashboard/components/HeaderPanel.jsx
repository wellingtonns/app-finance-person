import { useState } from "react";
import { Menu, Settings, Trash2, UserPlus, X } from "lucide-react";

export default function HeaderPanel({
  title,
  description,
  statusNote,
  people,
  selectedPerson,
  setSelectedPerson,
  sumSalaries,
  setSumSalaries,
  consolidateDebts,
  setConsolidateDebts,
  onOpenSidebar,
  onAddPerson,
  onRemovePerson,
}) {
  const [showPeopleManager, setShowPeopleManager] = useState(false);
  const [personName, setPersonName] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    const normalized = personName.trim();
    if (!normalized) return;
    onAddPerson(normalized);
    setPersonName("");
  }

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
          <h2 className="font-display text-3xl font-bold text-white sm:text-[2.15rem]">{title}</h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-copy/78">{description}</p>
          <p className="text-base leading-7 text-copy/78">{statusNote}</p>
        </div>

        <div className="grid w-full max-w-[420px] gap-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <select
              value={selectedPerson}
              onChange={(event) => setSelectedPerson(event.target.value)}
              className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-base text-white outline-none ring-0"
            >
              {people.map((person) => (
                <option key={person} value={person}>
                  {person}
                </option>
              ))}
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
              onClick={() => setShowPeopleManager((current) => !current)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-info/35 bg-info/20 px-4 py-3 text-sm font-semibold text-[#dcebff]"
            >
              <Settings className="h-4 w-4" />
              {showPeopleManager ? "Fechar pessoas" : "Gerenciar pessoas"}
            </button>
          </div>
        </div>
      </div>

      {showPeopleManager ? (
        <div className="mt-5 rounded-[24px] border border-white/10 bg-white/5 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-[1.35rem] font-bold text-white">Pessoas vinculadas</h3>
              <p className="text-sm text-copy/70">Adicione novas pessoas ou remova quem nao usa mais o painel.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowPeopleManager(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-copy/80"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <input
              value={personName}
              onChange={(event) => setPersonName(event.target.value)}
              placeholder="Nome da pessoa"
              className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-base text-white outline-none"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-info/35 bg-info/20 px-4 py-3 text-sm font-semibold text-[#dcebff]"
            >
              <UserPlus className="h-4 w-4" />
              Adicionar pessoa
            </button>
          </form>

          <div className="mt-4 grid gap-3">
            {people.map((person) => (
              <div
                key={person}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#111927] px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-white">{person}</p>
                  <p className="text-sm text-copy/65">{person === selectedPerson ? "Pessoa ativa no painel" : "Disponivel para selecao"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemovePerson(person)}
                  disabled={people.length === 1}
                  className="inline-flex items-center gap-2 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-2 text-sm font-semibold text-danger disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                  Remover
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
