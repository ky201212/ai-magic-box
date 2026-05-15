import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { marketingNavItems } from "./_components/marketing-nav";
import { getBrandIdentitySetting, getHomeHeroSetting } from "@/lib/site-config";

function PixelField() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#f7fbff_0%,#eef5ff_44%,#fff6fb_100%)]" />
      <div className="home-grid absolute inset-0 opacity-[0.5]" />
      <div className="home-sweep absolute left-[-20%] top-[12%] h-[24rem] w-[140%] rotate-[-8deg] bg-[linear-gradient(90deg,transparent,rgba(135,166,255,0.18),rgba(255,177,210,0.16),transparent)] blur-2xl" />
      <div className="absolute left-[-8%] top-[6%] h-[420px] w-[420px] rounded-full bg-[#8edaff]/18 blur-[130px]" />
      <div className="absolute right-[-8%] top-[4%] h-[520px] w-[520px] rounded-full bg-[#ddb7ff]/22 blur-[150px]" />
      <div className="absolute left-[38%] bottom-[2%] h-[320px] w-[320px] rounded-full bg-[#ffd59e]/18 blur-[120px]" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-[linear-gradient(180deg,transparent,rgba(255,255,255,0.88))]" />
    </div>
  );
}

export default async function HomePage() {
  const cookieStore = await cookies();
  const isLoggedIn = Boolean(cookieStore.get("magic_session")?.value);
  const [heroSetting, brandIdentity] = await Promise.all([
    getHomeHeroSetting(),
    getBrandIdentitySetting(),
  ]);

  return (
    <main className="min-h-screen bg-[#f7fbff] text-[#17213f]">
      <section className="relative min-h-screen overflow-hidden">
        <PixelField />

        <div className="relative z-20 mx-auto flex w-full max-w-[1920px] items-center justify-between px-10 py-7 lg:px-14 xl:px-20">
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
                className="text-[14px] font-semibold tracking-[0.03em] text-[#5f6b8e] transition hover:text-[#5b78dc]"
              >
                {item.label}
              </Link>
            ))}
            <div className="flex items-center gap-3 rounded-full border border-white/80 bg-white/72 p-2 pl-3 shadow-[0_18px_44px_rgba(116,132,185,0.12)] backdrop-blur-xl">
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
        </div>

        <div className="relative z-20 mx-auto grid min-h-[calc(100vh-108px)] w-full max-w-[1920px] items-center gap-8 px-10 pb-12 pt-2 lg:grid-cols-[minmax(0,980px)_minmax(560px,1fr)] lg:px-14 xl:px-20">
          <div className="max-w-[980px] py-6">
            <div className="inline-flex items-center rounded-full border border-white/80 bg-white/68 px-4 py-2 text-[12px] font-black tracking-[0.08em] text-[#627ee6] shadow-[0_18px_42px_rgba(116,132,185,0.1)] backdrop-blur-xl">
              为青少年打造的未来学习与创造空间
            </div>

            <h1 className="mt-10 max-w-none text-[72px] font-black leading-[1.01] tracking-[-0.055em] text-[#121a35] xl:text-[102px] 2xl:text-[116px]">
              <span className="block">{heroSetting.title}</span>
              <span className="home-gradient-text mt-5 block whitespace-nowrap pr-3 text-[72px] leading-[1.03] tracking-[-0.055em] xl:text-[102px] 2xl:text-[116px]">
                {heroSetting.subtitle}
              </span>
            </h1>

            <p className="mt-8 max-w-none whitespace-nowrap text-[19px] leading-9 text-[#657193] xl:text-[20px]">
              {heroSetting.description}
            </p>

            <div className="mt-12 flex flex-col gap-4 sm:flex-row">
              <Link
                href={heroSetting.primaryButtonHref}
                className="home-button-glow inline-flex items-center justify-center rounded-full bg-[linear-gradient(90deg,#ffbc7c_0%,#ff8fc7_46%,#8974ff_100%)] px-8 py-4 text-[16px] font-semibold text-white shadow-[0_20px_48px_rgba(140,96,255,0.22)] transition hover:-translate-y-0.5"
              >
                {heroSetting.primaryButtonLabel}
              </Link>
              <div className="inline-flex items-center justify-center rounded-full border border-white/80 bg-white/68 px-6 py-4 text-[15px] font-semibold text-[#5f6b8e] shadow-[0_18px_42px_rgba(116,132,185,0.1)] backdrop-blur-xl">
                {heroSetting.secondaryBadge}
              </div>
            </div>
          </div>

          <div className="relative hidden min-h-[640px] lg:block">
            <div className="absolute inset-x-0 bottom-0 h-[640px]">
              <div className="absolute left-[8%] top-[18%] h-[420px] w-[420px] rounded-full border border-white/70 bg-[radial-gradient(circle,rgba(255,255,255,0.34),transparent_68%)]" />
              <div className="absolute right-[8%] top-[25%] h-[340px] w-[340px] rounded-full border border-white/70 bg-[radial-gradient(circle,rgba(141,218,255,0.12),transparent_68%)]" />
              <div className="absolute bottom-[3%] left-[24%] h-28 w-64 rounded-full bg-[radial-gradient(circle,rgba(255,202,126,0.35),transparent_68%)] blur-2xl" />

              <div className="absolute bottom-0 left-[10%] z-20">
                <Image
                  src="/landing-assets/home-kid-custom-transparent.png"
                  alt="儿童创作者"
                  width={1237}
                  height={1280}
                  priority
                  className="h-[520px] w-auto object-contain drop-shadow-[0_34px_72px_rgba(92,112,170,0.24)]"
                />
              </div>

              <div className="absolute bottom-[5%] right-[2%] z-30">
                <Image
                  src="/landing-assets/robot-final-user.png"
                  alt="AI伙伴"
                  width={1024}
                  height={1536}
                  className="h-[320px] w-auto object-contain drop-shadow-[0_28px_58px_rgba(92,112,170,0.24)]"
                />
              </div>

              <Image
                src="/landing-assets/planet-final-user.png"
                alt="微笑星球"
                width={1024}
                height={1536}
                className="orbital-float absolute left-[49%] top-[-18%] h-[188px] w-auto -translate-x-1/2 object-contain drop-shadow-[0_22px_42px_rgba(92,112,170,0.18)]"
                priority
              />
              <Image
                src="/landing-assets/rocket-launch.png"
                alt="探索火箭"
                width={163}
                height={117}
                className="orbital-float absolute right-[10%] top-[-6%] h-[116px] w-auto rotate-[8deg] object-contain drop-shadow-[0_18px_34px_rgba(92,112,170,0.16)]"
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
