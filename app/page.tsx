import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { marketingNavItems } from "./_components/marketing-nav";

function HeroStage() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(118,221,255,0.14),transparent_18%),radial-gradient(circle_at_84%_16%,rgba(188,118,255,0.18),transparent_22%),radial-gradient(circle_at_58%_78%,rgba(255,180,128,0.08),transparent_16%),linear-gradient(180deg,#0a0717_0%,#130b2c_42%,#0c071b_100%)]" />
      <div className="absolute inset-0 opacity-[0.18] [background-image:radial-gradient(rgba(255,255,255,0.9)_0.75px,transparent_0.75px)] [background-size:24px_24px]" />

      <div className="aurora-drift absolute left-[-8%] top-[6%] h-[420px] w-[420px] rounded-full bg-[#67d8ff]/10 blur-[130px]" />
      <div className="aurora-drift absolute right-[-8%] top-[4%] h-[520px] w-[520px] rounded-full bg-[#9a6fff]/14 blur-[150px]" />
      <div className="aurora-drift absolute left-[38%] bottom-[2%] h-[320px] w-[320px] rounded-full bg-[#ffb87d]/10 blur-[120px]" />

      <div className="absolute left-[56%] top-[12%] -translate-x-1/2">
        <Image
          src="/landing-assets/planet-smile-clean.png"
          alt="微笑星球"
          width={179}
          height={101}
          className="orbital-float h-[126px] w-auto object-contain"
          priority
        />
      </div>

      <div className="absolute right-[13%] top-[18%]">
        <Image
          src="/landing-assets/rocket-launch.png"
          alt="探索火箭"
          width={163}
          height={117}
          className="orbital-float h-[104px] w-auto rotate-[8deg] object-contain"
        />
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-[180px] bg-[linear-gradient(180deg,transparent,rgba(8,5,20,0.14)_24%,rgba(8,5,20,0.88))]" />
    </div>
  );
}

export default async function HomePage() {
  const cookieStore = await cookies();
  const isLoggedIn = Boolean(cookieStore.get("magic_session")?.value);

  return (
    <main className="min-h-screen bg-[#080512] text-white">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#06030d_0%,#0b0616_24%,#10081f_52%,#080512_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_18%,rgba(113,219,255,0.12),transparent_16%),radial-gradient(circle_at_88%_8%,rgba(174,108,255,0.12),transparent_20%)]" />
        </div>

        <section className="relative min-h-screen overflow-hidden border-y border-white/8 bg-[linear-gradient(180deg,rgba(32,22,78,0.18),rgba(10,7,24,0.96))] shadow-[0_42px_120px_rgba(0,0,0,0.28)]">
          <HeroStage />

          <div className="relative z-20 mx-auto flex w-full max-w-[1920px] items-center justify-between px-10 py-7 lg:px-14 xl:px-20">
            <div className="flex items-center gap-4">
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
                <p className="text-[12px] tracking-[0.08em] text-white/40">
                  下一代儿童AI创造力平台
                </p>
              </div>
            </div>

            <div className="hidden items-center gap-8 lg:flex">
              {marketingNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-[14px] font-medium tracking-[0.03em] text-white/52 transition hover:text-white"
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
                  className="rounded-full bg-white px-6 py-2.5 text-[14px] font-semibold text-[#1e1338] shadow-[0_14px_34px_rgba(255,255,255,0.14)] transition hover:bg-white/92"
                >
                  进入工坊
                </Link>
              </div>
            </div>
          </div>

          <div className="relative z-20 mx-auto grid min-h-[calc(100vh-92px)] w-full max-w-[1920px] items-center gap-10 px-10 pb-12 pt-2 lg:grid-cols-[minmax(0,820px)_1fr] lg:px-14 xl:px-20">
            <div className="max-w-[820px] py-6">
              <div className="inline-flex items-center rounded-full border border-white/12 bg-white/6 px-4 py-2 text-[12px] font-medium text-white/72 backdrop-blur-xl">
                为青少年打造的未来学习与创造空间
              </div>

              <h1 className="mt-10 max-w-none text-[78px] font-black leading-[1.01] tracking-[-0.065em] text-white xl:text-[108px] 2xl:text-[118px]">
                小红车魔法工坊
                <span className="mt-5 inline-block pr-3 whitespace-nowrap leading-[1.03] tracking-[-0.05em] bg-gradient-to-r from-[#8de1ff] via-[#f4b9ff] to-[#ffd788] bg-clip-text text-transparent">
                  共同拥抱AI新时代
                </span>
              </h1>

              <p className="mt-8 max-w-[620px] text-[19px] leading-9 text-white/60 xl:text-[20px]">
                把编程、绘画、写作与未来科技体验，变成孩子愿意主动走进去的创造旅程。
              </p>

              <div className="mt-12 flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/workshop?mode=coding"
                  className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(90deg,#ffbc7c_0%,#ff8fc7_46%,#8974ff_100%)] px-8 py-4 text-[16px] font-semibold text-white shadow-[0_20px_48px_rgba(140,96,255,0.34)] transition hover:-translate-y-0.5"
                >
                  开始第一场创作旅程
                </Link>
                <div className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/6 px-6 py-4 text-[15px] font-medium text-white/66 backdrop-blur-xl">
                  面向孩子的AI创造力启蒙
                </div>
              </div>
            </div>

            <div className="relative hidden min-h-[640px] lg:block">
              <div className="absolute inset-x-0 bottom-0 h-[640px]">
                <div className="absolute left-[8%] top-[18%] h-[420px] w-[420px] rounded-full border border-white/8 bg-[radial-gradient(circle,rgba(255,255,255,0.05),transparent_68%)]" />
                <div className="absolute right-[8%] top-[25%] h-[340px] w-[340px] rounded-full border border-white/8 bg-[radial-gradient(circle,rgba(121,220,255,0.05),transparent_68%)]" />
                <div className="absolute bottom-[3%] left-[24%] h-28 w-64 rounded-full bg-[radial-gradient(circle,rgba(255,202,126,0.28),transparent_68%)] blur-2xl" />

                <div className="absolute bottom-0 left-[10%] z-20">
                  <Image
                    src="/landing-assets/kid-point.png"
                    alt="儿童创作者"
                    width={311}
                    height={323}
                    priority
                    className="h-[590px] w-auto object-contain drop-shadow-[0_34px_72px_rgba(4,4,18,0.56)]"
                  />
                </div>

                <div className="absolute bottom-[4%] right-[8%] z-10">
                  <Image
                    src="/landing-assets/robot-front.png"
                    alt="AI伙伴"
                    width={160}
                    height={172}
                    className="h-[255px] w-auto object-contain drop-shadow-[0_24px_52px_rgba(6,6,24,0.48)]"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
