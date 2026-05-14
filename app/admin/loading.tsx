export default function AdminLoading() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#f6f8fc_45%,#f8fafc_100%)] text-slate-800">
      <div className="mx-auto flex min-h-screen w-full max-w-[1680px] gap-6 px-5 py-5 xl:px-8">
        <div className="hidden xl:block">
          <aside className="flex w-full max-w-[320px] shrink-0 flex-col rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
            <div className="h-24 rounded-[24px] bg-slate-100" />
            <div className="mt-5 h-28 rounded-[24px] bg-slate-100" />
            <div className="mt-6 space-y-3">
              <div className="h-20 rounded-[22px] bg-slate-100" />
              <div className="h-20 rounded-[22px] bg-slate-100" />
              <div className="h-20 rounded-[22px] bg-slate-100" />
            </div>
          </aside>
        </div>

        <div className="min-w-0 flex-1 space-y-5">
          <section className="rounded-[28px] border border-white/80 bg-white/90 px-6 py-5 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
            <div className="h-16 rounded-[20px] bg-slate-100" />
          </section>
          <section className="rounded-[32px] border border-white/80 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
            <div className="h-10 w-64 rounded-full bg-slate-100" />
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="h-40 rounded-[24px] bg-slate-100" />
              <div className="h-40 rounded-[24px] bg-slate-100" />
              <div className="h-40 rounded-[24px] bg-slate-100" />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
