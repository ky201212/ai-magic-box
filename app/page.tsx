"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

type EntranceCard = {
  title: string;
  description: string;
  href?: string;
  eyebrow: string;
  iconSrc: string;
  preview: ReactNode;
  accentClass: string;
};

const navItems = ["平台介绍", "创作入口", "课程资源"];

const entranceCards: EntranceCard[] = [
  {
    eyebrow: "互动创作",
    title: "智能编程体验馆",
    description:
      "从一句话出发，快速生成可运行的小作品，让课堂灵感自然变成真正能展示的成果。",
    href: "/workshop?mode=coding",
    iconSrc: "/landing-assets/icon-code.png",
    accentClass: "from-[#ffb56e]/18 via-[#9473ff]/12 to-transparent",
    preview: (
      <div className="relative h-[132px] w-[138px]">
        <Image
          src="/landing-assets/robot-pad.png"
          alt="智能编程体验馆"
          width={157}
          height={174}
          className="absolute bottom-0 right-0 h-[102px] w-auto object-contain"
        />
        <Image
          src="/landing-assets/cube.png"
          alt=""
          aria-hidden="true"
          width={70}
          height={65}
          className="absolute left-2 bottom-6 h-[32px] w-auto object-contain"
        />
        <Image
          src="/landing-assets/spark-purple.png"
          alt=""
          aria-hidden="true"
          width={53}
          height={48}
          className="absolute right-4 top-2 h-[18px] w-auto object-contain"
        />
      </div>
    ),
  },
  {
    eyebrow: "视觉表达",
    title: "智能绘画工作坊",
    description:
      "把脑海中的角色、故事和场景变成完整画面，让想象力拥有清晰、好看的表达方式。",
    href: "/workshop?mode=painting",
    iconSrc: "/landing-assets/icon-palette.png",
    accentClass: "from-[#ff9eb8]/18 via-[#9f84ff]/14 to-transparent",
    preview: (
      <div className="relative h-[136px] w-[146px]">
        <Image
          src="/landing-assets/easel.png"
          alt="智能绘画工作坊"
          width={131}
          height={179}
          className="absolute bottom-0 right-2 h-[118px] w-auto object-contain"
        />
        <Image
          src="/landing-assets/star-purple.png"
          alt=""
          aria-hidden="true"
          width={70}
          height={69}
          className="absolute left-1 top-4 h-[18px] w-auto object-contain opacity-80"
        />
      </div>
    ),
  },
  {
    eyebrow: "文字表达",
    title: "智能写作实验室",
    description:
      "从童话、诗歌到演讲稿，帮助孩子更顺畅地整理想法，也更自信地表达自己。",
    href: "/workshop?mode=writing",
    iconSrc: "/landing-assets/icon-doc.png",
    accentClass: "from-[#ffd87d]/18 via-[#a97bff]/14 to-transparent",
    preview: (
      <div className="relative h-[132px] w-[140px]">
        <Image
          src="/landing-assets/scroll.png"
          alt="智能写作实验室"
          width={162}
          height={161}
          className="absolute bottom-0 right-0 h-[104px] w-auto object-contain"
        />
        <Image
          src="/landing-assets/spark-yellow.png"
          alt=""
          aria-hidden="true"
          width={44}
          height={42}
          className="absolute right-6 top-4 h-[18px] w-auto object-contain"
        />
      </div>
    ),
  },
  {
    eyebrow: "声音灵感",
    title: "智能音乐工坊",
    description:
      "让节拍、旋律和情绪成为作品的一部分，把创意从画面自然延伸到声音空间。",
    iconSrc: "/landing-assets/icon-music.png",
    accentClass: "from-[#b287ff]/18 via-[#6f92ff]/14 to-transparent",
    preview: (
      <div className="relative h-[136px] w-[150px]">
        <Image
          src="/landing-assets/tablet.png"
          alt="智能音乐工坊"
          width={175}
          height={55}
          className="absolute left-0 bottom-5 h-[58px] w-auto rotate-[-6deg] object-contain"
        />
        <Image
          src="/landing-assets/icon-music.png"
          alt=""
          aria-hidden="true"
          width={70}
          height={69}
          className="absolute right-2 top-3 h-[44px] w-auto object-contain opacity-90"
        />
        <Image
          src="/landing-assets/spark-purple.png"
          alt=""
          aria-hidden="true"
          width={53}
          height={48}
          className="absolute left-4 top-2 h-[18px] w-auto object-contain"
        />
      </div>
    ),
  },
  {
    eyebrow: "影像叙事",
    title: "智能视频工场",
    description:
      "把知识点、角色设定和镜头表达连接起来，让故事真正拥有节奏和完整的呈现。",
    iconSrc: "/landing-assets/icon-video.png",
    accentClass: "from-[#6faeff]/18 via-[#9f77ff]/14 to-transparent",
    preview: (
      <div className="relative h-[136px] w-[150px]">
        <Image
          src="/landing-assets/rocket-launch.png"
          alt="智能视频工场"
          width={163}
          height={117}
          className="absolute bottom-1 right-0 h-[88px] w-auto object-contain"
        />
        <Image
          src="/landing-assets/icon-video.png"
          alt=""
          aria-hidden="true"
          width={70}
          height={69}
          className="absolute left-2 top-3 h-[42px] w-auto object-contain opacity-92"
        />
      </div>
    ),
  },
  {
    eyebrow: "空间想象",
    title: "智能建模星球",
    description:
      "从平面灵感迈向立体构造，让孩子理解空间关系，也看见未来创作的新方式。",
    iconSrc: "/landing-assets/icon-cube.png",
    accentClass: "from-[#80ebd8]/18 via-[#7d7fff]/14 to-transparent",
    preview: (
      <div className="relative h-[140px] w-[154px]">
        <Image
          src="/landing-assets/earth.png"
          alt="智能建模星球"
          width={177}
          height={157}
          className="absolute bottom-0 right-0 h-[108px] w-auto object-contain"
        />
        <Image
          src="/landing-assets/star-yellow.png"
          alt=""
          aria-hidden="true"
          width={71}
          height={69}
          className="absolute left-4 top-5 h-[18px] w-auto object-contain"
        />
      </div>
    ),
  },
];

function MaterialIcon({
  src,
  alt,
  className = "h-12 w-12",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <div className="grid h-14 w-14 place-items-center rounded-[20px] border border-white/14 bg-white/10 shadow-[0_14px_28px_rgba(6,7,34,0.24)] backdrop-blur-xl">
      <Image src={src} alt={alt} width={56} height={56} className={className} />
    </div>
  );
}

function HeroArtwork() {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-[40px]">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#14154c_0%,#241561_32%,#2a196d_56%,#28144f_100%)]" />
      <div className="aurora-drift absolute left-[-8%] top-[10%] h-[320px] w-[320px] rounded-full bg-[#67d7ff]/10 blur-[100px]" />
      <div className="aurora-drift absolute left-[34%] top-[14%] h-[280px] w-[280px] rounded-full bg-[#8e7dff]/16 blur-[96px]" />
      <div className="aurora-drift absolute right-[4%] top-[8%] h-[360px] w-[360px] rounded-full bg-[#9d62ff]/20 blur-[110px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_40%,rgba(106,139,255,0.14),transparent_20%),radial-gradient(circle_at_74%_72%,rgba(255,175,118,0.16),transparent_18%),radial-gradient(circle_at_58%_14%,rgba(255,255,255,0.12),transparent_20%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,10,46,0.2),rgba(22,18,76,0.06)_36%,rgba(255,177,118,0.08)_78%,rgba(255,166,106,0.12))]" />

      <div className="absolute left-[56%] top-[9%] h-[118px] w-[118px] -translate-x-1/2 rounded-full bg-[#ffc77e]/18 blur-[28px]" />
      <div className="absolute left-[56%] top-[7%] -translate-x-1/2">
        <Image
          src="/landing-assets/planet-smile.png"
          alt="微笑星球"
          width={179}
          height={101}
          className="h-[94px] w-auto object-contain"
        />
      </div>

      <div className="absolute left-[65%] top-[18%]">
        <Image
          src="/landing-assets/rocket-launch.png"
          alt="小火箭"
          width={163}
          height={117}
          className="h-[82px] w-auto rotate-[8deg] object-contain"
        />
      </div>

      <div className="absolute left-[76%] top-[24%]">
        <Image
          src="/landing-assets/star-yellow.png"
          alt="黄色星星"
          width={71}
          height={69}
          className="h-[26px] w-auto object-contain drop-shadow-[0_0_14px_rgba(255,216,103,0.74)]"
        />
      </div>

      <div className="absolute inset-0 opacity-[0.42] [background-image:radial-gradient(rgba(255,255,255,0.95)_1px,transparent_1px)] [background-size:124px_124px]" />
      <div className="absolute left-[30%] top-[18%] h-[6px] w-[6px] rounded-full bg-white shadow-[0_0_16px_rgba(255,255,255,0.8)]" />
      <div className="absolute left-[39%] top-[24%] h-[5px] w-[5px] rounded-full bg-white shadow-[0_0_16px_rgba(255,255,255,0.8)]" />
      <div className="absolute left-[53%] top-[16%] h-[5px] w-[5px] rounded-full bg-white shadow-[0_0_16px_rgba(255,255,255,0.8)]" />
      <div className="absolute left-[70%] top-[18%] h-[4px] w-[4px] rounded-full bg-white shadow-[0_0_16px_rgba(255,255,255,0.8)]" />
      <div className="absolute left-[78%] top-[12%] h-[4px] w-[4px] rounded-full bg-white shadow-[0_0_16px_rgba(255,255,255,0.8)]" />

      <div className="absolute right-[10%] top-[16%] h-[390px] w-[240px] rounded-[34px] bg-[linear-gradient(180deg,rgba(100,72,212,0.16),rgba(255,255,255,0.01))] blur-[1px]" />

      <div className="absolute bottom-0 left-0 right-0 h-[220px] bg-[linear-gradient(180deg,transparent,rgba(23,10,56,0.62)_18%,rgba(24,10,51,0.94))]" />
      <div className="absolute bottom-[54px] left-[18%] h-[94px] w-[420px] rounded-full bg-[#684dff]/18 blur-[40px]" />
      <div className="absolute bottom-[36px] right-[8%] h-[132px] w-[260px] rounded-full bg-[#ffb379]/12 blur-[42px]" />
      <div className="absolute bottom-[12px] right-[2%] h-[120px] w-[250px] rounded-tl-[84px] rounded-tr-[24px] rounded-br-[20px] rounded-bl-[26px] bg-[linear-gradient(180deg,rgba(255,177,120,0.12),rgba(93,58,197,0.04))]" />
      <div className="absolute bottom-[0] right-[4%] h-[164px] w-[318px] rounded-tl-[100px] rounded-tr-[20px] bg-[linear-gradient(180deg,rgba(255,168,108,0.08),rgba(76,47,160,0.02))]" />

      <div className="absolute bottom-[0] left-[48%] h-[324px] w-[250px] rounded-t-[120px] bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.005))]" />

      <div className="absolute left-[19%] bottom-[74px]">
        <Image
          src="/landing-assets/tablet.png"
          alt="创作面板"
          width={175}
          height={55}
          className="h-[78px] w-auto object-contain drop-shadow-[0_20px_36px_rgba(68,50,162,0.45)]"
        />
      </div>

      <div className="absolute left-[15%] bottom-[92px]">
        <Image
          src="/landing-assets/cup.png"
          alt="画笔笔筒"
          width={78}
          height={144}
          className="h-[104px] w-auto object-contain"
        />
      </div>

      <div className="absolute left-[31%] bottom-[82px]">
        <Image
          src="/landing-assets/cube.png"
          alt="积木"
          width={70}
          height={65}
          className="h-[40px] w-auto object-contain"
        />
      </div>

      <div className="absolute left-[36%] bottom-[72px]">
        <Image
          src="/landing-assets/star-big.png"
          alt="发光星星"
          width={76}
          height={74}
          className="h-[54px] w-auto object-contain drop-shadow-[0_0_20px_rgba(255,216,106,0.72)]"
        />
      </div>

      <div className="absolute left-[53%] bottom-[18px] -translate-x-1/2">
        <Image
          src="/landing-assets/kid-point.png"
          alt="小朋友角色"
          width={311}
          height={323}
          priority
          className="h-[420px] w-auto object-contain drop-shadow-[0_18px_40px_rgba(16,10,41,0.5)]"
        />
      </div>

      <div className="absolute left-[57%] bottom-[158px]">
        <Image
          src="/landing-assets/star-yellow.png"
          alt="黄色星星"
          width={71}
          height={69}
          className="h-[34px] w-auto object-contain drop-shadow-[0_0_18px_rgba(255,216,103,0.86)]"
        />
      </div>

      <div className="absolute left-[66%] bottom-[140px]">
        <Image
          src="/landing-assets/star-purple.png"
          alt="紫色星星"
          width={70}
          height={69}
          className="h-[30px] w-auto object-contain"
        />
      </div>

      <div className="absolute left-[61%] bottom-[118px]">
        <Image
          src="/landing-assets/spark-yellow.png"
          alt="黄色星点"
          width={44}
          height={42}
          className="h-[20px] w-auto object-contain"
        />
      </div>

      <div className="absolute left-[62%] bottom-[82px]">
        <Image
          src="/landing-assets/planet-bubble-left.png"
          alt="星球光点"
          width={40}
          height={39}
          className="h-[28px] w-auto object-contain"
        />
      </div>

      <div className="absolute left-[67%] bottom-[76px]">
        <Image
          src="/landing-assets/planet-bubble-right.png"
          alt="星球光点"
          width={43}
          height={42}
          className="h-[30px] w-auto object-contain"
        />
      </div>

      <div className="absolute right-[17%] bottom-[20px]">
        <Image
          src="/landing-assets/robot-front.png"
          alt="机器人伙伴"
          width={160}
          height={172}
          className="h-[252px] w-auto object-contain drop-shadow-[0_18px_40px_rgba(16,10,41,0.45)]"
        />
      </div>

      <div className="absolute right-[11%] bottom-[202px]">
        <Image
          src="/landing-assets/spark-purple.png"
          alt="紫色星点"
          width={53}
          height={48}
          className="h-[24px] w-auto object-contain"
        />
      </div>

      <div className="absolute right-[20%] bottom-[218px]">
        <Image
          src="/landing-assets/rocket-glide.png"
          alt="小火箭"
          width={149}
          height={89}
          className="h-[54px] w-auto object-contain rotate-[8deg] opacity-80"
        />
      </div>
    </div>
  );
}

function FeatureCard({ item }: { item: EntranceCard }) {
  const content = (
    <div className="group relative h-full overflow-hidden rounded-[30px] border border-white/12 bg-[linear-gradient(180deg,rgba(110,93,204,0.24),rgba(71,53,151,0.2)_28%,rgba(255,255,255,0.02))] p-6 shadow-[0_18px_38px_rgba(6,6,26,0.18)] transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_26px_54px_rgba(10,9,40,0.28)]">
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${item.accentClass}`} />
      <div className="pointer-events-none absolute right-[-44px] top-[-30px] h-32 w-32 rounded-full bg-white/8 blur-2xl" />
      <div className="pointer-events-none absolute bottom-[-44px] right-[-12px] h-28 w-28 rounded-full bg-white/6 blur-2xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_78%,rgba(142,220,255,0.12),transparent_24%),radial-gradient(circle_at_22%_16%,rgba(255,255,255,0.08),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_34%)]" />

      <div className="relative z-10 flex items-start justify-between gap-4">
        <MaterialIcon src={item.iconSrc} alt={item.title} />
        <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[12px] font-medium text-white/46">
          {item.eyebrow}
        </span>
      </div>

      <div className="relative z-10 mt-9">
        <h3 className="max-w-[12ch] text-[31px] font-black leading-[1.08] tracking-[-0.055em] text-white">
          {item.title}
        </h3>
        <p className="mt-4 max-w-[30ch] text-[15px] leading-8 text-white/60">
          {item.description}
        </p>
      </div>

      <div className="relative z-10 mt-8 flex items-end justify-between gap-4">
        <span className="inline-flex items-center rounded-full border border-white/12 bg-white/8 px-4 py-2 text-[13px] font-medium text-white/80 transition group-hover:border-white/20 group-hover:text-white">
          {item.href ? "进入体验" : "敬请期待"}
        </span>

        <div className="relative">
          <div className="absolute -left-4 -top-3 h-14 w-14 rounded-full bg-white/8 blur-xl" />
          {item.preview}
        </div>
      </div>
    </div>
  );

  if (item.href) {
    return (
      <Link href={item.href} className="block">
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => window.alert("工程师正在全力接入该创作模块，敬请期待。")}
      className="text-left"
    >
      {content}
    </button>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#120722] text-white">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="aurora-drift absolute left-[-8%] top-[12%] h-[380px] w-[380px] rounded-full bg-[#6fd8ff]/12 blur-[120px]" />
          <div className="aurora-drift absolute right-[-6%] top-[4%] h-[420px] w-[420px] rounded-full bg-[#a36fff]/16 blur-[130px]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#10051e_0%,#180833_40%,#120724_100%)]" />
          <div className="absolute inset-0 opacity-[0.12] [background-image:radial-gradient(rgba(255,255,255,0.95)_0.75px,transparent_0.75px)] [background-size:26px_26px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_6%,rgba(255,255,255,0.12),transparent_28%),radial-gradient(circle_at_20%_68%,rgba(255,157,95,0.16),transparent_22%),radial-gradient(circle_at_82%_18%,rgba(136,108,255,0.24),transparent_26%)]" />
        </div>

        <div className="relative mx-auto w-full max-w-[1420px] px-4 py-4 lg:px-8 lg:py-8">
          <section className="overflow-hidden rounded-[40px] border border-white/10 bg-[linear-gradient(180deg,rgba(52,44,146,0.22),rgba(24,16,72,0.46)_18%,rgba(19,11,48,0.84))] shadow-[0_30px_100px_rgba(0,0,0,0.34)] backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5 lg:px-8">
              <div className="flex items-center gap-4">
                <Image
                  src="/logo.png"
                  alt="小红车魔法工坊"
                  width={44}
                  height={44}
                  className="rounded-2xl shadow-[0_10px_24px_rgba(255,255,255,0.1)]"
                  priority
                />
                <div>
                  <p className="text-[16px] font-semibold text-white">小红车魔法工坊</p>
                  <p className="text-[12px] text-white/46">专注青少年人工智能与前沿科技启蒙</p>
                </div>
              </div>

              <div className="hidden items-center gap-8 lg:flex">
                {navItems.map((item) => (
                  <span
                    key={item}
                    className="text-[14px] text-white/68 transition hover:text-white"
                  >
                    {item}
                  </span>
                ))}
                <Link
                  href="/workshop?mode=coding"
                  className="rounded-full bg-white px-5 py-2.5 text-[14px] font-semibold text-slate-950 shadow-[0_12px_28px_rgba(255,255,255,0.14)] transition hover:bg-white/92"
                >
                  进入体验
                </Link>
              </div>
            </div>

            <div className="relative min-h-[610px] px-6 py-7 lg:px-8 lg:py-8">
              <HeroArtwork />

              <div className="relative z-20 flex min-h-[560px] flex-col justify-between lg:max-w-[52%]">
                <div>
                  <div className="inline-flex items-center gap-3 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-[12px] font-medium text-white/72 backdrop-blur-xl">
                    <span className="rounded-full bg-[#c26fff] px-3 py-1 text-white shadow-[0_10px_24px_rgba(194,111,255,0.38)]">
                      平台升级
                    </span>
                    <span>更好玩、更聪明，让每个想法都发光</span>
                  </div>

                  <h1 className="mt-10 text-[50px] font-black leading-[0.98] tracking-[-0.075em] text-white sm:text-[64px] lg:text-[66px]">
                    <span className="block whitespace-nowrap">让孩子的每一个想法</span>
                    <span className="block whitespace-nowrap bg-gradient-to-r from-[#ff9fcf] via-[#ffd777] to-[#79dbff] bg-clip-text text-transparent">
                      都能成为真正可展示的
                    </span>
                    <span className="mt-1 block whitespace-nowrap bg-gradient-to-r from-[#8dd8ff] via-[#83b3ff] to-[#9b83ff] bg-clip-text text-transparent">
                      智能作品
                    </span>
                  </h1>

                  <p className="mt-8 max-w-[680px] text-[17px] leading-8 text-white/66">
                    小红车魔法工坊把编程、绘画、写作、音乐与视频创作整合在一个平台里，让孩子用更自然的表达方式，把想象一步步变成作品。
                  </p>

                  <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                    <Link
                      href="/workshop?mode=coding"
                      className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#ffbf74] via-[#ff83c8] to-[#916bff] px-7 py-4 text-[16px] font-semibold text-white shadow-[0_18px_42px_rgba(177,98,255,0.34)] transition hover:-translate-y-0.5"
                    >
                      立即开始创作
                    </Link>
                    <div className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/8 px-6 py-4 text-[15px] font-medium text-white/72 backdrop-blur-xl">
                      多模态能力持续扩展中
                    </div>
                  </div>
                </div>

                <div className="mt-10 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-[24px] border border-white/10 bg-white/7 p-5 backdrop-blur-xl">
                    <p className="text-[12px] tracking-[0.1em] text-white/38">适用对象</p>
                    <p className="mt-3 text-[20px] font-semibold text-white">中小学生</p>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-white/7 p-5 backdrop-blur-xl">
                    <p className="text-[12px] tracking-[0.1em] text-white/38">表达方式</p>
                    <p className="mt-3 text-[20px] font-semibold text-white">提示词与互动创作</p>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-white/7 p-5 backdrop-blur-xl">
                    <p className="text-[12px] tracking-[0.1em] text-white/38">展示效果</p>
                    <p className="mt-3 text-[20px] font-semibold text-white">作品级沉浸预览</p>
                  </div>
                </div>
              </div>

              <div className="absolute right-8 top-10 z-30 w-full max-w-[420px] rounded-[32px] border border-white/14 bg-[linear-gradient(180deg,rgba(146,103,255,0.22),rgba(118,76,237,0.14)_36%,rgba(255,255,255,0.08))] p-5 shadow-[0_30px_60px_rgba(34,15,78,0.28)] backdrop-blur-2xl">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-semibold tracking-[0.12em] text-white/78">
                    创作总览
                  </p>
                  <span className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-[12px] font-medium text-white/74">
                    已点亮
                  </span>
                </div>

                <div className="mt-4 rounded-[24px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] p-5">
                  <div className="flex items-center gap-3">
                    <MaterialIcon
                      src="/landing-assets/icon-code.png"
                      alt="智能编程体验馆"
                      className="h-10 w-10"
                    />
                    <div>
                      <p className="text-[18px] font-semibold text-white">智能编程体验馆</p>
                      <p className="mt-1 text-[13px] leading-7 text-white/58">
                        一句话生成互动作品，适合课堂展示与启发式创作教学。
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="rounded-[24px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] p-5">
                    <MaterialIcon
                      src="/landing-assets/icon-doc.png"
                      alt="智能写作"
                      className="h-10 w-10"
                    />
                    <p className="mt-5 text-[15px] font-semibold text-white">智能写作</p>
                  </div>
                  <div className="rounded-[24px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] p-5">
                    <MaterialIcon
                      src="/landing-assets/icon-music.png"
                      alt="智能音乐"
                      className="h-10 w-10"
                    />
                    <p className="mt-5 text-[15px] font-semibold text-white">智能音乐</p>
                  </div>
                </div>

                <div className="mt-4 rounded-[24px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] p-5">
                  <p className="text-[12px] tracking-[0.1em] text-white/40">品牌理念</p>
                  <p className="mt-3 text-[17px] font-semibold leading-8 text-white/92">
                    让每一个孩子都能通过智能工具，看见自己的创造力。
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-8 overflow-hidden rounded-[40px] border border-white/10 bg-[linear-gradient(180deg,rgba(89,56,197,0.26),rgba(41,21,91,0.4)_30%,rgba(23,12,52,0.56))] px-6 py-8 shadow-[0_26px_76px_rgba(0,0,0,0.28)] backdrop-blur-sm lg:px-8 lg:py-9">
            <div className="flex flex-col gap-4 border-b border-white/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[13px] font-semibold tracking-[0.12em] text-cyan-300/84">
                  魔法入口
                </p>
                <h2 className="mt-4 text-[38px] font-black leading-[1.08] tracking-[-0.055em] text-white">
                  选择一扇创作之门
                  <br className="hidden sm:block" />
                  让灵感落进真实作品
                </h2>
              </div>
              <p className="max-w-md text-[14px] leading-7 text-white/48">
                首页负责品牌展示与流量分发，工作台负责真正开始创作与预览。
              </p>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {entranceCards.map((item) => (
                <FeatureCard key={item.title} item={item} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
