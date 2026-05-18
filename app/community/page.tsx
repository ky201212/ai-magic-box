import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { marketingNavItems } from "../_components/marketing-nav";
import { CommunityClient } from "./community-client";
import { getBrandIdentitySetting } from "@/lib/site-config";
import { getCommunityOverview, listApprovedCommunityPosts } from "@/lib/community";

export default async function CommunityPage() {
  const cookieStore = await cookies();
  const isLoggedIn = Boolean(cookieStore.get("magic_session")?.value);
  const [brandIdentity, initialPosts, initialOverview] = await Promise.all([
    getBrandIdentitySetting(),
    listApprovedCommunityPosts().catch(() => []),
    getCommunityOverview().catch(() => null),
  ]);

  return (
    <main className="min-h-screen bg-[#f7f8ff] text-[#17213f]">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(117,159,255,0.34),transparent_26%),radial-gradient(circle_at_88%_10%,rgba(255,166,213,0.26),transparent_26%),radial-gradient(circle_at_50%_70%,rgba(255,205,119,0.18),transparent_28%),linear-gradient(180deg,#ffffff_0%,#f8f9ff_44%,#eff5ff_100%)]" />
          <div className="home-grid absolute inset-0 opacity-80" />
          <div className="home-sweep absolute left-[-10%] top-[20%] h-48 w-[72%] rounded-full bg-[linear-gradient(90deg,rgba(124,148,255,0),rgba(124,148,255,0.25),rgba(255,161,211,0))] blur-3xl" />
          <div className="float-soft absolute right-[6%] top-[18%] h-24 w-24 rounded-[28px] border border-white/80 bg-white/60 shadow-[0_22px_50px_rgba(104,126,190,0.16)]" />
        </div>

        <div className="relative mx-auto w-full max-w-[1800px] px-4 pb-12 pt-5 sm:px-6 sm:pb-16 sm:pt-6 lg:px-12 2xl:px-16">
          <header className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-white/80 bg-white/72 px-4 py-3 shadow-[0_18px_50px_rgba(84,107,170,0.12)] backdrop-blur-2xl">
            <Link href="/" className="flex min-w-0 items-center gap-3 sm:gap-4">
              <Image
                src={brandIdentity.logoUrl}
                alt={brandIdentity.siteName}
                width={54}
                height={54}
                className="h-11 w-11 rounded-[14px] shadow-[0_12px_28px_rgba(116,142,210,0.16)] sm:h-[54px] sm:w-[54px] sm:rounded-[18px]"
                priority
              />
              <div className="min-w-0">
                <p className="truncate text-[16px] font-semibold tracking-[-0.03em] text-[#17213f] sm:text-[18px]">
                  {brandIdentity.siteName}
                </p>
                <p className="truncate text-[11px] tracking-[0.08em] text-[#677396] sm:text-[12px]">
                  {brandIdentity.tagline}
                </p>
              </div>
            </Link>

            <div className="flex flex-wrap items-center justify-end gap-3 lg:gap-6">
              {marketingNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch
                  className={`relative hidden text-[14px] font-semibold tracking-[0.03em] transition sm:inline-flex ${
                    item.href === "/community"
                      ? "text-[#6c63ff]"
                      : "text-[#6a7392] hover:text-[#17213f]"
                  }`}
                >
                  {item.label}
                  {item.href === "/community" && (
                    <span className="absolute -bottom-3 left-1/2 h-[2px] w-10 -translate-x-1/2 rounded-full bg-[#8b7cff]" />
                  )}
                </Link>
              ))}

              <div className="flex w-full flex-wrap items-center gap-2 rounded-[22px] border border-[#dce5ff] bg-white/78 p-1.5 sm:w-auto sm:rounded-full">
                {isLoggedIn ? (
                  <>
                    <Link
                      href="/profile"
                      prefetch
                      className="flex-1 rounded-full border border-[#e1e7ff] bg-white px-4 py-2.5 text-center text-[13px] font-semibold text-[#5c6688] transition hover:border-[#bccaff] hover:text-[#273252] sm:flex-none"
                    >
                      我的主页
                    </Link>
                    <form action="/api/auth/logout" method="POST">
                      <button
                        type="submit"
                        className="rounded-full border border-[#e1e7ff] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#5c6688] transition hover:border-[#bccaff] hover:text-[#273252]"
                      >
                        退出登录
                      </button>
                    </form>
                  </>
                ) : (
                  <Link
                    href="/login?redirect=/community"
                    prefetch
                    className="flex-1 rounded-full border border-[#e1e7ff] bg-white px-4 py-2.5 text-center text-[13px] font-semibold text-[#5c6688] transition hover:border-[#bccaff] hover:text-[#273252] sm:flex-none"
                  >
                    手机号登录
                  </Link>
                )}
                <Link
                  href="/workshop?mode=coding"
                  prefetch
                  className="flex-1 rounded-full bg-[#625cff] px-5 py-2.5 text-center text-[14px] font-semibold text-white shadow-[0_12px_28px_rgba(98,92,255,0.22)] transition hover:bg-[#544cf4] sm:flex-none"
                >
                  进入工坊
                </Link>
              </div>
            </div>
          </header>

          <CommunityClient
            isLoggedIn={isLoggedIn}
            initialPosts={initialPosts}
            initialOverview={initialOverview}
          />
        </div>
      </div>
    </main>
  );
}
