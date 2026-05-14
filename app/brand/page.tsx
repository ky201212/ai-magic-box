import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { marketingNavItems } from "../_components/marketing-nav";

const beliefCards = [
  {
    title: "先让孩子想点进去",
    body: "学习不该从任务感开始，而应该从被吸引、被邀请、被激发的那一刻开始。",
    icon: "/brand-spec-assets/badge-planet-card.png",
  },
  {
    title: "再让家长看到价值",
    body: "不是只展示用了 AI，而是让表达力、逻辑力、审美力和科技理解力一起生长。",
    icon: "/brand-spec-assets/badge-cube-card.png",
  },
  {
    title: "最后让 AI 回到幕后",
    body: "平台真正想被看见的，从来不是模型本身，而是孩子如何提出问题、完成创作。",
    icon: "/brand-spec-assets/badge-robot-card.png",
  },
] as const;

const philosophyItems = [
  {
    title: "创造力优先",
    body: "敢想、敢问、敢表达，比给出标准答案更重要。",
    icon: "/brand-spec-assets/badge-create-row.png",
  },
  {
    title: "真实成长",
    body: "每一次创作，都在把孩子的表达和判断力推远一点。",
    icon: "/brand-spec-assets/badge-grow-row.png",
  },
  {
    title: "AI 为伙伴",
    body: "AI 不是替孩子完成，而是陪孩子一起完成。",
    icon: "/brand-spec-assets/badge-ai-row.png",
  },
  {
    title: "面向未来",
    body: "培养孩子面对科技世界时的理解力、想象力与问题意识。",
    icon: "/brand-spec-assets/badge-future-row.png",
  },
] as const;

const values = [
  {
    title: "好奇心",
    subtitle: "是一切的开始",
    icon: "/brand-spec-assets/badge-curiosity-row.png",
  },
  {
    title: "想象力",
    subtitle: "是未来的翅膀",
    icon: "/brand-spec-assets/badge-imagination-row.png",
  },
  {
    title: "创造力",
    subtitle: "是改变的力量",
    icon: "/brand-spec-assets/badge-create-row.png",
  },
  {
    title: "行动力",
    subtitle: "让想法落进世界",
    icon: "/brand-spec-assets/badge-action-row.png",
  },
] as const;

const milestones = [
  { value: "8年+", label: "青少年教育经验" },
  { value: "2000+", label: "学校与机构合作" },
  { value: "50万+", label: "孩子参与体验" },
  { value: "1000+", label: "科创活动累计" },
] as const;

const growthPath = [
  { title: "激发兴趣", text: "让孩子愿意开始" },
  { title: "学习能力", text: "掌握 AI 与创作技能" },
  { title: "表达想法", text: "用作品表达自己" },
  { title: "改变世界", text: "用创造影响未来" },
] as const;

function BrandBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#070412_0%,#0b0518_20%,#100925_46%,#090513_100%)]" />
      <div className="absolute inset-0 opacity-[0.14] [background-image:radial-gradient(rgba(255,255,255,0.95)_0.75px,transparent_0.75px)] [background-size:28px_28px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_16%,rgba(132,206,255,0.12),transparent_16%),radial-gradient(circle_at_86%_8%,rgba(187,116,255,0.18),transparent_20%),radial-gradient(circle_at_56%_70%,rgba(255,171,100,0.08),transparent_18%)]" />

      <div className="absolute left-[-10%] top-[4%] h-[420px] w-[420px] rounded-full bg-[#57c8ff]/10 blur-[140px]" />
      <div className="absolute right-[-8%] top-[14%] h-[520px] w-[520px] rounded-full bg-[#9d69ff]/12 blur-[160px]" />
      <div className="absolute left-[32%] bottom-[6%] h-[320px] w-[320px] rounded-full bg-[#ffb97b]/8 blur-[120px]" />
      <div className="absolute bottom-[18%] right-[26%] h-[260px] w-[260px] rounded-full bg-[#7ad6ff]/8 blur-[120px]" />
    </div>
  );
}

function BrandCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`relative overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,11,44,0.86),rgba(11,7,28,0.94))] shadow-[0_28px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl ${className}`}
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent_22%,transparent_78%,rgba(255,255,255,0.02))]" />
      {children}
    </section>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] px-4 py-2.5 shadow-[0_10px_24px_rgba(0,0,0,0.14)] backdrop-blur-xl">
      <span className="h-2.5 w-2.5 rounded-full bg-[linear-gradient(180deg,#cda3ff,#7fcfff)] shadow-[0_0_16px_rgba(173,123,255,0.45)]" />
      <span className="text-[13px] font-semibold tracking-[0.08em] text-white/82">
        {label}
      </span>
    </div>
  );
}

export default async function BrandPage() {
  const cookieStore = await cookies();
  const isLoggedIn = Boolean(cookieStore.get("magic_session")?.value);

  return (
    <main className="min-h-screen bg-[#080512] text-white">
      <div className="relative overflow-hidden">
        <BrandBackground />

        <div className="relative mx-auto flex min-h-screen w-full max-w-[1920px] flex-col px-6 py-6 sm:px-8 lg:px-10 xl:px-12 2xl:px-16">
          <header className="relative z-20 rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(14,9,34,0.88),rgba(10,7,25,0.82))] px-6 py-5 shadow-[0_24px_70px_rgba(0,0,0,0.24)] backdrop-blur-xl">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <Link href="/" className="flex items-center gap-4">
                <Image
                  src="/brand-spec-assets/brand-logo-lockup.png"
                  alt="小红车魔法工坊"
                  width={290}
                  height={78}
                  className="h-[52px] w-auto"
                  priority
                />
                <div>
                  <p className="sr-only text-[18px] font-semibold tracking-[-0.03em] text-white">
                    小红车魔法工坊
                  </p>
                  <p className="sr-only text-[12px] tracking-[0.08em] text-white/42">
                    下一代儿童 AI 创造教育平台
                  </p>
                </div>
              </Link>

              <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                <nav className="flex flex-wrap items-center gap-5 text-[14px] font-medium text-white/46">
                  {marketingNavItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`transition hover:text-white ${
                        item.href === "/brand" ? "text-white" : "text-white/46"
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                  <Link
                    href="/login"
                    className="text-white/72 transition hover:text-white"
                  >
                    手机登录
                  </Link>
                </nav>

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
                      开始登录
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
            </div>
          </header>

          <div className="relative z-10 mt-6 grid flex-1 gap-6">
            <BrandCard className="min-h-[540px] p-8 sm:p-10">
                <div className="absolute right-[6%] top-[5%]">
                  <Image
                    src="/brand-spec-assets/deco-planet-large.png"
                    alt="星球"
                    width={129}
                    height={92}
                    className="h-[96px] w-auto object-contain opacity-95"
                  />
                </div>

                <div className="relative grid gap-10 xl:grid-cols-[0.92fr_1.08fr]">
                  <div className="max-w-[600px]">
                    <SectionLabel label="品牌主张" />
                    <h1 className="mt-8 text-[50px] font-black leading-[1.08] tracking-[-0.055em] text-white sm:text-[64px] xl:text-[78px]">
                      <span className="block">我们想打造的不是工具站</span>
                      <span className="mt-3 block bg-gradient-to-r from-[#ffffff] via-[#f1c4ff] to-[#aa8dff] bg-clip-text text-transparent">
                        而是一座儿童创造宇宙
                      </span>
                    </h1>
                    <p className="mt-8 max-w-[34ch] text-[18px] leading-9 text-white/60">
                      小红车魔法工坊相信，真正好的 AI 教育平台，不该先要求孩子适应技术，而应该先让技术适应孩子的好奇心、表达欲、想象力与创造力。
                    </p>
                  </div>

                  <div className="relative flex min-h-[350px] flex-col justify-start gap-5 pt-10 xl:pt-20">
                    <div className="grid gap-4 md:grid-cols-3">
                      {beliefCards.map((item) => (
                        <article
                          key={item.title}
                          className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-5 shadow-[0_18px_44px_rgba(0,0,0,0.2)]"
                        >
                          <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-white/8">
                            <Image
                              src={item.icon}
                              alt={item.title}
                              width={34}
                              height={34}
                              className="h-8 w-8 object-contain"
                            />
                          </div>
                          <h2 className="mt-5 text-[24px] font-black leading-[1.24] tracking-[-0.04em] text-white">
                            {item.title}
                          </h2>
                          <p className="mt-4 text-[14px] leading-7 text-white/50">
                            {item.body}
                          </p>
                        </article>
                      ))}
                    </div>

                    <div className="relative hidden min-h-[230px] xl:block">
                      <div className="absolute bottom-0 left-[6%]">
                        <Image
                          src="/brand-spec-assets/hero-kid-robot.png"
                          alt="创作中的孩子与 AI 伙伴"
                          width={400}
                          height={240}
                          className="h-[250px] w-auto object-contain drop-shadow-[0_34px_72px_rgba(0,0,0,0.42)]"
                          priority
                        />
                      </div>
                      <div className="absolute bottom-10 right-[8%]">
                        <Image
                          src="/brand-spec-assets/deco-planet-orange.png"
                          alt="装饰星球"
                          width={84}
                          height={56}
                          className="h-[42px] w-auto object-contain opacity-95"
                        />
                      </div>
                      <div className="absolute bottom-8 left-[2%] h-20 w-[72%] rounded-full bg-[radial-gradient(circle,rgba(121,92,255,0.28),transparent_68%)] blur-2xl" />
                    </div>
                  </div>
                </div>
            </BrandCard>

            <BrandCard className="p-8 sm:p-10">
                <div className="grid gap-8 xl:grid-cols-[0.78fr_1.22fr]">
                <div>
                  <SectionLabel label="品牌故事" />
                  <h2 className="mt-8 max-w-[12ch] text-[40px] font-black leading-[1.14] tracking-[-0.05em] text-white sm:text-[54px]">
                    从一辆小红车到一个创造宇宙
                  </h2>
                  <p className="mt-6 max-w-[30ch] text-[17px] leading-8 text-white/56">
                    小红车从科普课堂走来，从乡镇走进城市，从一辆科普车，变成一个孩子们通往未来的创造起点。我们走过的每一段路，都在为了让更多孩子拥有改变未来的能力。
                  </p>
                  <Link
                    href="/world"
                    className="mt-8 inline-flex items-center justify-center rounded-full bg-[linear-gradient(90deg,#7a56ff_0%,#8a45ff_100%)] px-6 py-3 text-[15px] font-semibold text-white shadow-[0_18px_42px_rgba(126,86,255,0.36)] transition hover:-translate-y-0.5"
                  >
                    了解我们的故事
                  </Link>
                </div>

                <div className="relative overflow-hidden rounded-[28px] border border-[#8f65ff]/45 bg-[linear-gradient(180deg,rgba(28,15,70,0.7),rgba(15,10,39,0.78))] p-4">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(117,196,255,0.12),transparent_18%),radial-gradient(circle_at_72%_18%,rgba(171,118,255,0.18),transparent_22%)]" />
                  <div className="relative aspect-[16/10] overflow-hidden rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,#191149_0%,#120b35_38%,#120a2d_100%)]">
                    <Image
                      src="/brand-spec-assets/deco-rocket-small.png"
                      alt="故事场景"
                      width={119}
                      height={124}
                      className="absolute right-[12%] top-[18%] h-[86px] w-auto object-contain opacity-95"
                    />
                    <Image
                      src="/brand-spec-assets/deco-planet-small.png"
                      alt="远处星球"
                      width={59}
                      height={53}
                      className="absolute right-8 top-7 h-[34px] w-auto object-contain opacity-90"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-[52%] bg-[linear-gradient(180deg,transparent,rgba(23,13,50,0.38)_10%,rgba(16,10,36,0.95)_84%)]" />
                    <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between px-10 pb-6">
                      <Image
                        src="/brand-spec-assets/story-scene.png"
                        alt="孩子们"
                        width={371}
                        height={204}
                        className="h-[150px] w-auto rounded-[16px] object-cover"
                      />
                    </div>
                    <div className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/12 backdrop-blur-xl">
                      <div className="ml-1 h-0 w-0 border-y-[12px] border-l-[18px] border-y-transparent border-l-white" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-4">
                {milestones.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[22px] border border-white/8 bg-white/4 px-5 py-5 text-center"
                  >
                    <p className="text-[38px] font-black tracking-[-0.05em] text-[#d498ff]">
                      {item.value}
                    </p>
                    <p className="mt-2 text-[13px] leading-6 text-white/42">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>
            </BrandCard>

            <BrandCard className="p-8 sm:p-10">
                <div className="grid gap-8 xl:grid-cols-[0.94fr_1.06fr]">
                  <div>
                    <SectionLabel label="我们的成长理念" />
                    <div className="mt-8 grid gap-7 sm:grid-cols-2">
                      {philosophyItems.map((item) => (
                        <div key={item.title} className="flex gap-4">
                          <div className="mt-1 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/6">
                            <Image
                              src={item.icon}
                              alt={item.title}
                              width={28}
                              height={28}
                              className="h-7 w-7 object-contain"
                            />
                          </div>
                          <div>
                            <h3 className="text-[26px] font-black tracking-[-0.04em] text-white">
                              {item.title}
                            </h3>
                            <p className="mt-3 max-w-[25ch] text-[15px] leading-7 text-white/52">
                              {item.body}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="relative flex min-h-[300px] items-center justify-center overflow-hidden rounded-[30px] border border-white/8 bg-[radial-gradient(circle_at_center,rgba(116,95,255,0.22),rgba(21,13,54,0.06)_42%,transparent_62%)]">
                    <div className="absolute h-[320px] w-[320px] rounded-full border border-[#7a63ff]/30 bg-[radial-gradient(circle,rgba(122,99,255,0.22),transparent_65%)]" />
                    <div className="absolute h-[230px] w-[230px] rounded-full border border-white/12" />
                    <div className="absolute h-[150px] w-[150px] rounded-full border border-white/10" />
                    <div className="relative z-10 text-center">
                      <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[linear-gradient(180deg,rgba(125,89,255,0.32),rgba(108,78,255,0.12))] shadow-[0_16px_48px_rgba(122,99,255,0.28)]">
                        <Image
                          src="/brand-spec-assets/badge-ai-row.png"
                          alt="AI 伙伴"
                          width={60}
                          height={60}
                          className="h-14 w-14 object-contain"
                        />
                      </div>
                      <p className="mt-8 text-[42px] font-black leading-[1.22] tracking-[-0.045em] text-white">
                        孩子为中心 创造为驱动
                      </p>
                      <p className="mt-2 text-[42px] font-black leading-[1.22] tracking-[-0.045em] text-white">
                        AI 为伙伴
                      </p>
                    </div>
                  </div>
                </div>
            </BrandCard>

            <BrandCard className="p-8 sm:p-10">
              <div className="grid gap-10 xl:grid-cols-[0.92fr_1.08fr] xl:items-center">
                <div>
                  <SectionLabel label="我们相信" />
                  <h2 className="mt-8 max-w-[14ch] text-[40px] font-black leading-[1.16] tracking-[-0.05em] text-white sm:text-[52px]">
                    每个孩子心中都有一个想改变世界的想法
                  </h2>
                  <p className="mt-6 max-w-[32ch] text-[17px] leading-8 text-white/56">
                    我们相信，每个孩子都有改变世界的力量。我们要做的，就是点燃它、保护它、陪伴它长大。
                  </p>

                  <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {values.map((item) => (
                      <div key={item.title} className="text-center xl:text-left">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/6 xl:mx-0">
                          <Image
                            src={item.icon}
                            alt={item.title}
                            width={28}
                            height={28}
                            className="h-7 w-7 object-contain"
                          />
                        </div>
                        <p className="mt-4 text-[22px] font-black tracking-[-0.04em] text-[#d4a6ff]">
                          {item.title}
                        </p>
                        <p className="mt-2 text-[15px] leading-7 text-white/50">
                          {item.subtitle}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="relative min-h-[360px]">
                  <div className="absolute inset-0 rounded-[30px] bg-[radial-gradient(circle_at_center,rgba(126,96,255,0.22),transparent_62%)]" />
                  <div className="absolute right-[4%] top-[6%]">
                    <Image
                      src="/brand-spec-assets/hero-kid-rocket.png"
                      alt="乘着火箭的孩子"
                      width={263}
                      height={250}
                      className="h-[320px] w-auto object-contain drop-shadow-[0_34px_72px_rgba(0,0,0,0.42)]"
                    />
                  </div>
                  <div className="absolute bottom-[18%] left-[10%]">
                    <Image
                      src="/brand-spec-assets/deco-cube.png"
                      alt="装饰方块"
                      width={80}
                      height={86}
                      className="h-[68px] w-auto object-contain opacity-95"
                    />
                  </div>
                </div>
              </div>
            </BrandCard>

            <BrandCard className="p-8 sm:p-10">
                <div className="grid gap-8 xl:grid-cols-[0.78fr_1.22fr]">
                  <div>
                    <SectionLabel label="我们的目标" />
                    <h2 className="mt-8 max-w-[12ch] text-[40px] font-black leading-[1.14] tracking-[-0.05em] text-white sm:text-[50px]">
                      让每个孩子成为未来的创造者
                    </h2>
                    <p className="mt-6 max-w-[30ch] text-[17px] leading-8 text-white/56">
                      我们希望通过一个充满乐趣、充满想象、充满可能的平台，让孩子真正掌握创造未来的能力。
                    </p>
                  </div>

                  <div className="relative overflow-hidden rounded-[30px] border border-white/8 bg-[linear-gradient(180deg,rgba(34,19,83,0.46),rgba(17,10,44,0.3))] px-6 py-8">
                    <div className="absolute inset-x-8 top-1/2 h-px -translate-y-1/2 bg-[linear-gradient(90deg,transparent,rgba(143,117,255,0.72),transparent)]" />
                    <div className="absolute left-10 right-10 top-1/2 -translate-y-1/2">
                      <svg
                        viewBox="0 0 1000 220"
                        className="h-[180px] w-full"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M20 175C120 180 170 114 246 118C321 121 332 150 416 149C514 148 548 78 635 82C724 87 734 130 824 130C904 130 946 82 980 44"
                          stroke="url(#growth-gradient)"
                          strokeWidth="6"
                          strokeLinecap="round"
                        />
                        <defs>
                          <linearGradient id="growth-gradient" x1="20" y1="175" x2="980" y2="44" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#FFD88B" />
                            <stop offset="0.48" stopColor="#8DAEFF" />
                            <stop offset="1" stopColor="#D79BFF" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>

                    <div className="relative z-10 grid gap-6 sm:grid-cols-4">
                      {growthPath.map((item, index) => (
                        <div
                          key={item.title}
                          className={`flex flex-col ${
                            index % 2 === 0 ? "justify-end pt-24" : "justify-start pb-20"
                          }`}
                        >
                          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(180deg,#f8d88d,#bfa0ff)] shadow-[0_0_24px_rgba(187,142,255,0.3)]" />
                          <div className="mt-5 text-center">
                            <p className="text-[22px] font-black tracking-[-0.03em] text-[#ffd48d]">
                              {item.title}
                            </p>
                            <p className="mt-2 text-[15px] leading-7 text-white/52">
                              {item.text}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
            </BrandCard>

            <BrandCard className="p-8 sm:p-10">
                <div className="grid gap-10 xl:grid-cols-[0.84fr_1.16fr] xl:items-center">
                  <div>
                    <SectionLabel label="欢迎来到工坊" />
                    <h2 className="mt-8 max-w-[10ch] text-[44px] font-black leading-[1.12] tracking-[-0.05em] text-white sm:text-[58px]">
                      欢迎来到小红车魔法工坊
                    </h2>
                    <p className="mt-6 max-w-[28ch] text-[17px] leading-8 text-white/56">
                      这里不是学习的终点，而是创造世界的起点。每一个孩子，都可以在这里把想法变成作品，把好奇变成能力。
                    </p>

                    <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                      <Link
                        href="/workshop?mode=coding"
                        className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(90deg,#8c63ff_0%,#6d55ff_100%)] px-7 py-3.5 text-[15px] font-semibold text-white shadow-[0_18px_42px_rgba(126,86,255,0.34)] transition hover:-translate-y-0.5"
                      >
                        进入工坊
                      </Link>
                      <Link
                        href="/matrix"
                        className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/6 px-7 py-3.5 text-[15px] font-semibold text-white/76 transition hover:bg-white/10 hover:text-white"
                      >
                        了解课程体系
                      </Link>
                    </div>
                  </div>

                  <div className="relative min-h-[300px] overflow-hidden rounded-[30px] border border-white/8 bg-[radial-gradient(circle_at_center,rgba(82,71,190,0.22),rgba(20,13,52,0.16)_48%,transparent_70%)]">
                    <div className="absolute left-1/2 top-1/2 h-[180px] w-[180px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(97,155,255,0.28),transparent_64%)] blur-[18px]" />
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                      <Image
                        src="/brand-spec-assets/badge-ai-row.png"
                        alt="AI 伙伴"
                        width={96}
                        height={96}
                        className="h-[76px] w-auto object-contain drop-shadow-[0_24px_52px_rgba(0,0,0,0.4)]"
                      />
                    </div>

                    <div className="absolute left-[18%] top-[22%] flex h-16 w-16 items-center justify-center rounded-[18px] border border-[#86a7ff]/30 bg-[linear-gradient(180deg,rgba(93,128,255,0.22),rgba(39,57,129,0.22))] shadow-[0_14px_34px_rgba(89,110,255,0.24)]">
                      <Image
                        src="/brand-spec-assets/badge-curiosity-row.png"
                        alt="写作"
                        width={28}
                        height={28}
                        className="h-7 w-7 object-contain"
                      />
                    </div>
                    <div className="absolute right-[16%] top-[18%] flex h-16 w-16 items-center justify-center rounded-[18px] border border-[#b88fff]/30 bg-[linear-gradient(180deg,rgba(156,106,255,0.22),rgba(79,45,155,0.22))] shadow-[0_14px_34px_rgba(156,106,255,0.24)]">
                      <Image
                        src="/brand-spec-assets/badge-imagination-row.png"
                        alt="绘画"
                        width={28}
                        height={28}
                        className="h-7 w-7 object-contain"
                      />
                    </div>
                    <div className="absolute left-[22%] bottom-[18%] flex h-16 w-16 items-center justify-center rounded-[18px] border border-[#a280ff]/30 bg-[linear-gradient(180deg,rgba(130,127,255,0.22),rgba(60,54,151,0.22))] shadow-[0_14px_34px_rgba(130,127,255,0.24)]">
                      <Image
                        src="/brand-spec-assets/badge-music-row.png"
                        alt="音乐"
                        width={28}
                        height={28}
                        className="h-7 w-7 object-contain"
                      />
                    </div>
                    <div className="absolute right-[18%] bottom-[16%] flex h-16 w-16 items-center justify-center rounded-[18px] border border-[#8fa9ff]/30 bg-[linear-gradient(180deg,rgba(110,152,255,0.22),rgba(44,67,151,0.22))] shadow-[0_14px_34px_rgba(110,152,255,0.24)]">
                      <Image
                        src="/brand-spec-assets/badge-code-row.png"
                        alt="编程"
                        width={28}
                        height={28}
                        className="h-7 w-7 object-contain"
                      />
                    </div>
                  </div>
                </div>
            </BrandCard>
          </div>

          <footer className="relative z-20 mt-6 rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(14,9,34,0.84),rgba(10,7,24,0.8))] px-6 py-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-4">
                <Image
                  src="/brand-spec-assets/brand-logo-lockup.png"
                  alt="小红车魔法工坊"
                  width={290}
                  height={78}
                  className="h-[46px] w-auto"
                />
                <div>
                  <p className="sr-only text-[16px] font-semibold text-white">小红车魔法工坊</p>
                  <p className="sr-only text-[12px] text-white/38">下一代儿童创造教育平台</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6 text-[14px] text-white/42">
                <Link href="/brand" className="transition hover:text-white">
                  品牌主张
                </Link>
                <Link href="/world" className="transition hover:text-white">
                  世界观
                </Link>
                <Link href="/matrix" className="transition hover:text-white">
                  创作矩阵
                </Link>
                <Link href="/community" className="transition hover:text-white">
                  成长社区
                </Link>
                <Link href="/workshop?mode=coding" className="transition hover:text-white">
                  进入工坊
                </Link>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-[13px] text-white/34">
                <span>© 2024 小红车魔法工坊</span>
                <span>蜀ICP备XXXXXXXX号</span>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </main>
  );
}
