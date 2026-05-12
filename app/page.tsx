"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type EntranceCard = {
  title: string;
  description: string;
  href?: string;
  eyebrow: string;
  icon: ReactNode;
};

const iconWrapClass =
  "grid h-14 w-14 place-items-center rounded-2xl border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]";

const iconStrokeProps = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  strokeWidth: 1.8,
};

const entranceCards: EntranceCard[] = [
  {
    eyebrow: "互动编程",
    title: "智能编程体验馆",
    description: "把一句提示词变成可运行的小程序，让灵感真正变成看得见、摸得着的作品。",
    href: "/workshop?mode=coding",
    icon: (
      <span className={`${iconWrapClass} text-sky-600`}>
        <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
          <rect x="4" y="5" width="16" height="11" rx="2.5" {...iconStrokeProps} />
          <path d="M8.5 20h7" {...iconStrokeProps} />
          <path d="M10 10.2 8.2 12l1.8 1.8" {...iconStrokeProps} />
          <path d="m14 10.2 1.8 1.8-1.8 1.8" {...iconStrokeProps} />
        </svg>
      </span>
    ),
  },
  {
    eyebrow: "视觉表达",
    title: "智能绘画工作坊",
    description: "把脑海中的色彩、角色和场景变成有质感的插画，让想象力拥有自己的画布。",
    href: "/workshop?mode=painting",
    icon: (
      <span className={`${iconWrapClass} text-rose-500`}>
        <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
          <path d="M12 4.5c4.4 0 8 2.8 8 6.8 0 3.4-2.7 5.7-5.7 5.7H12a1.9 1.9 0 0 0-1.9 1.9c0 .8-.6 1.6-1.8 1.6-2.8 0-6.3-2.6-6.3-6.9 0-5 4.6-9.1 10-9.1Z" {...iconStrokeProps} />
          <circle cx="8.1" cy="10.4" r="1" fill="currentColor" stroke="none" />
          <circle cx="11.6" cy="8.8" r="1" fill="currentColor" stroke="none" />
          <circle cx="15.2" cy="10.8" r="1" fill="currentColor" stroke="none" />
          <path d="m15.8 15.8 3.4 3.4" {...iconStrokeProps} />
        </svg>
      </span>
    ),
  },
  {
    eyebrow: "文字创作",
    title: "智能写作实验室",
    description: "和故事灵感一起写童话、写诗歌、写演讲稿，让文字表达变得更从容也更有画面。",
    href: "/workshop?mode=writing",
    icon: (
      <span className={`${iconWrapClass} text-amber-600`}>
        <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
          <path d="M6 4.8h8.3L18 8.5V19a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2Z" {...iconStrokeProps} />
          <path d="M14.3 4.8V8.4H18" {...iconStrokeProps} />
          <path d="M9 12h6" {...iconStrokeProps} />
          <path d="M9 15.5h6" {...iconStrokeProps} />
        </svg>
      </span>
    ),
  },
  {
    eyebrow: "声音表达",
    title: "智能音乐工坊",
    description: "尝试创作旋律、节拍和专属主题曲，让灵感不只停留在画面里，也能长出声音。",
    icon: (
      <span className={`${iconWrapClass} text-violet-600`}>
        <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
          <path d="M15.5 5v10.2a2.3 2.3 0 1 1-1.5-2.2V8.6l5-1.4v7a2.3 2.3 0 1 1-1.5-2.2V5.9Z" {...iconStrokeProps} />
        </svg>
      </span>
    ),
  },
  {
    eyebrow: "影像叙事",
    title: "智能视频工场",
    description: "把科普点子变成动态画面和短片，让会讲故事的影像成为下一扇创作之门。",
    icon: (
      <span className={`${iconWrapClass} text-slate-700`}>
        <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
          <rect x="4" y="6" width="16" height="12" rx="2.5" {...iconStrokeProps} />
          <path d="m10 9.5 4.5 2.5-4.5 2.5Z" {...iconStrokeProps} />
          <path d="M7 4.5v3" {...iconStrokeProps} />
          <path d="M17 4.5v3" {...iconStrokeProps} />
        </svg>
      </span>
    ),
  },
  {
    eyebrow: "空间构建",
    title: "智能建模星球",
    description: "从平面想法走向立体世界，探索未来的空间创作方式，把想法搭成立体作品。",
    icon: (
      <span className={`${iconWrapClass} text-cyan-600`}>
        <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
          <path d="m12 4.5 6.5 3.7v7.6L12 19.5l-6.5-3.7V8.2Z" {...iconStrokeProps} />
          <path d="M12 4.5v7.6m0 0 6.5-3.9m-6.5 3.9L5.5 8.2" {...iconStrokeProps} />
        </svg>
      </span>
    ),
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f6f4ef] text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-[1400px] flex-col px-4 py-5 lg:px-8 lg:py-8">
        <section className="relative overflow-hidden rounded-[40px] border border-white/60 bg-[linear-gradient(135deg,#18314f_0%,#244b70_52%,#2f7399_100%)] px-6 py-8 shadow-[0_24px_80px_rgba(22,34,58,0.18)] lg:px-12 lg:py-12">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.16),transparent_20%),radial-gradient(circle_at_78%_22%,rgba(255,255,255,0.14),transparent_18%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent)]" />
            <div className="absolute left-[55%] top-16 h-36 w-36 rounded-[28px] bg-white/10 blur-2xl" />
            <div className="absolute right-20 top-20 h-52 w-52 rounded-full bg-cyan-300/10 blur-3xl" />
          </div>

          <div className="relative grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="max-w-3xl">
              <div className="inline-flex items-center rounded-full border border-white/15 bg-white/8 px-4 py-2 text-[13px] font-semibold tracking-[0.12em] text-white/88 backdrop-blur-xl">
                小红车多模态创作平台
              </div>

              <h1 className="mt-8 text-[42px] font-black leading-[1.02] tracking-[-0.06em] text-white sm:text-[56px] lg:text-[70px]">
                小红车魔法工坊
                <br />
                共同拥抱智能新时代
              </h1>

              <p className="mt-6 max-w-2xl text-[20px] font-semibold leading-8 tracking-[-0.02em] text-white/88">
                专注青少年智能科技与前沿启蒙
              </p>

              <p className="mt-5 max-w-2xl text-[15px] leading-8 text-white/70 lg:text-base">
                我们希望把前沿技术做成孩子能理解、敢尝试、愿意展示的互动创作体验，让探索未来这件事，既有专业感，也有温度。
              </p>

              <div className="mt-9 flex flex-wrap gap-4">
                <Link
                  href="/workshop?mode=coding"
                  className="inline-flex items-center justify-center rounded-full bg-white px-7 py-4 text-[15px] font-semibold tracking-[-0.01em] text-sky-700 shadow-[0_16px_30px_rgba(255,255,255,0.16)] transition hover:-translate-y-0.5"
                >
                  进入智能编程体验馆
                </Link>
                <div className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/8 px-6 py-4 text-[15px] font-medium text-white/82 backdrop-blur-xl">
                  多模态创作能力持续扩展中
                </div>
              </div>
            </div>

            <div className="relative hidden min-h-[400px] lg:block">
              <div className="absolute right-6 top-10 w-[340px] rounded-[34px] border border-white/14 bg-white/10 p-6 shadow-[0_30px_60px_rgba(18,28,46,0.16)] backdrop-blur-2xl">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-semibold tracking-[0.12em] text-white/80">
                    创作总览
                  </p>
                  <span className="rounded-full bg-white/14 px-3 py-1 text-[12px] font-medium text-white/88">
                    已点亮
                  </span>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="rounded-[24px] border border-white/10 bg-white/10 p-4">
                    <p className="text-[15px] font-semibold text-white">
                      智能编程体验馆
                    </p>
                    <p className="mt-2 text-[13px] leading-7 text-white/70">
                      一句话生成互动作品，适合课堂展示与创意启蒙
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-[22px] border border-white/10 bg-white/8 p-4 text-white/88">
                      <div className="text-cyan-200">
                        {entranceCards[1].icon}
                      </div>
                      <p className="mt-3 text-[14px] font-semibold">智能绘画</p>
                    </div>
                    <div className="rounded-[22px] border border-white/10 bg-white/8 p-4 text-white/88">
                      <div className="text-violet-200">
                        {entranceCards[3].icon}
                      </div>
                      <p className="mt-3 text-[14px] font-semibold">智能音乐</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute bottom-10 left-4 w-[280px] rounded-[30px] border border-white/12 bg-white/10 p-6 shadow-[0_22px_50px_rgba(18,28,46,0.14)] backdrop-blur-2xl">
                <p className="text-[13px] font-semibold tracking-[0.12em] text-white/76">
                  品牌愿景
                </p>
                <p className="mt-4 text-[17px] font-semibold leading-8 text-white/94">
                  让每一个孩子都能通过智能工具，看见自己的创造力。
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-[36px] border border-[#efe8da] bg-[#fbfaf6] px-6 py-8 shadow-[0_16px_40px_rgba(149,114,66,0.06)] lg:px-10 lg:py-9">
          <div className="max-w-3xl">
            <p className="text-[13px] font-semibold tracking-[0.12em] text-[#d57f88]">
              平台理念
            </p>
            <h2 className="mt-4 text-[34px] font-black leading-[1.12] tracking-[-0.05em] text-slate-900">
              把前沿智能能力
              <br />
              变成孩子愿意主动探索的好玩体验
            </h2>
            <p className="mt-5 text-[15px] leading-8 text-slate-600">
              小红车魔法工坊不只是一个工具集合，更是一套面向青少年的创作平台。我们用更轻盈的交互、更克制的视觉和更有想象力的内容组织方式，让编程、绘画、写作、音乐与视频创作都成为孩子触摸未来科技的自然入口。
            </p>
          </div>
        </section>

        <section className="mt-8 flex-1 rounded-[36px] border border-[#efe8da] bg-[#fbfaf6] px-6 py-8 shadow-[0_18px_40px_rgba(149,114,66,0.06)] lg:px-10 lg:py-10">
          <div className="flex flex-col gap-4 border-b border-[#ede7dc] pb-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[13px] font-semibold tracking-[0.12em] text-[#3397a5]">
                创作入口
              </p>
              <h2 className="mt-4 text-[36px] font-black leading-[1.12] tracking-[-0.05em] text-slate-900">
                选择一扇创作之门，
                <br className="hidden sm:block" />
                开启你的作品旅程
              </h2>
            </div>
            <p className="max-w-md text-[14px] leading-7 text-slate-500">
              从智能编程开始，后续我们会逐步点亮更多多模态创作能力。
            </p>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {entranceCards.map((item) => {
              const cardContent = (
                <div className="group h-full rounded-[30px] border border-[#efebe4] bg-white px-6 py-6 shadow-[0_12px_30px_rgba(15,23,42,0.04)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <div className="flex items-start justify-between gap-5">
                    <div>{item.icon}</div>
                    <p className="pt-1 text-[12px] font-semibold tracking-[0.08em] text-slate-400">
                      {item.eyebrow}
                    </p>
                  </div>

                  <h3 className="mt-8 text-[32px] font-black leading-[1.1] tracking-[-0.05em] text-slate-900">
                    {item.title}
                  </h3>

                  <p className="mt-4 text-[15px] leading-8 text-slate-600">
                    {item.description}
                  </p>

                  <div className="mt-8 inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-[13px] font-medium text-slate-500 transition group-hover:border-sky-200 group-hover:bg-sky-50 group-hover:text-sky-700">
                    {item.href ? "进入体验" : "即将开放"}
                  </div>
                </div>
              );

              if (item.href) {
                return (
                  <Link key={item.title} href={item.href} className="block">
                    {cardContent}
                  </Link>
                );
              }

              return (
                <button
                  key={item.title}
                  type="button"
                  onClick={() =>
                    window.alert("工程师正在全力接入该创作模块，敬请期待。")
                  }
                  className="text-left"
                >
                  {cardContent}
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
