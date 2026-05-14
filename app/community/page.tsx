import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { marketingNavItems } from "../_components/marketing-nav";
import { CommunityClient } from "./community-client";

export default async function CommunityPage() {
  const cookieStore = await cookies();
  const isLoggedIn = Boolean(cookieStore.get("magic_session")?.value);

  return (
    <main className="min-h-screen bg-[#080512] text-white">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#06030d_0%,#0a0616_18%,#10081f_44%,#090512_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(116,208,255,0.12),transparent_18%),radial-gradient(circle_at_84%_12%,rgba(194,120,255,0.14),transparent_22%),radial-gradient(circle_at_56%_64%,rgba(132,77,255,0.08),transparent_24%)]" />
          <div className="absolute inset-0 opacity-[0.16] [background-image:radial-gradient(rgba(255,255,255,0.9)_0.7px,transparent_0.7px)] [background-size:26px_26px]" />
          <div className="absolute left-[-6%] top-[8%] h-[520px] w-[520px] rounded-full bg-[#66c9ff]/10 blur-[140px]" />
          <div className="absolute right-[-8%] top-[0%] h-[620px] w-[620px] rounded-full bg-[#8d56ff]/12 blur-[180px]" />
          <div className="absolute bottom-[8%] left-[34%] h-[360px] w-[360px] rounded-full bg-[#ffb57a]/8 blur-[140px]" />
        </div>

        <div className="relative mx-auto w-full max-w-[1880px] px-8 pb-16 pt-6 lg:px-12 2xl:px-20">
          <header className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-4">
              <Image
                src="/logo.png"
                alt="小红车魔法工坊"
                width={54}
                height={54}
                className="rounded-[18px] shadow-[0_12px_28px_rgba(255,255,255,0.12)]"
                priority
              />
              <div>
                <p className="text-[18px] font-semibold tracking-[-0.03em] text-white">
                  小红车魔法工坊
                </p>
                <p className="text-[12px] tracking-[0.08em] text-white/42">
                  下一代儿童创意故事平台
                </p>
              </div>
            </Link>

            <div className="hidden items-center gap-8 lg:flex">
              {marketingNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative text-[14px] font-medium tracking-[0.03em] transition ${
                    item.href === "/community"
                      ? "text-white"
                      : "text-white/52 hover:text-white"
                  }`}
                >
                  {item.label}
                  {item.href === "/community" && (
                    <span className="absolute -bottom-3 left-1/2 h-[2px] w-10 -translate-x-1/2 rounded-full bg-[#c58cff]" />
                  )}
                </Link>
              ))}

              <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/6 p-2 pl-3 backdrop-blur-xl">
                {isLoggedIn ? (
                  <>
                    <Link
                      href="/profile"
                      className="rounded-full border border-white/10 bg-white/6 px-4 py-2.5 text-[13px] font-semibold text-white/78 transition hover:bg-white/10 hover:text-white"
                    >
                      我的主页
                    </Link>
                    <form action="/api/auth/logout" method="POST">
                      <button
                        type="submit"
                        className="rounded-full border border-white/10 bg-white/6 px-4 py-2.5 text-[13px] font-semibold text-white/78 transition hover:bg-white/10 hover:text-white"
                      >
                        退出登录
                      </button>
                    </form>
                  </>
                ) : (
                  <Link
                    href="/login?redirect=/community"
                    className="rounded-full border border-white/10 bg-white/6 px-4 py-2.5 text-[13px] font-semibold text-white/78 transition hover:bg-white/10 hover:text-white"
                  >
                    手机号登录
                  </Link>
                )}
                <Link
                  href="/workshop?mode=coding"
                  className="rounded-full bg-white px-6 py-2.5 text-[14px] font-semibold text-[#1d1433] shadow-[0_12px_34px_rgba(255,255,255,0.14)] transition hover:bg-white/92"
                >
                  进入工坊
                </Link>
              </div>
            </div>
          </header>

          <CommunityClient
            isLoggedIn={isLoggedIn}
          />
        </div>
      </div>
    </main>
  );
}
