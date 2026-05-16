import Link from "next/link";
import { cookies } from "next/headers";
import { getBrandIdentitySetting } from "@/lib/site-config";
import { CommunityDetailClient } from "./post-detail-client";

type RouteContext = {
  params: Promise<{
    postId: string;
  }>;
};

export default async function CommunityPostDetailPage(context: RouteContext) {
  const { postId } = await context.params;
  const brandIdentity = await getBrandIdentitySetting();
  const cookieStore = await cookies();
  const isLoggedIn = Boolean(cookieStore.get("magic_session")?.value);

  return (
    <main className="min-h-screen bg-[#f7f8ff] text-[#17213f]">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(117,159,255,0.34),transparent_26%),radial-gradient(circle_at_88%_10%,rgba(255,166,213,0.26),transparent_26%),radial-gradient(circle_at_50%_70%,rgba(255,205,119,0.18),transparent_28%),linear-gradient(180deg,#ffffff_0%,#f8f9ff_44%,#eff5ff_100%)]" />
          <div className="home-grid absolute inset-0 opacity-80" />
          <div className="home-sweep absolute left-[-10%] top-[20%] h-48 w-[72%] rounded-full bg-[linear-gradient(90deg,rgba(124,148,255,0),rgba(124,148,255,0.25),rgba(255,161,211,0))] blur-3xl" />
          <div className="float-soft absolute right-[6%] top-[18%] h-24 w-24 rounded-[28px] border border-white/80 bg-white/60 shadow-[0_22px_50px_rgba(104,126,190,0.16)]" />
        </div>

        <div className="relative mx-auto w-full max-w-[1880px] px-5 pb-16 pt-6 sm:px-8 lg:px-12 2xl:px-20">
          <header className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-white/80 bg-white/72 px-4 py-3 shadow-[0_18px_50px_rgba(84,107,170,0.12)] backdrop-blur-2xl">
            <div>
              <p className="text-sm tracking-[0.14em] text-[#677396]">
                {brandIdentity.siteName}
              </p>
              <h1 className="mt-2 text-[30px] font-black tracking-[-0.05em] text-[#17213f]">
                社区作品详情
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/community"
                className="rounded-full border border-[#dce5ff] bg-white/78 px-5 py-3 text-sm font-semibold text-[#5c6688] shadow-[0_10px_24px_rgba(116,132,185,0.08)] transition hover:border-[#bccaff] hover:text-[#273252]"
              >
                返回成长社区
              </Link>
              <Link
                href={isLoggedIn ? "/profile" : "/login?redirect=/profile"}
                className="rounded-full border border-[#dce5ff] bg-white/78 px-5 py-3 text-sm font-semibold text-[#5c6688] shadow-[0_10px_24px_rgba(116,132,185,0.08)] transition hover:border-[#bccaff] hover:text-[#273252]"
              >
                {isLoggedIn ? "我的投稿" : "先登录"}
              </Link>
              <Link
                href="/workshop?mode=coding"
                className="rounded-full bg-[#625cff] px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(98,92,255,0.22)] transition hover:bg-[#544cf4]"
              >
                进入工坊
              </Link>
            </div>
          </header>

          <CommunityDetailClient postId={postId} isLoggedIn={isLoggedIn} />
        </div>
      </div>
    </main>
  );
}
