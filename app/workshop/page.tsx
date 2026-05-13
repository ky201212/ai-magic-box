"use client";

import html2canvas from "html2canvas";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

const codingScenes = [
  {
    key: "环保小卫士",
    title: "环保小卫士",
    description: "把环保知识做成一场绿色闯关",
  },
  {
    key: "恐龙探险队",
    title: "恐龙探险队",
    description: "回到远古世界，边玩边学恐龙百科",
  },
  {
    key: "汽车动力站",
    title: "汽车动力站",
    description: "用互动小机关讲清楚汽车为什么会跑",
  },
  {
    key: "太空任务局",
    title: "太空任务局",
    description: "像小小宇航员一样出发探索星球",
  },
] as const;

const writingCapsules = [
  {
    label: "续写童话",
    note: "森林奇遇",
    prompt:
      "请帮我续写一段关于森林小精灵的冒险故事，要有神秘地图、会发光的蘑菇和一句鼓励勇气的话。",
  },
  {
    label: "写首小诗",
    note: "春天主题",
    prompt: "请以“春天”为题写一首充满画面感的现代诗，要温柔、清新，适合小学生朗读。",
  },
  {
    label: "演讲稿助手",
    note: "班长竞选",
    prompt:
      "我明天要竞选班长，请帮我写一份充满自信、真诚又有感染力的演讲稿初稿，语气要自然。",
  },
] as const;

const modeTabs = [
  { id: "coding", label: "AI编程", subtitle: "做出会互动的小程序" },
  { id: "writing", label: "AI写作", subtitle: "把念头写成完整文章" },
  { id: "painting", label: "AI绘画", subtitle: "把想象变成一张画" },
  { id: "music", label: "AI音乐", subtitle: "创作旋律与节奏" },
  { id: "video", label: "AI视频", subtitle: "生成故事短片" },
  { id: "modeling", label: "AI建模", subtitle: "搭建立体小世界" },
] as const;

type ModeId = (typeof modeTabs)[number]["id"];

const modeVisuals: Record<
  ModeId,
  {
    iconSrc: string;
    glowClass: string;
    cardClass: string;
    pillClass: string;
  }
> = {
  coding: {
    iconSrc: "/landing-assets/icon-code.png",
    glowClass: "from-[#8b8fff] via-[#8fcbff] to-[#ffd3e1]",
    cardClass:
      "from-[#eef2ff] via-white to-[#fdf2f8] shadow-[0_22px_50px_rgba(129,140,248,0.18)]",
    pillClass: "bg-[#eef2ff] text-[#5b62d7]",
  },
  writing: {
    iconSrc: "/landing-assets/icon-doc.png",
    glowClass: "from-[#ffe3a6] via-[#fff4c7] to-[#ffd9c5]",
    cardClass:
      "from-[#fff9df] via-[#fffef5] to-[#fff0da] shadow-[0_22px_50px_rgba(245,158,11,0.16)]",
    pillClass: "bg-[#fff1c9] text-[#b7791f]",
  },
  painting: {
    iconSrc: "/landing-assets/icon-palette.png",
    glowClass: "from-[#ffc8de] via-[#ffdcb6] to-[#c8edff]",
    cardClass:
      "from-[#fff1f6] via-white to-[#edf8ff] shadow-[0_22px_50px_rgba(244,114,182,0.16)]",
    pillClass: "bg-[#ffe0eb] text-[#d25586]",
  },
  music: {
    iconSrc: "/landing-assets/icon-music.png",
    glowClass: "from-[#d8d4ff] via-[#c7d2fe] to-[#f5d0fe]",
    cardClass:
      "from-[#f5f3ff] via-white to-[#fdf4ff] shadow-[0_22px_50px_rgba(147,51,234,0.14)]",
    pillClass: "bg-[#ede9fe] text-[#6d5bcf]",
  },
  video: {
    iconSrc: "/landing-assets/icon-video.png",
    glowClass: "from-[#c5f3e7] via-[#cce9ff] to-[#e5f6ff]",
    cardClass:
      "from-[#ecfeff] via-white to-[#eff6ff] shadow-[0_22px_50px_rgba(14,165,233,0.14)]",
    pillClass: "bg-[#dff8ff] text-[#178ca7]",
  },
  modeling: {
    iconSrc: "/landing-assets/icon-cube.png",
    glowClass: "from-[#d7ecff] via-[#dbeafe] to-[#d8d4ff]",
    cardClass:
      "from-[#eff6ff] via-white to-[#f5f3ff] shadow-[0_22px_50px_rgba(59,130,246,0.14)]",
    pillClass: "bg-[#e0efff] text-[#3172b7]",
  },
};

const comingSoonConfig: Record<
  Exclude<ModeId, "coding" | "painting" | "writing">,
  { title: string; description: string; badge: string }
> = {
  music: {
    title: "音乐工坊正在接入",
    description:
      "未来这里会把一句灵感变成旋律、节奏和伴奏，让孩子像在玩乐器积木一样完成自己的主题曲。",
    badge: "旋律引擎搭建中",
  },
  video: {
    title: "视频工坊正在接入",
    description:
      "未来这里会把故事脚本扩展成镜头、画面和动画短片，让科普内容像小电影一样生动展开。",
    badge: "光影舞台搭建中",
  },
  modeling: {
    title: "建模工坊正在接入",
    description:
      "未来这里会把平面的想法变成立体作品，孩子可以旋转、观察、拆解，像搭一个会发光的小世界。",
    badge: "立体宇宙搭建中",
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
  "正在翻阅今天的灵感册",
  "正在搭建互动小舞台",
  "正在整理页面里的机关和按钮",
  "正在把想法装进手机预览里",
  "马上就可以看到成品了",
];

const writingLoadingMessages = [
  "正在铺开温柔信纸",
  "正在给句子挑选更合适的节奏",
  "正在把灵感连成完整段落",
  "正在润色更自然的表达",
  "文章马上就写好了",
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
            radial-gradient(circle at top, #fff5cc 0%, #fff2f7 46%, #edf6ff 100%);
          font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
          color: #475569;
        }
        .panel {
          width: min(84%, 320px);
          border-radius: 30px;
          background: rgba(255, 255, 255, 0.94);
          box-shadow: 0 18px 40px rgba(251, 191, 188, 0.2);
          padding: 28px 22px;
          text-align: center;
        }
        .tag {
          display: inline-block;
          border-radius: 999px;
          background: #eef2ff;
          color: #6673d8;
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
        <div class="tag">预览待命中</div>
        <h2>手机预览台</h2>
        <p>等你开始创作后，这里会出现实时生成的小程序。</p>
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
            radial-gradient(circle at top, #fff5cc 0%, #fff2f7 46%, #edf6ff 100%);
          font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
          color: #475569;
        }
        .panel {
          width: min(84%, 320px);
          border-radius: 30px;
          background: rgba(255, 255, 255, 0.94);
          box-shadow: 0 18px 40px rgba(251, 191, 188, 0.2);
          padding: 28px 22px;
          text-align: center;
        }
        .tag {
          display: inline-block;
          border-radius: 999px;
          background: #fff1f2;
          color: #db5c88;
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
        <h2>手机预览台</h2>
        <p>${message}</p>
      </div>
    </body>
  </html>
`;

function WorkshopContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const previewShellRef = useRef<HTMLDivElement | null>(null);
  const previewIframeRef = useRef<HTMLIFrameElement | null>(null);

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
  const [isSharing, setIsSharing] = useState(false);
  const [shareMessage, setShareMessage] = useState("");

  const modeParam = searchParams.get("mode");
  const activeMode = modeTabs.some((tab) => tab.id === modeParam)
    ? (modeParam as ModeId)
    : "coding";
  const activeTab = modeTabs.find((tab) => tab.id === activeMode) ?? modeTabs[0];
  const activeVisual = modeVisuals[activeMode];
  const isCodingMode = activeMode === "coding";
  const isWritingMode = activeMode === "writing";
  const isPaintingMode = activeMode === "painting";
  const hasGeneratedCode =
    Boolean(generatedCode.trim()) && generatedCode !== defaultPreviewHtml;
  const isPreviewFocused = isCodingMode && (isLoading || hasGeneratedCode);
  const effectivePhoneScale = phoneScale * (isPreviewFocused ? 1.15 : 1);
  const codingPreviewDoc = hasGeneratedCode ? generatedCode : defaultPreviewHtml;

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

  const redirectToLogin = () => {
    const currentMode = searchParams.get("mode");
    const redirectPath = currentMode
      ? `${pathname}?mode=${currentMode}`
      : pathname;

    router.push(`/login?redirect=${encodeURIComponent(redirectPath)}`);
  };

  const buildShareTitle = () => {
    const condensedPrompt = promptText.replace(/\s+/g, " ").trim();

    if (!condensedPrompt) {
      return "我的创作作品";
    }

    return condensedPrompt.length > 18
      ? `${condensedPrompt.slice(0, 18)}...`
      : condensedPrompt;
  };

  const capturePreviewImage = async () => {
    const iframe = previewIframeRef.current;

    if (iframe?.contentDocument?.documentElement) {
      const frameRoot = iframe.contentDocument.documentElement;
      const canvas = await html2canvas(frameRoot, {
        backgroundColor: "#ffffff",
        useCORS: true,
        scale: 1,
      });

      return canvas.toDataURL("image/png", 0.92);
    }

    if (previewShellRef.current) {
      const canvas = await html2canvas(previewShellRef.current, {
        backgroundColor: null,
        useCORS: true,
        scale: 1,
      });

      return canvas.toDataURL("image/png", 0.92);
    }

    throw new Error("预览截图失败，请重新生成后再试。");
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

    if (response.status === 401) {
      redirectToLogin();
      throw new Error("请先登录后再使用语音施法。");
    }

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
          setVoiceError("没有录到声音，再试一次语音施法吧。");
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
      setVoiceError("麦克风权限还没有打开，请先允许浏览器使用麦克风。");
      setIsRecording(false);
      setIsTranscribing(false);
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const handleGenerate = async () => {
    if (!promptText.trim()) {
      window.alert("请先在左侧写下创作想法。");
      return;
    }

    setShareMessage("");
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

      if (response.status === 401) {
        redirectToLogin();
        return;
      }

      if (!response.ok || !data.code) {
        setGeneratedCode(
          createMessagePreviewHtml(
            "生成未完成",
            data.error ?? "这次创作没有成功，我们再试一次。",
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
          "连接中断",
          "刚刚和创作引擎失去了一下联系，请稍后再试试。",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleShareToCommunity = async () => {
    if (!promptText.trim()) {
      window.alert("先写下创作想法，再把作品分享出去。");
      return;
    }

    if (!hasGeneratedCode || isLoading) {
      window.alert("先完成一次生成，才能把作品分享到社区。");
      return;
    }

    setIsSharing(true);
    setShareMessage("");

    try {
      const previewImageUrl = await capturePreviewImage();
      const response = await fetch("/api/community/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: buildShareTitle(),
          prompt: promptText,
          previewImageUrl,
          previewCode: generatedCode,
          mode: "coding",
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        message?: string;
        moderation?: { approved?: boolean; reason?: string };
      };

      if (response.status === 401) {
        redirectToLogin();
        return;
      }

      if (!response.ok) {
        setShareMessage(data.error ?? "分享失败了，请稍后再试。");
        return;
      }

      setShareMessage(
        data.message ??
          (data.moderation?.approved
            ? "作品已经分享进社区。"
            : "作品已经提交，但暂未通过审核。"),
      );
    } catch (error) {
      setShareMessage(
        error instanceof Error ? error.message : "分享失败了，请稍后再试。",
      );
    } finally {
      setIsSharing(false);
    }
  };

  const handleGenerateWriting = async () => {
    if (!writingPrompt.trim()) {
      window.alert("请先写下今天想创作的内容。");
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

      if (response.status === 401) {
        redirectToLogin();
        return;
      }

      if (!response.ok || !data.code) {
        setWritingError(data.error ?? "这次创作没有成功，我们再试一次。");
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
      window.alert("请先写下一句绘画描述。");
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

      if (response.status === 401) {
        redirectToLogin();
        return;
      }

      if (!response.ok || !data.imageUrl) {
        setDrawingError(data.error ?? "这次作画没有成功，我们再试一次。");
        return;
      }

      setGeneratedImageUrl(data.imageUrl);
    } catch {
      setDrawingError("刚刚和画板星云失去了一下联系，请稍后再试试。");
    } finally {
      setIsDrawing(false);
    }
  };

  const activeComingSoon =
    isCodingMode || isPaintingMode || isWritingMode
      ? null
      : comingSoonConfig[activeMode];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#edf4ff] text-slate-700">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.96),rgba(238,244,255,0.94)_34%,rgba(231,239,255,0.96)_62%,rgba(244,247,255,1)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(140deg,rgba(180,208,255,0.22),transparent_26%,rgba(255,217,229,0.18)_58%,rgba(255,238,190,0.18)_84%,transparent)]" />
        <div className="absolute -left-16 top-10 h-72 w-72 rounded-full bg-[#ffd9e4]/45 blur-3xl" />
        <div className="absolute left-[28%] top-0 h-80 w-80 rounded-full bg-[#d7e6ff]/55 blur-3xl" />
        <div className="absolute right-8 top-12 h-80 w-80 rounded-full bg-[#dff5ff]/55 blur-3xl" />
        <div className="absolute bottom-0 left-[20%] h-80 w-80 rounded-full bg-[#fff0bf]/35 blur-3xl" />
        <div className="absolute bottom-[-60px] right-[12%] h-96 w-96 rounded-full bg-[#cfe0ff]/35 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1700px] gap-4 px-4 py-4 lg:px-6 lg:py-6">
        <aside className="hidden w-[118px] shrink-0 rounded-[34px] border border-white/70 bg-white/78 p-4 shadow-[0_28px_80px_rgba(148,163,184,0.15)] backdrop-blur-xl lg:flex lg:flex-col">
          <div className="flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="小红车标志"
              width={58}
              height={58}
              className="rounded-[20px] shadow-[0_12px_28px_rgba(248,113,113,0.16)]"
            />
          </div>

          <div className="mt-8 flex flex-1 flex-col gap-3">
            {modeTabs.map((tab) => {
              const isActive = activeMode === tab.id;
              const visual = modeVisuals[tab.id];

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleModeChange(tab.id)}
                  className={`group flex flex-col items-center rounded-[26px] px-3 py-4 transition-all duration-300 ${
                    isActive
                      ? "bg-white shadow-[0_18px_36px_rgba(148,163,184,0.16)]"
                      : "bg-white/45 hover:-translate-y-0.5 hover:bg-white/85"
                  }`}
                >
                  <div
                    className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${visual.glowClass} shadow-[0_12px_24px_rgba(148,163,184,0.16)]`}
                  >
                    <Image
                      src={visual.iconSrc}
                      alt={tab.label}
                      width={28}
                      height={28}
                      className="h-7 w-7 object-contain"
                    />
                  </div>
                  <span
                    className={`mt-3 text-center text-[12px] font-bold leading-5 ${
                      isActive ? "text-slate-700" : "text-slate-400"
                    }`}
                  >
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="rounded-[24px] bg-white/72 p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.82)]">
            <div className="flex items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-[#ffd6df] to-[#d8e6ff] text-[10px] font-black text-slate-600">
                创作
              </div>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-bold text-slate-700">
                  今日进度
                </p>
                <p className="text-[10px] text-slate-400">灵感已就位</p>
              </div>
            </div>
            <div className="mt-3 h-2 rounded-full bg-slate-100">
              <div className="h-2 w-2/3 rounded-full bg-gradient-to-r from-[#8ec9ff] to-[#a493ff]" />
            </div>
          </div>
        </aside>

        <section className="grid min-h-[calc(100vh-2rem)] flex-1 gap-4 lg:grid-cols-[440px_minmax(0,1fr)]">
          <section className="flex h-full flex-col rounded-[36px] border border-white/75 bg-white/80 px-5 py-5 shadow-[0_30px_90px_rgba(148,163,184,0.14)] backdrop-blur-xl lg:px-6 lg:py-6">
            <div className="rounded-[30px] bg-gradient-to-br from-white via-[#f8fbff] to-[#fff6f8] p-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.88)]">
              <div className="relative flex items-start justify-between gap-4 pr-28">
                <div className="min-w-0 max-w-[340px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-full bg-[#eef3ff] px-3 py-1 text-[11px] font-bold tracking-[0.18em] text-[#6e78df]">
                      小红车魔法工坊
                    </div>
                    <div
                      className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold ${activeVisual.pillClass}`}
                    >
                      {activeTab.label}
                    </div>
                  </div>
                  <h1 className="mt-4 font-['STZhongsong','Songti_SC','PingFang_SC',serif] text-[34px] font-black leading-[1.14] tracking-[-0.04em] text-slate-700 sm:text-[38px]">
                    把一个念头，
                    <br />
                    慢慢做成作品。
                  </h1>
                  <p className="mt-4 max-w-md text-[15px] leading-8 text-slate-500">
                    左边负责组织灵感，右边负责展示成品。整个工作台像一间儿童创作实验室，清爽、圆润，也更适合拿去正式展示。
                  </p>
                </div>

                <div className="absolute right-1 top-1 hidden lg:block">
                  <div className="absolute inset-0 rounded-full bg-[#dbe8ff]/90 blur-2xl" />
                  <Image
                    src="/landing-assets/kid-think.png"
                    alt="创作角色"
                    width={130}
                    height={166}
                    className="relative h-[132px] w-auto max-w-none object-contain opacity-95"
                  />
                </div>
              </div>
            </div>

            {isCodingMode ? (
              <div className="mt-4 flex-1 rounded-[32px] bg-white p-5 shadow-[0_22px_60px_rgba(148,163,184,0.12)]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-lg font-black text-slate-700">编程创作台</p>
                    <p className="mt-1 text-sm leading-7 text-slate-400">
                      先选一个主题，再补上你想让页面发生的互动。
                    </p>
                  </div>
                  <div className={`rounded-full px-3 py-1 text-xs font-bold ${activeVisual.pillClass}`}>
                    当前模式
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  {codingScenes.map((scene, index) => {
                    const sceneClasses = [
                      "from-[#fff1f6] to-[#ffe6f0]",
                      "from-[#eef8ff] to-[#e3f2ff]",
                      "from-[#fff8e5] to-[#fff1ce]",
                      "from-[#eef6ff] to-[#efeaff]",
                    ];

                    return (
                      <button
                        key={scene.key}
                        type="button"
                        onClick={() => handleCodingPresetClick(scene.key)}
                        className={`rounded-[24px] bg-gradient-to-br ${sceneClasses[index]} px-4 py-4 text-left shadow-[0_12px_28px_rgba(148,163,184,0.12)] transition duration-200 hover:-translate-y-0.5`}
                      >
                        <p className="text-sm font-black text-slate-700">
                          {scene.title}
                        </p>
                        <p className="mt-2 text-xs leading-6 text-slate-500">
                          {scene.description}
                        </p>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <label
                      htmlFor="prompt"
                      className="text-sm font-bold tracking-[0.08em] text-slate-500"
                    >
                      创作描述
                    </label>
                    <button
                      type="button"
                      onClick={handleVoiceMagic}
                      disabled={isTranscribing}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold shadow-[0_10px_24px_rgba(148,163,184,0.12)] transition ${
                        isRecording
                          ? "animate-pulse bg-[#ffd7df] text-[#bf4d74]"
                          : isTranscribing
                            ? "bg-[#fff2cf] text-[#b67e18]"
                            : "bg-gradient-to-r from-[#eef3ff] via-[#fff0f5] to-[#fff7d8] text-slate-600 hover:-translate-y-0.5"
                      }`}
                    >
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-white/80 text-[12px]">
                        {isRecording ? "停" : isTranscribing ? "识" : "录"}
                      </span>
                      {isRecording
                        ? "停止并识别"
                        : isTranscribing
                          ? "正在识别"
                          : "语音施法"}
                    </button>
                  </div>

                  <div className="relative">
                    <textarea
                      id="prompt"
                      rows={11}
                      value={promptText}
                      onChange={(event) => setPromptText(event.target.value)}
                      placeholder="比如：做一个关于汽车为什么会跑起来的科普小程序，要有互动问答、会变化的知识卡片和适合孩子阅读的语气。"
                      className="w-full resize-none rounded-[30px] bg-[#f6faff] px-5 py-5 text-base leading-8 text-slate-700 outline-none shadow-[inset_0_0_0_2px_rgba(219,234,254,0.95)] transition placeholder:text-slate-400 focus:bg-white focus:shadow-[inset_0_0_0_2px_rgba(193,209,255,1),0_0_0_8px_rgba(255,233,190,0.26)]"
                    />
                    {(isRecording || isTranscribing) && (
                      <div className="pointer-events-none absolute bottom-4 right-4 rounded-full bg-white/92 px-3 py-1 text-xs font-bold text-[#cf6f8b] shadow-[0_8px_20px_rgba(148,163,184,0.12)]">
                        {isRecording ? "正在聆听" : "正在转成文字"}
                      </div>
                    )}
                  </div>

                  {voiceError && (
                    <div className="mt-3 rounded-[18px] bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#d45b85]">
                      {voiceError}
                    </div>
                  )}
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setGeneratedCode(defaultPreviewHtml);
                      setShareMessage("");
                    }}
                    className="inline-flex h-15 flex-1 items-center justify-center rounded-full bg-[#f4f7ff] px-5 text-base font-black text-slate-600 shadow-[0_12px_28px_rgba(148,163,184,0.12)] transition hover:-translate-y-0.5"
                  >
                    清空预览
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={isLoading}
                    className="inline-flex h-15 flex-[1.3] items-center justify-center rounded-full bg-gradient-to-r from-[#ffdbe5] via-[#ffe8cd] to-[#dcecff] px-6 text-lg font-black text-slate-700 shadow-[0_16px_38px_rgba(251,191,188,0.32)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_20px_42px_rgba(148,163,184,0.18)] focus:outline-none"
                  >
                    {isLoading ? "生成中" : "开始生成"}
                  </button>
                </div>

                {shareMessage && (
                  <div className="mt-4 rounded-[20px] bg-[#fff7e8] px-4 py-3 text-sm font-bold leading-7 text-[#b7791f]">
                    {shareMessage}
                  </div>
                )}
              </div>
            ) : isWritingMode ? (
              <div className="mt-4 flex-1 rounded-[32px] bg-gradient-to-br from-[#fffdf1] via-white to-[#fff7dc] p-5 shadow-[0_22px_60px_rgba(217,119,6,0.12)]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-lg font-black text-amber-900">写作创作台</p>
                    <p className="mt-1 text-sm leading-7 text-amber-800/70">
                      选一枚灵感胶囊，句子会沿着你的思路自然展开。
                    </p>
                  </div>
                  <div className={`rounded-full px-3 py-1 text-xs font-bold ${activeVisual.pillClass}`}>
                    当前模式
                  </div>
                </div>

                <div className="mt-6 grid gap-3">
                  {writingCapsules.map((item, index) => {
                    const capsuleClasses = [
                      "from-[#fff7e3] to-[#fff0cb]",
                      "from-[#fff2f1] to-[#ffe7ec]",
                      "from-[#eefaf5] to-[#e2f4ed]",
                    ];

                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => handleWritingCapsuleClick(item.prompt)}
                        className={`rounded-[24px] bg-gradient-to-br ${capsuleClasses[index]} px-4 py-4 text-left shadow-[0_12px_28px_rgba(217,119,6,0.08)] transition hover:-translate-y-0.5`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-black text-amber-900">
                            {item.label}
                          </p>
                          <span className="rounded-full bg-white/70 px-3 py-1 text-[11px] font-bold text-amber-600">
                            {item.note}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6">
                  <label
                    htmlFor="writing-prompt"
                    className="mb-3 block text-sm font-bold tracking-[0.08em] text-amber-700"
                  >
                    写作需求
                  </label>
                  <textarea
                    id="writing-prompt"
                    rows={12}
                    value={writingPrompt}
                    onChange={(event) => setWritingPrompt(event.target.value)}
                    placeholder="比如：写一封给未来自己的信，语气温柔真诚，适合五年级的小朋友阅读。"
                    className="w-full resize-none rounded-[30px] bg-[#fffdf4] px-5 py-5 text-base leading-8 text-amber-900 outline-none shadow-[inset_0_0_0_2px_rgba(254,240,138,0.8)] transition placeholder:text-amber-500/70 focus:bg-white focus:shadow-[inset_0_0_0_2px_rgba(251,191,36,0.42),0_0_0_8px_rgba(252,211,77,0.16)]"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleGenerateWriting}
                  disabled={isWritingLoading}
                  className="mt-6 inline-flex h-15 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#ffe2a9] via-[#fff0c8] to-[#ffdcb6] px-6 text-lg font-black text-amber-900 shadow-[0_16px_34px_rgba(251,191,36,0.24)] transition duration-200 hover:-translate-y-1"
                >
                  {isWritingLoading ? "正在创作" : "开始创作"}
                </button>
              </div>
            ) : isPaintingMode ? (
              <div className="mt-4 flex-1 rounded-[32px] bg-white p-5 shadow-[0_22px_60px_rgba(148,163,184,0.12)]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-lg font-black text-slate-700">绘画创作台</p>
                    <p className="mt-1 text-sm leading-7 text-slate-400">
                      把场景、颜色、角色和光影写清楚，画面会更完整。
                    </p>
                  </div>
                  <div className={`rounded-full px-3 py-1 text-xs font-bold ${activeVisual.pillClass}`}>
                    当前模式
                  </div>
                </div>

                <div className="mt-6 rounded-[28px] bg-gradient-to-br from-[#fff2f8] via-white to-[#eef7ff] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.9)]">
                  <p className="text-sm font-bold text-slate-500">描述建议</p>
                  <p className="mt-2 text-sm leading-7 text-slate-500">
                    可以写清场景、角色、颜色、光线和风格，比如“云朵游乐园里的小机器人，奶油色调，像童书封面一样柔和明亮”。
                  </p>
                </div>

                <div className="mt-6">
                  <label
                    htmlFor="drawing-prompt"
                    className="mb-3 block text-sm font-bold tracking-[0.08em] text-slate-500"
                  >
                    绘画描述
                  </label>
                  <textarea
                    id="drawing-prompt"
                    rows={12}
                    value={drawingPrompt}
                    onChange={(event) => setDrawingPrompt(event.target.value)}
                    placeholder="比如：一辆会飞的小红车穿过彩虹云朵和糖果星星，画面温暖柔和，像高品质儿童绘本封面。"
                    className="w-full resize-none rounded-[30px] bg-[#fff6fa] px-5 py-5 text-base leading-8 text-slate-700 outline-none shadow-[inset_0_0_0_2px_rgba(251,207,232,0.9)] transition placeholder:text-slate-400 focus:bg-white focus:shadow-[inset_0_0_0_2px_rgba(191,219,254,1),0_0_0_8px_rgba(255,233,190,0.18)]"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleGenerateImage}
                  disabled={isDrawing}
                  className="mt-6 inline-flex h-15 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#ffd7e8] via-[#ffe7d2] to-[#dcecff] px-6 text-lg font-black text-slate-700 shadow-[0_16px_34px_rgba(251,191,188,0.24)] transition duration-200 hover:-translate-y-1"
                >
                  {isDrawing ? "正在作画" : "开始作画"}
                </button>
              </div>
            ) : (
              <div className="mt-4 flex-1 rounded-[32px] bg-white p-6 shadow-[0_22px_60px_rgba(148,163,184,0.12)]">
                <div className={`rounded-[28px] bg-gradient-to-br ${activeVisual.cardClass} p-6`}>
                  <div className="flex items-start gap-4">
                    <div
                      className={`grid h-16 w-16 shrink-0 place-items-center rounded-[22px] bg-gradient-to-br ${activeVisual.glowClass} shadow-[0_14px_30px_rgba(148,163,184,0.14)]`}
                    >
                      <Image
                        src={activeVisual.iconSrc}
                        alt={activeTab.label}
                        width={30}
                        height={30}
                        className="h-8 w-8 object-contain"
                      />
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
                </div>
              </div>
            )}
          </section>

          <section className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-[38px] border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(245,248,255,0.94))] shadow-[0_30px_90px_rgba(148,163,184,0.14)] backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.95),rgba(239,245,255,0.9)_52%,rgba(232,240,255,0.98)_100%)]" />
              <div className="absolute -left-12 top-20 h-80 w-80 rounded-full bg-[#d8e6ff]/52 blur-3xl" />
              <div className="absolute right-8 top-8 h-80 w-80 rounded-full bg-[#e2f5ff]/56 blur-3xl" />
              <div className="absolute bottom-0 left-[32%] h-72 w-72 rounded-full bg-[#fff0c6]/30 blur-3xl" />
            </div>

            <div className="relative z-10 flex items-center justify-between gap-4 px-6 py-5 lg:px-10">
              <div>
                <p className="text-sm font-bold tracking-[0.16em] text-[#7f9dcf]">
                  {isCodingMode
                    ? "创作预览台"
                    : isWritingMode
                      ? "写作展示台"
                      : isPaintingMode
                        ? "绘画展示台"
                        : "新模块筹备中"}
                </p>
                <h2 className="mt-2 font-['STZhongsong','Songti_SC','PingFang_SC',serif] text-[30px] font-black tracking-[-0.04em] text-slate-700">
                  {isCodingMode
                    ? "手机预览台"
                    : isWritingMode
                      ? "灵感信纸"
                      : isPaintingMode
                        ? "梦幻画板"
                        : activeTab.label}
                </h2>
              </div>

              {isCodingMode ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center rounded-full bg-white/85 px-2 py-2 shadow-[0_10px_24px_rgba(148,163,184,0.12)]">
                    <button
                      type="button"
                      onClick={handleScaleDown}
                      className="grid h-9 w-9 place-items-center rounded-full bg-[#fff1f6] text-lg font-black text-[#d15f86] transition hover:scale-105"
                      aria-label="缩小手机预览"
                    >
                      －
                    </button>
                    <span className="px-3 text-xs font-bold text-slate-400">
                      {Math.round(effectivePhoneScale * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={handleScaleUp}
                      className="grid h-9 w-9 place-items-center rounded-full bg-[#eaf4ff] text-lg font-black text-[#4b8fd6] transition hover:scale-105"
                      aria-label="放大手机预览"
                    >
                      ＋
                    </button>
                  </div>

                  <div className={`rounded-full px-4 py-2 text-sm font-bold ${activeVisual.pillClass}`}>
                    {isLoading ? "正在生成" : hasGeneratedCode ? "内容已生成" : "等待开始"}
                  </div>
                </div>
              ) : isWritingMode ? (
                <div className={`rounded-full px-4 py-2 text-sm font-bold ${activeVisual.pillClass} shadow-[0_10px_24px_rgba(217,119,6,0.12)]`}>
                  {isWritingLoading
                    ? "正在创作"
                    : writingResult
                      ? "文章已生成"
                      : "空白信纸待命中"}
                </div>
              ) : isPaintingMode ? (
                <div className={`rounded-full px-4 py-2 text-sm font-bold ${activeVisual.pillClass} shadow-[0_10px_24px_rgba(244,114,182,0.12)]`}>
                  {isDrawing
                    ? "正在作画"
                    : generatedImageUrl
                      ? "画作已完成"
                      : "空白画板待命中"}
                </div>
              ) : (
                <div className={`rounded-full px-4 py-2 text-sm font-bold ${activeVisual.pillClass}`}>
                  {activeComingSoon?.badge}
                </div>
              )}
            </div>

            {isCodingMode ? (
              <div className="relative z-10 flex flex-1 px-6 pb-8 lg:px-10 lg:pb-10">
                <div
                  className={`flex w-full transition-all duration-500 ${
                    !hasGeneratedCode && !isLoading
                      ? "items-center"
                      : "items-center justify-center"
                  }`}
                >
                  <div
                    className={`relative grid w-full max-w-[1220px] gap-10 transition-all duration-500 ${
                      !hasGeneratedCode && !isLoading
                        ? "xl:grid-cols-[minmax(0,360px)_1fr]"
                        : "place-items-center"
                    }`}
                  >
                    {!hasGeneratedCode && !isLoading && (
                      <div className="hidden xl:flex xl:flex-col xl:justify-center">
                        <div className="max-w-[340px]">
                          <p className="text-sm font-bold tracking-[0.18em] text-[#8aa0ca]">
                            今天要做什么
                          </p>
                          <h3 className="mt-4 font-['STZhongsong','Songti_SC','PingFang_SC',serif] text-[44px] font-black leading-tight tracking-[-0.05em] text-slate-700">
                            写下一个想法，
                            <br />
                            看它在屏幕里长出来。
                          </h3>
                          <p className="mt-5 text-[16px] leading-8 text-slate-500">
                            右侧保留安全预览结构，生成完成后会直接进入手机展示区。整体舞台更干净，也更像正式产品发布时的展示画面。
                          </p>
                          <div className="mt-8 flex gap-3">
                            <button
                              type="button"
                              onClick={() => setGeneratedCode(defaultPreviewHtml)}
                              className="rounded-full bg-white px-4 py-3 text-sm font-bold text-slate-500 shadow-[0_12px_28px_rgba(148,163,184,0.12)]"
                            >
                              恢复预览
                            </button>
                            <button
                              type="button"
                              onClick={handleGenerate}
                              className="rounded-full bg-[#eaf4ff] px-4 py-3 text-sm font-bold text-[#4b8fd6] shadow-[0_12px_28px_rgba(125,211,252,0.16)]"
                            >
                              直接生成
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="relative flex w-full justify-center">
                      <div className="pointer-events-none absolute inset-0 hidden xl:block">
                        <div className="absolute left-0 top-24 w-[190px] rounded-[28px] bg-white/72 p-4 shadow-[0_18px_42px_rgba(148,163,184,0.12)] backdrop-blur-xl">
                          <div className="flex items-center gap-3">
                            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#eef3ff]">
                              <Image
                                src="/landing-assets/icon-code.png"
                                alt="代码图标"
                                width={24}
                                height={24}
                                className="h-6 w-6 object-contain"
                              />
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-700">
                                互动页面
                              </p>
                              <p className="mt-1 text-xs leading-5 text-slate-400">
                                适合手机展示
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="absolute right-4 top-2">
                          <div className="relative">
                            <div className="absolute inset-0 rounded-full bg-[#dbe8ff] blur-2xl" />
                            <Image
                              src="/landing-assets/kid-point.png"
                              alt="指向预览的角色"
                              width={170}
                              height={170}
                              className="relative h-[150px] w-auto object-contain"
                            />
                          </div>
                        </div>

                        <div className="absolute bottom-0 left-8">
                          <div className="relative">
                            <div className="absolute inset-0 rounded-full bg-[#dcecff] blur-2xl" />
                            <Image
                              src="/landing-assets/robot-front.png"
                              alt="工作台机器人"
                              width={210}
                              height={250}
                              className="relative h-[220px] w-auto object-contain"
                            />
                          </div>
                        </div>
                      </div>

                      <div
                        ref={previewShellRef}
                        className={`origin-center transition-transform duration-500 ${
                          isPreviewFocused ? "scale-110" : ""
                        }`}
                        style={{ transform: `scale(${effectivePhoneScale})` }}
                      >
                        <div className="relative mx-auto w-[322px] rounded-[52px] bg-gradient-to-b from-white via-[#f3f9ff] to-[#fff6fa] p-[12px] shadow-[0_34px_90px_rgba(125,211,252,0.22),0_18px_40px_rgba(251,191,188,0.24)] sm:w-[372px]">
                          <div className="absolute inset-x-0 top-[82px] mx-auto h-[80%] w-[88%] rounded-[42px] bg-[#dff1ff]/80 blur-2xl" />
                          <div className="absolute left-[8px] top-28 h-16 w-[4px] rounded-full bg-[#dce7ff]" />
                          <div className="absolute left-[8px] top-48 h-10 w-[4px] rounded-full bg-[#ffe0eb]" />
                          <div className="absolute right-[8px] top-40 h-20 w-[4px] rounded-full bg-[#fff0c7]" />

                          <div className="relative overflow-y-auto overflow-x-hidden rounded-[40px] bg-white p-[10px] shadow-[inset_0_0_0_3px_rgba(229,241,255,1)]">
                            <div className="absolute left-1/2 top-3 z-10 h-8 w-32 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#ecf3ff] to-[#fff1f6] shadow-[0_10px_20px_rgba(219,234,254,0.75)]">
                              <div className="mx-auto mt-[11px] h-2 w-14 rounded-full bg-white/80" />
                            </div>

                            {isLoading ? (
                              <div className="flex h-[620px] w-full flex-col items-center justify-center rounded-[32px] bg-gradient-to-b from-[#fff3d2] via-[#fff7fb] to-[#edf6ff] px-6 text-center">
                                <div className="relative flex h-28 w-28 items-center justify-center">
                                  <div className="absolute inset-0 rounded-full border-4 border-dashed border-[#ffd5e2] animate-spin" />
                                  <div className="absolute inset-3 rounded-full bg-white/78" />
                                  <div className="relative h-12 w-12 rounded-full bg-gradient-to-br from-[#ffdbe7] to-[#d8e6ff] shadow-[0_10px_24px_rgba(148,163,184,0.16)]" />
                                  <div className="absolute right-2 top-2 h-3 w-3 rounded-full bg-[#ffe4a8] animate-pulse" />
                                  <div className="absolute left-4 bottom-3 h-2.5 w-2.5 rounded-full bg-[#b9e2ff] animate-pulse" />
                                </div>

                                <div className="mt-6 rounded-full bg-white/86 px-4 py-2 text-sm font-bold text-[#d06b8c] shadow-[0_10px_24px_rgba(148,163,184,0.12)]">
                                  正在整理页面结构
                                </div>

                                <p className="mt-5 min-h-[64px] max-w-[260px] text-lg font-black leading-8 text-slate-600">
                                  {loadingMessages[loadingMessageIndex]}
                                </p>

                                <div className="mt-4 flex items-center gap-2">
                                  <span className="h-3 w-3 rounded-full bg-[#ffd7e4] animate-bounce" />
                                  <span
                                    className="h-3 w-3 rounded-full bg-[#ffe4ae] animate-bounce"
                                    style={{ animationDelay: "0.15s" }}
                                  />
                                  <span
                                    className="h-3 w-3 rounded-full bg-[#c9e8ff] animate-bounce"
                                    style={{ animationDelay: "0.3s" }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <iframe
                                ref={previewIframeRef}
                                title="小程序实时预览"
                                className="block h-[620px] w-full overflow-y-auto rounded-[32px] bg-white"
                                srcDoc={codingPreviewDoc}
                                scrolling="yes"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {hasGeneratedCode && !isLoading && (
                      <div className="absolute bottom-0 left-1/2 flex -translate-x-1/2 justify-center gap-3 xl:bottom-2">
                        <button
                          type="button"
                          onClick={() => {
                            setGeneratedCode(defaultPreviewHtml);
                            setShareMessage("");
                          }}
                          className="rounded-full bg-white px-4 py-3 text-sm font-bold text-slate-500 shadow-[0_12px_28px_rgba(148,163,184,0.12)]"
                        >
                          重置预览
                        </button>
                        <button
                          type="button"
                          onClick={handleGenerate}
                          className="rounded-full bg-[#eaf4ff] px-4 py-3 text-sm font-bold text-[#4b8fd6] shadow-[0_12px_28px_rgba(125,211,252,0.16)]"
                        >
                          重新生成
                        </button>
                        <button
                          type="button"
                          onClick={handleShareToCommunity}
                          disabled={isSharing}
                          className="rounded-full bg-[linear-gradient(90deg,#ffd9ea_0%,#ffe7c7_52%,#dcecff_100%)] px-4 py-3 text-sm font-bold text-slate-700 shadow-[0_12px_28px_rgba(251,191,188,0.2)] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {isSharing ? "正在分享" : "分享到社区"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : isWritingMode ? (
              <div className="relative z-10 flex flex-1 items-center justify-center px-6 pb-8 lg:px-10 lg:pb-10">
                <div className="pointer-events-none absolute inset-0 hidden xl:block">
                  <div className="absolute left-8 bottom-6">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full bg-[#fff0bf] blur-2xl" />
                      <Image
                        src="/landing-assets/robot-pad.png"
                        alt="写作助手"
                        width={220}
                        height={260}
                        className="relative h-[215px] w-auto object-contain"
                      />
                    </div>
                  </div>
                  <div className="absolute right-10 top-3">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full bg-[#ffe8cf] blur-2xl" />
                      <Image
                        src="/landing-assets/kid-point.png"
                        alt="阅读角色"
                        width={165}
                        height={165}
                        className="relative h-[148px] w-auto object-contain"
                      />
                    </div>
                  </div>
                </div>

                <div className="relative w-full max-w-5xl">
                  <div className="rounded-[42px] bg-gradient-to-br from-[#fffdf4] via-[#fff9eb] to-[#fff1cf] p-6 shadow-[0_28px_80px_rgba(245,158,11,0.12)]">
                    <div className="mx-auto min-h-[620px] rounded-[34px] border border-[#f9e7b2] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,252,241,0.98))] p-6 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.88)]">
                      {isWritingLoading ? (
                        <div className="flex min-h-[572px] flex-col items-center justify-center text-center">
                          <div className="relative flex h-28 w-28 items-center justify-center">
                            <div className="absolute inset-0 rounded-full border-4 border-dashed border-[#f8d88f] animate-spin" />
                            <div className="absolute inset-3 rounded-full bg-white/80" />
                            <div className="relative h-12 w-12 rounded-[18px] bg-gradient-to-br from-[#ffe8ac] to-[#ffd7b6]" />
                            <div className="absolute -right-1 top-3 h-3 w-3 rounded-full bg-[#fff1c9] animate-ping" />
                            <div className="absolute -left-1 bottom-4 h-2.5 w-2.5 rounded-full bg-[#ffd8e2] animate-pulse" />
                          </div>

                          <div className="mt-6 rounded-full bg-white px-4 py-2 text-sm font-bold text-amber-600 shadow-[0_10px_24px_rgba(217,119,6,0.12)]">
                            正在组织段落和语气
                          </div>

                          <p className="mt-5 min-h-[64px] max-w-md text-lg font-black leading-8 text-amber-900">
                            {writingLoadingMessages[writingLoadingMessageIndex]}
                          </p>
                        </div>
                      ) : writingResult ? (
                        <div className="relative overflow-hidden rounded-[30px] border border-[#f6e4ae] bg-white px-8 py-10 shadow-[0_18px_45px_rgba(251,191,36,0.1)]">
                          <div className="absolute inset-y-0 left-6 w-px bg-[#f6b8c6]/80" />
                          <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-r from-[#fff2c8]/35 via-transparent to-[#ffe5ef]/35" />
                          <div className="relative pl-4">
                            <div className="mb-6 inline-flex rounded-full bg-[#fff1c9] px-4 py-2 text-sm font-bold text-amber-700">
                              今日成稿
                            </div>
                            <div className="space-y-4 whitespace-pre-wrap text-[17px] leading-9 text-slate-700">
                              {writingResult}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex min-h-[572px] flex-col items-center justify-center text-center">
                          <div className="grid h-28 w-28 place-items-center rounded-[30px] bg-gradient-to-br from-[#ffe8ac] via-[#fff3d5] to-[#ffd9c5] shadow-[0_16px_36px_rgba(251,191,36,0.14)]">
                            <Image
                              src="/landing-assets/icon-doc.png"
                              alt="写作图标"
                              width={42}
                              height={42}
                              className="h-11 w-11 object-contain"
                            />
                          </div>
                          <p className="mt-6 font-['STZhongsong','Songti_SC','PingFang_SC',serif] text-3xl font-black text-amber-900">
                            空白信纸
                          </p>
                          <p className="mt-3 max-w-lg text-base leading-8 text-amber-900/68">
                            选一枚创作胶囊，或者自己写下主题。开始创作后，右边会用更舒展的排版展示完整文章。
                          </p>
                          {writingError && (
                            <div className="mt-5 max-w-md rounded-[22px] bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#d45b85]">
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
              <div className="relative z-10 flex flex-1 items-center justify-center px-6 pb-8 lg:px-10 lg:pb-10">
                <div className="pointer-events-none absolute inset-0 hidden xl:block">
                  <div className="absolute left-8 bottom-6">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full bg-[#ffe0eb] blur-2xl" />
                      <Image
                        src="/landing-assets/robot-front.png"
                        alt="绘画助手"
                        width={220}
                        height={260}
                        className="relative h-[215px] w-auto object-contain"
                      />
                    </div>
                  </div>
                  <div className="absolute right-8 top-4">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full bg-[#dff2ff] blur-2xl" />
                      <Image
                        src="/landing-assets/kid-point.png"
                        alt="看向画板的角色"
                        width={165}
                        height={165}
                        className="relative h-[148px] w-auto object-contain"
                      />
                    </div>
                  </div>
                </div>

                <div className="w-full max-w-5xl">
                  <div className="rounded-[42px] bg-gradient-to-br from-white via-[#fff5fa] to-[#eef7ff] p-6 shadow-[0_28px_80px_rgba(125,211,252,0.14)]">
                    <div className="mx-auto flex min-h-[620px] w-full items-center justify-center rounded-[34px] border-2 border-dashed border-[#f5c5d7] bg-white/78 p-6 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.9)]">
                      {isDrawing ? (
                        <div className="flex flex-col items-center justify-center text-center">
                          <div className="relative flex h-28 w-28 items-center justify-center">
                            <div className="absolute inset-0 rounded-full border-4 border-dashed border-[#cfe7ff] animate-spin" />
                            <div className="absolute inset-3 rounded-full bg-white/82" />
                            <div className="relative h-12 w-12 rounded-[18px] bg-gradient-to-br from-[#ffdbe5] to-[#dbe9ff]" />
                            <div className="absolute -right-1 top-3 h-3 w-3 rounded-full bg-[#ffe5b4] animate-ping" />
                            <div className="absolute -left-1 bottom-4 h-2.5 w-2.5 rounded-full bg-[#ffcadb] animate-pulse" />
                          </div>
                          <div className="mt-6 rounded-full bg-white px-4 py-2 text-sm font-bold text-[#d06b8c] shadow-[0_10px_24px_rgba(148,163,184,0.12)]">
                            正在绘制画面细节
                          </div>
                          <p className="mt-5 max-w-md text-lg font-black leading-8 text-slate-600">
                            正在把你的绘画描述整理成完整画面，请稍等一会儿。
                          </p>
                        </div>
                      ) : generatedImageUrl ? (
                        <div className="flex w-full justify-center">
                          <img
                            src={generatedImageUrl}
                            alt="智能生成的绘画作品"
                            className="max-h-[560px] w-auto max-w-full rounded-[30px] object-contain shadow-[0_22px_60px_rgba(148,163,184,0.2)]"
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center">
                          <div className="grid h-28 w-28 place-items-center rounded-[30px] bg-gradient-to-br from-[#ffe0eb] via-[#fff1cf] to-[#dcecff] shadow-[0_16px_36px_rgba(148,163,184,0.12)]">
                            <Image
                              src="/landing-assets/icon-palette.png"
                              alt="绘画图标"
                              width={44}
                              height={44}
                              className="h-11 w-11 object-contain"
                            />
                          </div>
                          <p className="mt-6 font-['STZhongsong','Songti_SC','PingFang_SC',serif] text-3xl font-black text-slate-700">
                            空白画板
                          </p>
                          <p className="mt-3 max-w-md text-base leading-8 text-slate-500">
                            在左侧写下场景和风格，开始作画后，右边会展示完整图片作品。
                          </p>
                          {drawingError && (
                            <div className="mt-5 max-w-md rounded-[22px] bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#d45b85]">
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
              <div className="relative z-10 flex flex-1 items-center justify-center px-6 pb-8 lg:px-10 lg:pb-10">
                <div className="relative flex w-full max-w-5xl items-center justify-center overflow-hidden rounded-[42px] bg-gradient-to-br from-white via-[#f7fbff] to-[#fff6f8] px-8 py-16 shadow-[0_28px_80px_rgba(148,163,184,0.14)]">
                  <div className="absolute -left-12 top-8 h-40 w-40 rounded-full bg-[#ffd9e4]/55 blur-3xl animate-pulse" />
                  <div className="absolute right-6 top-10 h-52 w-52 rounded-full bg-[#d8ecff]/52 blur-3xl animate-pulse" />
                  <div className="absolute bottom-0 left-1/3 h-44 w-44 rounded-full bg-[#fff0bf]/40 blur-3xl animate-pulse" />

                  <div className="pointer-events-none absolute left-10 bottom-0 hidden xl:block">
                    <Image
                      src="/landing-assets/robot-front.png"
                      alt="等待接入的机器人"
                      width={220}
                      height={260}
                      className="h-[220px] w-auto object-contain opacity-95"
                    />
                  </div>

                  <div className="relative w-full max-w-2xl rounded-[34px] border border-white/80 bg-white/76 p-8 text-center shadow-[0_18px_60px_rgba(148,163,184,0.12)] backdrop-blur-xl">
                    <div
                      className={`mx-auto grid h-24 w-24 place-items-center rounded-[30px] bg-gradient-to-br ${activeVisual.glowClass} shadow-[0_14px_36px_rgba(148,163,184,0.14)]`}
                    >
                      <Image
                        src={activeVisual.iconSrc}
                        alt={activeTab.label}
                        width={44}
                        height={44}
                        className="h-11 w-11 object-contain"
                      />
                    </div>

                    <div className={`mt-6 inline-flex rounded-full px-4 py-2 text-sm font-bold ${activeVisual.pillClass}`}>
                      {activeComingSoon?.badge}
                    </div>

                    <h3 className="mt-5 font-['STZhongsong','Songti_SC','PingFang_SC',serif] text-4xl font-black leading-tight text-slate-700">
                      {activeComingSoon?.title}
                    </h3>

                    <p className="mx-auto mt-5 max-w-xl text-base leading-8 text-slate-500">
                      {activeComingSoon?.description}
                    </p>

                    <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                      <div className="rounded-full bg-white px-4 py-3 text-sm font-bold text-slate-500 shadow-[0_10px_20px_rgba(148,163,184,0.12)]">
                        视觉层已准备完成
                      </div>
                      <div className="rounded-full bg-white px-4 py-3 text-sm font-bold text-slate-500 shadow-[0_10px_20px_rgba(148,163,184,0.12)]">
                        能力层正在接入
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}

export default function WorkshopPage() {
  return (
    <Suspense
      fallback={
        <main className="relative min-h-screen overflow-hidden bg-[#eef4ff] text-slate-700">
          <div className="absolute inset-0 bg-gradient-to-br from-[#f8fbff] via-[#fff7fa] to-[#eef6ff]" />
          <div className="relative flex min-h-screen items-center justify-center px-6">
            <div className="rounded-[32px] bg-white/90 px-8 py-10 text-center shadow-[0_20px_60px_rgba(148,163,184,0.14)]">
              <div className="mx-auto h-14 w-14 rounded-full border-4 border-dashed border-[#d7e7ff] animate-spin" />
              <p className="mt-5 text-lg font-black text-slate-700">
                正在准备创作空间
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                请稍等一下，我们正在铺开今天的画布。
              </p>
            </div>
          </div>
        </main>
      }
    >
      <WorkshopContent />
    </Suspense>
  );
}
