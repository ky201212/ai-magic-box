"use client";

import { useState } from "react";

const quickPrompts = [
  "环保小卫士",
  "恐龙探险队",
  "汽车动力站",
  "太空任务局",
];

const presetPrompts: Record<string, string> = {
  环保小卫士:
    "请帮我变出一个《环保小卫士》的科普小程序，要像森林里的秘密任务一样有趣。里面要有会眨眼的知识卡片、垃圾分类小游戏、节约用水小贴士，还要用鼓励小朋友的童话语气来说话。",
  恐龙探险队:
    "请帮我变出一个《恐龙探险队》的科普小程序，让我像坐着时光车回到侏罗纪。里面要有不同恐龙的自我介绍、会跳出来的小问答、可爱的探险徽章，还要把科学知识讲得像冒险故事一样精彩。",
  汽车动力站:
    "请帮我变出一个《汽车动力站》的科普小程序，用儿童乐园的方式告诉我汽车为什么会跑。里面要有发动机小剧场、车轮转动演示、交通安全互动问答，还要让每一段说明都像在和小朋友聊天。",
  太空任务局:
    "请帮我变出一个《太空任务局》的科普小程序，让我像小小宇航员一样出发。里面要有星球介绍、火箭发射倒计时、太空知识问答和闪闪发光的任务勋章，整体语气要梦幻又勇敢。",
};

export default function Home() {
  const [promptText, setPromptText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handlePresetClick = (scene: string) => {
    setPromptText(presetPrompts[scene]);
  };

  const handleCastMagic = () => {
    setIsLoading(true);

    window.setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  };

  return (
    <main className="min-h-screen bg-yellow-50 text-slate-700">
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(253,224,71,0.35),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(125,211,252,0.32),_transparent_32%),linear-gradient(180deg,_#fefce8_0%,_#fef6fb_48%,_#f0f9ff_100%)]">
        <div className="mx-auto flex min-h-screen w-full max-w-[1520px] flex-col gap-6 px-4 py-4 lg:flex-row lg:gap-0 lg:px-6 lg:py-6">
          <section className="flex w-full flex-col rounded-[36px] bg-white px-6 py-6 shadow-[0_25px_70px_rgba(251,191,188,0.28),0_10px_30px_rgba(125,211,252,0.18)] lg:w-[34%] lg:rounded-r-[40px] lg:px-8 lg:py-8">
            <div className="flex items-start gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[22px] bg-gradient-to-br from-pink-200 via-amber-200 to-teal-200 text-xl shadow-[0_10px_25px_rgba(251,191,188,0.4)]">
                🚗
              </div>
              <div>
                <p className="text-sm font-bold tracking-[0.18em] text-pink-300">
                  MAGIC PLAY LAB
                </p>
                <h1 className="mt-1 text-[34px] font-black tracking-tight text-slate-700 sm:text-[40px]">
                  小红车魔法工坊
                </h1>
                <p className="mt-3 max-w-md text-base leading-8 text-slate-500">
                  把脑袋里的奇妙点子写下来，变成一个会动、会讲故事的科普小程序。
                </p>
              </div>
            </div>

            <div className="mt-6 flex-1 rounded-[32px] bg-white p-5 shadow-[0_18px_50px_rgba(244,114,182,0.14),0_12px_35px_rgba(56,189,248,0.12)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-black text-slate-700">魔法咒语书</p>
                  <p className="mt-1 text-sm text-slate-400">
                    先挑一个喜欢的主题，再写下你的小愿望。
                  </p>
                </div>
                <div className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-500">
                  今日灵感
                </div>
              </div>

              <div className="mt-6">
                <p className="mb-3 text-sm font-bold text-slate-500">场景按钮</p>
                <div className="grid grid-cols-2 gap-3">
                  {quickPrompts.map((item, index) => {
                    const pastelClasses = [
                      "bg-pink-100 text-pink-500",
                      "bg-teal-100 text-teal-500",
                      "bg-amber-100 text-amber-500",
                      "bg-sky-100 text-sky-500",
                    ];

                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => handlePresetClick(item)}
                        className={`rounded-[22px] px-4 py-3 text-left text-sm font-bold shadow-[0_8px_20px_rgba(255,255,255,0.8)] transition duration-200 hover:-translate-y-0.5 ${pastelClasses[index]}`}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6">
                <label
                  htmlFor="prompt"
                  className="mb-3 block text-sm font-bold text-slate-500"
                >
                  输入提示词
                </label>
                <textarea
                  id="prompt"
                  rows={11}
                  value={promptText}
                  onChange={(event) => setPromptText(event.target.value)}
                  placeholder="比如：请帮我做一个关于汽车为什么会跑起来的科普小程序，要有会跳舞的知识卡片、趣味问答和可爱的按钮。"
                  className="w-full resize-none rounded-[28px] bg-sky-50 px-5 py-5 text-base leading-8 text-slate-700 outline-none shadow-[inset_0_0_0_2px_rgba(186,230,253,0.7)] transition placeholder:text-slate-400 focus:bg-white focus:shadow-[inset_0_0_0_2px_rgba(244,114,182,0.35),0_0_0_8px_rgba(253,224,71,0.18)]"
                />
              </div>

              <button
                type="button"
                onClick={handleCastMagic}
                disabled={isLoading}
                className="mt-6 inline-flex h-16 w-full items-center justify-center rounded-full bg-gradient-to-r from-pink-200 via-rose-200 to-amber-200 px-6 text-xl font-black text-rose-700 shadow-[0_16px_35px_rgba(251,191,188,0.45)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(251,191,188,0.55)] focus:outline-none focus:ring-4 focus:ring-pink-200/60"
              >
                {isLoading ? "施放中... 🪄" : "施放魔法 ✨🪄"}
              </button>
            </div>
          </section>

          <div className="hidden w-[96px] shrink-0 lg:flex lg:items-stretch lg:justify-center">
            <div className="my-6 flex w-full items-center justify-center rounded-full bg-white/60">
              <div className="[writing-mode:vertical-rl] text-[12px] font-bold tracking-[0.28em] text-pink-300">
                炼金炉预留区
              </div>
            </div>
          </div>

          <section className="flex w-full flex-1 flex-col rounded-[36px] bg-white/70 shadow-[0_25px_80px_rgba(125,211,252,0.18)] backdrop-blur-sm lg:rounded-l-[40px]">
            <div className="flex items-center justify-between px-6 py-5 lg:px-10">
              <div>
                <p className="text-sm font-bold tracking-[0.16em] text-teal-400">
                  FAIRY PREVIEW
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-700">
                  手机水晶球
                </h2>
              </div>
              <div className="rounded-full bg-teal-100 px-4 py-2 text-sm font-bold text-teal-500">
                等待魔法中
              </div>
            </div>

            <div className="flex flex-1 items-center justify-center px-6 py-8 lg:px-10 lg:py-10">
              <div className="grid w-full max-w-5xl items-center gap-10 xl:grid-cols-[1fr_430px]">
                <div className="hidden xl:block">
                  <div className="max-w-md">
                    <p className="text-sm font-bold tracking-[0.16em] text-amber-400">
                      童话预览台
                    </p>
                    <h3 className="mt-4 text-4xl font-black leading-tight text-slate-700">
                      写下一个想法，
                      <br />
                      看它在手机里发光。
                    </h3>
                    <p className="mt-5 text-lg leading-8 text-slate-500">
                      右边保留安全 iframe 预览区，后续接入生成能力后，这里会像魔法玩具一样，把孩子的提示词变成真的作品。
                    </p>
                    <div className="mt-8 flex gap-3">
                      <div className="rounded-full bg-pink-100 px-4 py-3 text-sm font-bold text-pink-500">
                        安全预览
                      </div>
                      <div className="rounded-full bg-sky-100 px-4 py-3 text-sm font-bold text-sky-500">
                        实时生成预留
                      </div>
                    </div>
                  </div>
                </div>

                <div className="justify-self-center">
                  <div className="relative mx-auto w-[310px] rounded-[48px] bg-gradient-to-b from-white via-sky-50 to-pink-50 p-[12px] shadow-[0_28px_70px_rgba(125,211,252,0.28),0_12px_32px_rgba(251,191,188,0.32)] sm:w-[360px]">
                    <div className="absolute inset-x-0 top-[78px] mx-auto h-[80%] w-[88%] rounded-[40px] bg-sky-100/70 blur-2xl" />
                    <div className="absolute left-[7px] top-28 h-16 w-[4px] rounded-full bg-sky-200" />
                    <div className="absolute left-[7px] top-48 h-10 w-[4px] rounded-full bg-pink-200" />
                    <div className="absolute right-[7px] top-40 h-20 w-[4px] rounded-full bg-amber-200" />

                    <div className="relative overflow-hidden rounded-[38px] bg-white p-[10px] shadow-[inset_0_0_0_3px_rgba(224,242,254,0.9)]">
                      <div className="absolute left-1/2 top-3 z-10 h-8 w-32 -translate-x-1/2 rounded-full bg-gradient-to-r from-sky-100 to-pink-100 shadow-[0_10px_20px_rgba(186,230,253,0.55)]">
                        <div className="mx-auto mt-[11px] h-2 w-14 rounded-full bg-white/80" />
                      </div>

                      <iframe
                        title="小程序实时预览"
                        className="block h-[620px] w-full rounded-[30px] bg-white"
                        srcDoc={`
                          <!DOCTYPE html>
                          <html lang="zh-CN">
                            <head>
                              <meta charset="UTF-8" />
                              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                              <style>
                                * { box-sizing: border-box; }
                                body {
                                  margin: 0;
                                  min-height: 100vh;
                                  display: flex;
                                  align-items: center;
                                  justify-content: center;
                                  background:
                                    radial-gradient(circle at top, #fef3c7 0%, #fdf2f8 45%, #eff6ff 100%);
                                  font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
                                  color: #475569;
                                }
                                .panel {
                                  width: min(84%, 320px);
                                  border-radius: 30px;
                                  background: rgba(255, 255, 255, 0.92);
                                  box-shadow: 0 18px 40px rgba(251, 191, 188, 0.22);
                                  padding: 28px 22px;
                                  text-align: center;
                                }
                                .tag {
                                  display: inline-block;
                                  border-radius: 999px;
                                  background: #fce7f3;
                                  color: #db2777;
                                  font-size: 12px;
                                  font-weight: 700;
                                  padding: 6px 12px;
                                }
                                h2 {
                                  margin: 14px 0 10px;
                                  font-size: 28px;
                                  line-height: 1.2;
                                  color: #334155;
                                }
                                p {
                                  margin: 0;
                                  font-size: 15px;
                                  line-height: 1.8;
                                }
                              </style>
                            </head>
                            <body>
                              <div class="panel">
                                <div class="tag">童话预览中</div>
                                <h2>手机水晶球</h2>
                                <p>等你施放魔法后，这里会出现实时生成的科普小程序。</p>
                              </div>
                            </body>
                          </html>
                        `}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
