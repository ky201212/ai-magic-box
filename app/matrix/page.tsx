import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { marketingNavItems } from "../_components/marketing-nav";
import { getBrandIdentitySetting } from "@/lib/site-config";

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
  const brandIdentity = await getBrandIdentitySetting();

  return (
    <main className="min-h-screen bg-[#f7fbff] text-[#17213f]">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#f7fbff_0%,#eef5ff_44%,#fff6fb_100%)]" />
          <div className="home-grid absolute inset-0 opacity-[0.55]" />
          <div className="home-sweep absolute left-[-20%] top-[10%] h-[24rem] w-[140%] rotate-[-8deg] bg-[linear-gradient(90deg,transparent,rgba(135,166,255,0.18),rgba(255,177,210,0.16),transparent)] blur-2xl" />
          <div className="absolute left-[-8%] top-[4%] h-[420px] w-[420px] rounded-full bg-[#8edaff]/18 blur-[130px]" />
          <div className="absolute right-[-8%] top-[4%] h-[520px] w-[520px] rounded-full bg-[#ddb7ff]/22 blur-[150px]" />
        </div>

        <div className="relative mx-auto w-full max-w-[1920px] px-10 py-8 lg:px-14 xl:px-20">
          <header className="flex items-center justify-between rounded-[28px] border border-white/80 bg-white/72 px-6 py-5 shadow-[0_18px_50px_rgba(84,107,170,0.12)] backdrop-blur-2xl">
            <Link href="/" className="flex items-center gap-4">
              <Image
                src={brandIdentity.logoUrl}
                alt={brandIdentity.siteName}
                width={54}
                height={54}
                className="rounded-[18px] bg-white object-cover shadow-[0_12px_28px_rgba(87,115,180,0.16)]"
                priority
              />
              <div>
                <p className="text-[18px] font-semibold tracking-[-0.03em] text-[#17213f]">
                  {brandIdentity.siteName}
                </p>
                <p className="text-[12px] tracking-[0.08em] text-[#6d7899]">
                  {brandIdentity.tagline}
                </p>
              </div>
            </Link>

            <div className="hidden items-center gap-8 lg:flex">
              {marketingNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-[14px] font-semibold tracking-[0.03em] transition hover:text-[#17213f] ${
                    item.href === "/matrix" ? "text-[#6c63ff]" : "text-[#6a7392]"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <div className="flex items-center gap-3 rounded-full border border-[#dce5ff] bg-white/78 p-2 pl-3 shadow-[0_18px_44px_rgba(116,132,185,0.1)] backdrop-blur-xl">
                {isLoggedIn ? (
                  <form action="/api/auth/logout" method="POST">
                    <button
                      type="submit"
                      className="rounded-full border border-[#e1e7ff] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#5c6688] transition hover:border-[#bccaff] hover:text-[#273252]"
                    >
                      退出登录
                    </button>
                  </form>
                ) : (
                  <Link
                    href="/login"
                    className="rounded-full border border-[#e1e7ff] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#5c6688] transition hover:border-[#bccaff] hover:text-[#273252]"
                  >
                    手机号登录
                  </Link>
                )}
                <Link
                  href="/workshop?mode=coding"
                  className="rounded-full bg-[#17213f] px-6 py-2.5 text-[14px] font-semibold text-white shadow-[0_14px_34px_rgba(23,33,63,0.16)] transition hover:-translate-y-0.5"
                >
                  进入工坊
                </Link>
              </div>
            </div>
          </header>

          <section className="py-16">
            <div className="inline-flex rounded-full border border-white/80 bg-white/72 px-4 py-2 text-xs font-black tracking-[0.18em] text-[#627ee6] shadow-[0_12px_34px_rgba(112,138,215,0.12)]">
              创作矩阵
            </div>

            <div className="mt-8 max-w-[1180px]">
              <h1 className="text-[64px] font-black leading-[0.96] tracking-[-0.07em] text-[#121a35] xl:text-[88px] 2xl:text-[102px]">
                <span className="block">每一种表达方式</span>
                <span className="home-gradient-text mt-3 block xl:mt-4">都可以成为孩子的创作入口</span>
              </h1>
              <div className="mt-6 h-[3px] w-24 rounded-full bg-[linear-gradient(90deg,#ffbc7c,#ff8fc7,#8974ff)]" />
            </div>

            <p className="mt-8 max-w-[38ch] text-[18px] leading-[2.1] text-[#657193] xl:max-w-[40ch]">
              我们把不同模态的 AI 能力，变成不同类型的创作工坊。孩子不需要先理解技术名词，只需要选择自己最想表达的方式。
            </p>

            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {matrixCards.map((card) => {
                const content = (
                  <div className="rounded-[30px] border border-white/80 bg-white/72 p-6 shadow-[0_18px_54px_rgba(92,116,189,0.14)] backdrop-blur-2xl">
                    <div className="flex items-start justify-between gap-4">
                      <div className="grid h-14 w-14 place-items-center rounded-[18px] border border-white/80 bg-white/78 shadow-[0_12px_30px_rgba(101,124,190,0.12)]">
                        <Image
                          src={card.iconSrc}
                          alt={card.title}
                          width={46}
                          height={46}
                          className="h-9 w-9 object-contain"
                        />
                      </div>
                      <div className="inline-flex rounded-full border border-[#dce5ff] bg-white/78 px-3 py-1 text-xs font-semibold tracking-[0.12em] text-[#627ee6]">
                        {card.badge}
                      </div>
                    </div>
                    <h2 className="mt-8 text-[34px] font-black leading-[1.04] tracking-[-0.06em] text-[#17213f]">
                      {card.title}
                    </h2>
                    <p className="mt-4 text-[15px] leading-8 text-[#647092]">
                      {card.description}
                    </p>
                    <div className="mt-8 inline-flex rounded-full border border-[#d7e0ff] bg-white/78 px-4 py-2 text-sm font-semibold text-[#52607e] shadow-[0_12px_30px_rgba(101,124,190,0.1)]">
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
