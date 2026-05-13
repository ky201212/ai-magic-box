import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { listApprovedCommunityPosts } from "@/lib/community";
import { marketingNavItems } from "../_components/marketing-nav";

function maskPhone(phone?: string | null) {
  if (!phone) {
    return "小创作者";
  }

  return phone.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2");
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export default async function CommunityPage() {
  const cookieStore = await cookies();
  const isLoggedIn = Boolean(cookieStore.get("magic_session")?.value);
  const posts = await listApprovedCommunityPosts();

  return (
    <main className="min-h-screen bg-[#080512] text-white">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#06030d_0%,#0b0616_22%,#10081f_54%,#080512_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_12%,rgba(255,191,130,0.1),transparent_16%),radial-gradient(circle_at_86%_18%,rgba(135,212,255,0.12),transparent_20%),radial-gradient(circle_at_50%_68%,rgba(200,143,255,0.08),transparent_24%)]" />
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
                    item.href === "/community" ? "text-white" : "text-white/52"
                  }`}
                >
                  {item.label}
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
                  className="rounded-full bg-white px-6 py-2.5 text-[14px] font-semibold text-[#1e1338] transition hover:bg-white/92"
                >
                  进入工坊
                </Link>
              </div>
            </div>
          </header>

          <section className="grid gap-10 py-16 xl:grid-cols-[minmax(0,420px)_1fr]">
            <div className="xl:sticky xl:top-10 xl:self-start">
              <div className="inline-flex rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs font-semibold tracking-[0.18em] text-white/66">
                成长社区
              </div>
              <h1 className="mt-6 max-w-[10ch] text-[58px] font-black leading-[0.98] tracking-[-0.075em] text-white xl:text-[76px]">
                每一个作品
                <br />
                都值得被看见
              </h1>
              <p className="mt-7 max-w-[34ch] text-[17px] leading-9 text-white/58">
                孩子们生成的小程序，可以从工坊一键分享到这里。我们会先做基础审核，再把真正适合展示的作品呈现给更多人。
              </p>

              <div className="mt-9 rounded-[30px] border border-white/10 bg-white/7 p-6 backdrop-blur-xl">
                <p className="text-sm font-semibold tracking-[0.14em] text-white/50">
                  社区规则
                </p>
                <div className="mt-4 space-y-3 text-sm leading-8 text-white/64">
                  <p>分享入口只开放在工坊生成完成之后，避免随意上传无关内容。</p>
                  <p>系统会审核提示词与展示内容，过滤不适合儿童社区的表达。</p>
                  <p>每个孩子都可以在个人主页里看到自己的投稿状态。</p>
                </div>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 2xl:grid-cols-3">
              {posts.length ? (
                posts.map((post) => {
                  const authorName =
                    post.user_profiles?.display_name ||
                    maskPhone(post.users?.phone);
                  const avatarColor =
                    post.user_profiles?.avatar_color || "#8b5cf6";

                  return (
                    <article
                      key={post.id}
                      className="group overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0.04))] shadow-[0_26px_64px_rgba(0,0,0,0.24)] backdrop-blur-xl transition duration-300 hover:-translate-y-1"
                    >
                      <div className="relative aspect-[4/5] overflow-hidden bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.22),rgba(255,255,255,0.04)_56%,rgba(13,10,28,0.7))]">
                        <img
                          src={post.preview_image_url}
                          alt={post.title}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                        />
                        <div className="absolute inset-x-0 bottom-0 h-36 bg-[linear-gradient(180deg,transparent,rgba(5,4,14,0.82))]" />
                        <div className="absolute bottom-5 left-5 right-5">
                          <p className="text-[11px] font-semibold tracking-[0.18em] text-white/52">
                            AI编程作品
                          </p>
                          <h2 className="mt-2 text-[24px] font-black leading-[1.1] tracking-[-0.05em] text-white">
                            {post.title}
                          </h2>
                        </div>
                      </div>

                      <div className="p-5">
                        <div className="flex items-center gap-3">
                          <div
                            className="grid h-11 w-11 place-items-center rounded-full text-sm font-black text-white"
                            style={{ backgroundColor: avatarColor }}
                          >
                            {authorName.slice(0, 1)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white/82">
                              {authorName}
                            </p>
                            <p className="text-xs text-white/42">
                              {formatDate(post.created_at)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 rounded-[24px] border border-white/10 bg-white/6 p-4">
                          <p className="text-xs font-semibold tracking-[0.14em] text-white/42">
                            创作提示词
                          </p>
                          <p className="mt-3 line-clamp-5 text-sm leading-7 text-white/66">
                            {post.prompt}
                          </p>
                        </div>

                        <div className="mt-4 inline-flex rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs font-semibold text-white/54">
                          社区精选展示中
                        </div>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="md:col-span-2 2xl:col-span-3">
                  <div className="flex min-h-[460px] items-center justify-center rounded-[40px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] p-10 text-center shadow-[0_24px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
                    <div className="max-w-xl">
                      <div className="mx-auto grid h-24 w-24 place-items-center rounded-[30px] border border-white/10 bg-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.18)]">
                        <Image
                          src="/landing-assets/icon-code.png"
                          alt="社区作品"
                          width={42}
                          height={42}
                          className="h-11 w-11 object-contain"
                        />
                      </div>
                      <h2 className="mt-7 text-[34px] font-black tracking-[-0.06em] text-white">
                        第一批作品正在路上
                      </h2>
                      <p className="mt-4 text-[16px] leading-8 text-white/58">
                        先去工坊完成一个小程序，再点击分享进社区。通过审核后，它就会出现在这里。
                      </p>
                      <Link
                        href="/workshop?mode=coding"
                        className="mt-8 inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#1e1338] transition hover:bg-white/92"
                      >
                        去生成第一份作品
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
