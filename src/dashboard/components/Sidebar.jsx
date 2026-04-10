import {
  BadgeDollarSign,
  BriefcaseBusiness,
  Home,
  Menu,
  Settings,
  Wallet,
  X,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: Home, active: false },
  { label: "Contas", icon: BriefcaseBusiness, active: true },
  { label: "Capital", icon: Wallet, active: false },
  { label: "Investimentos", icon: BadgeDollarSign, active: false },
];

function NavButton({ icon: Icon, label, active }) {
  return (
    <button
      type="button"
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

export default function Sidebar({ open, onClose, currentUser }) {
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
            <NavButton key={item.label} {...item} />
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
              <button type="button" className="rounded-xl border border-white/10 bg-white/5 p-2">
                <Menu className="h-4 w-4" />
              </button>
              <button type="button" className="rounded-xl border border-white/10 bg-white/5 p-2">
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
