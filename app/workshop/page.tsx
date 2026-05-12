"use client";

import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const codingQuickPrompts = [
  "环保小卫士",
  "恐龙探险队",
  "汽车动力站",
  "太空任务局",
];

const writingCapsules = [
  {
    label: "🧚 续写童话",
    prompt:
      "请帮我续写一段关于森林小精灵的冒险故事，要有神秘地图、会发光的蘑菇和一句鼓励勇气的话。",
  },
  {
    label: "🌸 写首小诗",
    prompt: "请以“春天”为题写一首充满画面感的现代诗，要温柔、清新，适合小学生朗读。",
  },
  {
    label: "🎤 演讲稿助手",
    prompt:
      "我明天要竞选班长，请帮我写一份充满自信、真诚又有感染力的演讲稿初稿，语气要自然。",
  },
];

const modeTabs = [
  { id: "coding", label: "💻 AI编程" },
  { id: "writing", label: "✍️ AI写作" },
  { id: "painting", label: "🎨 AI绘画" },
  { id: "music", label: "🎵 AI音乐" },
  { id: "video", label: "🎬 AI视频" },
  { id: "modeling", label: "🧊 AI建模" },
] as const;

type ModeId = (typeof modeTabs)[number]["id"];

const comingSoonConfig: Record<
  Exclude<ModeId, "coding" | "painting" | "writing">,
  { emoji: string; title: string; description: string; badge: string }
> = {
  music: {
    emoji: "🎵",
    title: "AI音乐魔法源正在接入",
    description:
      "工程师正在训练会唱歌的小音符，未来这里会生成旋律、伴奏和属于孩子的主题曲。",
    badge: "旋律引擎施工中",
  },
  video: {
    emoji: "🎬",
    title: "AI视频魔法源正在接入",
    description:
      "工程师正在搭建会讲故事的镜头工坊，未来这里会生成动画短片和趣味科普视频。",
    badge: "光影工坊施工中",
  },
  modeling: {
    emoji: "🧊",
    title: "AI建模魔法源正在接入",
    description:
      "工程师正在召唤立体积木精灵，未来这里会把想法变成可以旋转查看的立体小世界。",
    badge: "立体宇宙施工中",
  },
};

const codingPresetPrompts: Record<string, string> = {
  环保小卫士:
    "请帮我变出一个《环保小卫士》的科普小程序，要像森林里的秘密任务一样有趣。里面要有会眨眼的知识卡片、垃圾分类小游戏、节约用水小贴士，还要用鼓励小朋友的童话语气来说话。",
  恐龙探险队:
    "请帮我变出一个《恐龙探险队》的科普小程序，让我像坐着时光车回到侏罗纪。里面要有不同恐龙的自我介绍、会跳出来的小问答、可爱的探险徽章，还要把科学知识讲得像冒险故事一样精彩。",
  汽车动力站:
    "请帮我变出一个《汽车动力站》的科普小程序，用儿童乐园的方式告诉我汽车为什么会跑。里面要有发动机小剧场、车轮转动演示、交通安全互动问答，还要让每一段说明都像在和小朋友聊天。",
  太空任务局:
    "请帮我变出一个《太空任务局》的科普小程序，让我像小小宇航员一样出发。里面要有星球介绍、火箭发射倒计时、太空知识问答和闪闪发光的任务勋章，整体语气要梦幻又勇敢。",
};

const loadingMessages = [
  "🪄 正在翻阅魔法书...",
  "✨ 正在提取马卡龙颜料...",
  "🧱 正在搭建积木小舞台...",
  "🚗 正在给小红车充能...",
  "🚀 马上就要大功告成啦！",
];

const writingLoadingMessages = [
  "🪶 正在轻轻蘸取墨水...",
  "📜 正在铺开温柔信纸...",
  "🌼 正在收集春天的词语...",
  "✨ 正在给句子撒上灵感星光...",
  "💌 文章马上就写好啦！",
];

const defaultPreviewHtml = `
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
`;

const createMessagePreviewHtml = (title: string, message: string) => `
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
        <div class="tag">${title}</div>
        <h2>手机水晶球</h2>
        <p>${message}</p>
      </div>
    </body>
  </html>
`;

export default function WorkshopPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const [promptText, setPromptText] = useState("");
  const [writingPrompt, setWritingPrompt] = useState("");
  const [writingResult, setWritingResult] = useState("");
  const [drawingPrompt, setDrawingPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isWritingLoading, setIsWritingLoading] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [writingError, setWritingError] = useState("");
  const [generatedCode, setGeneratedCode] = useState(defaultPreviewHtml);
  const [generatedImageUrl, setGeneratedImageUrl] = useState("");
  const [drawingError, setDrawingError] = useState("");
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [writingLoadingMessageIndex, setWritingLoadingMessageIndex] = useState(0);
  const [phoneScale, setPhoneScale] = useState(1);

  const modeParam = searchParams.get("mode");
  const activeMode = modeTabs.some((tab) => tab.id === modeParam)
    ? (modeParam as ModeId)
    : "coding";
  const isCodingMode = activeMode === "coding";
  const isWritingMode = activeMode === "writing";
  const isPaintingMode = activeMode === "painting";
  const hasGeneratedCode =
    Boolean(generatedCode.trim()) && generatedCode !== defaultPreviewHtml;
  const isPreviewFocused = isCodingMode && (isLoading || hasGeneratedCode);
  const effectivePhoneScale = phoneScale * (isPreviewFocused ? 1.15 : 1);

  useEffect(() => {
    if (!isLoading) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setLoadingMessageIndex(
        (currentIndex) => (currentIndex + 1) % loadingMessages.length,
      );
    }, 2400);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isLoading]);

  useEffect(() => {
    if (!isWritingLoading) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setWritingLoadingMessageIndex(
        (currentIndex) => (currentIndex + 1) % writingLoadingMessages.length,
      );
    }, 2200);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isWritingLoading]);

  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stop();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const handleCodingPresetClick = (scene: string) => {
    setPromptText(codingPresetPrompts[scene]);
  };

  const handleWritingCapsuleClick = (prompt: string) => {
    setWritingPrompt(prompt);
  };

  const handleModeChange = (mode: ModeId) => {
    router.replace(`${pathname}?mode=${mode}`, { scroll: false });
  };

  const handleScaleUp = () => {
    setPhoneScale((currentScale) => Math.min(3, currentScale + 0.15));
  };

  const handleScaleDown = () => {
    setPhoneScale((currentScale) => Math.max(0.8, currentScale - 0.1));
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append("file", audioBlob, "audio.webm");

    const response = await fetch("/api/transcribe", {
      method: "POST",
      body: formData,
    });

    const data = (await response.json()) as { text?: string; error?: string };
    console.log("SenseVoice 返回的原始数据:", data);

    if (!response.ok || !data.text) {
      throw new Error(data.error ?? "语音识别失败，请稍后再试。");
    }

    const recognizedText = data.text;

    setPromptText((currentText) =>
      currentText.trim()
        ? `${currentText}\n${recognizedText}`
        : recognizedText,
    );
  };

  const handleVoiceMagic = async () => {
    if (isTranscribing) {
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      setIsTranscribing(true);
      mediaRecorderRef.current?.stop();
      return;
    }

    try {
      setVoiceError("");
      recordedChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onerror = () => {
        setVoiceError("录音时出现了一点小状况，请再试一次。");
        setIsRecording(false);
        setIsTranscribing(false);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(recordedChunksRef.current, {
          type: mediaRecorder.mimeType || "audio/webm",
        });

        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;

        if (!audioBlob.size) {
          setVoiceError("没有录到声音，再试一次魔法麦克风吧。");
          setIsTranscribing(false);
          return;
        }

        try {
          await transcribeAudio(audioBlob);
        } catch (error) {
          setVoiceError(
            error instanceof Error
              ? error.message
              : "语音识别失败，请稍后再试。",
          );
        } finally {
          setIsTranscribing(false);
          recordedChunksRef.current = [];
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      setVoiceError("麦克风权限还没有打开，请先允许浏览器使用麦克风哦。");
      setIsRecording(false);
      setIsTranscribing(false);
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const handleGenerate = async () => {
    if (!promptText.trim()) {
      window.alert("请先在左侧魔法书里写下咒语哦！");
      return;
    }

    setGeneratedCode("");
    setLoadingMessageIndex(0);
    setIsLoading(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: promptText,
          mode: "coding",
        }),
      });

      const data = (await response.json()) as { code?: string; error?: string };
      console.log("小米返回的原始数据:", data);

      if (!response.ok || !data.code) {
        setGeneratedCode(
          createMessagePreviewHtml(
            "魔法打了个喷嚏",
            data.error ?? "这次施法没有成功，我们再试一次吧。",
          ),
        );
        return;
      }

      const cleanedHtml = data.code
        .replace(/```(html)?/gi, "")
        .replace(/```/g, "")
        .trim();

      setGeneratedCode(cleanedHtml);
    } catch {
      setGeneratedCode(
        createMessagePreviewHtml(
          "魔法信号飘走了",
          "刚刚和魔法星球失去了一下联系，请稍后再试试。",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateWriting = async () => {
    if (!writingPrompt.trim()) {
      window.alert("请先写下今天想创作的内容哦！");
      return;
    }

    setWritingError("");
    setWritingResult("");
    setWritingLoadingMessageIndex(0);
    setIsWritingLoading(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: writingPrompt,
          mode: "writing",
        }),
      });

      const data = (await response.json()) as { code?: string; error?: string };
      console.log("MiMo 写作返回的原始数据:", data);

      if (!response.ok || !data.code) {
        setWritingError(data.error ?? "这次创作没有成功，我们再试一次吧。");
        return;
      }

      const cleanedText = data.code
        .replace(/```(html|markdown|md|text)?/gi, "")
        .replace(/```/g, "")
        .trim();

      setWritingResult(cleanedText);
    } catch {
      setWritingError("刚刚和灵感邮局失去了一下联系，请稍后再试试。");
    } finally {
      setIsWritingLoading(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!drawingPrompt.trim()) {
      window.alert("请先写下一句绘画咒语哦！");
      return;
    }

    setGeneratedImageUrl("");
    setDrawingError("");
    setIsDrawing(true);

    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: drawingPrompt,
        }),
      });

      const data = (await response.json()) as {
        imageUrl?: string;
        error?: string;
      };
      console.log("SiliconFlow 返回的原始数据:", data);

      if (!response.ok || !data.imageUrl) {
        setDrawingError(data.error ?? "这次作画没有成功，我们再试一次吧。");
        return;
      }

      setGeneratedImageUrl(data.imageUrl);
    } catch {
      setDrawingError("刚刚和画笔星云失去了一下联系，请稍后再试试。");
    } finally {
      setIsDrawing(false);
    }
  };

  const activeComingSoon =
    isCodingMode || isPaintingMode || isWritingMode
      ? null
      : comingSoonConfig[activeMode];

  return (
    <main className="relative min-h-screen overflow-hidden bg-yellow-50 text-slate-700">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-50 via-pink-50 to-sky-50" />
        <div className="absolute -left-12 top-10 h-56 w-56 rounded-full bg-pink-200/50 blur-3xl animate-pulse" />
        <div className="absolute right-0 top-24 h-72 w-72 rounded-full bg-sky-200/45 blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-amber-200/45 blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-20 h-40 w-40 rounded-full bg-teal-200/35 blur-3xl animate-pulse" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1560px] flex-col gap-6 px-4 py-4 lg:flex-row lg:px-6 lg:py-6">
        <section className="flex w-full flex-col rounded-[36px] bg-white px-6 py-6 shadow-[0_25px_70px_rgba(251,191,188,0.28),0_10px_30px_rgba(125,211,252,0.18)] lg:w-[37%] lg:px-8 lg:py-8">
          <div className="flex items-start gap-4">
            <Image
              src="/logo.png"
              alt="小红车Logo"
              width={40}
              height={40}
              className="rounded-full"
            />
            <div>
              <p className="text-sm font-bold tracking-[0.14em] text-pink-300">
                多模态创作工坊
              </p>
              <h1 className="mt-1 text-[34px] font-black leading-[1.08] tracking-[-0.045em] text-slate-700 sm:text-[40px]">
                小红车创作工坊
              </h1>
              <p className="mt-3 max-w-md text-base leading-8 text-slate-500">
                在一个童话般的多模态工坊里，写代码、画图、写故事、做音乐，逐步点亮孩子的创造力。
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-[30px] bg-[#fff8fb] p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.7),0_14px_35px_rgba(244,114,182,0.08)]">
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
              {modeTabs.map((tab) => {
                const isActive = activeMode === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleModeChange(tab.id)}
                    className={`rounded-[22px] px-4 py-3 text-left text-sm font-bold transition-all duration-300 ${
                      isActive
                        ? "bg-gradient-to-r from-pink-200 via-rose-200 to-amber-200 text-rose-700 shadow-[0_12px_28px_rgba(251,191,188,0.38)]"
                        : "bg-white/80 text-slate-400 shadow-[0_8px_18px_rgba(255,255,255,0.7)] hover:-translate-y-0.5 hover:text-slate-600"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {isCodingMode ? (
            <div className="mt-6 flex-1 rounded-[32px] bg-white p-5 shadow-[0_18px_50px_rgba(244,114,182,0.14),0_12px_35px_rgba(56,189,248,0.12)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-black text-slate-700">魔法咒语书</p>
                  <p className="mt-1 text-sm text-slate-400">
                    先挑一个喜欢的主题，再写下你的小愿望。
                  </p>
                </div>
                <div className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-500">
                  AI编程模式
                </div>
              </div>

              <div className="mt-6">
                <p className="mb-3 text-sm font-bold text-slate-500">场景按钮</p>
                <div className="grid grid-cols-2 gap-3">
                  {codingQuickPrompts.map((item, index) => {
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
                        onClick={() => handleCodingPresetClick(item)}
                        className={`rounded-[22px] px-4 py-3 text-left text-sm font-bold shadow-[0_8px_20px_rgba(255,255,255,0.8)] transition duration-200 hover:-translate-y-0.5 ${pastelClasses[index]}`}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <label
                    htmlFor="prompt"
                    className="block text-sm font-bold text-slate-500"
                  >
                    输入提示词
                  </label>
                  <button
                    type="button"
                    onClick={handleVoiceMagic}
                    disabled={isTranscribing}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold shadow-[0_10px_24px_rgba(251,191,188,0.25)] transition ${
                      isRecording
                        ? "bg-rose-200 text-rose-700 animate-pulse"
                        : isTranscribing
                          ? "bg-amber-100 text-amber-600"
                          : "bg-gradient-to-r from-pink-100 via-rose-100 to-amber-100 text-rose-600 hover:-translate-y-0.5"
                    }`}
                  >
                    {isRecording
                      ? "⏹️ 停止并识别..."
                      : isTranscribing
                        ? "🎧 识别魔法语音中..."
                        : "🎤 语音施法"}
                  </button>
                </div>

                <div className="relative">
                  <textarea
                    id="prompt"
                    rows={11}
                    value={promptText}
                    onChange={(event) => setPromptText(event.target.value)}
                    placeholder="比如：请帮我做一个关于汽车为什么会跑起来的科普小程序，要有会跳舞的知识卡片、趣味问答和可爱的按钮。"
                    className="w-full resize-none rounded-[28px] bg-sky-50 px-5 py-5 text-base leading-8 text-slate-700 outline-none shadow-[inset_0_0_0_2px_rgba(186,230,253,0.7)] transition placeholder:text-slate-400 focus:bg-white focus:shadow-[inset_0_0_0_2px_rgba(244,114,182,0.35),0_0_0_8px_rgba(253,224,71,0.18)]"
                  />
                  {(isRecording || isTranscribing) && (
                    <div className="pointer-events-none absolute bottom-4 right-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-pink-400 shadow-[0_8px_20px_rgba(251,191,188,0.18)]">
                      {isRecording ? "正在聆听你的咒语..." : "正在翻译声音魔法..."}
                    </div>
                  )}
                </div>

                {voiceError && (
                  <div className="mt-3 rounded-[20px] bg-rose-50 px-4 py-3 text-sm font-bold text-rose-500">
                    {voiceError}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={isLoading}
                className="mt-6 inline-flex h-16 w-full items-center justify-center rounded-full bg-gradient-to-r from-pink-200 via-rose-200 to-amber-200 px-6 text-xl font-black text-rose-700 shadow-[0_16px_35px_rgba(251,191,188,0.45)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(251,191,188,0.55)] focus:outline-none focus:ring-4 focus:ring-pink-200/60"
              >
                {isLoading ? "施放中... 🪄" : "施放魔法 ✨🪄"}
              </button>
            </div>
          ) : isWritingMode ? (
            <div className="mt-6 flex-1 rounded-[32px] bg-gradient-to-br from-[#fffef7] via-[#fffbea] to-[#fef7d7] p-5 shadow-[0_20px_55px_rgba(217,119,6,0.12),0_12px_30px_rgba(234,179,8,0.12)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-black tracking-[-0.02em] text-amber-900">
                    智能写作实验室
                  </p>
                  <p className="mt-1 text-sm text-amber-700/70">
                    选一个灵感胶囊，让句子慢慢开花。
                  </p>
                </div>
                <div className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-600">
                  AI写作模式
                </div>
              </div>

              <div className="mt-6">
                <p className="mb-3 text-sm font-bold text-amber-700">创作胶囊</p>
                <div className="grid gap-3">
                  {writingCapsules.map((item, index) => {
                    const capsuleClasses = [
                      "bg-[#fff7e6] text-amber-700",
                      "bg-[#fff1f2] text-rose-600",
                      "bg-[#eefcf7] text-teal-600",
                    ];

                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => handleWritingCapsuleClick(item.prompt)}
                        className={`rounded-[22px] px-4 py-4 text-left text-sm font-bold shadow-[0_10px_24px_rgba(255,255,255,0.85)] transition duration-200 hover:-translate-y-0.5 ${capsuleClasses[index]}`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6">
                <label
                  htmlFor="writing-prompt"
                  className="mb-3 block text-sm font-bold text-amber-700"
                >
                  输入写作需求
                </label>
                <textarea
                  id="writing-prompt"
                  rows={12}
                  value={writingPrompt}
                  onChange={(event) => setWritingPrompt(event.target.value)}
                  placeholder="比如：请帮我写一封给未来自己的信，语气要温柔真诚，适合五年级小朋友。"
                  className="w-full resize-none rounded-[28px] bg-[#fffdf4] px-5 py-5 text-base leading-8 text-amber-900 outline-none shadow-[inset_0_0_0_2px_rgba(253,230,138,0.75)] transition placeholder:text-amber-500/70 focus:bg-white focus:shadow-[inset_0_0_0_2px_rgba(251,191,36,0.45),0_0_0_8px_rgba(252,211,77,0.18)]"
                />
              </div>

              <button
                type="button"
                onClick={handleGenerateWriting}
                disabled={isWritingLoading}
                className="mt-6 inline-flex h-16 w-full items-center justify-center rounded-full bg-gradient-to-r from-amber-200 via-yellow-200 to-orange-200 px-6 text-xl font-black text-amber-800 shadow-[0_16px_35px_rgba(251,191,36,0.28)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(251,191,36,0.34)] focus:outline-none focus:ring-4 focus:ring-amber-200/70"
              >
                {isWritingLoading ? "创作中... ✍️" : "开始创作 ✍️"}
              </button>
            </div>
          ) : isPaintingMode ? (
            <div className="mt-6 flex-1 rounded-[32px] bg-white p-5 shadow-[0_18px_50px_rgba(244,114,182,0.14),0_12px_35px_rgba(56,189,248,0.12)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-black text-slate-700">梦幻绘画咒语本</p>
                  <p className="mt-1 text-sm text-slate-400">
                    写下你想画的世界，让智能画笔帮你把它变出来。
                  </p>
                </div>
                <div className="rounded-full bg-pink-100 px-3 py-1 text-xs font-bold text-pink-500">
                  AI绘画模式
                </div>
              </div>

              <div className="mt-6 rounded-[28px] bg-gradient-to-br from-pink-50 via-white to-sky-50 p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.85)]">
                <p className="text-sm font-bold text-slate-500">灵感小提示</p>
                <p className="mt-2 text-sm leading-7 text-slate-500">
                  可以写：场景、角色、颜色、光影、画风，比如“在云朵游乐园里跳舞的小机器人，马卡龙色，童话插画风”。
                </p>
              </div>

              <div className="mt-6">
                <label
                  htmlFor="drawing-prompt"
                  className="mb-3 block text-sm font-bold text-slate-500"
                >
                  输入绘画咒语
                </label>
                <textarea
                  id="drawing-prompt"
                  rows={12}
                  value={drawingPrompt}
                  onChange={(event) => setDrawingPrompt(event.target.value)}
                  placeholder="比如：请画一辆会飞的小红车，穿过彩虹云朵和星星糖果雨，整体是温暖的马卡龙色，像儿童绘本封面一样梦幻。"
                  className="w-full resize-none rounded-[28px] bg-pink-50 px-5 py-5 text-base leading-8 text-slate-700 outline-none shadow-[inset_0_0_0_2px_rgba(251,207,232,0.8)] transition placeholder:text-slate-400 focus:bg-white focus:shadow-[inset_0_0_0_2px_rgba(125,211,252,0.45),0_0_0_8px_rgba(253,224,71,0.18)]"
                />
              </div>

              <button
                type="button"
                onClick={handleGenerateImage}
                disabled={isDrawing}
                className="mt-6 inline-flex h-16 w-full items-center justify-center rounded-full bg-gradient-to-r from-pink-200 via-fuchsia-200 to-sky-200 px-6 text-xl font-black text-rose-700 shadow-[0_16px_35px_rgba(251,191,188,0.45)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(125,211,252,0.22)] focus:outline-none focus:ring-4 focus:ring-pink-200/60"
              >
                {isDrawing ? "作画中... 🖌️" : "开始作画 🖌️"}
              </button>
            </div>
          ) : (
            <div className="mt-6 flex-1 rounded-[32px] bg-white p-6 shadow-[0_18px_50px_rgba(244,114,182,0.14),0_12px_35px_rgba(56,189,248,0.12)]">
              <div className="rounded-[28px] bg-gradient-to-br from-white via-pink-50 to-sky-50 p-6 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.7)]">
                <div className="flex items-center gap-3">
                  <div className="grid h-14 w-14 place-items-center rounded-[22px] bg-gradient-to-br from-pink-100 via-amber-100 to-sky-100 text-3xl shadow-[0_12px_28px_rgba(125,211,252,0.18)]">
                    {activeComingSoon?.emoji}
                  </div>
                  <div>
                    <p className="text-lg font-black text-slate-700">
                      {activeComingSoon?.title}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      {activeComingSoon?.badge}
                    </p>
                  </div>
                </div>

                <p className="mt-6 text-base leading-8 text-slate-500">
                  {activeComingSoon?.description}
                </p>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-[22px] bg-pink-100/70 px-4 py-4 text-sm font-bold text-pink-500">
                    灵感源准备中
                  </div>
                  <div className="rounded-[22px] bg-sky-100/70 px-4 py-4 text-sm font-bold text-sky-500">
                    工程师努力接入中
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="flex w-full flex-1 flex-col rounded-[36px] bg-white/75 shadow-[0_25px_80px_rgba(125,211,252,0.18)] backdrop-blur-sm">
          <div className="flex items-center justify-between px-6 py-5 lg:px-10">
            <div>
              <p className="text-sm font-bold tracking-[0.16em] text-teal-400">
                {isCodingMode
                  ? "魔法预览台"
                  : isWritingMode
                    ? "灵感书写台"
                    : isPaintingMode
                      ? "梦幻画板"
                      : "魔法筹备中"}
              </p>
              <h2 className="mt-1 text-2xl font-black text-slate-700">
                {isCodingMode
                  ? "手机水晶球"
                  : isWritingMode
                    ? "灵感信纸"
                    : isPaintingMode
                      ? "梦幻画板"
                      : "多模态魔法源"}
              </h2>
            </div>

            {isCodingMode ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center rounded-full bg-white/80 px-2 py-2 shadow-[0_10px_24px_rgba(125,211,252,0.16)]">
                  <button
                    type="button"
                    onClick={handleScaleDown}
                    className="grid h-9 w-9 place-items-center rounded-full bg-pink-100 text-lg font-black text-pink-500 transition hover:scale-105"
                    aria-label="缩小手机预览"
                  >
                    ➖
                  </button>
                  <span className="px-3 text-xs font-bold text-slate-400">
                    {Math.round(effectivePhoneScale * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={handleScaleUp}
                    className="grid h-9 w-9 place-items-center rounded-full bg-sky-100 text-lg font-black text-sky-500 transition hover:scale-105"
                    aria-label="放大手机预览"
                  >
                    ➕
                  </button>
                </div>

                <div className="rounded-full bg-teal-100 px-4 py-2 text-sm font-bold text-teal-500">
                  {isLoading ? "魔法酝酿中" : "等待魔法中"}
                </div>
              </div>
            ) : isWritingMode ? (
              <div className="rounded-full bg-amber-100 px-4 py-2 text-sm font-bold text-amber-600 shadow-[0_10px_24px_rgba(251,191,36,0.18)]">
                {isWritingLoading
                  ? "灵感正在落笔中"
                  : writingResult
                    ? "文章已写好"
                    : "空白信纸待命中"}
              </div>
            ) : isPaintingMode ? (
              <div className="rounded-full bg-pink-100 px-4 py-2 text-sm font-bold text-pink-500 shadow-[0_10px_24px_rgba(251,191,188,0.18)]">
                {isDrawing ? "画笔挥洒中" : "空白画板待命中"}
              </div>
            ) : (
              <div className="rounded-full bg-amber-100 px-4 py-2 text-sm font-bold text-amber-500 shadow-[0_10px_24px_rgba(253,224,71,0.2)]">
                工坊升级中
              </div>
            )}
          </div>

          {isCodingMode ? (
            <div className="flex flex-1 items-center justify-center px-6 py-8 lg:px-10 lg:py-10">
              <div
                className={`w-full max-w-6xl transition-all duration-500 ${
                  isPreviewFocused
                    ? "flex items-center justify-center"
                    : "grid items-center gap-10 xl:grid-cols-[1fr_430px]"
                }`}
              >
                {!hasGeneratedCode && !isLoading && (
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
                        <button
                          type="button"
                          onClick={() => setGeneratedCode("")}
                          className="rounded-full bg-pink-100 px-4 py-3 text-sm font-bold text-pink-500"
                        >
                          安全预览
                        </button>
                        <button
                          type="button"
                          onClick={handleGenerate}
                          className="rounded-full bg-sky-100 px-4 py-3 text-sm font-bold text-sky-500"
                        >
                          实时生成预览
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div
                  className={`justify-self-center ${
                    isPreviewFocused ? "flex w-full justify-center" : ""
                  }`}
                >
                  <div
                    className={`origin-center transition-transform duration-500 ${
                      isPreviewFocused ? "scale-110" : ""
                    }`}
                    style={{ transform: `scale(${effectivePhoneScale})` }}
                  >
                    <div className="relative mx-auto w-[310px] rounded-[48px] bg-gradient-to-b from-white via-sky-50 to-pink-50 p-[12px] shadow-[0_28px_70px_rgba(125,211,252,0.28),0_12px_32px_rgba(251,191,188,0.32)] sm:w-[360px]">
                      <div className="absolute inset-x-0 top-[78px] mx-auto h-[80%] w-[88%] rounded-[40px] bg-sky-100/70 blur-2xl" />
                      <div className="absolute left-[7px] top-28 h-16 w-[4px] rounded-full bg-sky-200" />
                      <div className="absolute left-[7px] top-48 h-10 w-[4px] rounded-full bg-pink-200" />
                      <div className="absolute right-[7px] top-40 h-20 w-[4px] rounded-full bg-amber-200" />

                      <div className="relative overflow-y-auto overflow-x-hidden rounded-[38px] bg-white p-[10px] shadow-[inset_0_0_0_3px_rgba(224,242,254,0.9)]">
                        <div className="absolute left-1/2 top-3 z-10 h-8 w-32 -translate-x-1/2 rounded-full bg-gradient-to-r from-sky-100 to-pink-100 shadow-[0_10px_20px_rgba(186,230,253,0.55)]">
                          <div className="mx-auto mt-[11px] h-2 w-14 rounded-full bg-white/80" />
                        </div>

                        {isLoading ? (
                          <div className="flex h-[620px] w-full flex-col items-center justify-center rounded-[30px] bg-gradient-to-b from-amber-100 via-pink-50 to-sky-100 px-6 text-center animate-pulse">
                            <div className="relative flex h-28 w-28 items-center justify-center">
                              <div className="absolute inset-0 rounded-full border-4 border-dashed border-pink-200 animate-spin" />
                              <div className="absolute inset-3 rounded-full bg-white/70" />
                              <div className="relative text-5xl animate-bounce">🪄</div>
                              <div className="absolute -right-1 top-2 text-2xl animate-ping">
                                ✨
                              </div>
                              <div className="absolute -left-2 bottom-3 text-xl animate-bounce">
                                ⭐
                              </div>
                            </div>

                            <div className="mt-6 rounded-full bg-white/80 px-4 py-2 text-sm font-bold text-pink-400 shadow-[0_10px_24px_rgba(251,191,188,0.28)]">
                              魔法正在悄悄准备中
                            </div>

                            <p className="mt-5 min-h-[64px] max-w-[260px] text-lg font-black leading-8 text-slate-600">
                              {loadingMessages[loadingMessageIndex]}
                            </p>

                            <div className="mt-4 flex items-center gap-2">
                              <span className="h-3 w-3 rounded-full bg-pink-200 animate-bounce" />
                              <span
                                className="h-3 w-3 rounded-full bg-amber-200 animate-bounce"
                                style={{ animationDelay: "0.15s" }}
                              />
                              <span
                                className="h-3 w-3 rounded-full bg-sky-200 animate-bounce"
                                style={{ animationDelay: "0.3s" }}
                              />
                            </div>
                          </div>
                        ) : (
                          <iframe
                            title="小程序实时预览"
                            className="block h-[620px] w-full overflow-y-auto rounded-[30px] bg-white"
                            srcDoc={generatedCode}
                            scrolling="yes"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {hasGeneratedCode && !isLoading && (
                  <div className="mt-6 flex justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setGeneratedCode("")}
                      className="rounded-full bg-pink-100 px-4 py-3 text-sm font-bold text-pink-500"
                    >
                      安全预览
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerate}
                      className="rounded-full bg-sky-100 px-4 py-3 text-sm font-bold text-sky-500"
                    >
                      重新生成
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : isWritingMode ? (
            <div className="flex flex-1 items-center justify-center px-6 py-8 lg:px-10 lg:py-10">
              <div className="w-full max-w-5xl">
                <div className="rounded-[40px] bg-gradient-to-br from-[#fffdf5] via-[#fff9e8] to-[#fef3c7] p-6 shadow-[0_28px_80px_rgba(245,158,11,0.14)]">
                  <div className="mx-auto min-h-[620px] rounded-[32px] border border-amber-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(255,251,235,0.98))] p-6 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.85)]">
                    {isWritingLoading ? (
                      <div className="flex min-h-[572px] flex-col items-center justify-center text-center">
                        <div className="relative flex h-28 w-28 items-center justify-center">
                          <div className="absolute inset-0 rounded-full border-4 border-dashed border-amber-200 animate-spin" />
                          <div className="absolute inset-3 rounded-full bg-white/80" />
                          <div className="relative text-5xl animate-bounce">🪶</div>
                          <div className="absolute -right-1 top-2 text-2xl animate-ping">
                            ✨
                          </div>
                          <div className="absolute -left-2 bottom-3 text-xl animate-bounce">
                            📜
                          </div>
                        </div>

                        <div className="mt-6 rounded-full bg-white px-4 py-2 text-sm font-bold text-amber-500 shadow-[0_10px_24px_rgba(251,191,36,0.2)]">
                          灵感邮局正在认真落笔
                        </div>

                        <p className="mt-5 min-h-[64px] max-w-md text-lg font-black leading-8 text-amber-900">
                          {writingLoadingMessages[writingLoadingMessageIndex]}
                        </p>
                      </div>
                    ) : writingResult ? (
                      <div className="relative overflow-hidden rounded-[28px] border border-amber-100 bg-white px-8 py-10 shadow-[0_18px_45px_rgba(251,191,36,0.12)]">
                        <div className="absolute inset-y-0 left-6 w-px bg-rose-200/70" />
                        <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-r from-amber-100/30 via-transparent to-pink-100/30" />
                        <div className="relative pl-4">
                          <div className="mb-6 inline-flex rounded-full bg-amber-100 px-4 py-2 text-sm font-bold text-amber-600">
                            今日灵感成稿
                          </div>
                          <div className="space-y-4 whitespace-pre-wrap text-[17px] leading-9 text-slate-700">
                            {writingResult}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex min-h-[572px] flex-col items-center justify-center text-center">
                        <div className="grid h-28 w-28 place-items-center rounded-[30px] bg-gradient-to-br from-amber-100 via-yellow-100 to-orange-100 text-5xl shadow-[0_16px_36px_rgba(251,191,36,0.18)]">
                          ✍️
                        </div>
                        <p className="mt-6 text-2xl font-black text-amber-900">
                          空白信纸
                        </p>
                        <p className="mt-3 max-w-lg text-base leading-8 text-amber-800/70">
                          选一个创作胶囊，或者自己写下想法。等你按下“开始创作”，右边就会出现一篇温柔又有画面感的文章。
                        </p>
                        {writingError && (
                          <div className="mt-5 max-w-md rounded-[22px] bg-rose-50 px-4 py-3 text-sm font-bold text-rose-500">
                            {writingError}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : isPaintingMode ? (
            <div className="flex flex-1 items-center justify-center px-6 py-8 lg:px-10 lg:py-10">
              <div className="w-full max-w-5xl">
                <div className="rounded-[36px] bg-gradient-to-br from-white via-pink-50/80 to-sky-50/80 p-6 shadow-[0_28px_80px_rgba(125,211,252,0.16)]">
                  <div className="mx-auto flex min-h-[620px] w-full items-center justify-center rounded-[30px] border-2 border-dashed border-pink-200 bg-white/70 p-6 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.85)]">
                    {isDrawing ? (
                      <div className="flex flex-col items-center justify-center text-center">
                        <div className="relative flex h-28 w-28 items-center justify-center">
                          <div className="absolute inset-0 rounded-full border-4 border-dashed border-sky-200 animate-spin" />
                          <div className="absolute inset-3 rounded-full bg-white/80" />
                          <div className="relative text-5xl animate-bounce">🖌️</div>
                          <div className="absolute -right-1 top-2 text-2xl animate-ping">
                            ✨
                          </div>
                          <div className="absolute -left-2 bottom-3 text-xl animate-bounce">
                            🎨
                          </div>
                        </div>
                        <div className="mt-6 rounded-full bg-white px-4 py-2 text-sm font-bold text-pink-400 shadow-[0_10px_24px_rgba(251,191,188,0.2)]">
                          梦幻画笔正在工作中
                        </div>
                        <p className="mt-5 max-w-md text-lg font-black leading-8 text-slate-600">
                          正在把你的绘画咒语变成闪闪发光的作品，请耐心等一小会儿。
                        </p>
                      </div>
                    ) : generatedImageUrl ? (
                      <div className="flex w-full justify-center">
                        <img
                          src={generatedImageUrl}
                          alt="智能生成的绘画作品"
                          className="max-h-[560px] w-auto max-w-full rounded-[28px] object-contain shadow-[0_22px_60px_rgba(148,163,184,0.22)]"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center">
                        <div className="grid h-28 w-28 place-items-center rounded-[30px] bg-gradient-to-br from-pink-100 via-amber-100 to-sky-100 text-5xl shadow-[0_16px_36px_rgba(251,191,188,0.22)]">
                          🎨
                        </div>
                        <p className="mt-6 text-2xl font-black text-slate-700">
                          空白画板
                        </p>
                        <p className="mt-3 max-w-md text-base leading-8 text-slate-500">
                          在左侧写下一句绘画咒语，然后点击“开始作画”，你的梦幻作品就会在这里出现。
                        </p>
                        {drawingError && (
                          <div className="mt-5 max-w-md rounded-[22px] bg-rose-50 px-4 py-3 text-sm font-bold text-rose-500">
                            {drawingError}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center px-6 py-8 lg:px-10 lg:py-10">
              <div className="relative flex w-full max-w-5xl items-center justify-center overflow-hidden rounded-[36px] bg-gradient-to-br from-white via-pink-50/90 to-sky-50/90 px-8 py-16 shadow-[0_28px_80px_rgba(125,211,252,0.18)]">
                <div className="absolute -left-12 top-8 h-40 w-40 rounded-full bg-pink-200/50 blur-3xl animate-pulse" />
                <div className="absolute right-6 top-10 h-52 w-52 rounded-full bg-sky-200/45 blur-3xl animate-pulse" />
                <div className="absolute bottom-0 left-1/3 h-44 w-44 rounded-full bg-amber-200/40 blur-3xl animate-pulse" />

                <div className="relative w-full max-w-2xl rounded-[32px] border border-white/70 bg-white/70 p-8 text-center shadow-[0_18px_60px_rgba(251,191,188,0.16)] backdrop-blur-xl">
                  <div className="mx-auto grid h-24 w-24 place-items-center rounded-[30px] bg-gradient-to-br from-pink-100 via-amber-100 to-sky-100 text-5xl shadow-[0_14px_36px_rgba(125,211,252,0.2)] animate-pulse">
                    {activeComingSoon?.emoji}
                  </div>

                  <div className="mt-6 inline-flex rounded-full bg-white px-4 py-2 text-sm font-bold text-pink-400 shadow-[0_10px_24px_rgba(251,191,188,0.18)]">
                    {activeComingSoon?.badge}
                  </div>

                  <h3 className="mt-5 text-4xl font-black leading-tight text-slate-700">
                    敬请期待
                  </h3>

                  <p className="mt-4 text-xl font-bold text-slate-600">
                    {activeComingSoon?.title}
                  </p>

                  <p className="mx-auto mt-5 max-w-xl text-base leading-8 text-slate-500">
                    工程师正在努力接入该魔法源，等它完成点亮后，这里就会变成一个真正的一站式多模态 AIGC 创作舞台。
                  </p>

                  <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                    <div className="rounded-full bg-pink-100 px-4 py-3 text-sm font-bold text-pink-500 shadow-[0_10px_20px_rgba(251,191,188,0.15)]">
                      可爱 UI 施工中
                    </div>
                    <div className="rounded-full bg-sky-100 px-4 py-3 text-sm font-bold text-sky-500 shadow-[0_10px_20px_rgba(125,211,252,0.15)]">
                      魔法引擎接入中
                    </div>
                    <div className="rounded-full bg-amber-100 px-4 py-3 text-sm font-bold text-amber-500 shadow-[0_10px_20px_rgba(253,224,71,0.15)]">
                      创作宇宙扩容中
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
