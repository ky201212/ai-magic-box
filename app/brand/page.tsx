import Image from "next/image";
import Link from "next/link";
import { marketingNavItems } from "../_components/marketing-nav";
import { getBrandIdentitySetting } from "@/lib/site-config";

const philosophyItems = [
  {
    title: "创造力优先",
    body: "敢想、敢问、敢表达，比给出标准答案更重要。",
  },
  {
    title: "真实成长",
    body: "每一次创作，都在把孩子的表达和判断力推远一点。",
  },
  {
    title: "AI 为伙伴",
    body: "AI 不是替孩子完成，而是陪孩子一起完成。",
  },
  {
    title: "面向未来",
    body: "培养孩子面对科技世界时的理解力、想象力与问题意识。",
  },
] as const;

const values = [
  {
    title: "好奇心",
    subtitle: "是一切的开始",
  },
  {
    title: "想象力",
    subtitle: "是未来的翅膀",
  },
  {
    title: "创造力",
    subtitle: "是改变的力量",
  },
  {
    title: "行动力",
    subtitle: "让想法落进世界",
  },
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
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#f7fbff_0%,#eef5ff_44%,#fff6fb_100%)]" />
      <div className="home-grid absolute inset-0 opacity-[0.55]" />
      <div className="home-sweep absolute left-[-20%] top-[10%] h-[24rem] w-[140%] rotate-[-8deg] bg-[linear-gradient(90deg,transparent,rgba(135,166,255,0.18),rgba(255,177,210,0.16),transparent)] blur-2xl" />
      <div className="absolute left-[-8%] top-[4%] h-[420px] w-[420px] rounded-full bg-[#8edaff]/18 blur-[130px]" />
      <div className="absolute right-[-8%] top-[4%] h-[520px] w-[520px] rounded-full bg-[#ddb7ff]/22 blur-[150px]" />
      <div className="absolute left-[38%] bottom-[2%] h-[320px] w-[320px] rounded-full bg-[#ffd59e]/18 blur-[120px]" />
      <div className="absolute inset-x-0 bottom-0 h-56 bg-[linear-gradient(180deg,transparent,rgba(255,255,255,0.9))]" />
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
      className={`relative overflow-hidden rounded-[30px] border border-white/80 bg-white/72 shadow-[0_28px_80px_rgba(92,116,189,0.14)] backdrop-blur-2xl ${className}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(126,171,255,0.18),transparent_24%),radial-gradient(circle_at_82%_14%,rgba(255,159,211,0.16),transparent_22%)]" />
      {children}
    </section>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-white/80 bg-white/70 px-4 py-2.5 shadow-[0_12px_34px_rgba(112,138,215,0.12)] backdrop-blur-xl">
      <span className="h-2.5 w-2.5 rounded-full bg-[linear-gradient(180deg,#ff9ccd,#6f9dff)] shadow-[0_0_16px_rgba(126,154,255,0.36)]" />
      <span className="text-[13px] font-black tracking-[0.08em] text-[#627ee6]">
        {label}
      </span>
    </div>
  );
}

export default async function BrandPage() {
  const brandIdentity = await getBrandIdentitySetting();

  return (
    <main className="min-h-screen bg-[#f7fbff] text-[#17213f]">
      <div className="relative overflow-hidden">
        <BrandBackground />

        <div className="relative mx-auto flex min-h-screen w-full max-w-[1920px] flex-col px-6 py-6 sm:px-8 lg:px-10 xl:px-12 2xl:px-16">
          <header className="relative z-20 rounded-[28px] border border-white/80 bg-white/72 px-6 py-5 shadow-[0_18px_50px_rgba(84,107,170,0.12)] backdrop-blur-2xl">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
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
                  <p className="text-[18px] font-semibold tracking-normal text-[#17213f]">
                    {brandIdentity.siteName}
                  </p>
                  <p className="text-[12px] tracking-[0.08em] text-[#6d7899]">
                    {brandIdentity.tagline}
                  </p>
                </div>
              </Link>

              <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                <nav className="flex flex-wrap items-center gap-5 text-[14px] font-semibold text-[#6a7392]">
                  {marketingNavItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`transition hover:text-[#17213f] ${
                        item.href === "/brand" ? "text-[#6c63ff]" : "text-[#6a7392]"
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                  <Link
                    href="/login"
                    className="text-[#5f6b8e] transition hover:text-[#17213f]"
                  >
                    手机登录
                  </Link>
                </nav>
              </div>
            </div>
          </header>

          <div className="relative z-10 mt-6 grid flex-1 gap-6">
            <BrandCard className="p-8 sm:p-10 xl:p-12">
              <div className="relative grid gap-10 xl:grid-cols-[0.82fr_1.18fr] xl:items-center">
                <div className="max-w-[660px] pt-2">
                  <SectionLabel label="品牌主张" />
                  <h1 className="mt-8 text-[42px] font-black leading-[1.08] tracking-normal text-[#121a35] sm:text-[46px] xl:text-[56px] 2xl:text-[70px]">
                    <span className="block">不是工具站</span>
                    <span className="home-gradient-text mt-3 block whitespace-nowrap">
                      是儿童创造宇宙
                    </span>
                  </h1>
                  <p className="mt-7 max-w-[560px] text-[18px] leading-[2] text-[#657193]">
                    小红车魔法工坊要做的不是把 AI 功能摆给孩子，而是把技术变成他们愿意进入的角色、任务、故事和作品现场。
                  </p>

                  <div className="mt-9 max-w-[560px] rounded-[26px] border border-white/80 bg-white/72 p-6 shadow-[0_18px_44px_rgba(92,116,189,0.1)] backdrop-blur-xl">
                    <p className="text-[18px] font-black leading-8 tracking-normal text-[#17213f]">
                      孩子是主角，AI 是伙伴，平台是他们开始创造的入口。
                    </p>
                    <p className="mt-3 text-[15px] leading-8 text-[#647092]">
                      我们关心的不是孩子点了多少按钮，而是他们能不能提出问题、做出选择、表达想法，并把想法变成作品。
                    </p>
                  </div>

                </div>

                <div className="relative min-h-[460px] overflow-hidden rounded-[32px] border border-[#edf1ff] bg-[linear-gradient(180deg,#ffffff_0%,#f7faff_58%,#fff8fb_100%)] p-7 shadow-[0_24px_70px_rgba(92,116,189,0.12)]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_20%,rgba(126,171,255,0.14),transparent_28%),radial-gradient(circle_at_76%_24%,rgba(255,159,211,0.16),transparent_26%)]" />
                  <div className="relative z-10 flex h-full flex-col">
                    <div>
                      <div>
                        <p className="text-[13px] font-black tracking-[0.14em] text-[#7782a4]">
                          AI CREATIVE WORKSHOP
                        </p>
                        <h2 className="mt-4 max-w-[14ch] text-[34px] font-black leading-[1.18] tracking-normal text-[#17213f] sm:text-[42px]">
                          给孩子一座可以进入的创造宇宙
                        </h2>
                      </div>
                    </div>

                    <div className="relative mt-6 flex flex-1 items-end justify-center">
                      <Image
                        src="/community-assets/hero-kid-robot-clean.png"
                        alt="创作中的孩子与 AI 伙伴"
                        width={746}
                        height={456}
                          className="relative z-10 h-[300px] w-full max-w-[660px] object-contain drop-shadow-[0_30px_62px_rgba(92,112,170,0.24)]"
                        priority
                      />
                      <Image
                        src="/community-assets/rocket-clean.png"
                        alt="火箭"
                        width={80}
                        height={110}
                        className="absolute right-[8%] top-[18%] h-20 w-auto rotate-12 object-contain"
                      />
                      <Image
                        src="/community-assets/planet-orange-clean.png"
                        alt="橙色星球"
                        width={48}
                        height={48}
                        className="absolute left-[14%] top-[18%] h-9 w-auto object-contain"
                      />
                    </div>

                    <p className="mt-4 text-center text-[14px] font-black tracking-[0.08em] text-[#7380a1]">
                      把技术翻译成任务，把灵感沉淀成作品
                    </p>
                  </div>
                </div>
              </div>
            </BrandCard>

            <BrandCard className="p-7 sm:p-8 xl:p-10">
              <div className="grid gap-5 xl:grid-cols-[0.94fr_1.06fr] xl:items-stretch">
                <div className="relative overflow-hidden rounded-[28px] border border-[#edf1ff] bg-white/58 p-7 shadow-[0_16px_40px_rgba(101,124,190,0.08)]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(126,171,255,0.14),transparent_28%),radial-gradient(circle_at_88%_88%,rgba(255,159,211,0.12),transparent_26%)]" />
                  <div className="relative">
                  <SectionLabel label="品牌故事" />
                  <h2 className="mt-7 text-[38px] font-black leading-[1.18] tracking-normal text-[#17213f] sm:text-[48px]">
                    <span className="block">从一辆小红车</span>
                    <span className="block">到一个创造宇宙</span>
                  </h2>
                  <p className="mt-5 max-w-[34ch] text-[16px] leading-8 text-[#647092]">
                    我们的故事不是一组数字，也不是一套视觉素材。它来自真实课堂里那些好奇的眼睛：孩子想知道世界怎么运行，也想知道自己的想法能不能真的被做出来。
                  </p>

                  <div className="mt-7 grid gap-3 sm:grid-cols-2">
                    {[
                      ["起点", "把科学带到孩子身边"],
                      ["方向", "把想法变成真实作品"],
                    ].map(([title, body]) => (
                      <div
                        key={title}
                        className="rounded-[18px] border border-white/80 bg-white/72 p-4 shadow-[0_10px_24px_rgba(101,124,190,0.07)]"
                      >
                        <p className="text-[13px] font-black tracking-[0.12em] text-[#7c8bb0]">
                          {title}
                        </p>
                        <p className="mt-2 text-[16px] font-black leading-7 text-[#17213f]">
                          {body}
                        </p>
                      </div>
                    ))}
                  </div>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-[28px] border border-[#edf1ff] bg-white/66 p-7 shadow-[0_16px_40px_rgba(101,124,190,0.08)]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_88%_10%,rgba(255,159,211,0.13),transparent_26%),radial-gradient(circle_at_8%_88%,rgba(126,171,255,0.12),transparent_28%)]" />
                  <div className="relative">
                    <p className="text-[13px] font-black tracking-[0.16em] text-[#7782a4]">
                      从科普车到 AI 创造平台
                    </p>
                    <h3 className="mt-3 max-w-[18ch] text-[30px] font-black leading-[1.18] tracking-normal text-[#17213f] sm:text-[38px]">
                      我们一路做的，是帮孩子把好奇心变成作品
                    </h3>

                    <div className="mt-6 space-y-3">
                      {[
                        ["科普启蒙", "把科学带到孩子身边，让他们先对世界产生好奇。"],
                        ["真实课堂", "在一次次活动和课堂里，看见孩子真正需要的是表达、陪伴和被鼓励。"],
                        ["AI 创造", "把技术变成孩子能使用的创作入口，让想法可以变成作品。"],
                      ].map(([title, body], index) => (
                        <div
                          key={title}
                          className="grid grid-cols-[40px_1fr] gap-4 rounded-[18px] border border-[#edf1ff] bg-white/82 p-4 shadow-[0_10px_24px_rgba(101,124,190,0.07)]"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(180deg,#ffbc7c,#8974ff)] text-[14px] font-black text-white">
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-[18px] font-black text-[#17213f]">
                              {title}
                            </p>
                            <p className="mt-2 text-[14px] leading-7 text-[#647092]">
                              {body}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </BrandCard>

            <BrandCard className="p-8 sm:p-10 xl:p-12">
              <div className="grid gap-10 xl:grid-cols-[0.72fr_1.28fr] xl:items-center">
                <div>
                  <SectionLabel label="我们的成长理念" />
                  <h2 className="mt-8 max-w-[12ch] text-[38px] font-black leading-[1.18] tracking-normal text-[#17213f] sm:text-[52px]">
                    孩子为中心，创造为驱动
                  </h2>
                  <p className="mt-6 max-w-[32ch] text-[17px] leading-8 text-[#647092]">
                    页面要讲清楚的不是平台有多少功能，而是我们如何看待孩子、AI 和未来学习。
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {philosophyItems.map((item, index) => (
                    <div
                      key={item.title}
                      className="relative min-h-[152px] rounded-[24px] border border-[#edf1ff] bg-white/78 p-6 shadow-[0_12px_30px_rgba(101,124,190,0.09)]"
                    >
                      <div className="absolute right-5 top-5 text-[38px] font-black leading-none text-[#eef2ff]">
                        0{index + 1}
                      </div>
                      <h3 className="relative text-[24px] font-black tracking-normal text-[#17213f]">
                        {item.title}
                      </h3>
                      <div className="relative mt-4 h-1 w-12 rounded-full bg-[linear-gradient(90deg,#ffbc7c,#8f79ff)]" />
                      <p className="relative mt-5 text-[15px] leading-7 text-[#647092]">
                        {item.body}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </BrandCard>

            <BrandCard className="p-8 sm:p-10 xl:p-12">
              <div className="grid gap-10 xl:grid-cols-[0.82fr_1.18fr] xl:items-center">
                <div>
                  <SectionLabel label="我们相信" />
                  <h2 className="mt-8 text-[38px] font-black leading-[1.18] tracking-normal text-[#17213f] sm:text-[52px]">
                    <span className="block">每个孩子心中都有</span>
                    <span className="block">一个改变世界的想法</span>
                  </h2>
                  <p className="mt-6 max-w-[34ch] text-[17px] leading-8 text-[#647092]">
                    我们要做的，就是点燃它、保护它、陪伴它长大。
                  </p>

                  <div className="mt-9 grid gap-4 sm:grid-cols-2">
                    {values.map((item) => (
                      <div
                        key={item.title}
                        className="rounded-[22px] border border-[#edf1ff] bg-white/74 px-5 py-4 shadow-[0_10px_26px_rgba(101,124,190,0.08)]"
                      >
                        <p className="text-[20px] font-black tracking-normal text-[#627ee6]">
                          {item.title}
                        </p>
                        <p className="mt-1 text-[14px] leading-6 text-[#647092]">
                          {item.subtitle}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-[30px] border border-[#edf1ff] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_58%,#fff8fb_100%)] p-8 shadow-[0_20px_54px_rgba(92,116,189,0.12)]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_88%_8%,rgba(255,159,211,0.16),transparent_26%),radial-gradient(circle_at_12%_88%,rgba(126,171,255,0.14),transparent_28%)]" />
                  <div className="relative">
                    <p className="text-[13px] font-black tracking-[0.14em] text-[#7782a4]">
                      OUR BELIEF
                    </p>
                    <p className="mt-6 max-w-[18ch] text-[42px] font-black leading-[1.18] tracking-normal text-[#17213f] sm:text-[50px]">
                      好奇心被认真对待，创造力才会长出来
                    </p>
                    <div className="mt-8 grid gap-4 sm:grid-cols-3">
                      {[
                        ["看见", "看见孩子真实的问题"],
                        ["保护", "保护尚未成形的想法"],
                        ["陪伴", "陪孩子把想法做成作品"],
                      ].map(([title, body]) => (
                        <div
                          key={title}
                          className="rounded-[22px] border border-[#edf1ff] bg-white/76 p-5 shadow-[0_10px_26px_rgba(101,124,190,0.08)]"
                        >
                          <p className="text-[22px] font-black tracking-normal text-[#627ee6]">
                            {title}
                          </p>
                          <p className="mt-3 text-[14px] leading-7 text-[#647092]">
                            {body}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </BrandCard>

            <BrandCard className="p-8 sm:p-10 xl:p-12">
              <div className="grid gap-10 xl:grid-cols-[0.75fr_1.25fr] xl:items-center">
                <div>
                  <SectionLabel label="我们的目标" />
                  <h2 className="mt-8 max-w-[12ch] text-[38px] font-black leading-[1.18] tracking-normal text-[#17213f] sm:text-[52px]">
                    让每个孩子成为未来的创造者
                  </h2>
                  <p className="mt-6 max-w-[32ch] text-[17px] leading-8 text-[#647092]">
                    这里不是学习的终点，而是创造世界的起点。孩子可以在这里把想法变成作品，把好奇变成能力。
                  </p>

                </div>

                <div className="grid gap-4 sm:grid-cols-4">
                  {growthPath.map((item, index) => (
                    <div
                      key={item.title}
                      className="rounded-[22px] border border-[#edf1ff] bg-white/78 p-5 text-center shadow-[0_10px_26px_rgba(101,124,190,0.08)]"
                    >
                      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(180deg,#ffd08c,#8f79ff)] text-[15px] font-black text-white shadow-[0_12px_28px_rgba(140,96,255,0.2)]">
                        {index + 1}
                      </div>
                      <p className="mt-4 text-[21px] font-black tracking-normal text-[#627ee6]">
                        {item.title}
                      </p>
                      <p className="mt-2 text-[14px] leading-7 text-[#647092]">
                        {item.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </BrandCard>
          </div>

          <footer className="relative z-20 mt-6 rounded-[28px] border border-white/80 bg-white/72 px-6 py-5 shadow-[0_18px_50px_rgba(84,107,170,0.12)] backdrop-blur-2xl">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-4">
                <Image
                  src={brandIdentity.logoUrl}
                  alt={brandIdentity.siteName}
                  width={46}
                  height={46}
                  className="rounded-[16px] bg-white object-cover shadow-[0_12px_28px_rgba(87,115,180,0.16)]"
                />
                <div>
                  <p className="text-[16px] font-semibold text-[#17213f]">{brandIdentity.siteName}</p>
                  <p className="text-[12px] text-[#6d7899]">{brandIdentity.tagline}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6 text-[14px] font-semibold text-[#6a7392]">
                <Link href="/brand" className="transition hover:text-[#17213f]">
                  品牌主张
                </Link>
                <Link href="/world" className="transition hover:text-[#17213f]">
                  科普资讯
                </Link>
                <Link href="/matrix" className="transition hover:text-[#17213f]">
                  创作矩阵
                </Link>
                <Link href="/community" className="transition hover:text-[#17213f]">
                  成长社区
                </Link>
                <Link href="/workshop?mode=coding" className="transition hover:text-[#17213f]">
                  进入工坊
                </Link>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-[13px] text-[#7a86a6]">
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
