import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  assertAdminPageAccess,
  hasAdminPermission,
} from "@/lib/admin";
import { getBrandIdentitySetting } from "@/lib/site-config";
import { AdminSidebar } from "./_components/admin-sidebar";
import type { AdminNavGroup } from "./_components/types";

type AdminNavConfigGroup = {
  title: string;
  items: Array<{
    href: string;
    label: string;
    description: string;
    permission?: string;
  }>;
};

const navGroups: AdminNavConfigGroup[] = [
  {
    title: "总览中心",
    items: [
      {
        href: "/admin",
        label: "运营总览",
        description: "快速查看用户、审核、通知与能力状态。",
      },
    ],
  },
  {
    title: "内容运营",
    items: [
      {
        href: "/admin/site",
        label: "站点内容",
        description: "编辑首页文案、品牌信息、Logo 与默认魔法币。",
        permission: "site_settings",
      },
      {
        href: "/admin/info",
        label: "资讯管理",
        description: "发布科普知识、科普视频、获奖喜讯和活动资讯。",
        permission: "site_settings",
      },
      {
        href: "/admin/notifications",
        label: "通知中心",
        description: "向全站用户、管理员或指定孩子发送消息。",
        permission: "notifications",
      },
      {
        href: "/admin/payments",
        label: "支付中心",
        description: "维护汇率、订阅套餐、激活码与 Mock 支付订单。",
        permission: "site_settings",
      },
    ],
  },
  {
    title: "能力与社区",
    items: [
      {
        href: "/admin/ai",
        label: "AI 能力配置",
        description: "配置模型、接口、提示词与各功能扣币规则。",
        permission: "ai_configs",
      },
      {
        href: "/admin/review",
        label: "社区审核",
        description: "查看规则审核、智能审核和人工复核的完整链路。",
        permission: "community_review",
      },
    ],
  },
  {
    title: "账号管理",
    items: [
      {
        href: "/admin/users",
        label: "用户管理",
        description: "查看注册用户、调整状态、备注和魔法币余额。",
        permission: "user_management",
      },
    ],
  },
];

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const admin = await assertAdminPageAccess();

  if (!admin) {
    redirect("/login?redirect=/admin");
  }

  const brand = await getBrandIdentitySetting();
  const permittedNavGroups: AdminNavGroup[] = navGroups
    .map((group) => ({
      title: group.title,
      items: group.items.filter(
        (item) =>
          !item.permission || hasAdminPermission(admin, item.permission),
      ),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#f6f8fc_45%,#f8fafc_100%)] text-slate-800">
      <div className="mx-auto flex min-h-screen w-full max-w-[1680px] gap-4 px-4 py-4 sm:px-5 sm:py-5 xl:gap-6 xl:px-8">
        <div className="hidden xl:block">
          <AdminSidebar
            brand={brand}
            admin={{
              displayName: admin.displayName,
              phone: admin.phone,
              role: admin.role,
            }}
            navGroups={permittedNavGroups}
          />
        </div>

        <div className="min-w-0 flex-1 space-y-5">
          <section className="rounded-[28px] border border-white/80 bg-white/90 px-6 py-5 shadow-[0_18px_40px_rgba(15,23,42,0.04)] backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-slate-400">后台工作台</p>
                <p className="mt-1 text-lg font-black text-slate-800">
                  今天继续把小红车打理得井井有条
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/"
                  className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                >
                  查看官网
                </Link>
                <Link
                  href="/workshop?mode=coding"
                  className="rounded-full bg-[linear-gradient(90deg,#dbeafe_0%,#e0f2fe_50%,#fff7ed_100%)] px-5 py-2.5 text-sm font-black text-slate-800 shadow-[0_12px_24px_rgba(125,211,252,0.14)]"
                >
                  进入工坊
                </Link>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 xl:hidden">
              {permittedNavGroups.flatMap((group) => group.items).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-600"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </section>

          {children}
        </div>
      </div>
    </main>
  );
}
