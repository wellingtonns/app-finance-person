import { Menu } from "lucide-react";

export default function HeaderPanel({ title, description, statusNote, controls, onOpenSidebar }) {
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

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,520px)] xl:items-start">
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-bold leading-tight text-white sm:text-[2rem]">{title}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-copy/78 sm:text-base">{description}</p>
          {statusNote ? <p className="mt-2 max-w-3xl text-sm leading-6 text-copy/72 sm:text-base">{statusNote}</p> : null}
        </div>

        {controls ? <div className="min-w-0">{controls}</div> : null}
      </div>
    </section>
  );
}
