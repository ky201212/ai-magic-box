import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { marketingNavItems } from "../_components/marketing-nav";

const matrixCards = [
  {
    title: "AI编程体验馆",
    description: "一句想法，立刻变成能运行、能互动、能展示的小程序作品。",
    href: "/workshop?mode=coding",
    badge: "正在开放",
    iconSrc: "/landing-assets/icon-code.png",
  },
  {
    title: "AI绘画工作坊",
    description: "把角色、色彩和场景从脑海里带出来，变成一张完整画面。",
    href: "/workshop?mode=painting",
    badge: "灵感成像",
    iconSrc: "/landing-assets/icon-palette.png",
  },
  {
    title: "AI写作实验室",
    description: "从童话、诗歌到演讲稿，把零散灵感写成完整表达。",
    href: "/workshop?mode=writing",
    badge: "表达升级",
    iconSrc: "/landing-assets/icon-doc.png",
  },
  {
    title: "AI音乐工坊",
    description: "让旋律、节奏与情绪也成为孩子表达世界的一部分。",
    badge: "即将开放",
    iconSrc: "/landing-assets/icon-music.png",
  },
  {
    title: "AI视频工场",
    description: "把故事、镜头和节奏连接起来，让知识表达拥有电影感。",
    badge: "即将开放",
    iconSrc: "/landing-assets/icon-video.png",
  },
  {
    title: "AI建模星球",
    description: "从平面想象迈向立体构造，让未来工程感进入孩子世界观。",
    badge: "即将开放",
    iconSrc: "/landing-assets/icon-cube.png",
  },
];

export default async function MatrixPage() {
  const cookieStore = await cookies();
  const isLoggedIn = Boolean(cookieStore.get("magic_session")?.value);

  return (
    <main className="min-h-screen bg-[#080512] text-white">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#06030d_0%,#0b0616_24%,#10081f_52%,#080512_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_14%,rgba(113,219,255,0.1),transparent_18%),radial-gradient(circle_at_84%_18%,rgba(174,108,255,0.12),transparent_22%)]" />
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
                    item.href === "/matrix" ? "text-white" : "text-white/52"
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

          <section className="py-16">
            <div className="inline-flex rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs font-semibold tracking-[0.18em] text-white/66">
              创作矩阵
            </div>
            <h1 className="mt-6 max-w-[10ch] text-[60px] font-black leading-[0.98] tracking-[-0.075em] text-white xl:text-[78px]">
              每一种表达方式
              <br />
              都可以成为孩子的创作入口
            </h1>
            <p className="mt-6 max-w-[42ch] text-[18px] leading-9 text-white/56">
              我们把不同模态的AI能力，变成不同类型的创作工坊。孩子不需要先理解技术名词，只需要选择自己最想表达的方式。
            </p>

            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {matrixCards.map((card) => {
                const content = (
                  <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(43,31,102,0.56),rgba(17,11,40,0.96))] p-6 shadow-[0_24px_64px_rgba(0,0,0,0.28)]">
                    <div className="flex items-start justify-between gap-4">
                      <div className="grid h-14 w-14 place-items-center rounded-[18px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.06))] backdrop-blur-xl">
                        <Image
                          src={card.iconSrc}
                          alt={card.title}
                          width={46}
                          height={46}
                          className="h-9 w-9 object-contain"
                        />
                      </div>
                      <div className="inline-flex rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-semibold tracking-[0.12em] text-white/66">
                        {card.badge}
                      </div>
                    </div>
                    <h2 className="mt-8 text-[34px] font-black leading-[1.04] tracking-[-0.06em] text-white">
                      {card.title}
                    </h2>
                    <p className="mt-4 text-[15px] leading-8 text-white/56">
                      {card.description}
                    </p>
                    <div className="mt-8 inline-flex rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm font-semibold text-white/80">
                      {card.href ? "进入体验" : "敬请期待"}
                    </div>
                  </div>
                );

                if (card.href) {
                  return (
                    <Link key={card.title} href={card.href} className="block">
                      {content}
                    </Link>
                  );
                }

                return (
                  <div key={card.title} className="text-left">
                    {content}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
