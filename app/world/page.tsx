import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { marketingNavItems } from "../_components/marketing-nav";
import { getBrandIdentitySetting } from "@/lib/site-config";

const worldBlocks = [
  {
    title: "未来实验室",
    body: "编程、绘画、写作、语音、互动预览都在同一个空间里完成，像进入一座真正的创造基地。",
    image: "/brand-spec-assets/badge-future-row.png",
    accent: "from-[#6b8dff] to-[#8ed8ff]",
  },
  {
    title: "儿童主创席",
    body: "孩子不是站在工具旁边的人，而是坐在主创位置上的人。平台负责辅助，孩子负责提问、想象和决定。",
    image: "/brand-spec-assets/badge-create-row.png",
    accent: "from-[#ff8fcb] to-[#ffc66d]",
  },
  {
    title: "作品型学习",
    body: "每一次表达都能留下作品，每一次作品都能反过来成为新的提问、新的讲述和新的成长证据。",
    image: "/brand-spec-assets/badge-grow-row.png",
    accent: "from-[#8f7dff] to-[#ff9bd3]",
  },
];

export default async function WorldPage() {
  const cookieStore = await cookies();
  const isLoggedIn = Boolean(cookieStore.get("magic_session")?.value);
  const brandIdentity = await getBrandIdentitySetting();

  return (
    <main className="min-h-screen bg-[#f7f8ff] text-[#18213f]">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_10%,rgba(126,171,255,0.34),transparent_28%),radial-gradient(circle_at_82%_14%,rgba(255,159,211,0.3),transparent_24%),linear-gradient(180deg,#ffffff_0%,#f7f8ff_48%,#eff5ff_100%)]" />
          <div className="home-grid absolute inset-0 opacity-80" />
          <div className="home-sweep absolute left-[-12%] top-[16%] h-44 w-[70%] rounded-full bg-[linear-gradient(90deg,rgba(139,165,255,0),rgba(139,165,255,0.28),rgba(255,177,213,0))] blur-3xl" />
          <div className="float-soft absolute right-[9%] top-[20%] h-36 w-36 rounded-[36px] border border-white/70 bg-white/60 shadow-[0_24px_60px_rgba(112,138,215,0.18)]" />
        </div>

        <div className="relative mx-auto w-full max-w-[1760px] px-5 py-6 sm:px-8 lg:px-12 xl:px-16">
          <header className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-white/80 bg-white/72 px-4 py-3 shadow-[0_18px_50px_rgba(84,107,170,0.12)] backdrop-blur-2xl">
            <Link href="/" className="flex items-center gap-4">
              <Image
                src={brandIdentity.logoUrl}
                alt={brandIdentity.siteName}
                width={54}
                height={54}
                className="rounded-[18px] shadow-[0_12px_28px_rgba(116,142,210,0.16)]"
                priority
              />
              <div>
                <p className="text-[18px] font-semibold tracking-[-0.03em] text-[#17213f]">
                  {brandIdentity.siteName}
                </p>
                <p className="text-[12px] tracking-[0.08em] text-[#677396]">
                  {brandIdentity.tagline}
                </p>
              </div>
            </Link>

            <div className="flex flex-wrap items-center justify-end gap-3 lg:gap-6">
              {marketingNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`hidden text-[14px] font-semibold tracking-[0.03em] transition sm:inline-flex ${
                    item.href === "/world"
                      ? "text-[#6c63ff]"
                      : "text-[#6a7392] hover:text-[#17213f]"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <div className="flex items-center gap-2 rounded-full border border-[#dce5ff] bg-white/78 p-1.5">
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
                  className="rounded-full bg-[#625cff] px-5 py-2.5 text-[14px] font-semibold text-white shadow-[0_12px_28px_rgba(98,92,255,0.22)] transition hover:bg-[#544cf4]"
                >
                  进入工坊
                </Link>
              </div>
            </div>
          </header>

          <section className="grid min-h-[calc(100vh-112px)] items-center gap-10 py-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(520px,1.1fr)] xl:gap-16">
            <div>
              <div className="inline-flex rounded-full border border-[#d9e2ff] bg-white/72 px-4 py-2 text-xs font-black tracking-[0.18em] text-[#6875a5] shadow-[0_12px_34px_rgba(112,138,215,0.12)]">
                世界观 WORLD
              </div>
              <h1 className="mt-7 max-w-[11ch] text-[48px] font-black leading-[0.98] tracking-[-0.06em] text-[#151f3d] sm:text-[64px] xl:text-[82px]">
                孩子进入的不是页面，
                <span className="home-gradient-text block">是一座创造星球</span>
              </h1>
              <p className="mt-7 max-w-[42ch] text-[17px] leading-9 text-[#5e6b8c]">
                星球、机器人、火箭和创作工坊共同组成一个完整的成长场景。孩子在这里写代码、画图、讲故事，也能把每一次想象变成可以被看见的作品。
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link
                  href="/workshop?mode=coding"
                  className="home-button-glow rounded-full bg-[#625cff] px-6 py-3 text-sm font-black text-white"
                >
                  进入创造世界
                </Link>
                <Link
                  href="/community"
                  className="rounded-full border border-[#d7e0ff] bg-white px-6 py-3 text-sm font-black text-[#52607e] transition hover:border-[#b9c8ff]"
                >
                  看看社区作品
                </Link>
              </div>
            </div>

            <div className="relative min-h-[560px] overflow-hidden rounded-[30px] border border-white/80 bg-white/72 p-6 shadow-[0_30px_90px_rgba(92,116,189,0.18)] backdrop-blur-2xl">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_20%,rgba(124,147,255,0.22),transparent_28%),radial-gradient(circle_at_72%_70%,rgba(255,168,211,0.24),transparent_30%)]" />
              <Image
                src="/brand-spec-assets/planet-large.png"
                alt="创造星球"
                width={260}
                height={260}
                className="slow-spin absolute right-8 top-8 opacity-95"
              />
              <Image
                src="/brand-spec-assets/rocket-deco.png"
                alt="火箭"
                width={126}
                height={126}
                className="orbital-float absolute left-10 top-12"
              />
              <Image
                src="/brand-spec-assets/story-scene.png"
                alt="孩子创造场景"
                width={620}
                height={420}
                className="relative z-10 mx-auto mt-24 w-full max-w-[620px] drop-shadow-[0_26px_46px_rgba(91,111,185,0.22)]"
                priority
              />
              <div className="relative z-20 mt-5 grid gap-3 sm:grid-cols-3">
                {["会提问", "能创作", "被看见"].map((label) => (
                  <div
                    key={label}
                    className="rounded-[20px] border border-white/90 bg-white/76 px-4 py-4 text-center text-sm font-black text-[#4e5c84] shadow-[0_12px_30px_rgba(101,124,190,0.12)]"
                  >
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-5 pb-16 lg:grid-cols-3">
            {worldBlocks.map((item) => (
              <article
                key={item.title}
                className="group overflow-hidden rounded-[26px] border border-white/80 bg-white/76 p-5 shadow-[0_18px_54px_rgba(92,116,189,0.14)] backdrop-blur-2xl transition hover:-translate-y-1 hover:shadow-[0_26px_70px_rgba(92,116,189,0.2)]"
              >
                <div className={`h-2 rounded-full bg-gradient-to-r ${item.accent}`} />
                <div className="mt-5 flex items-start gap-4">
                  <Image
                    src={item.image}
                    alt=""
                    width={74}
                    height={74}
                    className="shrink-0 rounded-[20px] bg-[#f4f7ff]"
                  />
                  <div>
                    <h2 className="text-[26px] font-black leading-[1.12] tracking-[-0.04em] text-[#17213f]">
                      {item.title}
                    </h2>
                    <p className="mt-3 text-[15px] leading-8 text-[#647092]">
                      {item.body}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </section>
        </div>
      </div>
    </main>
  );
}
