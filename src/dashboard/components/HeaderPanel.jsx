import { Menu, RefreshCcw, UserRound } from "lucide-react";

export default function HeaderPanel({
  title,
  description,
  statusNote,
  controls,
  onOpenSidebar,
  currentUser,
  selectedPersonName,
  syncStatus,
  onRefresh,
}) {
  const userInitial = String(selectedPersonName || currentUser || "U").slice(0, 1).toUpperCase();
  const isOffline = /indisponivel|desativada/i.test(syncStatus || "");

  return (
    <section className="premium-panel rounded-[22px] p-4 sm:p-5">
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

      <div className="mb-5 flex flex-col gap-3 border-b border-white/10 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold leading-tight text-white sm:text-[2rem]">
            Ola, {selectedPersonName || currentUser || "usuario"}
          </h1>
          <p className="mt-1 text-sm text-copy/70">{title}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-semibold ${
              isOffline ? "border-income/25 bg-income/10 text-income" : "border-success/25 bg-success/10 text-success"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${isOffline ? "bg-income" : "bg-success"}`} />
            {isOffline ? "Offline local" : "Sincronizacao ativa"}
          </span>
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-info/30 bg-info/15 px-4 py-2 text-sm font-semibold text-[#dcebff]"
          >
            <RefreshCcw className="h-4 w-4" />
            Atualizar
          </button>
          <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-info to-[#7c4dff] text-sm font-bold text-white">
              {userInitial}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{currentUser || "usuario"}</p>
              <p className="truncate text-xs text-copy/60">Pessoa ativa</p>
            </div>
            <UserRound className="h-4 w-4 text-copy/55" />
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,640px)] xl:items-start">
        <div className="min-w-0">
          <p className="mt-3 max-w-3xl text-sm leading-6 text-copy/78 sm:text-base">{description}</p>
          {statusNote ? <p className="mt-2 max-w-3xl text-sm leading-6 text-copy/72 sm:text-base">{statusNote}</p> : null}
        </div>

        {controls ? <div className="min-w-0">{controls}</div> : null}
      </div>
    </section>
  );
}
