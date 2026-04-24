import { useState } from "react";
import {
  BadgeDollarSign,
  BriefcaseBusiness,
  Home,
  LogOut,
  Menu,
  Settings,
  Trash2,
  UserPlus,
  Wallet,
  X,
} from "lucide-react";

const navItems = [
  { key: "dashboard", label: "Dashboard", icon: Home },
  { key: "contas", label: "Contas", icon: BriefcaseBusiness },
  { key: "capital", label: "Capital", icon: Wallet },
  { key: "investimentos", label: "Investimentos", icon: BadgeDollarSign },
];

function NavButton({ icon: Icon, label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-[15px] font-medium transition ${
        active
          ? "border-white/10 bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
          : "border-transparent bg-transparent text-copy/85 hover:border-white/10 hover:bg-white/5"
      }`}
    >
      <Icon className="h-4 w-4 text-info" />
      <span>{label}</span>
    </button>
  );
}

export default function Sidebar({
  open,
  onClose,
  currentUser,
  currentView,
  onNavigate,
  people,
  selectedPerson,
  onAddPerson,
  onRemovePerson,
  onLogout,
  onNotify,
}) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showPeopleManager, setShowPeopleManager] = useState(false);
  const [personName, setPersonName] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    const normalized = personName.trim();
    console.log("[dashboard] Sidebar person save clicked", { normalized });
    if (!normalized) {
      onNotify?.("Informe um nome valido para adicionar pessoa.");
      return;
    }
    onAddPerson(normalized);
    setPersonName("");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => (open ? onClose() : null)}
        className={`fixed inset-0 z-40 bg-black/65 transition md:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        aria-hidden={!open}
      />

      <aside
        className={`fixed inset-y-4 left-3 z-50 flex w-[290px] max-w-[calc(100vw-24px)] flex-col rounded-[28px] border border-white/10 bg-sidebar p-4 shadow-panel transition duration-300 md:sticky md:top-4 md:z-10 md:h-[calc(100vh-2rem)] md:w-full md:max-w-none md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-[115%]"
        }`}
      >
        <div className="mb-4 flex items-start justify-between md:hidden">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-copy"
            onClick={onClose}
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-4">
          <div className="flex items-center gap-3">
            <img src="/logo-financeperson.svg" alt="FinancePerson" className="h-12 w-12 rounded-2xl" />
            <div>
              <h1 className="font-display text-[1.7rem] font-bold leading-none text-white">FinancePerson</h1>
              <p className="mt-1 text-sm text-copy/70">Painel de Abril de 2026</p>
            </div>
          </div>
        </div>

        <div className="my-5 h-px bg-white/10" />

        <nav className="space-y-2">
          {navItems.map((item) => (
            <NavButton
              key={item.key}
              icon={item.icon}
              label={item.label}
              active={item.key === currentView}
              onClick={() => onNavigate(item.key)}
            />
          ))}
        </nav>

        <div className="mt-auto rounded-[24px] border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-info/60 to-white/10 text-sm font-bold text-white">
              {currentUser.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-[0.2em] text-copy/55">Usuario:</p>
              <p className="truncate text-base font-semibold text-white">{currentUser}</p>
            </div>
            <div className="flex gap-2 text-copy/70">
              <button
                type="button"
                onClick={() => {
                  console.log("[dashboard] Sidebar user menu toggle clicked", { open: !showUserMenu });
                  setShowUserMenu((current) => !current);
                }}
                className="rounded-xl border border-white/10 bg-white/5 p-2"
                aria-label="Abrir menu do usuario"
              >
                <Menu className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  console.log("[dashboard] Sidebar settings toggle clicked", { open: !showPeopleManager });
                  setShowPeopleManager((current) => !current);
                  setShowUserMenu(true);
                }}
                className="rounded-xl border border-white/10 bg-white/5 p-2"
                aria-label="Abrir configuracoes"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>

          {showUserMenu ? (
            <div className="mt-4 rounded-[20px] border border-white/10 bg-[#111927] p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Configuracoes da conta</p>
                  <p className="text-xs text-copy/65">Gerencie pessoas e a sessao atual.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    console.log("[dashboard] Sidebar user menu close clicked");
                    setShowUserMenu(false);
                    setShowPeopleManager(false);
                  }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-copy/80"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    console.log("[dashboard] Sidebar manage people clicked", { open: !showPeopleManager });
                    setShowPeopleManager((current) => !current);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-info/35 bg-info/15 px-4 py-3 text-sm font-semibold text-[#dcebff]"
                >
                  <Settings className="h-4 w-4" />
                  {showPeopleManager ? "Fechar pessoas" : "Gerenciar pessoas"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    console.log("[dashboard] Logout clicked", { currentUser });
                    onLogout();
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger"
                >
                  <LogOut className="h-4 w-4" />
                  Deslogar
                </button>
              </div>

              {showPeopleManager ? (
                <div className="mt-4 border-t border-white/10 pt-4">
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
                      Adicionar
                    </button>
                  </form>

                  <div className="mt-4 grid gap-3">
                    {people.map((person) => (
                      <div
                        key={person}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3"
                      >
                        <div>
                          <p className="font-semibold text-white">{person}</p>
                          <p className="text-sm text-copy/65">
                            {person === selectedPerson ? "Pessoa ativa no painel" : "Disponivel para selecao"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            console.log("[dashboard] Sidebar person remove clicked", { person });
                            onRemovePerson(person);
                          }}
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
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
}
