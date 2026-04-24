import { Menu } from "lucide-react";

export default function HeaderPanel({ title, description, statusNote, controls, onOpenSidebar }) {
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
          {statusNote ? <p className="mt-2 text-base leading-7 text-copy/72">{statusNote}</p> : null}
        </div>

        {controls ? <div className="w-full max-w-[620px]">{controls}</div> : null}
      </div>
    </section>
  );
}
