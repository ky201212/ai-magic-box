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
    <main className="min-h-screen bg-[#080512] text-white">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#06030d_0%,#0b0616_22%,#10081f_54%,#080512_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_12%,rgba(133,212,255,0.12),transparent_16%),radial-gradient(circle_at_86%_18%,rgba(248,183,129,0.1),transparent_20%),radial-gradient(circle_at_46%_78%,rgba(188,118,255,0.08),transparent_24%)]" />
        </div>

        <div className="relative mx-auto w-full max-w-[1880px] px-8 pb-16 pt-8 lg:px-12 2xl:px-20">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm tracking-[0.14em] text-white/42">
                {brandIdentity.siteName}
              </p>
              <h1 className="mt-2 text-[30px] font-black tracking-[-0.05em] text-white">
                社区作品详情
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/community"
                className="rounded-full border border-white/10 bg-white/6 px-5 py-3 text-sm font-semibold text-white/82"
              >
                返回成长社区
              </Link>
              <Link
                href={isLoggedIn ? "/profile" : "/login?redirect=/profile"}
                className="rounded-full border border-white/10 bg-white/6 px-5 py-3 text-sm font-semibold text-white/82"
              >
                {isLoggedIn ? "我的投稿" : "先登录"}
              </Link>
              <Link
                href="/workshop?mode=coding"
                className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#1e1338]"
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
