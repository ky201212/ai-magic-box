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
    () => data?.profile?.avatar_color || "#7b72ff",
    [data],
  );
  const postStats = useMemo(() => {
    const posts = data?.posts ?? [];
    return {
      all: posts.length,
      approved: posts.filter((post) => post.moderation_status === "approved").length,
      pending: posts.filter((post) => post.moderation_status === "pending").length,
      rejected: posts.filter((post) => post.moderation_status === "rejected").length,
    };
  }, [data?.posts]);

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

        <div className="relative mx-auto w-full max-w-[1760px] px-5 py-6 sm:px-8 lg:px-12 xl:px-16">
          <header className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-white/80 bg-white/72 px-4 py-3 shadow-[0_18px_50px_rgba(84,107,170,0.12)] backdrop-blur-2xl">
            <Link href="/" className="flex items-center gap-4">
              <Image
                src="/logo.png"
                alt="小红车魔法工坊"
                width={54}
                height={54}
                className="rounded-[18px] shadow-[0_12px_28px_rgba(116,142,210,0.16)]"
                priority
              />
              <div>
                <p className="text-[18px] font-semibold tracking-[-0.03em] text-[#17213f]">
                  小红车魔法工坊
                </p>
                <p className="text-[12px] tracking-[0.08em] text-[#677396]">
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
              <div className="flex items-center gap-2 rounded-full border border-[#dce5ff] bg-white/78 p-1.5">
                <Link
                  href="/community"
                  className="rounded-full border border-[#e1e7ff] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#5c6688] transition hover:border-[#bccaff] hover:text-[#273252]"
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
                  className="rounded-full bg-[#625cff] px-5 py-2.5 text-[14px] font-semibold text-white shadow-[0_12px_28px_rgba(98,92,255,0.22)] transition hover:bg-[#544cf4]"
                >
                  进入工坊
                </Link>
              </div>
            </div>
          </header>

          <section className="grid gap-8 py-12 xl:grid-cols-[360px_minmax(0,1fr)]">
            <aside className="space-y-5">
              <div className="relative overflow-hidden rounded-[28px] border border-white/80 bg-white/76 p-6 shadow-[0_24px_70px_rgba(92,116,189,0.16)] backdrop-blur-2xl">
                <div className="absolute right-[-34px] top-[-34px] h-32 w-32 rounded-full bg-[#e9ddff]" />
                <div className="relative">
                  <div
                    className="grid h-20 w-20 place-items-center rounded-full text-3xl font-black text-white shadow-[0_16px_34px_rgba(91,111,185,0.18)]"
                    style={{ backgroundColor: avatarColor }}
                  >
                    {displayName.slice(0, 1)}
                  </div>
                  <h1 className="mt-5 text-[34px] font-black tracking-[-0.05em] text-[#17213f]">
                    {displayName}
                  </h1>
                  <p className="mt-2 text-sm font-semibold text-[#7782a4]">
                    {maskPhone(data.phone)}
                  </p>
                  <p className="mt-5 text-[15px] leading-8 text-[#687394]">
                    {data.profile?.bio || "这里会记录你的创作投稿和社区展示进度。"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCreditPanelOpen(true)}
                className="block w-full rounded-[28px] border border-white/80 bg-white/76 p-6 text-left shadow-[0_18px_54px_rgba(92,116,189,0.13)] backdrop-blur-2xl transition hover:-translate-y-0.5 hover:border-[#cbd5ff]"
              >
                <p className="text-sm font-black tracking-[0.14em] text-[#7782a4]">
                  魔法币
                </p>
                <p className="mt-3 text-[42px] font-black tracking-[-0.06em] text-[#17213f]">
                  {data.credits.credits}
                </p>
                <p className="mt-3 text-sm leading-7 text-[#687394]">
                  点开查看增加、减少和每一次变化原因。
                </p>
              </button>

              <div className="grid grid-cols-2 gap-3">
                {[
                  ["全部投稿", postStats.all],
                  ["已通过", postStats.approved],
                  ["审核中", postStats.pending],
                  ["未通过", postStats.rejected],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-[22px] border border-white/80 bg-white/72 px-4 py-4 shadow-[0_12px_34px_rgba(92,116,189,0.1)]"
                  >
                    <p className="text-xs font-semibold text-[#7782a4]">{label}</p>
                    <p className="mt-2 text-[28px] font-black text-[#17213f]">{value}</p>
                  </div>
                ))}
              </div>
            </aside>

            <section className="min-w-0">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="inline-flex rounded-full border border-[#d9e2ff] bg-white/72 px-4 py-2 text-xs font-black tracking-[0.18em] text-[#6875a5] shadow-[0_12px_34px_rgba(112,138,215,0.12)]">
                    我的主页 PROFILE
                  </div>
                  <h2 className="mt-5 text-[40px] font-black leading-[1] tracking-[-0.06em] text-[#151f3d] sm:text-[56px]">
                    我的创作档案
                  </h2>
                </div>
                <Link
                  href="/workshop?mode=coding"
                  className="rounded-full bg-[#625cff] px-6 py-3 text-sm font-black text-white shadow-[0_14px_32px_rgba(98,92,255,0.22)] transition hover:bg-[#544cf4]"
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
                        className="grid gap-5 rounded-[26px] border border-white/80 bg-white/78 p-5 shadow-[0_18px_54px_rgba(91,111,185,0.13)] backdrop-blur-2xl transition hover:-translate-y-0.5 hover:shadow-[0_26px_70px_rgba(91,111,185,0.18)] lg:grid-cols-[190px_minmax(0,1fr)]"
                      >
                        <div className="overflow-hidden rounded-[22px] bg-[#edf2ff]">
                          <img
                            src={post.preview_image_url}
                            alt={post.title}
                            className="aspect-[4/3] h-full w-full object-cover lg:aspect-[5/4]"
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-3">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${status.className}`}
                            >
                              {status.label}
                            </span>
                            <span className="text-xs font-semibold text-[#8a95b5]">
                              {formatDate(post.created_at)}
                            </span>
                          </div>

                          <h3 className="mt-4 text-[26px] font-black leading-[1.16] tracking-[-0.04em] text-[#17213f]">
                            {post.title}
                          </h3>

                          <p className="mt-3 line-clamp-3 text-sm leading-7 text-[#687394]">
                            {post.prompt}
                          </p>

                          {post.moderation_reason && (
                            <div className="mt-4 rounded-[18px] border border-[#ffc7d8] bg-[#fff4f7] px-4 py-3 text-sm font-semibold leading-7 text-[#c94c78]">
                              审核说明：{post.moderation_reason}
                            </div>
                          )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17213f]/28 px-5 backdrop-blur-md">
          <div className="w-full max-w-3xl rounded-[28px] border border-white/80 bg-white/92 p-6 shadow-[0_30px_90px_rgba(40,53,100,0.26)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black tracking-[0.14em] text-[#7782a4]">
                  魔法币明细
                </p>
                <h3 className="mt-2 text-[34px] font-black tracking-[-0.05em] text-[#17213f]">
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
              <p className="mt-2 text-[42px] font-black tracking-[-0.06em] text-[#17213f]">
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
