"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { marketingNavItems } from "../_components/marketing-nav";

type ProfilePayload = {
  profile: {
    display_name: string | null;
    avatar_color: string | null;
    bio: string | null;
  } | null;
  credits: {
    user_id: string;
    credits: number;
  };
  creditLogs: Array<{
    id: string;
    change_amount: number;
    balance_after: number;
    reason_code: string;
    reason_label: string;
    note: string | null;
    created_at: string;
  }>;
  posts: Array<{
    id: string;
    mode: "coding" | "writing" | "painting";
    title: string;
    description: string | null;
    prompt: string;
    preview_image_url: string;
    moderation_status: "draft" | "pending" | "approved" | "rejected";
    moderation_reason: string | null;
    category: string;
    created_at: string;
  }>;
  orders: Array<{
    order_id: string;
    order_type: "coin_purchase" | "subscription";
    amount: number;
    status: "pending" | "paid" | "cancelled" | "refunded";
    payment_method: string;
    paid_at: string | null;
    created_at: string;
  }>;
  subscriptions: Array<{
    id: string;
    status: "active" | "expired" | "cancelled";
    start_date: string;
    end_date: string;
    last_grant_date: string | null;
    subscription_plans?: {
      name: string;
      daily_coins: number;
      duration_days: number;
      price: number;
    } | null;
  }>;
  phone: string;
};

function maskPhone(phone: string) {
  return phone.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2");
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function formatOrderStatus(status: ProfilePayload["orders"][number]["status"]) {
  if (status === "pending") {
    return "待支付";
  }

  if (status === "paid") {
    return "已支付";
  }

  if (status === "cancelled") {
    return "已取消";
  }

  if (status === "refunded") {
    return "已退款";
  }

  return status;
}

const statusMap = {
  draft: {
    label: "已保存未发布",
    className: "bg-[#eef3ff] text-[#5571c7] border-[#d4ddff]",
  },
  approved: {
    label: "已通过审核",
    className: "bg-[#e7fff2] text-[#1e9b66] border-[#b9f1d2]",
  },
  pending: {
    label: "审核中",
    className: "bg-[#fff6dc] text-[#b77b10] border-[#f4dea0]",
  },
  rejected: {
    label: "未通过",
    className: "bg-[#fff0f4] text-[#cc4c78] border-[#ffc7d8]",
  },
} as const;

function getPostDetailHref(post: ProfilePayload["posts"][number]) {
  return `/community/${post.id}?mode=${post.mode}`;
}

function getWorkshopReuseHref(post: ProfilePayload["posts"][number]) {
  return `/workshop?mode=${post.mode}&fromCommunity=${post.id}`;
}

const moderationNoteMap = {
  draft: {
    eyebrow: "发布限制",
    containerClassName:
      "border-[#d9e3ff] bg-[#f7f9ff] text-[#5a6f9c] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]",
    badgeClassName: "bg-[#e8eeff] text-[#5b6fd4]",
  },
  pending: {
    eyebrow: "审核进度",
    containerClassName:
      "border-[#f4e2b2] bg-[#fffbf1] text-[#8a7141] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]",
    badgeClassName: "bg-[#fff2c8] text-[#ae7c18]",
  },
  rejected: {
    eyebrow: "审核反馈",
    containerClassName:
      "border-[#f0d8de] bg-[#fff9fb] text-[#8f6270] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]",
    badgeClassName: "bg-[#ffe6ef] text-[#bf5a80]",
  },
} as const;

export default function ProfilePage() {
  const router = useRouter();
  const [data, setData] = useState<ProfilePayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCreditPanelOpen, setIsCreditPanelOpen] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        const response = await fetch("/api/community/me", {
          cache: "no-store",
        });
        const payload = (await response.json()) as ProfilePayload & {
          error?: string;
        };

        if (response.status === 401) {
          router.replace("/login?redirect=/profile");
          return;
        }

        if (!response.ok) {
          throw new Error(payload.error ?? "个人主页加载失败。");
        }

        if (mounted) {
          setData(payload);
        }
      } catch (requestError) {
        if (mounted) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "个人主页加载失败。",
          );
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      mounted = false;
    };
  }, [router]);

  const displayName = useMemo(
    () => data?.profile?.display_name || "小创作者",
    [data],
  );
  const avatarColor = useMemo(
    () => data?.profile?.avatar_color || "#7b72ff",
    [data],
  );
  const postStats = useMemo(() => {
    const posts = data?.posts ?? [];
    return {
      all: posts.length,
      draft: posts.filter((post) => post.moderation_status === "draft").length,
      approved: posts.filter((post) => post.moderation_status === "approved").length,
      pending: posts.filter((post) => post.moderation_status === "pending").length,
      rejected: posts.filter((post) => post.moderation_status === "rejected").length,
    };
  }, [data?.posts]);
  const activeSubscription = useMemo(
    () => data?.subscriptions.find((item) => item.status === "active") ?? null,
    [data?.subscriptions],
  );

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#f7f8ff] text-[#17213f]">
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_14%,rgba(117,159,255,0.32),transparent_28%),radial-gradient(circle_at_82%_16%,rgba(255,166,213,0.28),transparent_26%),linear-gradient(180deg,#fff,#f1f6ff)]" />
          <div className="home-grid pointer-events-none absolute inset-0" />
          <div className="relative rounded-[28px] border border-white/80 bg-white/78 px-8 py-10 text-center shadow-[0_24px_70px_rgba(91,111,185,0.16)] backdrop-blur-2xl">
            <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-dashed border-[#9aa8ff]" />
            <p className="mt-5 text-lg font-black text-[#17213f]">正在打开我的主页</p>
          </div>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-[#f7f8ff] text-[#17213f]">
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_14%,rgba(117,159,255,0.32),transparent_28%),radial-gradient(circle_at_82%_16%,rgba(255,166,213,0.28),transparent_26%),linear-gradient(180deg,#fff,#f1f6ff)]" />
          <div className="relative max-w-lg rounded-[28px] border border-white/80 bg-white/78 px-8 py-10 text-center shadow-[0_24px_70px_rgba(91,111,185,0.16)] backdrop-blur-2xl">
            <p className="text-2xl font-black text-[#17213f]">个人主页暂时打不开</p>
            <p className="mt-4 text-sm leading-8 text-[#687394]">
              {error || "刚刚和个人主页失去了一下联系，请稍后再试。"}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 rounded-full bg-[#625cff] px-5 py-3 text-sm font-black text-white"
            >
              重新加载
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8ff] text-[#17213f]">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_10%,rgba(117,159,255,0.34),transparent_26%),radial-gradient(circle_at_84%_14%,rgba(255,166,213,0.28),transparent_24%),radial-gradient(circle_at_50%_70%,rgba(255,205,119,0.16),transparent_28%),linear-gradient(180deg,#ffffff_0%,#f8f9ff_44%,#eff5ff_100%)]" />
          <div className="home-grid absolute inset-0 opacity-80" />
          <div className="home-sweep absolute left-[-10%] top-[18%] h-48 w-[72%] rounded-full bg-[linear-gradient(90deg,rgba(124,148,255,0),rgba(124,148,255,0.24),rgba(255,161,211,0))] blur-3xl" />
        </div>

        <div className="relative mx-auto w-full max-w-[1520px] px-4 py-5 sm:px-6 sm:py-6 lg:px-10">
          <header className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-white/80 bg-white/72 px-4 py-3 shadow-[0_18px_50px_rgba(84,107,170,0.12)] backdrop-blur-2xl">
            <Link href="/" className="flex min-w-0 items-center gap-3 sm:gap-4">
              <Image
                src="/logo.png"
                alt="小红车魔法工坊"
                width={54}
                height={54}
                className="h-11 w-11 rounded-[14px] shadow-[0_12px_28px_rgba(116,142,210,0.16)] sm:h-[54px] sm:w-[54px] sm:rounded-[18px]"
                priority
              />
              <div className="min-w-0">
                <p className="truncate text-[16px] font-semibold tracking-[-0.03em] text-[#17213f] sm:text-[18px]">
                  小红车魔法工坊
                </p>
                <p className="truncate text-[11px] tracking-[0.08em] text-[#677396] sm:text-[12px]">
                  下一代儿童AI创造力平台
                </p>
              </div>
            </Link>

            <div className="flex flex-wrap items-center justify-end gap-3 lg:gap-6">
              {marketingNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="hidden text-[14px] font-semibold tracking-[0.03em] text-[#6a7392] transition hover:text-[#17213f] sm:inline-flex"
                >
                  {item.label}
                </Link>
              ))}
              <div className="flex w-full flex-wrap items-center gap-2 rounded-[22px] border border-[#dce5ff] bg-white/78 p-1.5 sm:w-auto sm:rounded-full">
                <Link
                  href="/community"
                  className="flex-1 rounded-full border border-[#e1e7ff] bg-white px-4 py-2.5 text-center text-[13px] font-semibold text-[#5c6688] transition hover:border-[#bccaff] hover:text-[#273252] sm:flex-none"
                >
                  社区广场
                </Link>
                <form action="/api/auth/logout" method="POST">
                  <button
                    type="submit"
                    className="rounded-full border border-[#e1e7ff] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#5c6688] transition hover:border-[#bccaff] hover:text-[#273252]"
                  >
                    退出登录
                  </button>
                </form>
                <Link
                  href="/workshop?mode=coding"
                  className="flex-1 rounded-full bg-[#625cff] px-5 py-2.5 text-center text-[14px] font-semibold text-white shadow-[0_12px_28px_rgba(98,92,255,0.22)] transition hover:bg-[#544cf4] sm:flex-none"
                >
                  进入工坊
                </Link>
              </div>
            </div>
          </header>

          <section className="grid gap-6 py-8 xl:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
              <div className="relative overflow-hidden rounded-[24px] border border-white/80 bg-white/82 p-5 shadow-[0_20px_56px_rgba(92,116,189,0.13)] backdrop-blur-2xl">
                <div className="absolute right-[-42px] top-[-48px] h-36 w-36 rounded-full bg-[#e9ddff]/80" />
                <div className="relative flex items-start gap-4">
                  <div
                    className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl text-2xl font-black text-white shadow-[0_16px_34px_rgba(91,111,185,0.18)]"
                    style={{ backgroundColor: avatarColor }}
                  >
                    {displayName.slice(0, 1)}
                  </div>
                  <div className="min-w-0 pt-1">
                    <h1 className="truncate text-[26px] font-black tracking-[-0.04em] text-[#17213f]">
                      {displayName}
                    </h1>
                    <p className="mt-1 text-sm font-semibold text-[#7782a4]">
                      {maskPhone(data.phone)}
                    </p>
                  </div>
                </div>
                <p className="relative mt-5 text-[14px] leading-7 text-[#687394]">
                  {data.profile?.bio || "这里会记录你的创作投稿和社区展示进度。"}
                </p>
                <div className="relative mt-5 h-px bg-[#dfe7ff]" />
                <div className="relative mt-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black tracking-[0.14em] text-[#7782a4]">
                      创作状态
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#687394]">
                      {postStats.approved}/{postStats.all} 已展示
                    </p>
                  </div>
                  <Link
                    href="/workshop?mode=coding"
                    className="rounded-full bg-[#625cff] px-4 py-2 text-xs font-black text-white shadow-[0_12px_26px_rgba(98,92,255,0.2)] transition hover:bg-[#544cf4]"
                  >
                    新作品
                  </Link>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCreditPanelOpen(true)}
                className="block w-full rounded-[24px] border border-white/80 bg-white/82 p-5 text-left shadow-[0_16px_44px_rgba(92,116,189,0.1)] backdrop-blur-2xl transition hover:-translate-y-0.5 hover:border-[#cbd5ff]"
              >
                <p className="text-sm font-black tracking-[0.14em] text-[#7782a4]">
                  魔法币
                </p>
                <p className="mt-2 text-[38px] font-black tracking-[-0.06em] text-[#17213f]">
                  {data.credits.credits}
                </p>
                <p className="mt-2 text-sm leading-7 text-[#687394]">
                  点开查看增加、减少和每一次变化原因。
                </p>
              </button>

              <div className="rounded-[24px] border border-white/80 bg-white/82 p-5 shadow-[0_16px_44px_rgba(92,116,189,0.1)] backdrop-blur-2xl">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black tracking-[0.14em] text-[#7782a4]">
                      当前订阅
                    </p>
                    {activeSubscription ? (
                      <>
                        <p className="mt-3 text-lg font-black text-[#17213f]">
                          {activeSubscription.subscription_plans?.name ?? "订阅套餐"}
                        </p>
                        <p className="mt-2 text-sm leading-7 text-[#687394]">
                          每日 {activeSubscription.subscription_plans?.daily_coins ?? 0} 币，
                          到期 {activeSubscription.end_date}
                        </p>
                      </>
                    ) : (
                      <p className="mt-3 text-sm leading-7 text-[#687394]">
                        还没有开通订阅，充值或开卡后每天早上会自动到账魔法币。
                      </p>
                    )}
                  </div>
                  <Link
                    href="/billing"
                    className="rounded-full border border-[#dce5ff] bg-white px-4 py-2 text-xs font-black text-[#5c6688]"
                  >
                    去管理
                  </Link>
                </div>
              </div>

              <div className="rounded-[24px] border border-white/80 bg-white/82 p-5 shadow-[0_16px_44px_rgba(92,116,189,0.1)] backdrop-blur-2xl">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black tracking-[0.14em] text-[#7782a4]">
                    最近订单
                  </p>
                  <Link
                    href="/billing"
                    className="text-xs font-black text-[#625cff]"
                  >
                    查看全部
                  </Link>
                </div>
                <div className="mt-4 space-y-3">
                  {data.orders.length ? (
                    data.orders.slice(0, 3).map((order) => (
                      <div
                        key={order.order_id}
                        className="rounded-[18px] border border-[#e4eaff] bg-[#f8faff] px-4 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-black text-[#17213f]">
                              {order.order_type === "coin_purchase" ? "魔法币充值" : "订阅购买"}
                            </p>
                            <p className="mt-1 text-xs text-[#8a95b5]">
                              {formatDate(order.created_at)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-black text-[#17213f]">
                              ¥{(order.amount / 100).toFixed(2)}
                            </p>
                            <p className="mt-1 text-xs text-[#8a95b5]">
                              {formatOrderStatus(order.status)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[18px] border border-dashed border-[#dce5ff] bg-[#f8faff] px-4 py-5 text-sm text-[#687394]">
                      还没有充值或订阅订单。
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  ["全部投稿", postStats.all],
                  ["已保存", postStats.draft],
                  ["已通过", postStats.approved],
                  ["审核中", postStats.pending],
                  ["未通过", postStats.rejected],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-[20px] border border-white/80 bg-white/76 px-4 py-4 shadow-[0_10px_28px_rgba(92,116,189,0.08)]"
                  >
                    <p className="text-xs font-semibold text-[#7782a4]">{label}</p>
                    <p className="mt-2 text-[28px] font-black text-[#17213f]">{value}</p>
                  </div>
                ))}
              </div>
            </aside>

            <section className="min-w-0">
              <div className="rounded-[28px] border border-white/80 bg-white/62 p-6 shadow-[0_18px_54px_rgba(91,111,185,0.1)] backdrop-blur-2xl sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-5">
                  <div className="max-w-3xl">
                  <div className="inline-flex rounded-full border border-[#d9e2ff] bg-white/72 px-4 py-2 text-xs font-black tracking-[0.18em] text-[#6875a5] shadow-[0_12px_34px_rgba(112,138,215,0.12)]">
                    我的主页 PROFILE
                  </div>
                    <h2 className="mt-5 text-[32px] font-black leading-[1.05] tracking-[-0.06em] text-[#151f3d] sm:text-[52px]">
                    我的创作档案
                  </h2>
                    <p className="mt-4 text-sm leading-7 text-[#687394]">
                      按时间整理你的社区投稿、审核状态和展示进度，最新作品会排在最前面。
                    </p>
                </div>
                <Link
                  href="/workshop?mode=coding"
                    className="rounded-full bg-[#625cff] px-6 py-3 text-sm font-black text-white shadow-[0_14px_32px_rgba(98,92,255,0.22)] transition hover:bg-[#544cf4]"
                >
                  去做新作品
                </Link>
              </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-5">
                  {[
                    ["全部", postStats.all],
                    ["未发布", postStats.draft],
                    ["已展示", postStats.approved],
                    ["审核中", postStats.pending],
                    ["需调整", postStats.rejected],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-[18px] border border-[#e4eaff] bg-white/72 px-4 py-3"
                    >
                      <p className="text-xs font-bold text-[#8190b2]">{label}</p>
                      <p className="mt-1 text-2xl font-black text-[#17213f]">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid gap-5 2xl:grid-cols-2">
                {data.posts.length ? (
                  data.posts.map((post) => {
                    const status =
                      statusMap[post.moderation_status as keyof typeof statusMap] ||
                      statusMap.pending;
                    const moderationNote =
                      post.moderation_status === "approved"
                        ? null
                        : moderationNoteMap[
                            post.moderation_status as keyof typeof moderationNoteMap
                          ] || moderationNoteMap.pending;

                    return (
                      <article
                        key={post.id}
                        className="group grid gap-4 rounded-[24px] border border-white/80 bg-white/82 p-4 shadow-[0_14px_42px_rgba(91,111,185,0.1)] backdrop-blur-2xl transition hover:-translate-y-0.5 hover:shadow-[0_24px_62px_rgba(91,111,185,0.16)] md:grid-cols-[154px_minmax(0,1fr)]"
                      >
                        <div className="overflow-hidden rounded-[20px] bg-[#edf2ff]">
                          <img
                            src={post.preview_image_url}
                            alt={post.title}
                            className="aspect-[4/3] h-full w-full object-cover transition duration-500 group-hover:scale-[1.03] md:aspect-square"
                          />
                        </div>

                        <div className="flex min-w-0 flex-col">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black ${status.className}`}
                            >
                              {status.label}
                            </span>
                            <span className="inline-flex rounded-full border border-[#dfe7ff] bg-[#f8f9ff] px-2.5 py-1 text-[11px] font-black text-[#627ee6]">
                              {post.category}
                            </span>
                            <span className="text-xs font-semibold text-[#8a95b5]">
                              {formatDate(post.created_at)}
                            </span>
                          </div>

                          <h3 className="mt-3 line-clamp-2 text-[22px] font-black leading-[1.16] tracking-[-0.04em] text-[#17213f]">
                            {post.title}
                          </h3>

                          <p className="mt-2 line-clamp-2 text-sm leading-7 text-[#687394]">
                            {post.description || post.prompt}
                          </p>

                          {post.moderation_reason && moderationNote && (
                            <div
                              className={`mt-4 inline-flex max-w-full items-start gap-2 rounded-[16px] border px-3 py-2.5 text-sm leading-6 ${moderationNote.containerClassName}`}
                            >
                              <span
                                className={`mt-0.5 inline-flex shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black tracking-[0.08em] ${moderationNote.badgeClassName}`}
                              >
                                {moderationNote.eyebrow}
                              </span>
                              <p className="min-w-0 line-clamp-2 font-semibold">
                                {post.moderation_reason}
                              </p>
                            </div>
                          )}

                          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <Link
                              href={getPostDetailHref(post)}
                              className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#625cff] px-4 py-2 text-center text-xs font-black text-white shadow-[0_12px_26px_rgba(98,92,255,0.18)] transition hover:bg-[#544cf4]"
                            >
                              打开作品
                            </Link>
                            <Link
                              href={getWorkshopReuseHref(post)}
                              className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#dce5ff] bg-white px-4 py-2 text-center text-xs font-black text-[#5c6688] transition hover:border-[#bccaff] hover:text-[#273252]"
                            >
                              复用到工坊
                            </Link>
                            <button
                              type="button"
                              disabled={deletingPostId === post.id}
                              onClick={async () => {
                                const confirmed = window.confirm(
                                  `确定删除《${post.title}》吗？删除后会同步从成长社区移除，点赞和互动记录也会一起清掉。`,
                                );

                                if (!confirmed) {
                                  return;
                                }

                                setDeletingPostId(post.id);

                                try {
                                  const response = await fetch(
                                    `/api/community/posts/${post.id}`,
                                    { method: "DELETE" },
                                  );
                                  const payload = (await response.json()) as {
                                    error?: string;
                                  };

                                  if (!response.ok) {
                                    throw new Error(payload.error ?? "删除作品失败。");
                                  }

                                  setData((current) =>
                                    current
                                      ? {
                                          ...current,
                                          posts: current.posts.filter(
                                            (item) => item.id !== post.id,
                                          ),
                                        }
                                      : current,
                                  );
                                } catch (requestError) {
                                  window.alert(
                                    requestError instanceof Error
                                      ? requestError.message
                                      : "删除作品失败。",
                                  );
                                } finally {
                                  setDeletingPostId(null);
                                }
                              }}
                              className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#ffd2de] bg-white px-4 py-2 text-center text-xs font-black text-[#c45a7e] transition hover:border-[#ffb1c6] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {deletingPostId === post.id ? "删除中" : "删除作品"}
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <div className="flex min-h-[360px] items-center justify-center rounded-[28px] border border-white/80 bg-white/76 text-center shadow-[0_18px_54px_rgba(91,111,185,0.12)] backdrop-blur-2xl">
                    <div className="max-w-md px-6">
                      <h3 className="text-[30px] font-black tracking-[-0.05em] text-[#17213f]">
                        还没有投稿记录
                      </h3>
                      <p className="mt-4 text-[15px] leading-8 text-[#687394]">
                        先去工坊生成一个小程序作品，再点击分享进社区，这里就会出现投稿与审核状态。
                      </p>
                      <Link
                        href="/workshop?mode=coding"
                        className="mt-7 inline-flex rounded-full bg-[#625cff] px-6 py-3 text-sm font-black text-white"
                      >
                        开始创作
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </section>
        </div>
      </div>

      {isCreditPanelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17213f]/28 px-4 py-4 backdrop-blur-md sm:px-5">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[28px] border border-white/80 bg-white/92 p-5 shadow-[0_30px_90px_rgba(40,53,100,0.26)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black tracking-[0.14em] text-[#7782a4]">
                  魔法币明细
                </p>
                <h3 className="mt-2 text-[28px] font-black tracking-[-0.05em] text-[#17213f] sm:text-[34px]">
                  我的魔法币账本
                </h3>
                <p className="mt-3 text-sm leading-7 text-[#687394]">
                  这里会告诉你魔法币什么时候增加、什么时候减少，以及对应原因。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreditPanelOpen(false)}
                className="grid h-11 w-11 place-items-center rounded-full border border-[#dce5ff] bg-white text-xl font-black text-[#687394] transition hover:border-[#bccaff] hover:text-[#273252]"
              >
                ×
              </button>
            </div>

            <div className="mt-6 rounded-[22px] border border-[#e3e9ff] bg-[#f8faff] p-5">
              <p className="text-sm font-semibold text-[#7782a4]">当前剩余魔法币</p>
              <p className="mt-2 text-[34px] font-black tracking-[-0.06em] text-[#17213f] sm:text-[42px]">
                {data.credits.credits}
              </p>
            </div>

            <div className="mt-6 max-h-[420px] space-y-3 overflow-y-auto pr-2">
              {data.creditLogs.length ? (
                data.creditLogs.map((log) => {
                  const isIncome = log.change_amount > 0;

                  return (
                    <div
                      key={log.id}
                      className="rounded-[22px] border border-[#e3e9ff] bg-white px-5 py-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-black text-[#17213f]">
                            {log.reason_label}
                          </p>
                          <p className="mt-2 text-sm leading-7 text-[#687394]">
                            {log.note || "系统记录了一次魔法币变化。"}
                          </p>
                          <p className="mt-2 text-xs font-semibold text-[#9aa5c5]">
                            {formatDate(log.created_at)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-xl font-black ${
                              isIncome ? "text-[#1e9b66]" : "text-[#cc4c78]"
                            }`}
                          >
                            {isIncome ? `+${log.change_amount}` : log.change_amount}
                          </p>
                          <p className="mt-2 text-xs font-semibold text-[#8a95b5]">
                            变化后余额 {log.balance_after}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-[22px] border border-dashed border-[#d6def8] bg-[#f8faff] px-5 py-10 text-center text-sm text-[#7380a4]">
                  这里暂时还没有魔法币变化记录。
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
