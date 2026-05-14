import Link from "next/link";
import { getDashboardStats, listAiModeConfigs, listAdminCommunityPosts, listAdminUsers, listNotifications } from "@/lib/admin-data";
import { AdminPageHeader } from "./_components/admin-page-header";

function formatCount(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

export default async function AdminDashboardPage() {
  const [stats, aiConfigs, posts, users, notifications] = await Promise.all([
    getDashboardStats().catch(() => ({
      usersTotal: 0,
      communityPending: 0,
      communityApproved: 0,
      notificationsSent: 0,
    })),
    listAiModeConfigs().catch(() => []),
    listAdminCommunityPosts().catch(() => []),
    listAdminUsers().catch(() => []),
    listNotifications(6).catch(() => []),
  ]);

  const enabledAiCount = aiConfigs.filter((item) => item.is_enabled).length;
  const paidAiCount = aiConfigs.filter((item) => {
    const payload = item.extra_payload ?? {};
    return payload.creditEnabled === true && Number(payload.creditCost ?? 0) > 0;
  }).length;
  const pendingPosts = posts.filter((item) => item.moderation_status === "pending").slice(0, 5);
  const newestUsers = users.slice(0, 5);

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="运营总览"
        title="后台总控台"
        description="这里先看整个平台今天的整体状态，再进入对应栏目做更细的配置和处理。所有核心功能都已经拆成独立页面，管理员不需要再面对一长页滚动操作。"
        actions={
          <Link
            href="/admin/site"
            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(15,23,42,0.16)] transition hover:bg-slate-800"
          >
            去编辑站点内容
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-[28px] border border-white/80 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
          <p className="text-xs font-bold tracking-[0.16em] text-sky-600">注册用户</p>
          <p className="mt-4 text-4xl font-black tracking-[-0.05em] text-slate-900">
            {formatCount(stats.usersTotal)}
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-500">当前已注册并进入平台的孩子数量。</p>
        </article>
        <article className="rounded-[28px] border border-white/80 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
          <p className="text-xs font-bold tracking-[0.16em] text-amber-600">待审核作品</p>
          <p className="mt-4 text-4xl font-black tracking-[-0.05em] text-slate-900">
            {formatCount(stats.communityPending)}
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-500">等待人工确认的社区分享内容。</p>
        </article>
        <article className="rounded-[28px] border border-white/80 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
          <p className="text-xs font-bold tracking-[0.16em] text-emerald-600">已启用能力</p>
          <p className="mt-4 text-4xl font-black tracking-[-0.05em] text-slate-900">
            {formatCount(enabledAiCount)}
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-500">当前已经对外开放的 AI 功能数量。</p>
        </article>
        <article className="rounded-[28px] border border-white/80 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
          <p className="text-xs font-bold tracking-[0.16em] text-rose-600">已发送通知</p>
          <p className="mt-4 text-4xl font-black tracking-[-0.05em] text-slate-900">
            {formatCount(stats.notificationsSent)}
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-500">已经发送到用户端的站内通知条数。</p>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="rounded-[32px] border border-white/80 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black text-slate-800">今天最需要处理的事项</p>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                建议优先看社区审核，再检查扣币配置和通知内容。
              </p>
            </div>
            <Link
              href="/admin/review"
              className="rounded-full bg-[#eef6ff] px-4 py-2 text-sm font-black text-[#2f6db3]"
            >
              去处理审核
            </Link>
          </div>

          <div className="mt-6 grid gap-4">
            <div className="rounded-[24px] bg-slate-50 px-5 py-4">
              <p className="text-xs font-bold tracking-[0.14em] text-slate-400">审核压力</p>
              <p className="mt-2 text-lg font-black text-slate-800">
                当前待审 {stats.communityPending} 条
              </p>
            </div>
            <div className="rounded-[24px] bg-slate-50 px-5 py-4">
              <p className="text-xs font-bold tracking-[0.14em] text-slate-400">扣币能力</p>
              <p className="mt-2 text-lg font-black text-slate-800">
                当前有 {paidAiCount} 个功能开启了魔法币消耗
              </p>
            </div>
            <div className="rounded-[24px] bg-slate-50 px-5 py-4">
              <p className="text-xs font-bold tracking-[0.14em] text-slate-400">用户增长</p>
              <p className="mt-2 text-lg font-black text-slate-800">
                最近新用户 {newestUsers.length} 位已进入后台列表
              </p>
            </div>
          </div>
        </article>

        <article className="rounded-[32px] border border-white/80 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black text-slate-800">最近通知</p>
              <p className="mt-2 text-sm leading-7 text-slate-500">可以快速查看最近发出去的消息内容。</p>
            </div>
            <Link
              href="/admin/notifications"
              className="rounded-full bg-[#fff7ed] px-4 py-2 text-sm font-black text-[#b86a12]"
            >
              去通知中心
            </Link>
          </div>

          <div className="mt-6 space-y-3">
            {notifications.length ? (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="rounded-[22px] border border-slate-100 bg-slate-50 px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-slate-800">{notification.title}</p>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500">
                      {notification.status === "sent" ? "已发送" : "草稿"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-slate-500">{notification.body}</p>
                </div>
              ))
            ) : (
              <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
                还没有通知记录。
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <article className="rounded-[32px] border border-white/80 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black text-slate-800">待审核作品</p>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                先挑出最值得优先处理的内容。
              </p>
            </div>
            <Link href="/admin/review" className="text-sm font-black text-sky-700">
              查看全部
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {pendingPosts.length ? (
              pendingPosts.map((post) => (
                <div key={post.id} className="rounded-[24px] bg-slate-50 p-4">
                  <div className="flex items-start gap-4">
                    <img
                      src={post.preview_image_url}
                      alt={post.title}
                      className="h-20 w-16 rounded-[16px] object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-base font-black text-slate-800">{post.title}</p>
                      <p className="mt-2 line-clamp-2 text-sm leading-7 text-slate-500">
                        {post.prompt}
                      </p>
                      <p className="mt-2 text-xs font-bold text-amber-600">
                        当前阶段：{post.moderation_stage}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
                当前没有待审核作品。
              </div>
            )}
          </div>
        </article>

        <article className="rounded-[32px] border border-white/80 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black text-slate-800">功能入口</p>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                直接进入对应管理页处理具体事项。
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Link href="/admin/site" className="rounded-[24px] bg-[#f8fbff] px-5 py-5">
              <p className="text-base font-black text-slate-800">站点内容</p>
              <p className="mt-2 text-sm leading-7 text-slate-500">编辑首页标题、按钮、品牌信息和 Logo。</p>
            </Link>
            <Link href="/admin/ai" className="rounded-[24px] bg-[#fffaf5] px-5 py-5">
              <p className="text-base font-black text-slate-800">AI 能力配置</p>
              <p className="mt-2 text-sm leading-7 text-slate-500">控制模型、接口、扣币和功能开关。</p>
            </Link>
            <Link href="/admin/users" className="rounded-[24px] bg-[#faf7ff] px-5 py-5">
              <p className="text-base font-black text-slate-800">用户管理</p>
              <p className="mt-2 text-sm leading-7 text-slate-500">调整账号状态、备注和魔法币。</p>
            </Link>
            <Link href="/admin/notifications" className="rounded-[24px] bg-[#f7fff9] px-5 py-5">
              <p className="text-base font-black text-slate-800">通知中心</p>
              <p className="mt-2 text-sm leading-7 text-slate-500">向孩子和管理员发送平台消息。</p>
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}
