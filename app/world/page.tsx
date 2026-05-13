import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { marketingNavItems } from "../_components/marketing-nav";

const worldBlocks = [
  {
    title: "未来实验室",
    body: "编程、绘画、写作、语音、互动预览都在同一个空间里完成，像进入一座真正的创造基地。",
  },
  {
    title: "儿童主创席",
    body: "孩子不是站在工具旁边的人，而是坐在主创位置上的人。平台负责辅助，孩子负责提问、想象和决定。",
  },
  {
    title: "作品型学习",
    body: "每一次表达都能留下作品，每一次作品都能反过来成为新的提问、新的讲述和新的成长证据。",
  },
];

export default async function WorldPage() {
  const cookieStore = await cookies();
  const isLoggedIn = Boolean(cookieStore.get("magic_session")?.value);

  return (
    <main className="min-h-screen bg-[#080512] text-white">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#06030d_0%,#0b0616_24%,#10081f_52%,#080512_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_14%,rgba(113,219,255,0.1),transparent_18%),radial-gradient(circle_at_84%_18%,rgba(174,108,255,0.12),transparent_22%)]" />
          <div className="aurora-drift absolute left-[8%] top-[16%] h-[300px] w-[300px] rounded-full bg-[#67d8ff]/8 blur-[120px]" />
          <div className="aurora-drift absolute right-[10%] bottom-[10%] h-[360px] w-[360px] rounded-full bg-[#a472ff]/10 blur-[130px]" />
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
                    item.href === "/world" ? "text-white" : "text-white/52"
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

          <section className="grid min-h-[calc(100vh-120px)] items-center gap-12 py-16 lg:grid-cols-[1fr_1fr]">
            <div className="relative overflow-hidden rounded-[42px] border border-white/10 bg-[linear-gradient(180deg,rgba(37,25,88,0.3),rgba(11,8,26,0.94))] p-8 shadow-[0_24px_64px_rgba(0,0,0,0.28)]">
              <div className="inline-flex rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs font-semibold tracking-[0.18em] text-white/66">
                世界观
              </div>
              <h1 className="mt-6 max-w-[9ch] text-[60px] font-black leading-[0.98] tracking-[-0.075em] text-white xl:text-[78px]">
                孩子不是在
                <br />
                使用平台
                <br />
                而是在进入世界
              </h1>
              <p className="mt-8 max-w-[30ch] text-[18px] leading-9 text-white/56">
                星球、机器人、火箭和创作工坊，并不是表面装饰，而是整个产品的统一世界语言。我们希望孩子每次打开，都像进入一座未来创造空间。
              </p>
            </div>

            <div className="space-y-5">
              {worldBlocks.map((item) => (
                <article
                  key={item.title}
                  className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-6 shadow-[0_18px_44px_rgba(0,0,0,0.22)] backdrop-blur-xl"
                >
                  <h2 className="text-[28px] font-black leading-[1.08] tracking-[-0.05em] text-white">
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
