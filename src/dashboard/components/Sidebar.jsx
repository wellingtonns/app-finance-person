import { useMemo, useState } from "react";
import {
  BadgeDollarSign,
  BriefcaseBusiness,
  CircleDollarSign,
  Home,
  LogOut,
  Menu,
  Settings,
  Users,
  Wallet,
  X,
} from "lucide-react";

const navItems = [
  { key: "dashboard", label: "Dashboard", icon: Home },
  { key: "entradas", label: "Entradas", icon: CircleDollarSign },
  { key: "contas", label: "Contas", icon: BriefcaseBusiness },
  { key: "capital", label: "Capital", icon: Wallet },
  { key: "investimentos", label: "Investimentos", icon: BadgeDollarSign },
  { key: "pessoas", label: "Pessoas", icon: Users },
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
  selectedPersonName,
  syncStatus,
  onLogout,
  onNavigateSettings,
}) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userInitial = useMemo(() => currentUser.slice(0, 1).toUpperCase(), [currentUser]);

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
              <p className="mt-1 text-sm text-copy/70">Painel financeiro pessoal</p>
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
              {userInitial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-[0.2em] text-copy/55">Usuario</p>
              <p className="truncate text-base font-semibold text-white">{currentUser}</p>
              <p className="truncate text-xs text-copy/60">Pessoa ativa: {selectedPersonName}</p>
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
                  console.log("[dashboard] Sidebar settings clicked");
                  onNavigateSettings();
                }}
                className="rounded-xl border border-white/10 bg-white/5 p-2"
                aria-label="Abrir configuracoes"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-white/10 bg-[#0b1220] px-3 py-2 text-xs text-copy/70">
            {syncStatus}
          </div>

          {showUserMenu ? (
            <div className="mt-4 rounded-[20px] border border-white/10 bg-[#111927] p-3">
              <p className="text-sm font-semibold text-white">Acoes da conta</p>
              <p className="mt-1 text-xs text-copy/65">As configuracoes ficam na pagina dedicada para manter o painel limpo.</p>

              <div className="mt-3 grid gap-2">
                <button
                  type="button"
                  onClick={() => {
                    console.log("[dashboard] Sidebar settings shortcut clicked");
                    onNavigateSettings();
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-info/35 bg-info/15 px-4 py-3 text-sm font-semibold text-[#dcebff]"
                >
                  <Settings className="h-4 w-4" />
                  Abrir configuracoes
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
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
}
