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
    title: string;
    prompt: string;
    preview_image_url: string;
    moderation_status: "pending" | "approved" | "rejected";
    moderation_reason: string | null;
    created_at: string;
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

const statusMap = {
  approved: {
    label: "已通过审核",
    className: "bg-[#e7fff2] text-[#1e9b66]",
  },
  pending: {
    label: "审核中",
    className: "bg-[#fff6dc] text-[#c88914]",
  },
  rejected: {
    label: "未通过",
    className: "bg-[#fff0f3] text-[#d45b85]",
  },
} as const;

export default function ProfilePage() {
  const router = useRouter();
  const [data, setData] = useState<ProfilePayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCreditPanelOpen, setIsCreditPanelOpen] = useState(false);

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
    () => data?.profile?.avatar_color || "#8b5cf6",
    [data],
  );

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#080512] text-white">
        <div className="flex min-h-screen items-center justify-center">
          <div className="rounded-[28px] border border-white/10 bg-white/6 px-8 py-10 text-center backdrop-blur-xl">
            <div className="mx-auto h-14 w-14 rounded-full border-4 border-dashed border-white/30 animate-spin" />
            <p className="mt-5 text-lg font-black text-white">正在打开我的主页</p>
          </div>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-[#080512] text-white">
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="max-w-lg rounded-[28px] border border-white/10 bg-white/6 px-8 py-10 text-center backdrop-blur-xl">
            <p className="text-2xl font-black text-white">个人主页暂时打不开</p>
            <p className="mt-4 text-sm leading-8 text-white/60">
              {error || "刚刚和个人主页失去了一下联系，请稍后再试。"}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 rounded-full bg-white px-5 py-3 text-sm font-black text-[#1e1338]"
            >
              重新加载
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#080512] text-white">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#06030d_0%,#0b0616_22%,#10081f_54%,#080512_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_12%,rgba(133,212,255,0.12),transparent_16%),radial-gradient(circle_at_86%_18%,rgba(248,183,129,0.1),transparent_20%),radial-gradient(circle_at_46%_78%,rgba(188,118,255,0.08),transparent_24%)]" />
        </div>

        <div className="relative mx-auto w-full max-w-[1920px] px-10 py-8 lg:px-14 xl:px-20">
          <header className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-4">
              <Image
                src="/logo.png"
                alt="小红车魔法工坊"
                width={54}
                height={54}
                className="rounded-[18px]"
                priority
              />
              <div>
                <p className="text-[18px] font-semibold tracking-[-0.03em] text-white">
                  小红车魔法工坊
                </p>
                <p className="text-[12px] tracking-[0.08em] text-white/40">
                  下一代儿童AI创造力平台
                </p>
              </div>
            </Link>

            <div className="hidden items-center gap-8 lg:flex">
              {marketingNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-[14px] font-medium tracking-[0.03em] text-white/52 transition hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
              <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/6 p-2 pl-3 backdrop-blur-xl">
                <Link
                  href="/community"
                  className="rounded-full border border-white/10 bg-white/6 px-4 py-2.5 text-[13px] font-semibold text-white/78 transition hover:bg-white/10 hover:text-white"
                >
                  社区广场
                </Link>
                <form action="/api/auth/logout" method="POST">
                  <button
                    type="submit"
                    className="rounded-full border border-white/10 bg-white/6 px-4 py-2.5 text-[13px] font-semibold text-white/78 transition hover:bg-white/10 hover:text-white"
                  >
                    退出登录
                  </button>
                </form>
                <Link
                  href="/workshop?mode=coding"
                  className="rounded-full bg-white px-6 py-2.5 text-[14px] font-semibold text-[#1e1338] transition hover:bg-white/92"
                >
                  进入工坊
                </Link>
              </div>
            </div>
          </header>

          <section className="grid gap-8 py-16 xl:grid-cols-[360px_1fr]">
            <aside className="space-y-6">
              <div className="rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0.04))] p-7 shadow-[0_26px_64px_rgba(0,0,0,0.24)] backdrop-blur-xl">
                <div
                  className="grid h-20 w-20 place-items-center rounded-full text-3xl font-black text-white"
                  style={{ backgroundColor: avatarColor }}
                >
                  {displayName.slice(0, 1)}
                </div>
                <h1 className="mt-5 text-[34px] font-black tracking-[-0.05em] text-white">
                  {displayName}
                </h1>
                <p className="mt-2 text-sm text-white/44">
                  {maskPhone(data.phone)}
                </p>
                <p className="mt-5 text-[15px] leading-8 text-white/62">
                  {data.profile?.bio || "这里会记录你的创作投稿和社区展示进度。"}
                </p>
              </div>

              <div className="rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0.04))] p-7 shadow-[0_26px_64px_rgba(0,0,0,0.24)] backdrop-blur-xl">
                <p className="text-sm font-semibold tracking-[0.14em] text-white/48">
                  创作资产
                </p>
                <button
                  type="button"
                  onClick={() => setIsCreditPanelOpen(true)}
                  className="mt-5 block w-full rounded-[26px] bg-white/7 p-5 text-left transition hover:bg-white/10"
                >
                  <p className="text-sm text-white/50">剩余魔法币</p>
                  <p className="mt-2 text-[38px] font-black tracking-[-0.05em] text-white">
                    {data.credits.credits}
                  </p>
                  <p className="mt-3 text-xs leading-6 text-white/46">
                    点开可以查看魔法币什么时候增加、什么时候减少。
                  </p>
                </button>
                <div className="mt-4 rounded-[26px] bg-white/7 p-5">
                  <p className="text-sm text-white/50">累计投稿</p>
                  <p className="mt-2 text-[38px] font-black tracking-[-0.05em] text-white">
                    {data.posts.length}
                  </p>
                </div>
              </div>
            </aside>

            <section className="rounded-[38px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0.04))] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.26)] backdrop-blur-xl">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold tracking-[0.14em] text-white/48">
                    我的投稿
                  </p>
                  <h2 className="mt-2 text-[42px] font-black tracking-[-0.06em] text-white">
                    作品状态一览
                  </h2>
                </div>
                <Link
                  href="/workshop?mode=coding"
                  className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#1e1338] transition hover:bg-white/92"
                >
                  去做新作品
                </Link>
              </div>

              <div className="mt-8 space-y-4">
                {data.posts.length ? (
                  data.posts.map((post) => {
                    const status =
                      statusMap[post.moderation_status as keyof typeof statusMap] ||
                      statusMap.pending;

                    return (
                      <article
                        key={post.id}
                        className="grid gap-5 rounded-[30px] border border-white/10 bg-white/6 p-5 lg:grid-cols-[220px_1fr]"
                      >
                        <div className="overflow-hidden rounded-[24px] bg-white/8">
                          <img
                            src={post.preview_image_url}
                            alt={post.title}
                            className="aspect-[4/5] h-full w-full object-cover"
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-3">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}
                            >
                              {status.label}
                            </span>
                            <span className="text-xs text-white/38">
                              {formatDate(post.created_at)}
                            </span>
                          </div>

                          <h3 className="mt-4 text-[28px] font-black leading-[1.12] tracking-[-0.04em] text-white">
                            {post.title}
                          </h3>

                          <div className="mt-4 rounded-[22px] border border-white/10 bg-white/5 p-4">
                            <p className="text-xs font-semibold tracking-[0.14em] text-white/40">
                              提示词
                            </p>
                            <p className="mt-3 line-clamp-4 text-sm leading-7 text-white/64">
                              {post.prompt}
                            </p>
                          </div>

                          {post.moderation_reason && (
                            <div className="mt-4 rounded-[20px] bg-[#fff1f2] px-4 py-3 text-sm font-semibold leading-7 text-[#d45b85]">
                              审核说明：{post.moderation_reason}
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <div className="flex min-h-[360px] items-center justify-center rounded-[30px] border border-white/10 bg-white/6 text-center">
                    <div className="max-w-md px-6">
                      <h3 className="text-[30px] font-black tracking-[-0.05em] text-white">
                        还没有投稿记录
                      </h3>
                      <p className="mt-4 text-[15px] leading-8 text-white/58">
                        先去工坊生成一个小程序作品，再点击分享进社区，这里就会出现你的投稿与审核状态。
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </section>
        </div>
      </div>

      {isCreditPanelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#05030d]/58 px-6 backdrop-blur-md">
          <div className="w-full max-w-3xl rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(28,20,52,0.98),rgba(17,11,33,0.98))] p-7 shadow-[0_30px_80px_rgba(0,0,0,0.42)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold tracking-[0.14em] text-white/42">
                  魔法币明细
                </p>
                <h3 className="mt-2 text-[34px] font-black tracking-[-0.05em] text-white">
                  我的魔法币账本
                </h3>
                <p className="mt-3 text-sm leading-7 text-white/58">
                  这里会告诉你魔法币什么时候增加、什么时候减少，以及对应的原因。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreditPanelOpen(false)}
                className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-xl font-black text-white/70 transition hover:bg-white/14 hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="mt-6 rounded-[26px] bg-white/6 p-5">
              <p className="text-sm text-white/50">当前剩余魔法币</p>
              <p className="mt-2 text-[42px] font-black tracking-[-0.06em] text-white">
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
                      className="rounded-[24px] border border-white/10 bg-white/6 px-5 py-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-black text-white">
                            {log.reason_label}
                          </p>
                          <p className="mt-2 text-sm leading-7 text-white/56">
                            {log.note || "系统记录了一次魔法币变化。"}
                          </p>
                          <p className="mt-2 text-xs text-white/34">
                            {formatDate(log.created_at)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-xl font-black ${
                              isIncome ? "text-[#9de0be]" : "text-[#ffb8cf]"
                            }`}
                          >
                            {isIncome ? `+${log.change_amount}` : log.change_amount}
                          </p>
                          <p className="mt-2 text-xs text-white/40">
                            变化后余额 {log.balance_after}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-[24px] border border-dashed border-white/12 bg-white/6 px-5 py-10 text-center text-sm text-white/46">
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
