export default function AppShell({ sidebar, children }) {
  return (
    <div className="min-h-screen bg-shell font-body text-copy">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-24 top-[-80px] h-72 w-72 rounded-full bg-info/15 blur-3xl" />
        <div className="absolute bottom-[-120px] right-[-80px] h-80 w-80 rounded-full bg-success/10 blur-3xl" />
      </div>

      <div className="relative grid min-h-screen w-full gap-3 px-3 py-3 lg:gap-4 lg:px-4 2xl:grid-cols-[248px_minmax(0,1fr)]">
        {sidebar}
        <main className="w-full min-w-0 space-y-3 overflow-hidden lg:space-y-4">{children}</main>
      </div>
    </div>
  );
}
