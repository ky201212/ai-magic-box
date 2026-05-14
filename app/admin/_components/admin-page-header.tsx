import type { ReactNode } from "react";

type AdminPageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
};

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: AdminPageHeaderProps) {
  return (
    <section className="rounded-[32px] border border-white/80 bg-white p-7 shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="max-w-3xl">
          <p className="text-xs font-bold tracking-[0.18em] text-sky-600">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] text-slate-900">
            {title}
          </h1>
          <p className="mt-4 text-[15px] leading-8 text-slate-500">
            {description}
          </p>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    </section>
  );
}
