"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AdminNavGroup } from "./types";

type AdminSidebarProps = {
  brand: {
    logoUrl: string;
    siteName: string;
    tagline: string;
  };
  admin: {
    displayName: string;
    phone: string;
    role: string;
  };
  navGroups: AdminNavGroup[];
};

function isItemActive(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin";
  }

  return pathname.startsWith(href);
}

export function AdminSidebar({ brand, admin, navGroups }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex w-full max-w-[320px] shrink-0 flex-col rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
      <div className="flex items-center gap-4 rounded-[24px] bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_52%,#fff7ed_100%)] p-4">
        <Image
          src={brand.logoUrl}
          alt={brand.siteName}
          width={52}
          height={52}
          className="rounded-[18px] border border-white/80 bg-white object-cover shadow-[0_12px_24px_rgba(148,163,184,0.18)]"
        />
        <div className="min-w-0">
          <p className="truncate text-lg font-black text-slate-800">
            {brand.siteName}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            平台后台管理中心
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-[24px] border border-slate-100 bg-slate-50 p-4">
        <p className="text-xs font-bold tracking-[0.14em] text-slate-400">
          当前管理员
        </p>
        <p className="mt-3 text-lg font-black text-slate-800">
          {admin.displayName}
        </p>
        <p className="mt-1 text-sm text-slate-500">{admin.phone}</p>
        <div className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold text-sky-700 shadow-[0_8px_18px_rgba(148,163,184,0.12)]">
          {admin.role}
        </div>
      </div>

      <div className="mt-6 space-y-5">
        {navGroups.map((group) => (
          <div key={group.title}>
            <p className="px-2 text-[11px] font-bold tracking-[0.18em] text-slate-400">
              {group.title}
            </p>
            <div className="mt-2 space-y-2">
              {group.items.map((item) => {
                const active = isItemActive(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block rounded-[22px] px-4 py-4 transition ${
                      active
                        ? "bg-[linear-gradient(135deg,#e0f2fe_0%,#eff6ff_45%,#fff7ed_100%)] shadow-[0_16px_30px_rgba(125,211,252,0.18)]"
                        : "bg-white hover:bg-slate-50"
                    }`}
                  >
                    <p
                      className={`text-sm font-black ${
                        active ? "text-slate-800" : "text-slate-700"
                      }`}
                    >
                      {item.label}
                    </p>
                    <p
                      className={`mt-1 text-xs leading-6 ${
                        active ? "text-slate-500" : "text-slate-400"
                      }`}
                    >
                      {item.description}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto space-y-3 pt-6">
        <Link
          href="/workshop?mode=coding"
          className="flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(15,23,42,0.18)] transition hover:bg-slate-800"
        >
          返回创作工坊
        </Link>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="w-full rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
          >
            退出登录
          </button>
        </form>
      </div>
    </aside>
  );
}
