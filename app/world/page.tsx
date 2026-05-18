import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { marketingNavItems } from "../_components/marketing-nav";
import { listInfoContentPosts } from "@/lib/admin-data";
import {
  defaultInfoContentPosts,
  getInfoCategoryHref,
  getInfoPostExcerpt,
  getInfoPostHref,
  getInfoCategoryTitle,
  infoCategories,
} from "@/lib/info-content";
import { getBrandIdentitySetting } from "@/lib/site-config";

export default async function WorldPage() {
  const cookieStore = await cookies();
  const isLoggedIn = Boolean(cookieStore.get("magic_session")?.value);
  const [brandIdentity, featuredNews] = await Promise.all([
    getBrandIdentitySetting(),
    listInfoContentPosts({ limit: 8 }).catch(() => defaultInfoContentPosts),
  ]);

  return (
    <main className="min-h-screen bg-[#f7f8ff] text-[#18213f]">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_10%,rgba(126,171,255,0.34),transparent_28%),radial-gradient(circle_at_82%_14%,rgba(255,159,211,0.3),transparent_24%),linear-gradient(180deg,#ffffff_0%,#f7f8ff_48%,#eff5ff_100%)]" />
          <div className="home-grid absolute inset-0 opacity-80" />
          <div className="home-sweep absolute left-[-12%] top-[16%] h-44 w-[70%] rounded-full bg-[linear-gradient(90deg,rgba(139,165,255,0),rgba(139,165,255,0.28),rgba(255,177,213,0))] blur-3xl" />
          <div className="float-soft absolute right-[9%] top-[20%] h-36 w-36 rounded-[36px] border border-white/70 bg-white/60 shadow-[0_24px_60px_rgba(112,138,215,0.18)]" />
        </div>

        <div className="relative mx-auto w-full max-w-[1760px] px-4 py-5 sm:px-6 sm:py-6 lg:px-12 xl:px-16">
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
                <p className="truncate text-[16px] font-semibold tracking-normal text-[#17213f] sm:text-[18px]">
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
                  className={`hidden text-[14px] font-semibold tracking-[0.03em] transition sm:inline-flex ${
                    item.href === "/world"
                      ? "text-[#6c63ff]"
                      : "text-[#6a7392] hover:text-[#17213f]"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <div className="flex w-full flex-wrap items-center gap-2 rounded-[22px] border border-[#dce5ff] bg-white/78 p-1.5 sm:w-auto sm:rounded-full">
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
                    className="flex-1 rounded-full border border-[#e1e7ff] bg-white px-4 py-2.5 text-center text-[13px] font-semibold text-[#5c6688] transition hover:border-[#bccaff] hover:text-[#273252] sm:flex-none"
                  >
                    手机号登录
                  </Link>
                )}
                <Link
                  href="/workshop?mode=coding"
                  className="flex-1 rounded-full bg-[#625cff] px-5 py-2.5 text-center text-[14px] font-semibold text-white shadow-[0_12px_28px_rgba(98,92,255,0.22)] transition hover:bg-[#544cf4] sm:flex-none"
                >
                  进入工坊
                </Link>
              </div>
            </div>
          </header>

          <section className="grid items-center gap-8 py-12 lg:grid-cols-[0.86fr_1.14fr] xl:gap-12">
            <div>
              <h1 className="mt-6 text-[34px] font-black leading-[1.08] tracking-normal text-[#151f3d] sm:mt-7 sm:text-[58px] xl:text-[66px]">
                <span className="home-gradient-text block">科普资讯</span>
              </h1>
              <p className="mt-5 max-w-[42ch] text-[15px] leading-7 text-[#5e6b8c] sm:mt-7 sm:text-[17px] sm:leading-9">
                这里为孩子和家长整理有趣、清楚、适合一起阅读的科学内容，也记录课程活动和孩子成长中的闪光时刻。
              </p>
            </div>

            <div className="relative overflow-hidden rounded-[30px] border border-white/80 bg-white/72 p-6 shadow-[0_30px_90px_rgba(92,116,189,0.18)] backdrop-blur-2xl">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(124,147,255,0.18),transparent_30%),radial-gradient(circle_at_82%_12%,rgba(255,168,211,0.2),transparent_28%)]" />
              <div className="relative">
                <p className="text-[13px] font-black tracking-[0.16em] text-[#7782a4]">
                  CONTENT CHANNELS
                </p>
                <h2 className="mt-3 text-[34px] font-black leading-[1.18] tracking-normal text-[#17213f] sm:text-[44px]">
                  科普资讯栏目
                </h2>
                <div className="mt-7 grid gap-4 sm:grid-cols-2">
                  {infoCategories.map((item) => (
                    <Link
                      key={item.title}
                      href={getInfoCategoryHref(item.key)}
                      className="rounded-[24px] border border-[#edf1ff] bg-white/78 p-5 shadow-[0_12px_30px_rgba(101,124,190,0.08)] transition hover:-translate-y-0.5 hover:border-[#dbe4ff] hover:shadow-[0_16px_34px_rgba(101,124,190,0.12)]"
                    >
                      <div className={`h-1.5 w-14 rounded-full bg-gradient-to-r ${item.accent}`} />
                      <p className="mt-4 text-[12px] font-black tracking-[0.14em] text-[#7c8bb0]">
                        {item.eyebrow}
                      </p>
                      <h3 className="mt-2 text-[24px] font-black leading-[1.18] text-[#17213f]">
                        {item.title}
                      </h3>
                      <p className="mt-3 text-[14px] leading-7 text-[#647092]">
                        {item.body}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="pb-16">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="inline-flex rounded-full border border-[#d9e2ff] bg-white/72 px-4 py-2 text-xs font-black tracking-[0.18em] text-[#6875a5] shadow-[0_12px_34px_rgba(112,138,215,0.12)]">
                  精选资讯
                </div>
                <h2 className="mt-5 text-[30px] font-black leading-[1.16] tracking-normal text-[#17213f] sm:text-[50px]">
                  最新科普与活动
                </h2>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {featuredNews.map((item) => (
                <Link
                  key={item.title}
                  href={getInfoPostHref(item.id)}
                  className="rounded-[26px] border border-white/80 bg-white/76 p-6 shadow-[0_18px_54px_rgba(92,116,189,0.12)] backdrop-blur-2xl transition hover:-translate-y-0.5 hover:border-[#dbe4ff] hover:shadow-[0_22px_58px_rgba(92,116,189,0.16)]"
                >
                  <div className="inline-flex rounded-full border border-[#dfe7ff] bg-white/80 px-3 py-1.5 text-[12px] font-black text-[#627ee6]">
                    {getInfoCategoryTitle(item.category)}
                  </div>
                  <h3 className="mt-5 text-[22px] font-black leading-[1.2] tracking-normal text-[#17213f] sm:text-[24px]">
                    {item.title}
                  </h3>
                  <p className="mt-4 text-[14px] leading-7 text-[#647092]">
                    {getInfoPostExcerpt(item)}
                  </p>
                  <p className="mt-6 text-[12px] font-bold text-[#8792b2]">
                    {item.publishedAt}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
