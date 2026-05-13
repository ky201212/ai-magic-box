import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { marketingNavItems } from "../_components/marketing-nav";

const pillars = [
  {
    title: "先让孩子想点进去",
    body: "学习不是从被要求开始，而是从被吸引开始。页面、角色、互动和作品反馈，都应该先唤起探索欲。",
  },
  {
    title: "再让家长看见价值",
    body: "不是只展示“用了AI”，而是能让家长看见表达力、逻辑力、审美力和科技理解力正在一起成长。",
  },
  {
    title: "最后让AI退到幕后",
    body: "平台真正想被看见的，从来不是模型本身，而是孩子如何提出问题、组织想法、完成创作。",
  },
];

export default async function BrandPage() {
  const cookieStore = await cookies();
  const isLoggedIn = Boolean(cookieStore.get("magic_session")?.value);

  return (
    <main className="min-h-screen bg-[#080512] text-white">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#06030d_0%,#0b0616_24%,#10081f_52%,#080512_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(113,219,255,0.1),transparent_18%),radial-gradient(circle_at_88%_12%,rgba(174,108,255,0.12),transparent_20%)]" />
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
                  className={`text-[14px] font-medium tracking-[0.03em] transition hover:text-white ${
                    item.href === "/brand" ? "text-white" : "text-white/52"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/6 p-2 pl-3 backdrop-blur-xl">
                {isLoggedIn ? (
                  <form action="/api/auth/logout" method="POST">
                    <button
                      type="submit"
                      className="rounded-full border border-white/10 bg-white/6 px-4 py-2.5 text-[13px] font-semibold text-white/78 transition hover:bg-white/10 hover:text-white"
                    >
                      退出登录
                    </button>
                  </form>
                ) : (
                  <Link
                    href="/login"
                    className="rounded-full border border-white/10 bg-white/6 px-4 py-2.5 text-[13px] font-semibold text-white/78 transition hover:bg-white/10 hover:text-white"
                  >
                    手机号登录
                  </Link>
                )}
                <Link
                  href="/workshop?mode=coding"
                  className="rounded-full bg-white px-6 py-2.5 text-[14px] font-semibold text-[#1e1338] transition hover:bg-white/92"
                >
                  进入工坊
                </Link>
              </div>
            </div>
          </header>

          <section className="grid min-h-[calc(100vh-120px)] items-center gap-12 py-16 lg:grid-cols-[0.92fr_1.08fr]">
            <div>
              <div className="inline-flex rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs font-semibold tracking-[0.18em] text-white/66">
                品牌主张
              </div>
              <h1 className="mt-6 max-w-[10ch] text-[62px] font-black leading-[0.98] tracking-[-0.075em] text-white xl:text-[82px]">
                我们想打造的
                <br />
                不是工具站
                <br />
                而是一座儿童创造宇宙
              </h1>
              <p className="mt-8 max-w-[34ch] text-[18px] leading-9 text-white/58">
                小红车魔法工坊相信，真正好的AI教育平台，不该先要求孩子适应技术，而应该先让技术适应孩子的好奇心、表达欲和创造力。
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              {pillars.map((item) => (
                <article
                  key={item.title}
                  className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-6 shadow-[0_18px_44px_rgba(0,0,0,0.22)] backdrop-blur-xl"
                >
                  <div className="h-10 w-10 rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.06))]" />
                  <h2 className="mt-6 text-[24px] font-black leading-[1.1] tracking-[-0.05em] text-white">
                    {item.title}
                  </h2>
                  <p className="mt-4 text-[15px] leading-8 text-white/54">{item.body}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
