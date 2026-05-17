"use client";

import html2canvas from "html2canvas";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from "react";

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
type ShareableMode = Extract<ModeId, "coding" | "writing" | "painting">;

type ShareCropSelection = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type ShareCropDragState = {
  startX: number;
  startY: number;
  startCrop: ShareCropSelection;
};

type ShareFeedbackState = {
  type: "success" | "pending" | "error";
  title: string;
  message: string;
};

type WorkshopNotification = {
  id: string;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
  notifications: {
    title: string;
    body: string;
    sent_at: string | null;
  } | null;
};

type WorkshopCreditLog = {
  id: string;
  change_amount: number;
  balance_after: number;
  reason_code: string;
  reason_label: string;
  note: string | null;
  created_at: string;
};

type WorkshopBrand = {
  siteName: string;
  tagline: string;
  logoUrl: string;
};

type WorkshopDraftSnapshot = {
  promptText: string;
  writingPrompt: string;
  writingResult: string;
  drawingPrompt: string;
  generatedCode: string;
  generatedImageUrl: string;
};

type CodeGuideRow = {
  markerId: number;
  lineNumber: number;
  code: string;
  meaning: string;
  area: string;
  previewTarget:
    | "background"
    | "title"
    | "description"
    | "stage"
    | "mainObject"
    | "controls"
    | "status"
    | "logic";
};

type CodeGuideMarkerLayout = {
  top: number;
  left: number;
  visible: boolean;
  align: "start" | "end" | "center";
  compact: boolean;
};

type CodeGuideTargetMeta = {
  title: string;
  badge: string;
  mission: string;
  accentClass: string;
  chipClass: string;
  markerClass: string;
};

const codeGuideTargetMeta: Record<
  CodeGuideRow["previewTarget"],
  CodeGuideTargetMeta
> = {
  background: {
    title: "舞台积木",
    badge: "先把舞台搭出来",
    mission: "负责把整张页面先铺开，让作品有一个可以表演的大舞台。",
    accentClass: "from-[#ffe7c8] via-[#fff3dd] to-[#fffaf1]",
    chipClass: "bg-[#fff1da] text-[#c9812d]",
    markerClass: "bg-[#f59e0b]",
  },
  title: {
    title: "标题积木",
    badge: "让名字先被看见",
    mission: "负责把最显眼的大标题放出来，让大家一眼知道这个作品在讲什么。",
    accentClass: "from-[#ffe0f0] via-[#fff1f7] to-[#fff9fc]",
    chipClass: "bg-[#ffe3f1] text-[#c95d90]",
    markerClass: "bg-[#ec4899]",
  },
  description: {
    title: "说明积木",
    badge: "帮作品开口说话",
    mission: "负责补充提示和介绍，让小朋友知道怎么玩、看哪里、接下来会发生什么。",
    accentClass: "from-[#e4f4ff] via-[#f1f8ff] to-[#fbfdff]",
    chipClass: "bg-[#e0f1ff] text-[#3b82f6]",
    markerClass: "bg-[#60a5fa]",
  },
  stage: {
    title: "场景积木",
    badge: "安排主角活动的地方",
    mission: "负责搭出游戏区域、卡片区域或者主画面，让内容有地方出现。",
    accentClass: "from-[#e6ffe7] via-[#f3fff3] to-[#fbfffb]",
    chipClass: "bg-[#e2f9e4] text-[#2f9a53]",
    markerClass: "bg-[#4ade80]",
  },
  mainObject: {
    title: "主角积木",
    badge: "把主角请上台",
    mission: "负责把小车、角色、图片或者最重要的主角元素放到页面里。",
    accentClass: "from-[#efe6ff] via-[#f7f1ff] to-[#fcfaff]",
    chipClass: "bg-[#eee7ff] text-[#7a67db]",
    markerClass: "bg-[#8b5cf6]",
  },
  controls: {
    title: "按钮积木",
    badge: "让孩子可以按一按",
    mission: "负责把按钮做出来，让页面不只是看，还可以点、可以玩、可以试试看。",
    accentClass: "from-[#ffe4df] via-[#fff1ee] to-[#fffaf9]",
    chipClass: "bg-[#ffe6e0] text-[#d9654f]",
    markerClass: "bg-[#fb7185]",
  },
  status: {
    title: "数据积木",
    badge: "把变化结果说出来",
    mission: "负责显示速度、分数、状态这些会变化的数据，让孩子看到操作后的结果。",
    accentClass: "from-[#fff5d8] via-[#fff9e9] to-[#fffdf7]",
    chipClass: "bg-[#fff1c8] text-[#c38b12]",
    markerClass: "bg-[#facc15]",
  },
  logic: {
    title: "动作积木",
    badge: "在幕后悄悄发指令",
    mission: "负责真正的动作和规则，比如移动、停止、计时，还有点一下以后要发生什么。",
    accentClass: "from-[#dde8ff] via-[#eef4ff] to-[#f8fbff]",
    chipClass: "bg-[#e0ebff] text-[#4f6dd7]",
    markerClass: "bg-[#6366f1]",
  },
};

const codeGuideTargetSelectors: Record<CodeGuideRow["previewTarget"], string[]> =
  {
    background: ["body"],
    title: ["h1", "[data-title]", "#title", ".title", ".hero-title"],
    description: [
      "p",
      "[data-description]",
      ".description",
      ".subtitle",
      ".intro",
    ],
    stage: [
      "canvas",
      ".game-area",
      "#gameArea",
      "#gamearea",
      ".stage",
      "[data-stage]",
      "main",
      "section",
    ],
    mainObject: [
      ".car",
      "#car",
      ".player",
      "#player",
      ".main-object",
      "[data-main-object]",
      "img",
      "svg",
    ],
    controls: [
      "button",
      "[data-controls]",
      ".controls",
      ".toolbar",
      ".control-panel",
    ],
    status: [
      "#speedDisplay",
      "#speeddisplay",
      "#display",
      "[data-status]",
      ".status",
      ".badge",
      ".score",
      ".counter",
      "output",
    ],
    logic: [
      ".game-area",
      "#gameArea",
      "#gamearea",
      ".stage",
      "[data-stage]",
      "canvas",
      "button",
      ".status",
      "main",
    ],
  };

const codeGuideFallbackAnchors: Record<
  CodeGuideRow["previewTarget"],
  { x: number; y: number }
> = {
  background: { x: 0.5, y: 0.12 },
  title: { x: 0.5, y: 0.16 },
  description: { x: 0.74, y: 0.28 },
  stage: { x: 0.72, y: 0.5 },
  mainObject: { x: 0.28, y: 0.46 },
  controls: { x: 0.72, y: 0.83 },
  status: { x: 0.5, y: 0.69 },
  logic: { x: 0.7, y: 0.9 },
};

const WORKSHOP_DRAFT_STORAGE_KEY = "magic-workshop-draft";
const LOCAL_WORKSHOP_DRAFT_STORAGE_KEY = "workshop-draft";
const SHARE_COVER_ASPECT_RATIO = 4 / 5;
const DEFAULT_SHARE_CROP: ShareCropSelection = {
  left: 0,
  top: 0,
  width: 1,
  height: 1,
};

function clampShareCropValue(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeShareCrop(crop: ShareCropSelection) {
  const width = clampShareCropValue(crop.width, 0.18, 1);
  const height = clampShareCropValue(crop.height, 0.18, 1);

  return {
    width,
    height,
    left: clampShareCropValue(crop.left, 0, Math.max(0, 1 - width)),
    top: clampShareCropValue(crop.top, 0, Math.max(0, 1 - height)),
  };
}

function createInitialShareCrop(imageWidth: number, imageHeight: number) {
  if (!imageWidth || !imageHeight) {
    return DEFAULT_SHARE_CROP;
  }

  const imageAspectRatio = imageWidth / imageHeight;
  const crop =
    imageAspectRatio > SHARE_COVER_ASPECT_RATIO
      ? {
          width: SHARE_COVER_ASPECT_RATIO / imageAspectRatio,
          height: 1,
          left: (1 - SHARE_COVER_ASPECT_RATIO / imageAspectRatio) / 2,
          top: 0,
        }
      : {
          width: 1,
          height: imageAspectRatio / SHARE_COVER_ASPECT_RATIO,
          left: 0,
          top: (1 - imageAspectRatio / SHARE_COVER_ASPECT_RATIO) / 2,
        };

  return normalizeShareCrop(crop);
}

function loadImageElement(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("封面图片读取失败，请重新准备预览。"));
    image.src = src;
  });
}

async function cropShareCoverImage(
  imageUrl: string,
  crop: ShareCropSelection,
) {
  const image = await loadImageElement(imageUrl);
  const normalizedCrop = normalizeShareCrop(crop);
  const outputWidth = 960;
  const outputHeight = 1200;
  const sourceX = normalizedCrop.left * image.naturalWidth;
  const sourceY = normalizedCrop.top * image.naturalHeight;
  const sourceWidth = normalizedCrop.width * image.naturalWidth;
  const sourceHeight = normalizedCrop.height * image.naturalHeight;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("封面裁剪失败，请稍后再试。");
  }

  canvas.width = outputWidth;
  canvas.height = outputHeight;
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    outputWidth,
    outputHeight,
  );

  return canvas.toDataURL("image/jpeg", 0.86);
}

function parseWorkshopDraftSnapshot(rawDraft: string | null) {
  if (!rawDraft) {
    return null;
  }

  const draft = JSON.parse(rawDraft) as Partial<WorkshopDraftSnapshot>;

  return {
    promptText: typeof draft.promptText === "string" ? draft.promptText : "",
    writingPrompt:
      typeof draft.writingPrompt === "string" ? draft.writingPrompt : "",
    writingResult:
      typeof draft.writingResult === "string" ? draft.writingResult : "",
    drawingPrompt:
      typeof draft.drawingPrompt === "string" ? draft.drawingPrompt : "",
    generatedCode:
      typeof draft.generatedCode === "string" && draft.generatedCode.trim()
        ? draft.generatedCode
        : defaultPreviewHtml,
    generatedImageUrl:
      typeof draft.generatedImageUrl === "string"
        ? draft.generatedImageUrl
        : "",
  } satisfies WorkshopDraftSnapshot;
}

function WritingSharePreview({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  return (
    <div className="mt-4 flex aspect-[4/5] max-h-[54vh] overflow-hidden rounded-[24px] border border-[#f3df99] bg-[linear-gradient(180deg,#fff7db_0%,#fffdf4_58%,#ffeaf0_100%)] p-3">
      <div className="relative flex min-h-0 w-full rounded-[20px] bg-gradient-to-br from-[#fffdf4] via-[#fff9eb] to-[#fff1cf] p-3 shadow-[0_16px_36px_rgba(245,158,11,0.10)]">
        <div className="relative flex min-h-0 w-full flex-col overflow-hidden rounded-[18px] border border-[#f9e7b2] bg-white px-5 py-5">
          <div className="absolute inset-y-0 left-5 w-px bg-[#f6b8c6]/80" />
          <div className="relative z-10 pl-3">
            <div className="inline-flex rounded-full bg-[#fff1c9] px-3 py-1 text-xs font-black text-amber-700">
              AI写作展示
            </div>
            <p className="mt-3 line-clamp-2 text-xl font-black leading-tight tracking-[-0.04em] text-slate-800">
              {title}
            </p>
          </div>
          <div className="relative z-10 mt-4 min-h-0 flex-1 overflow-y-auto pl-3 pr-1">
            <div className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
              {content}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function createWritingShareCoverImage(input: {
  title: string;
  prompt: string;
  result: string;
}) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("写作封面生成失败，请稍后再试。");
  }

  canvas.width = 960;
  canvas.height = 1200;

  const backgroundGradient = context.createLinearGradient(0, 0, 960, 1200);
  backgroundGradient.addColorStop(0, "#fff7dd");
  backgroundGradient.addColorStop(0.52, "#fffdf4");
  backgroundGradient.addColorStop(1, "#ffe9ef");
  context.fillStyle = backgroundGradient;
  context.fillRect(0, 0, 960, 1200);

  context.fillStyle = "#ffffff";
  context.strokeStyle = "#f4cf7a";
  context.lineWidth = 3;
  context.beginPath();
  context.roundRect(88, 96, 784, 1008, 42);
  context.fill();
  context.stroke();

  context.fillStyle = "#fff3c8";
  context.beginPath();
  context.roundRect(132, 144, 180, 54, 27);
  context.fill();
  context.fillStyle = "#bf7a16";
  context.font = "700 26px 'Microsoft YaHei', sans-serif";
  context.fillText("AI写作作品", 162, 180);

  context.fillStyle = "#24304f";
  context.font = "900 46px 'Microsoft YaHei', sans-serif";
  const titleLines = wrapCanvasText(
    context,
    input.title || "我的写作作品",
    680,
    2,
    { shouldEllipsize: true },
  );
  titleLines.forEach((line, index) => {
    context.fillText(line, 132, 268 + index * 58);
  });

  context.fillStyle = "#8a6a25";
  context.font = "700 22px 'Microsoft YaHei', sans-serif";
  const promptLines = wrapCanvasText(context, input.prompt, 696, 3, {
    shouldEllipsize: true,
  });
  promptLines.forEach((line, index) => {
    context.fillText(line, 132, 422 + index * 36);
  });

  context.strokeStyle = "#f4cf7a";
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(132, 560);
  context.lineTo(828, 560);
  context.stroke();

  context.fillStyle = "#3b465f";
  context.font = "400 25px 'Microsoft YaHei', sans-serif";
  const resultLines = wrapCanvasText(context, input.result, 696, 9, {
    shouldEllipsize: true,
  });
  resultLines.forEach((line, index) => {
    context.fillText(line, 132, 630 + index * 42);
  });

  context.fillStyle = "#f9d982";
  context.beginPath();
  context.roundRect(132, 1012, 696, 12, 6);
  context.fill();

  return canvas.toDataURL("image/jpeg", 0.88);
}

function readSavedWorkshopDraft() {
  if (typeof window === "undefined") {
    return null;
  }

  return (
    parseWorkshopDraftSnapshot(
      window.sessionStorage.getItem(WORKSHOP_DRAFT_STORAGE_KEY),
    ) ??
    parseWorkshopDraftSnapshot(
      window.localStorage.getItem(LOCAL_WORKSHOP_DRAFT_STORAGE_KEY),
    )
  );
}

function isUpstreamCredentialError(message: string | undefined) {
  if (!message) {
    return false;
  }

  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes("invalid api key") ||
    normalizedMessage.includes("please provide valid api key") ||
    normalizedMessage.includes("api key") ||
    normalizedMessage.includes("密钥") ||
    normalizedMessage.includes("key 无效")
  );
}

async function parseApiResponse<T extends Record<string, unknown>>(
  response: Response,
) {
  const rawText = await response.text();
  let data: T | null = null;

  try {
    data = JSON.parse(rawText) as T;
  } catch {
    data = null;
  }

  return {
    data,
    rawText,
  };
}

function toReadableApiError(
  response: Response,
  fallbackMessage: string,
  payloadError?: string,
  rawText?: string,
) {
  if (payloadError?.trim()) {
    return payloadError.trim();
  }

  const normalizedRawText = rawText?.trim() ?? "";

  if (!normalizedRawText) {
    return `${fallbackMessage}（HTTP ${response.status}）`;
  }

  if (
    normalizedRawText.startsWith("<!DOCTYPE html") ||
    normalizedRawText.startsWith("<html") ||
    normalizedRawText.startsWith("<!doctype html")
  ) {
    if (response.status === 502 || response.status === 504) {
      return `服务器网关超时或上游连接失败（HTTP ${response.status}）。如果本地正常、服务器异常，通常是 Nginx / CDN 超时，或者服务器访问模型接口不通。`;
    }

    return `服务器返回了网页错误页（HTTP ${response.status}），不是接口 JSON。请检查服务器反向代理和线上日志。`;
  }

  return normalizedRawText.length > 240
    ? `${normalizedRawText.slice(0, 240)}...`
    : normalizedRawText;
}

function clampMarkerValue(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function resolveCodeGuideMarkerCollisions(
  layouts: Record<number, CodeGuideMarkerLayout>,
  viewportWidth: number,
  viewportHeight: number,
) {
  const entries = Object.entries(layouts)
    .map(([markerId, layout]) => ({
      markerId: Number(markerId),
      layout: { ...layout },
    }))
    .sort((leftEntry, rightEntry) => leftEntry.layout.top - rightEntry.layout.top);

  const verticalGap = 52;
  const horizontalGap = 124;

  for (let index = 0; index < entries.length; index += 1) {
    const currentEntry = entries[index];

    for (let previousIndex = 0; previousIndex < index; previousIndex += 1) {
      const previousEntry = entries[previousIndex];
      const topDistance = Math.abs(
        currentEntry.layout.top - previousEntry.layout.top,
      );
      const leftDistance = Math.abs(
        currentEntry.layout.left - previousEntry.layout.left,
      );

      if (topDistance < verticalGap && leftDistance < horizontalGap) {
        currentEntry.layout.top = clampMarkerValue(
          previousEntry.layout.top + verticalGap,
          34,
          viewportHeight - 34,
        );

        if (leftDistance < 64) {
          const horizontalDirection =
            currentEntry.layout.left >= previousEntry.layout.left ? 1 : -1;
          currentEntry.layout.left = clampMarkerValue(
            currentEntry.layout.left + horizontalDirection * 58,
            34,
            viewportWidth - 34,
          );
        }
      }
    }
  }

  return entries.reduce<Record<number, CodeGuideMarkerLayout>>(
    (nextLayouts, entry) => {
      const nearEdge =
        entry.layout.left < 110 || entry.layout.left > viewportWidth - 110;
      const crowded =
        entries.filter((candidate) => {
          if (candidate.markerId === entry.markerId) {
            return false;
          }

          return (
            Math.abs(candidate.layout.top - entry.layout.top) < verticalGap &&
            Math.abs(candidate.layout.left - entry.layout.left) < horizontalGap
          );
        }).length > 0;

      nextLayouts[entry.markerId] = {
        ...entry.layout,
        compact: nearEdge || crowded,
      };

      return nextLayouts;
    },
    {},
  );
}

function queryCodeGuideTargetElement(
  doc: Document,
  target: CodeGuideRow["previewTarget"],
) {
  for (const selector of codeGuideTargetSelectors[target]) {
    const matchedElement = doc.querySelector(selector);

    if (matchedElement) {
      return matchedElement;
    }
  }

  return target === "background" ? doc.body : null;
}

function explainCodeLine(line: string) {
  const trimmedLine = line.trim();
  const lowerLine = trimmedLine.toLowerCase();

  if (!trimmedLine) {
    return null;
  }

  if (lowerLine.startsWith("<!doctype html")) {
    return {
      meaning:
        "这一行像是在告诉浏览器：'请把我当成一个完整的网页作品来打开。'",
      area: "整个小程序的起点",
      previewTarget: "background" as const,
    };
  }

  if (lowerLine.startsWith("<html")) {
    return {
      meaning: "这一行是在搭出整张网页的大外壳，后面的内容都会放在里面。",
      area: "整个页面",
      previewTarget: "background" as const,
    };
  }

  if (lowerLine.startsWith("<head")) {
    return {
      meaning:
        "这一行打开了一个看不见的准备区，专门放样式、标题和规则，这些不会直接出现在画面上。",
      area: "页面背后的准备区",
      previewTarget: "logic" as const,
    };
  }

  if (lowerLine.includes("meta charset")) {
    return {
      meaning: "这一行是在提醒网页要正确显示中文，不要把字变成奇怪符号。",
      area: "页面里的文字显示",
      previewTarget: "description" as const,
    };
  }

  if (lowerLine.includes("meta name=\"viewport\"")) {
    return {
      meaning:
        "这一行是在告诉网页：'请乖乖适应手机屏幕大小。' 所以作品在手机里看起来会更合适。",
      area: "手机预览界面",
      previewTarget: "background" as const,
    };
  }

  if (lowerLine.startsWith("<title")) {
    return {
      meaning: "这一行是在给这个作品起名字，浏览器顶部的小标题会用到它。",
      area: "浏览器标题位置",
      previewTarget: "title" as const,
    };
  }

  if (lowerLine.includes("tailwind")) {
    return {
      meaning:
        "这一行像是请来一个'样式工具箱'帮忙，让按钮、颜色和排版更快变漂亮。",
      area: "整个页面的样式",
      previewTarget: "background" as const,
    };
  }

  if (lowerLine.startsWith("<style")) {
    return {
      meaning:
        "这一行开始写'打扮规则'了，接下来会告诉网页颜色、大小、圆角和动画该怎么表现。",
      area: "整个页面的外观",
      previewTarget: "background" as const,
    };
  }

  if (lowerLine.includes("@keyframes")) {
    return {
      meaning:
        "这一行是在设计动画动作，像是在安排谁要晃一晃、跳一跳或者慢慢消失。",
      area: "会动的界面效果",
      previewTarget: "logic" as const,
    };
  }

  if (lowerLine.startsWith("body")) {
    return {
      meaning:
        "这一行是在安排整个画面的底色和基本风格，就像给舞台先铺上一层背景。",
      area: "整张画面背景",
      previewTarget: "background" as const,
    };
  }

  if (lowerLine.includes("class=\"game-area\"") || lowerLine.includes("id=\"gamearea\"")) {
    return {
      meaning: "这一行是在搭建小车活动的大操场，所以你看到的小车会在这块区域里跑来跑去。",
      area: "中间的游戏区域",
      previewTarget: "stage" as const,
    };
  }

  if (lowerLine.includes("class=\"car\"") || lowerLine.includes("id=\"car\"")) {
    return {
      meaning: "这一行是在把小车本人放到画面上，所以它对应的就是预览里的那辆小车。",
      area: "小车图案本体",
      previewTarget: "mainObject" as const,
    };
  }

  if (lowerLine.includes("<h1")) {
    return {
      meaning: "这一行通常是在放大标题，所以它对应的是画面上最显眼的大字。",
      area: "页面顶部的大标题",
      previewTarget: "title" as const,
    };
  }

  if (lowerLine.includes("<p")) {
    return {
      meaning:
        "这一行通常是在补充说明，它会把玩法提示、介绍话语或者小提醒写到画面里。",
      area: "标题下方或卡片里的说明文字",
      previewTarget: "description" as const,
    };
  }

  if (lowerLine.includes("<button")) {
    if (lowerLine.includes("moveCar('up')")) {
      return {
        meaning: "这一行是在做'向上'按钮，按下去时，小车会往上移动。",
        area: "控制区里的上方向按钮",
        previewTarget: "controls" as const,
      };
    }

    if (lowerLine.includes("movecar('down')")) {
      return {
        meaning: "这一行是在做'向下'按钮，按下去时，小车会往下移动。",
        area: "控制区里的下方向按钮",
        previewTarget: "controls" as const,
      };
    }

    if (lowerLine.includes("movecar('left')")) {
      return {
        meaning: "这一行是在做'向左'按钮，按下去时，小车会往左移动。",
        area: "控制区里的左方向按钮",
        previewTarget: "controls" as const,
      };
    }

    if (lowerLine.includes("movecar('right')")) {
      return {
        meaning: "这一行是在做'向右'按钮，按下去时，小车会往右移动。",
        area: "控制区里的右方向按钮",
        previewTarget: "controls" as const,
      };
    }

    if (lowerLine.includes("stopcar()")) {
      return {
        meaning: "这一行是在做'停止'按钮，按下去后，小车会先停下来休息一下。",
        area: "控制区里的停止按钮",
        previewTarget: "controls" as const,
      };
    }

    if (lowerLine.includes("changespeed(")) {
      return {
        meaning: "这一行是在做调速度的按钮，让小车可以跑得慢一点或快一点。",
        area: "控制区里的速度按钮",
        previewTarget: "controls" as const,
      };
    }

    return {
      meaning: "这一行是在做一个可点击的按钮，让小朋友可以跟页面互动。",
      area: "页面里的操作按钮",
      previewTarget: "controls" as const,
    };
  }

  if (lowerLine.includes("iddisplay") || lowerLine.includes("speeddisplay")) {
    return {
      meaning: "这一行是在预留一个会变化的小位置，好让速度数字可以及时更新。",
      area: "速度显示区域",
      previewTarget: "status" as const,
    };
  }

  if (lowerLine.startsWith("<script")) {
    return {
      meaning:
        "这一行开始写'动作脑袋'了。上面是画面，下面这些代码是在告诉页面该怎么动、怎么回应按钮。",
      area: "页面背后的控制逻辑",
      previewTarget: "logic" as const,
    };
  }

  if (lowerLine.includes("const car")) {
    return {
      meaning: "这一行是在先记住'小车是谁'，这样后面的代码才能找到它并移动它。",
      area: "小车本体",
      previewTarget: "mainObject" as const,
    };
  }

  if (lowerLine.includes("const gamearea")) {
    return {
      meaning: "这一行是在先记住游戏场地，这样代码才知道小车能在哪里活动。",
      area: "游戏活动区域",
      previewTarget: "stage" as const,
    };
  }

  if (lowerLine.includes("currentSpeed".toLowerCase())) {
    return {
      meaning: "这一行在保存现在的速度数值，所以小车会知道自己该跑多快。",
      area: "速度控制功能",
      previewTarget: "status" as const,
    };
  }

  if (lowerLine.includes("addEventListener".toLowerCase()) && lowerLine.includes("keydown")) {
    return {
      meaning:
        "这一行是在认真听键盘按键，所以除了点按钮，小朋友也能用方向键控制作品。",
      area: "键盘控制功能",
      previewTarget: "logic" as const,
    };
  }

  if (lowerLine.includes("touchstart") || lowerLine.includes("touchmove") || lowerLine.includes("touchend")) {
    return {
      meaning:
        "这一行是在照顾手机触摸操作，让手指滑动的时候，小车也能跟着做动作。",
      area: "手机触摸控制",
      previewTarget: "logic" as const,
    };
  }

  if (lowerLine.includes("function updatecarposition")) {
    return {
      meaning: "这个小功能专门负责把新的位置真正画到屏幕上，让小车出现在正确地方。",
      area: "小车在画面里的位置",
      previewTarget: "mainObject" as const,
    };
  }

  if (lowerLine.includes("function movecar")) {
    return {
      meaning: "这个小功能是小车的行动指挥员，会决定小车要往哪一个方向跑。",
      area: "小车移动功能",
      previewTarget: "logic" as const,
    };
  }

  if (lowerLine.includes("function stopcar")) {
    return {
      meaning: "这个小功能是停车员，会让已经在动的小车停下来。",
      area: "停止控制功能",
      previewTarget: "logic" as const,
    };
  }

  if (lowerLine.includes("function changespeed")) {
    return {
      meaning: "这个小功能是调速器，会让小车跑快一点或者慢一点。",
      area: "速度按钮和速度数字",
      previewTarget: "status" as const,
    };
  }

  if (lowerLine.includes("function createstar")) {
    return {
      meaning: "这个小功能会在小车移动时撒出小星星，让画面更有魔法感。",
      area: "小车旁边的闪光特效",
      previewTarget: "mainObject" as const,
    };
  }

  if (lowerLine.includes("setinterval")) {
    return {
      meaning: "这一行是在安排'每隔一下就重复做一次'，所以小车才会持续移动，而不是只跳一下。",
      area: "连续移动效果",
      previewTarget: "logic" as const,
    };
  }

  if (lowerLine.includes("clearinterval")) {
    return {
      meaning: "这一行是在关掉重复动作，常常会用在停车或换方向的时候。",
      area: "停止移动时的控制",
      previewTarget: "logic" as const,
    };
  }

  if (lowerLine.includes("appendchild")) {
    return {
      meaning: "这一行是在把新东西放进画面里，比如把星星特效加到游戏区。",
      area: "会新增内容的画面位置",
      previewTarget: "stage" as const,
    };
  }

  if (lowerLine.includes("removechild")) {
    return {
      meaning: "这一行是在把已经用完的小东西拿走，避免画面越堆越乱。",
      area: "特效清理功能",
      previewTarget: "logic" as const,
    };
  }

  if (lowerLine.includes("settimeout")) {
    return {
      meaning: "这一行是在说：'先等一下，再做下一步。' 常用来让特效过一会儿消失。",
      area: "延时动作效果",
      previewTarget: "logic" as const,
    };
  }

  if (lowerLine.startsWith("</")) {
    return {
      meaning: "这一行是在把前面打开的那一块内容收好，告诉网页这一部分写完了。",
      area: "对应上一段界面内容",
      previewTarget: "logic" as const,
    };
  }

  if (trimmedLine.includes("<div")) {
    return {
      meaning: "这一行通常是在搭一个小盒子，好把标题、按钮或图片整齐放在一起。",
      area: "页面里的某个内容盒子",
      previewTarget: "stage" as const,
    };
  }

  return {
    meaning:
      "这一行是在帮小程序补充细节规则。它可能在安排样子、位置，或者告诉页面下一步该怎么做。",
    area: "页面里的细节功能",
    previewTarget: "logic" as const,
  };
}

function buildCodeGuideRows(code: string): CodeGuideRow[] {
  const rows = code
    .split("\n")
    .map((line, index) => ({
      lineNumber: index + 1,
      code: line,
      explanation: explainCodeLine(line),
    }))
    .filter(
      (
        row,
      ): row is {
        lineNumber: number;
        code: string;
        explanation: {
          meaning: string;
          area: string;
          previewTarget: CodeGuideRow["previewTarget"];
        };
      } => Boolean(row.code.trim()) && Boolean(row.explanation),
    )
    .map((row) => ({
      lineNumber: row.lineNumber,
      code: row.code,
      meaning: row.explanation.meaning,
      area: row.explanation.area,
      previewTarget: row.explanation.previewTarget,
    }));

  const seenTargets = new Set<CodeGuideRow["previewTarget"]>();

  return rows
    .filter((row) => {
      if (seenTargets.has(row.previewTarget)) {
        return false;
      }

      seenTargets.add(row.previewTarget);
      return true;
    })
    .slice(0, 7)
    .map((row, index) => ({
      markerId: index + 1,
      ...row,
    }));
}

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
  const codeGuidePreviewIframeRef = useRef<HTMLIFrameElement | null>(null);
  const writingPreviewRef = useRef<HTMLDivElement | null>(null);
  const paintingPreviewRef = useRef<HTMLDivElement | null>(null);
  const shareCropFrameRef = useRef<HTMLDivElement | null>(null);
  const shareCropDragRef = useRef<ShareCropDragState | null>(null);
  const hasRestoredDraftRef = useRef(false);
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
  const [isSharing, setIsSharing] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const [isShareConfirmOpen, setIsShareConfirmOpen] = useState(false);
  const [sharePreviewImageUrl, setSharePreviewImageUrl] = useState("");
  const [shareSourceImageUrl, setShareSourceImageUrl] = useState("");
  const [shareTitle, setShareTitle] = useState("");
  const [shareDescription, setShareDescription] = useState("");
  const [shareTitleError, setShareTitleError] = useState("");
  const [shareCrop, setShareCrop] =
    useState<ShareCropSelection>(DEFAULT_SHARE_CROP);
  const [isShareCropDragging, setIsShareCropDragging] = useState(false);
  const [activeHeaderPanel, setActiveHeaderPanel] = useState<
    "help" | "notifications" | "credits" | null
  >(null);
  const [shareFeedback, setShareFeedback] = useState<ShareFeedbackState | null>(
    null,
  );
  const [headerNotifications, setHeaderNotifications] = useState<
    WorkshopNotification[]
  >([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [magicCredits, setMagicCredits] = useState<number | null>(null);
  const [creditLogs, setCreditLogs] = useState<WorkshopCreditLog[]>([]);
  const [brand, setBrand] = useState<WorkshopBrand>({
    siteName: "小红车魔法工坊",
    tagline: "激发创造力，探索 AI 的无限可能",
    logoUrl: "/logo.png",
  });
  const [loginPromptMessage, setLoginPromptMessage] = useState("");
  const [isCodeGuideOpen, setIsCodeGuideOpen] = useState(false);
  const [activeCodeGuideMarkerId, setActiveCodeGuideMarkerId] = useState<
    number | null
  >(null);
  const [codeGuideMarkerLayouts, setCodeGuideMarkerLayouts] = useState<
    Record<number, CodeGuideMarkerLayout>
  >({});

  const modeParam = searchParams.get("mode");
  const activeMode = modeTabs.some((tab) => tab.id === modeParam)
    ? (modeParam as ModeId)
    : "coding";
  const activeTab = modeTabs.find((tab) => tab.id === activeMode) ?? modeTabs[0];
  const activeVisual = modeVisuals[activeMode];
  const isCodingMode = activeMode === "coding";
  const isWritingMode = activeMode === "writing";
  const isPaintingMode = activeMode === "painting";
  const activeShareMode: ShareableMode | null =
    isCodingMode || isWritingMode || isPaintingMode
      ? (activeMode as ShareableMode)
      : null;
  const hasGeneratedCode =
    Boolean(generatedCode.trim()) && generatedCode !== defaultPreviewHtml;
  const codingPreviewDoc = hasGeneratedCode ? generatedCode : defaultPreviewHtml;
  const codeGuideRows = useMemo(
    () => buildCodeGuideRows(codingPreviewDoc),
    [codingPreviewDoc],
  );
  const selectedCodeGuideMarkerId = useMemo(() => {
    if (!isCodeGuideOpen) {
      return null;
    }

    if (
      activeCodeGuideMarkerId !== null &&
      codeGuideRows.some((row) => row.markerId === activeCodeGuideMarkerId)
    ) {
      return activeCodeGuideMarkerId;
    }

    return codeGuideRows[0]?.markerId ?? null;
  }, [activeCodeGuideMarkerId, codeGuideRows, isCodeGuideOpen]);

  const persistWorkshopDraft = () => {
    if (typeof window === "undefined") {
      return;
    }

    const payload: WorkshopDraftSnapshot = {
      promptText,
      writingPrompt,
      writingResult,
      drawingPrompt,
      generatedCode,
      generatedImageUrl,
    };

    window.sessionStorage.setItem(
      WORKSHOP_DRAFT_STORAGE_KEY,
      JSON.stringify(payload),
    );
  };

  const showLoginPrompt = (message: string) => {
    persistWorkshopDraft();
    setLoginPromptMessage(message);
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      try {
        const savedDraft = readSavedWorkshopDraft();

        if (savedDraft) {
          setPromptText(savedDraft.promptText);
          setWritingPrompt(savedDraft.writingPrompt);
          setWritingResult(savedDraft.writingResult);
          setDrawingPrompt(savedDraft.drawingPrompt);
          setGeneratedCode(savedDraft.generatedCode);
          setGeneratedImageUrl(savedDraft.generatedImageUrl);
        }
      } catch {
        window.sessionStorage.removeItem(WORKSHOP_DRAFT_STORAGE_KEY);
        window.localStorage.removeItem(LOCAL_WORKSHOP_DRAFT_STORAGE_KEY);
        window.console.error("创作草稿恢复失败");
      } finally {
        hasRestoredDraftRef.current = true;
      }
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (!isShareCropDragging) {
      return;
    }

    const handlePointerMove = (event: globalThis.PointerEvent) => {
      const dragState = shareCropDragRef.current;
      const frameRect = shareCropFrameRef.current?.getBoundingClientRect();

      if (!dragState || !frameRect?.width || !frameRect.height) {
        return;
      }

      const deltaX = (event.clientX - dragState.startX) / frameRect.width;
      const deltaY = (event.clientY - dragState.startY) / frameRect.height;

      setShareCrop(
        normalizeShareCrop({
          ...dragState.startCrop,
          left: dragState.startCrop.left + deltaX,
          top: dragState.startCrop.top + deltaY,
        }),
      );
    };

    const handlePointerUp = () => {
      shareCropDragRef.current = null;
      setIsShareCropDragging(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isShareCropDragging]);

  useEffect(() => {
    if (!isCodeGuideOpen) {
      return;
    }

    const iframe = codeGuidePreviewIframeRef.current;

    if (!iframe) {
      return;
    }

    let animationFrameId = 0;
    let detachListeners: (() => void) | null = null;

    const updateCodeGuideMarkers = () => {
      const nextFrameWindow = iframe.contentWindow;
      const nextFrameDocument = iframe.contentDocument;

      if (!nextFrameWindow || !nextFrameDocument) {
        return;
      }

      const scrollingElement =
        nextFrameDocument.scrollingElement ?? nextFrameDocument.documentElement;
      const viewportHeight = iframe.clientHeight || scrollingElement.clientHeight;
      const viewportWidth = iframe.clientWidth || scrollingElement.clientWidth;

      const nextLayouts = codeGuideRows.reduce<Record<number, CodeGuideMarkerLayout>>(
        (layouts, row) => {
          const matchedElement = queryCodeGuideTargetElement(
            nextFrameDocument,
            row.previewTarget,
          );

          if (!matchedElement) {
            const fallbackAnchor = codeGuideFallbackAnchors[row.previewTarget];
            const fallbackTop = fallbackAnchor.y * viewportHeight;
            const fallbackLeft = fallbackAnchor.x * viewportWidth;

            layouts[row.markerId] = {
              top: clampMarkerValue(fallbackTop, 34, viewportHeight - 34),
              left: clampMarkerValue(fallbackLeft, 34, viewportWidth - 34),
              visible: true,
              align:
                fallbackAnchor.x > 0.68
                  ? "end"
                  : fallbackAnchor.x < 0.32
                    ? "start"
                    : "center",
              compact: false,
            };

            return layouts;
          }

          const rect = matchedElement.getBoundingClientRect();
          const topInViewport = rect.top + rect.height / 2;
          const leftInViewport = rect.left + rect.width / 2;
          const isVisible =
            rect.bottom >= 0 &&
            rect.top <= viewportHeight &&
            rect.right >= 0 &&
            rect.left <= viewportWidth;

          layouts[row.markerId] = {
            top: clampMarkerValue(topInViewport, 34, viewportHeight - 34),
            left: clampMarkerValue(leftInViewport, 34, viewportWidth - 34),
            visible: isVisible,
            align:
              leftInViewport > viewportWidth * 0.68
                ? "end"
                : leftInViewport < viewportWidth * 0.32
                  ? "start"
                  : "center",
            compact: false,
          };

          return layouts;
        },
        {},
      );

      setCodeGuideMarkerLayouts(
        resolveCodeGuideMarkerCollisions(
          nextLayouts,
          viewportWidth,
          viewportHeight,
        ),
      );
    };

    const requestMarkerUpdate = () => {
      window.cancelAnimationFrame(animationFrameId);
      animationFrameId = window.requestAnimationFrame(updateCodeGuideMarkers);
    };

    const bindFrameListeners = () => {
      const frameWindow = iframe.contentWindow;
      const frameDocument = iframe.contentDocument;

      if (!frameWindow || !frameDocument) {
        return;
      }

      const scrollingElement =
        frameDocument.scrollingElement ?? frameDocument.documentElement;

      const handleScroll = () => {
        requestMarkerUpdate();
      };

      const handleResize = () => {
        requestMarkerUpdate();
      };

      frameWindow.addEventListener("scroll", handleScroll, { passive: true });
      scrollingElement.addEventListener("scroll", handleScroll, {
        passive: true,
      });
      window.addEventListener("resize", handleResize);

      detachListeners = () => {
        frameWindow.removeEventListener("scroll", handleScroll);
        scrollingElement.removeEventListener("scroll", handleScroll);
        window.removeEventListener("resize", handleResize);
      };

      requestMarkerUpdate();
    };

    const handleLoad = () => {
      detachListeners?.();
      bindFrameListeners();
    };

    iframe.addEventListener("load", handleLoad);
    bindFrameListeners();

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      iframe.removeEventListener("load", handleLoad);
      detachListeners?.();
    };
  }, [codeGuideRows, codingPreviewDoc, isCodeGuideOpen]);

  useEffect(() => {
    if (!hasRestoredDraftRef.current) {
      return;
    }

    try {
      window.localStorage.setItem(
        LOCAL_WORKSHOP_DRAFT_STORAGE_KEY,
        JSON.stringify({
          promptText,
          writingPrompt,
          writingResult,
          drawingPrompt,
          generatedCode,
          generatedImageUrl,
        }),
      );
    } catch {
      window.console.error("草稿保存失败");
    }
  }, [
    promptText,
    writingPrompt,
    writingResult,
    drawingPrompt,
    generatedCode,
    generatedImageUrl,
  ]);

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

  useEffect(() => {
    let isMounted = true;

    const loadBrand = async () => {
      try {
        const response = await fetch("/api/site/brand", {
          cache: "no-store",
        });
        const data = (await response.json()) as {
          brand?: WorkshopBrand;
        };

        if (!response.ok || !data.brand || !isMounted) {
          return;
        }

        setBrand(data.brand);
      } catch {
        if (isMounted) {
          window.console.error("品牌信息加载失败");
        }
      }
    };

    const loadCreditSummary = async () => {
      try {
        const response = await fetch("/api/credits/summary", {
          cache: "no-store",
        });

        if (response.status === 401) {
          if (isMounted) {
            showLoginPrompt(
              "登录状态刚刚断开了，当前创作内容已经帮你留住。确认后重新登录，就可以继续回来创作。",
            );
          }
          return;
        }

        const data = (await response.json()) as {
          credits?: { credits: number };
          creditLogs?: WorkshopCreditLog[];
        };

        if (!response.ok || !isMounted) {
          return;
        }

        setMagicCredits(
          typeof data.credits?.credits === "number" ? data.credits.credits : null,
        );
        setCreditLogs(data.creditLogs ?? []);
      } catch {
        if (isMounted) {
          window.console.error("魔法币信息加载失败");
        }
      }
    };

    const loadNotifications = async () => {
      try {
        const response = await fetch("/api/notifications", {
          cache: "no-store",
        });
        const data = (await response.json()) as {
          notifications?: WorkshopNotification[];
          unreadCount?: number;
        };

        if (!response.ok || !data.notifications || !isMounted) {
          return;
        }

        setHeaderNotifications(data.notifications);
        setUnreadNotificationsCount(data.unreadCount ?? 0);
      } catch {
        if (isMounted) {
          window.console.error("通知加载失败");
        }
      }
    };

    void loadBrand();
    void loadNotifications();
    void loadCreditSummary();

    const creditIntervalId = window.setInterval(() => {
      void loadCreditSummary();
    }, 15000);

    const notificationIntervalId = window.setInterval(() => {
      void loadNotifications();
    }, 12000);

    return () => {
      isMounted = false;
      window.clearInterval(creditIntervalId);
      window.clearInterval(notificationIntervalId);
    };
  }, []);

  const handleCodingPresetClick = (scene: string) => {
    setPromptText(codingPresetPrompts[scene]);
  };

  const handleWritingCapsuleClick = (prompt: string) => {
    setWritingPrompt(prompt);
  };

  const handleModeChange = (mode: ModeId) => {
    setShareMessage("");
    setShareFeedback(null);
    setIsShareConfirmOpen(false);
    router.replace(`${pathname}?mode=${mode}`, { scroll: false });
  };

  const handleHeaderAction = (panel: "help" | "notifications" | "credits") => {
    if (panel === "notifications" && activeHeaderPanel !== "notifications") {
      void fetch("/api/notifications", {
        method: "PATCH",
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("通知已读状态更新失败");
          }

          setUnreadNotificationsCount(0);
          setHeaderNotifications((current) =>
            current.map((item) => ({
              ...item,
              is_read: true,
              read_at: item.read_at ?? new Date().toISOString(),
            })),
          );
        })
        .catch(() => {
          window.console.error("通知已读状态更新失败");
        });
    }

    setActiveHeaderPanel((currentPanel) =>
      currentPanel === panel ? null : panel,
    );
  };

  const redirectToLogin = () => {
    persistWorkshopDraft();
    const currentMode = searchParams.get("mode");
    const redirectPath = currentMode
      ? `${pathname}?mode=${currentMode}`
      : pathname;

    router.push(`/login?redirect=${encodeURIComponent(redirectPath)}`);
  };

  const getSharePrompt = (mode: ShareableMode | null = activeShareMode) => {
    if (mode === "writing") {
      return writingPrompt;
    }

    if (mode === "painting") {
      return drawingPrompt;
    }

    return promptText;
  };

  const getDefaultShareTitle = (mode: ShareableMode | null = activeShareMode) => {
    const condensedPrompt = getSharePrompt(mode).replace(/\s+/g, " ").trim();
    const fallbackTitle =
      mode === "writing"
        ? "我的写作作品"
        : mode === "painting"
          ? "我的绘画作品"
          : "我的编程作品";

    if (!condensedPrompt) {
      return fallbackTitle;
    }

    return condensedPrompt.length > 18
      ? `${condensedPrompt.slice(0, 18)}...`
      : condensedPrompt;
  };

  const buildShareTitle = () => shareTitle.trim() || getDefaultShareTitle();
  const buildShareDescription = () => shareDescription.trim();

  const buildSharePreviewCode = () => {
    if (activeShareMode === "writing") {
      return writingResult.trim();
    }

    if (activeShareMode === "painting") {
      return [
        "AI绘画作品",
        `绘画描述：${drawingPrompt.trim()}`,
        generatedImageUrl ? `图片地址：${generatedImageUrl}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    }

    return generatedCode;
  };

  const capturePreviewImage = async (mode: ShareableMode) => {
    if (mode === "writing") {
      return WRITING_SHARE_PLACEHOLDER_IMAGE_URL;
    }

    if (mode === "painting") {
      if (generatedImageUrl) {
        return generatedImageUrl;
      }

      throw new Error("绘画预览还没有准备好，请先完成作画。");
    }

    const iframe = previewIframeRef.current;

    if (iframe?.contentDocument?.documentElement) {
      const frameRoot = iframe.contentDocument.documentElement;
      const canvas = await html2canvas(frameRoot, {
        backgroundColor: "#ffffff",
        useCORS: true,
        scale: 0.72,
      });

      return canvas.toDataURL("image/jpeg", 0.82);
    }

    if (previewShellRef.current) {
      const canvas = await html2canvas(previewShellRef.current, {
        backgroundColor: null,
        useCORS: true,
        scale: 0.72,
      });

      return canvas.toDataURL("image/jpeg", 0.82);
    }

    throw new Error("预览截图失败，请重新生成后再试。");
  };

  const validateShareReady = (mode: ShareableMode | null) => {
    if (!mode) {
      return "当前模式还不能分享到社区。";
    }

    if (!getSharePrompt(mode).trim()) {
      return "先写下创作想法，再把作品分享出去。";
    }

    if (mode === "coding" && (!hasGeneratedCode || isLoading)) {
      return "先完成一次生成，才能把作品分享到社区。";
    }

    if (mode === "writing" && (!writingResult.trim() || isWritingLoading)) {
      return "先完成一篇文章，才能把作品分享到社区。";
    }

    if (mode === "painting" && (!generatedImageUrl.trim() || isDrawing)) {
      return "先完成一张画，才能把作品分享到社区。";
    }

    return "";
  };

  const handleShareCropPointerDown = (
    event: PointerEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();
    shareCropDragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startCrop: shareCrop,
    };
    setIsShareCropDragging(true);
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append("file", audioBlob, "audio.webm");

    const response = await fetch("/api/transcribe", {
      method: "POST",
      body: formData,
    });

    const data = (await response.json()) as { text?: string; error?: string };
      if (response.status === 401) {
      showLoginPrompt(
        "登录状态需要重新确认，语音施法这次没有完成。你刚刚写的内容已经保留。",
      );
      throw new Error("登录状态需要重新确认后，才能继续使用语音施法。");
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
    setShareFeedback(null);
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

      const { data, rawText } = await parseApiResponse<{
        code?: string;
        error?: string;
        remainingCredits?: number;
      }>(response);
      if (response.status === 401) {
        if (isUpstreamCredentialError(data?.error)) {
          setGeneratedCode(
            createMessagePreviewHtml(
              "模型密钥需要检查",
              data?.error ?? "模型密钥无效，请检查后台 AI 配置里的 key。",
            ),
          );
          return;
        }

        setGeneratedCode(
          createMessagePreviewHtml(
            "需要重新确认登录",
            "刚刚检测到登录状态异常。你的创作想法已经保留，重新登录后可以继续生成。",
          ),
        );
        showLoginPrompt(
          "刚刚检测到登录状态异常。你的创作想法已经保留，重新登录后可以继续生成。",
        );
        return;
      }

      if (typeof data?.remainingCredits === "number") {
        setMagicCredits(data.remainingCredits);
      }

      if (!response.ok || !data?.code) {
        setGeneratedCode(
          createMessagePreviewHtml(
            "生成未完成",
            toReadableApiError(
              response,
              "这次创作没有成功，我们再试一次。",
              data?.error,
              rawText,
            ),
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

  const openShareConfirm = async () => {
    const mode = activeShareMode;
    const shareReadyError = validateShareReady(mode);

    if (shareReadyError || !mode) {
      window.alert(shareReadyError);
      return;
    }

    setIsSharing(true);
    setShareMessage("");
    setShareFeedback(null);
    setShareTitleError("");

    try {
      const previewImageUrl = await capturePreviewImage(mode);
      setShareSourceImageUrl(previewImageUrl);
      setSharePreviewImageUrl(previewImageUrl);
      setShareTitle(getDefaultShareTitle(mode));
      setShareDescription("");
      setShareCrop(DEFAULT_SHARE_CROP);
      setIsShareConfirmOpen(true);
    } catch (error) {
      setShareMessage(
        error instanceof Error ? error.message : "预览截图失败，请稍后再试。",
      );
    } finally {
      setIsSharing(false);
    }
  };

  const handleShareToCommunity = async () => {
    const mode = activeShareMode;
    const shareReadyError = validateShareReady(mode);

    if (shareReadyError || !mode) {
      setIsShareConfirmOpen(false);
      window.alert(shareReadyError);
      return;
    }

    const normalizedTitle = buildShareTitle().trim();

    if (!normalizedTitle) {
      setShareTitleError("请给这次分享起一个标题。");
      return;
    }

    if (!sharePreviewImageUrl && !shareSourceImageUrl) {
      setIsShareConfirmOpen(false);
      await openShareConfirm();
      return;
    }

    setIsSharing(true);
    setShareMessage("");
    setShareFeedback(null);
    setShareTitleError("");

    try {
      const finalPreviewImageUrl =
        mode === "coding" && shareSourceImageUrl
          ? await cropShareCoverImage(shareSourceImageUrl, shareCrop)
          : sharePreviewImageUrl || shareSourceImageUrl;
      const response = await fetch("/api/community/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: normalizedTitle,
          description: buildShareDescription(),
          prompt: getSharePrompt(mode),
          previewImageUrl: finalPreviewImageUrl,
          previewCode: buildSharePreviewCode(),
          mode,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        message?: string;
        moderation?: {
          approved?: boolean;
          reason?: string;
          suggestedStatus?: "approved" | "pending" | "rejected";
        };
      };

      if (response.status === 401) {
        setIsShareConfirmOpen(false);
        showLoginPrompt(
          "登录状态断开了，这次分享还没有送出去。当前作品内容已经保留，重新登录后可以继续分享。",
        );
        return;
      }

      if (!response.ok) {
        setShareMessage(data.error ?? "分享失败了，请稍后再试。");
        setShareFeedback({
          type: "error",
          title: "这次还没有分享成功",
          message: data.error ?? "刚刚和社区广场失去了一下联系，请稍后再试。",
        });
        return;
      }

      setIsShareConfirmOpen(false);
      setShareMessage(data.message ?? "");

      if (data.moderation?.suggestedStatus === "pending") {
        setShareFeedback({
          type: "pending",
          title: "作品已经进入审核队列",
          message:
            data.message ??
            "你现在可以继续创作了，审核结果会通过右上角通知告诉你。",
        });
        return;
      }

      if (data.moderation?.suggestedStatus === "approved") {
        setShareFeedback({
          type: "success",
          title: "作品已经点亮社区展台",
          message:
            data.message ?? "你的作品已经通过审核，其他小朋友现在可以在成长社区看到它了。",
        });
        return;
      }

      setShareFeedback({
        type: "error",
        title: "作品暂时不能公开展示",
        message:
          data.message ??
          data.moderation?.reason ??
          "你可以调整提示词或内容后再试一次。",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "分享失败了，请稍后再试。";
      setShareMessage(message);
      setShareFeedback({
        type: "error",
        title: "分享没有完成",
        message,
      });
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

      const { data, rawText } = await parseApiResponse<{
        code?: string;
        error?: string;
        remainingCredits?: number;
      }>(response);
      if (response.status === 401) {
        if (isUpstreamCredentialError(data?.error)) {
          setWritingError(
            data?.error ?? "模型密钥无效，请检查后台 AI 配置里的 key。",
          );
          return;
        }

        showLoginPrompt(
          "登录状态断开了，这次写作还没有完成。当前内容已经保留，重新登录后可以继续。",
        );
        return;
      }

      if (typeof data?.remainingCredits === "number") {
        setMagicCredits(data.remainingCredits);
      }

      if (!response.ok || !data?.code) {
        setWritingError(
          toReadableApiError(
            response,
            "这次创作没有成功，我们再试一次。",
            data?.error,
            rawText,
          ),
        );
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
    setShareMessage("");
    setShareFeedback(null);
    setIsShareConfirmOpen(false);
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
        remainingCredits?: number;
      };
      if (response.status === 401) {
        if (isUpstreamCredentialError(data.error)) {
          setDrawingError(
            data.error ?? "模型密钥无效，请检查后台 AI 配置里的 key。",
          );
          return;
        }

        showLoginPrompt(
          "登录状态断开了，这次绘画还没有完成。当前内容已经保留，重新登录后可以继续。",
        );
        return;
      }

      if (typeof data.remainingCredits === "number") {
        setMagicCredits(data.remainingCredits);
      }

      if (!response.ok || !data.imageUrl) {
        setDrawingError(data.error ?? "这次作画没有成功，我们再试一次。");
        setGeneratedImageUrl("");
        return;
      }

      if (!/^(https?:\/\/|data:image\/|blob:)/i.test(data.imageUrl.trim())) {
        setGeneratedImageUrl("");
        setDrawingError(
          data.imageUrl.toLowerCase().includes("invalid token")
            ? "绘画接口返回 Invalid token，请检查后台 AI 绘画配置里的接口密钥。"
            : "绘画接口没有返回可显示的图片地址，请检查后台 AI 绘画配置。",
        );
        return;
      }

      setDrawingError("");
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
  const completedGoalCount =
    Number(Boolean(hasGeneratedCode)) +
    Number(Boolean(writingResult.trim())) +
    Number(Boolean(generatedImageUrl.trim()));
  const dailyGoalTarget = 2;
  const cappedCompletedGoalCount = Math.min(completedGoalCount, dailyGoalTarget);
  const dailyGoalProgressPercent = Math.min(
    100,
    Math.round((cappedCompletedGoalCount / dailyGoalTarget) * 100),
  );
  const dailyGoalDescription =
    cappedCompletedGoalCount >= dailyGoalTarget
      ? "今天的小目标已经完成啦"
      : `再完成 ${dailyGoalTarget - cappedCompletedGoalCount} 个创意作品就达标`;

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

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1700px] px-4 py-4 lg:px-6 lg:py-5">
        <section className="flex min-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded-[32px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(246,249,255,0.98))] shadow-[0_26px_80px_rgba(148,163,184,0.14)] backdrop-blur-xl">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/80 px-5 py-5 lg:px-7">
            <div className="flex min-w-0 items-center gap-4">
              <Image
                src={brand.logoUrl}
                alt={brand.siteName}
                width={56}
                height={56}
                className="rounded-[18px] shadow-[0_12px_28px_rgba(248,113,113,0.14)]"
                unoptimized
              />
              <div className="min-w-0">
                <h1 className="truncate text-[18px] font-black text-slate-800 lg:text-[20px]">
                  {brand.siteName}
                </h1>
                <p className="mt-1 truncate text-sm text-slate-500">
                  {brand.tagline}
                </p>
              </div>
            </div>

            <div className="relative flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => handleHeaderAction("credits")}
                className="inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-bold text-[#5f84d8] shadow-[0_10px_24px_rgba(148,163,184,0.1)] transition hover:-translate-y-0.5"
              >
                {magicCredits ?? "--"} 魔法币
              </button>
              <button
                type="button"
                onClick={() => handleHeaderAction("help")}
                className="rounded-[18px] bg-white/88 px-4 py-3 text-sm font-bold text-slate-600 shadow-[0_10px_24px_rgba(148,163,184,0.08)] transition hover:-translate-y-0.5"
              >
                帮助
              </button>
              <button
                type="button"
                onClick={() => handleHeaderAction("notifications")}
                className="relative rounded-[18px] bg-white/88 px-4 py-3 text-sm font-bold text-slate-600 shadow-[0_10px_24px_rgba(148,163,184,0.08)] transition hover:-translate-y-0.5"
              >
                通知
                {unreadNotificationsCount > 0 && (
                  <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#ff5f7f]" />
                )}
              </button>
              <button
                type="button"
                onClick={() => router.push("/profile")}
                className="flex items-center gap-3 rounded-[18px] bg-white/92 px-3 py-2 shadow-[0_10px_24px_rgba(148,163,184,0.08)] transition hover:-translate-y-0.5"
              >
                <Image
                  src={brand.logoUrl}
                  alt="当前账号头像"
                  width={42}
                  height={42}
                  className="h-10 w-10 rounded-full object-cover"
                  unoptimized
                />
                <div className="text-left">
                  <p className="text-sm font-black text-slate-700">小创客</p>
                  <p className="text-xs text-slate-400">查看我的主页</p>
                </div>
              </button>

              {activeHeaderPanel && (
                <div className="absolute right-0 top-[calc(100%+12px)] z-20 w-[320px] rounded-[24px] border border-white/80 bg-white/96 p-4 shadow-[0_22px_50px_rgba(148,163,184,0.14)] backdrop-blur-xl">
                  {activeHeaderPanel === "help" ? (
                    <div>
                      <p className="text-sm font-black text-slate-700">帮助中心</p>
                      <div className="mt-4 space-y-3">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveHeaderPanel(null);
                            handleModeChange("coding");
                          }}
                          className="w-full rounded-[18px] bg-[#f6faff] px-4 py-3 text-left text-sm font-bold text-slate-600"
                        >
                          返回 AI 编程继续创作
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveHeaderPanel(null);
                            router.push("/community");
                          }}
                          className="w-full rounded-[18px] bg-[#fff8fb] px-4 py-3 text-left text-sm font-bold text-slate-600"
                        >
                          去成长社区看看大家的作品
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveHeaderPanel(null);
                            router.push("/profile");
                          }}
                          className="w-full rounded-[18px] bg-[#fff9ef] px-4 py-3 text-left text-sm font-bold text-slate-600"
                        >
                          打开我的主页和作品记录
                        </button>
                      </div>
                    </div>
                  ) : activeHeaderPanel === "notifications" ? (
                    <div>
                      <p className="text-sm font-black text-slate-700">通知中心</p>
                      <div className="mt-4 space-y-3">
                        {headerNotifications.length ? (
                          headerNotifications.slice(0, 4).map((item, index) => (
                            <div
                              key={item.id}
                              className={`rounded-[18px] px-4 py-3 ${
                                index % 2 === 0 ? "bg-[#fff8fb]" : "bg-[#fff9ef]"
                              }`}
                            >
                              <p className="text-sm font-black text-slate-700">
                                {item.notifications?.title ?? "平台通知"}
                              </p>
                              <p className="mt-1 text-xs leading-6 text-slate-400">
                                {item.notifications?.body ?? "有一条新的平台动态可以查看。"}
                              </p>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-[18px] bg-[#fff8fb] px-4 py-3">
                            <p className="text-sm font-black text-slate-700">暂时还没有新的平台通知</p>
                            <p className="mt-1 text-xs leading-6 text-slate-400">
                              后台发布的新消息会第一时间出现在这里。
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-black text-slate-700">魔法币账本</p>
                      <div className="mt-4 rounded-[18px] bg-[#f6faff] px-4 py-3">
                        <p className="text-xs font-bold tracking-[0.14em] text-slate-400">
                          当前剩余
                        </p>
                        <p className="mt-2 text-2xl font-black text-slate-700">
                          {magicCredits ?? "--"} 魔法币
                        </p>
                        <p className="mt-1 text-xs leading-6 text-slate-400">
                          这里会告诉你魔法币什么时候增加、什么时候减少，以及对应的原因。
                        </p>
                      </div>
                      <div className="mt-3 max-h-[280px] space-y-3 overflow-y-auto pr-1">
                        {creditLogs.length ? (
                          creditLogs.slice(0, 8).map((log) => (
                            <div
                              key={log.id}
                              className="rounded-[18px] bg-[#fff8fb] px-4 py-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-black text-slate-700">
                                    {log.reason_label}
                                  </p>
                                  <p className="mt-1 text-xs leading-6 text-slate-400">
                                    {log.note || "系统记录了一次魔法币变化。"}
                                  </p>
                                  <p className="mt-1 text-[11px] text-slate-300">
                                    {new Intl.DateTimeFormat("zh-CN", {
                                      month: "numeric",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    }).format(new Date(log.created_at))}
                                  </p>
                                </div>
                                <div
                                  className={`text-sm font-black ${
                                    log.change_amount > 0
                                      ? "text-[#1e9b66]"
                                      : "text-[#d45b85]"
                                  }`}
                                >
                                  {log.change_amount > 0
                                    ? `+${log.change_amount}`
                                    : log.change_amount}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-[18px] bg-[#fff8fb] px-4 py-3">
                            <p className="text-sm font-black text-slate-700">
                              暂时还没有新的魔法币变化
                            </p>
                            <p className="mt-1 text-xs leading-6 text-slate-400">
                              当你领取礼包或使用需要扣币的功能时，这里就会出现记录。
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </header>

          <div className="grid min-h-0 flex-1 gap-4 p-4 lg:grid-cols-[320px_420px_minmax(0,1fr)] lg:p-5">
            <aside className="flex min-h-0 flex-col rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(246,249,255,0.96))] p-4 shadow-[0_18px_50px_rgba(148,163,184,0.1)]">
              <div>
                <p className="text-[13px] font-black tracking-[0.08em] text-[#4165c7]">
                  模式选择
                </p>
              </div>

              <div className="mt-5 flex-1 space-y-3 overflow-y-auto pr-1">
                {modeTabs.map((tab) => {
                  const isActive = activeMode === tab.id;
                  const visual = modeVisuals[tab.id];

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleModeChange(tab.id)}
                      className={`flex w-full items-center gap-4 rounded-[24px] border px-4 py-4 text-left transition ${
                        isActive
                          ? "border-[#7aa6ff] bg-white shadow-[0_18px_36px_rgba(125,211,252,0.14)]"
                          : "border-white/80 bg-white/70 shadow-[0_10px_24px_rgba(148,163,184,0.08)] hover:bg-white"
                      }`}
                    >
                      <div
                        className={`grid h-14 w-14 shrink-0 place-items-center rounded-[18px] bg-gradient-to-br ${visual.glowClass} shadow-[0_12px_24px_rgba(148,163,184,0.14)]`}
                      >
                        <Image
                          src={visual.iconSrc}
                          alt={tab.label}
                          width={30}
                          height={30}
                          className="h-7 w-7 object-contain"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-black text-slate-700">
                          {tab.label}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-slate-400">
                          {tab.subtitle}
                        </p>
                      </div>
                      <div
                        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-black ${
                          isActive
                            ? "bg-[#4d86ff] text-white"
                            : "bg-[#eef3ff] text-[#90a4d8]"
                        }`}
                      >
                        {isActive ? "✓" : ""}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 rounded-[24px] border border-white/80 bg-white/82 p-4 shadow-[0_10px_24px_rgba(148,163,184,0.08)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-12 w-12 place-items-center rounded-[16px] bg-gradient-to-br from-[#efe4ff] to-[#dcecff] text-sm font-black text-[#6f6ad8]">
                      今日
                    </div>
                    <div>
                      <p className="text-sm font-black text-[#4165c7]">
                        今日学习小目标
                      </p>
                      <p className="mt-1 text-sm text-slate-500">{dailyGoalDescription}</p>
                    </div>
                  </div>
                  <p className="text-sm font-black text-[#5f84d8]">
                    {cappedCompletedGoalCount}/{dailyGoalTarget}
                  </p>
                </div>
                <div className="mt-4 h-2 rounded-full bg-[#eef3ff]">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-[#8baeff] to-[#918dff] transition-[width] duration-500"
                    style={{ width: `${dailyGoalProgressPercent}%` }}
                  />
                </div>
              </div>
            </aside>

            <section className="flex min-h-0 flex-col rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,250,255,0.98))] p-5 shadow-[0_18px_50px_rgba(148,163,184,0.1)]">
              <div>
                <p className="text-[13px] font-black tracking-[0.08em] text-[#4165c7]">
                  创作区
                </p>
                <h2 className="mt-2 text-[18px] font-black text-slate-800">
                  输入与设置
                </h2>
              </div>

              <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
                {isCodingMode ? (
                  <div className="space-y-4">
                    <div className="rounded-[22px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(250,252,255,0.98))] p-4 shadow-[0_10px_24px_rgba(148,163,184,0.08)]">
                      <div className="flex items-start gap-3">
                        <div>
                          <p className="text-[15px] font-black text-slate-700">编程创作台</p>
                          <p className="mt-1 text-sm leading-6 text-slate-400">
                            先选一个主题，再补上你想让页面发生的互动。
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[22px] border border-white/80 bg-white/90 p-4 shadow-[0_10px_24px_rgba(148,163,184,0.08)]">
                      <p className="text-[15px] font-black text-slate-700">主题灵感</p>
                      <div className="mt-4 grid grid-cols-2 gap-3">
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
                              className={`rounded-[18px] bg-gradient-to-br ${sceneClasses[index]} px-4 py-4 text-left shadow-[0_10px_22px_rgba(148,163,184,0.1)] transition hover:-translate-y-0.5`}
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
                    </div>

                    <div className="rounded-[22px] border border-white/80 bg-white/90 p-4 shadow-[0_10px_24px_rgba(148,163,184,0.08)]">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <label
                            htmlFor="prompt"
                            className="text-[15px] font-black text-slate-700"
                          >
                            创作描述
                          </label>
                          <p className="mt-1 text-sm leading-6 text-slate-400">
                            把内容、互动方式和语气写清楚。
                          </p>
                        </div>
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
                          placeholder="输入你的想法或问题，告诉 AI 你想要什么..."
                          className="w-full resize-none rounded-[22px] border border-[#d7e6ff] bg-[#fbfdff] px-5 py-5 text-base leading-8 text-slate-700 outline-none transition placeholder:text-slate-400 focus:bg-white focus:shadow-[0_0_0_4px_rgba(219,234,254,0.55)]"
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

                      <div className="mt-4 flex gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setGeneratedCode(defaultPreviewHtml);
                            setShareMessage("");
                            setShareFeedback(null);
                          }}
                          className="inline-flex h-12 flex-1 items-center justify-center rounded-full bg-[#f4f7ff] px-5 text-base font-black text-slate-600 shadow-[0_12px_28px_rgba(148,163,184,0.12)] transition hover:-translate-y-0.5"
                        >
                          清空预览
                        </button>
                        <button
                          type="button"
                          onClick={handleGenerate}
                          disabled={isLoading}
                          className="inline-flex h-12 flex-[1.25] items-center justify-center rounded-full bg-gradient-to-r from-[#6fa4ff] to-[#7d8cff] px-6 text-base font-black text-white shadow-[0_16px_34px_rgba(96,132,255,0.24)] transition hover:-translate-y-0.5"
                        >
                          {isLoading ? "生成中" : "生成作品"}
                        </button>
                      </div>
                    </div>

                    <div className="rounded-[22px] border border-white/80 bg-white/90 p-4 shadow-[0_10px_24px_rgba(148,163,184,0.08)]">
                      <p className="text-[15px] font-black text-slate-700">创作提示</p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[18px] bg-[#f7fbff] px-4 py-4">
                          <p className="text-[11px] font-bold tracking-[0.14em] text-slate-400">
                            预览状态
                          </p>
                          <p className="mt-2 text-sm font-black text-slate-700">
                            {isLoading
                              ? "小程序正在生成"
                              : hasGeneratedCode
                                ? "可继续调整后重新生成"
                                : "等待开始生成"}
                          </p>
                        </div>
                        <div className="rounded-[18px] bg-[#fdf9ff] px-4 py-4">
                          <p className="text-[11px] font-bold tracking-[0.14em] text-slate-400">
                            展示建议
                          </p>
                          <p className="mt-2 text-sm font-black text-slate-700">
                            生成完成后可在右侧放大查看细节
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : isWritingMode ? (
                  <div className="space-y-4">
                    <div className="rounded-[22px] border border-[#f7e8b7] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,251,238,0.98))] p-4 shadow-[0_10px_24px_rgba(217,119,6,0.08)]">
                      <div className="flex items-start gap-3">
                        <div>
                          <p className="text-[15px] font-black text-amber-900">写作创作台</p>
                          <p className="mt-1 text-sm leading-6 text-amber-800/70">
                            选一枚灵感胶囊，句子会沿着你的思路自然展开。
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
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
                            className={`w-full rounded-[20px] bg-gradient-to-br ${capsuleClasses[index]} px-4 py-4 text-left shadow-[0_10px_24px_rgba(217,119,6,0.08)] transition hover:-translate-y-0.5`}
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

                    <div className="rounded-[22px] border border-[#f7e8b7] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,251,238,0.98))] p-4 shadow-[0_10px_24px_rgba(217,119,6,0.08)]">
                      <label
                        htmlFor="writing-prompt"
                        className="mb-3 block text-[15px] font-black text-amber-900"
                      >
                        写作需求
                      </label>
                      <textarea
                        id="writing-prompt"
                        rows={12}
                        value={writingPrompt}
                        onChange={(event) => setWritingPrompt(event.target.value)}
                        placeholder="输入你的主题和想法..."
                        className="w-full resize-none rounded-[22px] border border-[#f3df99] bg-white px-5 py-5 text-base leading-8 text-amber-900 outline-none transition placeholder:text-amber-500/70 focus:shadow-[0_0_0_4px_rgba(253,230,138,0.35)]"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleGenerateWriting}
                      disabled={isWritingLoading}
                      className="inline-flex h-14 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#ffe2a9] via-[#fff0c8] to-[#ffdcb6] px-6 text-lg font-black text-amber-900 shadow-[0_16px_34px_rgba(251,191,36,0.24)] transition duration-200 hover:-translate-y-1"
                    >
                      {isWritingLoading ? "正在创作" : "开始创作"}
                    </button>

                    <div className="rounded-[22px] border border-[#f7e8b7] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,251,238,0.98))] p-4 shadow-[0_10px_24px_rgba(217,119,6,0.08)]">
                      <p className="text-[15px] font-black text-amber-900">创作提示</p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[18px] bg-[#fff8e9] px-4 py-4">
                          <p className="text-[11px] font-bold tracking-[0.14em] text-amber-400">
                            当前状态
                          </p>
                          <p className="mt-2 text-sm font-black text-amber-900">
                            {isWritingLoading
                              ? "正在组织段落"
                              : writingResult
                                ? "文章已生成"
                                : "等待开始创作"}
                          </p>
                        </div>
                        <div className="rounded-[18px] bg-white px-4 py-4">
                          <p className="text-[11px] font-bold tracking-[0.14em] text-amber-400">
                            阅读体验
                          </p>
                          <p className="mt-2 text-sm font-black text-amber-900">
                            成稿会在右侧信纸区舒展展示
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : isPaintingMode ? (
                  <div className="space-y-4">
                    <div className="rounded-[22px] border border-white/80 bg-white/92 p-4 shadow-[0_10px_24px_rgba(148,163,184,0.08)]">
                      <div className="flex items-start gap-3">
                        <div>
                          <p className="text-[15px] font-black text-slate-700">绘画创作台</p>
                          <p className="mt-1 text-sm leading-6 text-slate-400">
                            把场景、颜色、角色和光影写清楚，画面会更完整。
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[22px] border border-white/80 bg-white/92 p-4 shadow-[0_10px_24px_rgba(148,163,184,0.08)]">
                      <p className="text-[15px] font-black text-slate-700">绘画描述</p>
                      <p className="mt-1 text-sm leading-6 text-slate-400">
                        可以写清场景、角色、颜色、光线和风格。
                      </p>
                      <textarea
                        id="drawing-prompt"
                        rows={12}
                        value={drawingPrompt}
                        onChange={(event) => setDrawingPrompt(event.target.value)}
                        placeholder="输入你的绘画描述..."
                        className="mt-4 w-full resize-none rounded-[22px] border border-[#f3d5e6] bg-white px-5 py-5 text-base leading-8 text-slate-700 outline-none transition placeholder:text-slate-400 focus:shadow-[0_0_0_4px_rgba(251,207,232,0.35)]"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleGenerateImage}
                      disabled={isDrawing}
                      className="inline-flex h-14 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#ffd7e8] via-[#ffe7d2] to-[#dcecff] px-6 text-lg font-black text-slate-700 shadow-[0_16px_34px_rgba(251,191,188,0.24)] transition duration-200 hover:-translate-y-1"
                    >
                      {isDrawing ? "正在作画" : "开始作画"}
                    </button>

                    <div className="rounded-[22px] border border-white/80 bg-white/92 p-4 shadow-[0_10px_24px_rgba(148,163,184,0.08)]">
                      <p className="text-[15px] font-black text-slate-700">创作提示</p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[18px] bg-[#fff7fb] px-4 py-4">
                          <p className="text-[11px] font-bold tracking-[0.14em] text-slate-400">
                            当前状态
                          </p>
                          <p className="mt-2 text-sm font-black text-slate-700">
                            {isDrawing
                              ? "画面正在生成"
                              : generatedImageUrl
                                ? "画作已完成"
                                : "等待开始作画"}
                          </p>
                        </div>
                        <div className="rounded-[18px] bg-[#f7fbff] px-4 py-4">
                          <p className="text-[11px] font-bold tracking-[0.14em] text-slate-400">
                            展示方式
                          </p>
                          <p className="mt-2 text-sm font-black text-slate-700">
                            成图会在右侧大画板中展示
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className={`rounded-[22px] bg-gradient-to-br ${activeVisual.cardClass} p-5 shadow-[0_14px_32px_rgba(148,163,184,0.08)]`}>
                      <div className="flex items-start gap-4">
                        <div
                          className={`grid h-16 w-16 shrink-0 place-items-center rounded-[20px] bg-gradient-to-br ${activeVisual.glowClass} shadow-[0_14px_30px_rgba(148,163,184,0.14)]`}
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
                          <p className="mt-2 text-sm leading-7 text-slate-500">
                            {activeComingSoon?.description}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-[22px] border border-white/80 bg-white/92 p-4 shadow-[0_10px_24px_rgba(148,163,184,0.08)]">
                      <p className="text-[15px] font-black text-slate-700">创作提示</p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[18px] bg-[#f7fbff] px-4 py-4">
                          <p className="text-[11px] font-bold tracking-[0.14em] text-slate-400">
                            当前阶段
                          </p>
                          <p className="mt-2 text-sm font-black text-slate-700">
                            {activeComingSoon?.badge}
                          </p>
                        </div>
                        <div className="rounded-[18px] bg-[#fff8fb] px-4 py-4">
                          <p className="text-[11px] font-bold tracking-[0.14em] text-slate-400">
                            后续展示
                          </p>
                          <p className="mt-2 text-sm font-black text-slate-700">
                            会接入和 AI 编程同级别的工作台体验
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {shareMessage && activeShareMode && (
                  <div className="mt-4 rounded-[18px] bg-[#fff7e8] px-4 py-3 text-sm font-bold leading-7 text-[#b7791f]">
                    {shareMessage}
                  </div>
                )}
              </div>
            </section>

            <section className="relative flex min-h-0 min-w-0 flex-col rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(247,250,255,0.98))] shadow-[0_18px_50px_rgba(148,163,184,0.1)]">
              <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.94),rgba(237,244,255,0.92)_54%,rgba(230,239,255,0.98)_100%)]" />
                <div className="absolute right-0 top-10 h-72 w-72 rounded-full bg-[#dfe8ff]/55 blur-3xl" />
                <div className="absolute bottom-0 left-[18%] h-60 w-60 rounded-full bg-[#fff0c9]/35 blur-3xl" />
              </div>

              <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-white/80 px-6 py-5 lg:px-8">
                <div>
                  <p className="text-[13px] font-black tracking-[0.08em] text-[#4165c7]">
                    {isCodingMode
                      ? "预览区"
                      : isWritingMode
                        ? "展示区"
                        : isPaintingMode
                          ? "画板区"
                          : "预览区"}
                  </p>
                  <h2 className="mt-2 text-[18px] font-black text-slate-800">
                    {isCodingMode
                      ? "手机预览"
                      : isWritingMode
                        ? "灵感信纸"
                        : isPaintingMode
                          ? "梦幻画板"
                          : activeTab.label}
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {isCodingMode ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setGeneratedCode(defaultPreviewHtml);
                          setShareMessage("");
                          setShareFeedback(null);
                        }}
                        className="inline-flex h-11 items-center justify-center rounded-full border border-[#8fb5ff] bg-white px-6 text-base font-black text-[#4d86ff] shadow-[0_10px_22px_rgba(148,163,184,0.08)]"
                      >
                        清空预览
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setGeneratedCode(defaultPreviewHtml);
                          setShareMessage("");
                          setShareFeedback(null);
                        }}
                        className="inline-flex h-11 items-center justify-center rounded-full bg-[linear-gradient(90deg,#f0e8ff_0%,#eee9ff_100%)] px-6 text-base font-black text-[#8a6df2] shadow-[0_10px_22px_rgba(148,163,184,0.08)]"
                      >
                        保存作品
                      </button>
                      <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={isLoading}
                        className="inline-flex h-11 items-center justify-center rounded-full bg-[linear-gradient(90deg,#6fa4ff_0%,#7d8cff_100%)] px-7 text-base font-black text-white shadow-[0_14px_28px_rgba(96,132,255,0.24)]"
                      >
                        {isLoading ? "生成中" : "生成作品"}
                      </button>
                    </div>
                  ) : isWritingMode ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setWritingResult("");
                          setWritingError("");
                        }}
                        className="inline-flex h-11 items-center justify-center rounded-full border border-[#f3d78f] bg-white px-6 text-base font-black text-amber-700 shadow-[0_10px_22px_rgba(217,119,6,0.08)]"
                      >
                        清空成稿
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleWritingCapsuleClick(writingCapsules[0].prompt)
                        }
                        className="inline-flex h-11 items-center justify-center rounded-full bg-[linear-gradient(90deg,#fff0c8_0%,#ffe7d6_100%)] px-6 text-base font-black text-amber-900 shadow-[0_10px_22px_rgba(251,191,36,0.12)]"
                      >
                        填入灵感
                      </button>
                      <button
                        type="button"
                        onClick={handleGenerateWriting}
                        disabled={isWritingLoading}
                        className="inline-flex h-11 items-center justify-center rounded-full bg-[linear-gradient(90deg,#ffe2a9_0%,#fff0c8_48%,#ffdcb6_100%)] px-7 text-base font-black text-amber-900 shadow-[0_14px_28px_rgba(251,191,36,0.18)]"
                      >
                        {isWritingLoading ? "创作中" : "开始创作"}
                      </button>
                      {writingResult && (
                        <button
                          type="button"
                          onClick={openShareConfirm}
                          disabled={isSharing}
                          className="inline-flex h-11 items-center justify-center rounded-full bg-[linear-gradient(90deg,#fff0c8_0%,#ffd8e6_52%,#e8efff_100%)] px-6 text-base font-black text-amber-900 shadow-[0_14px_28px_rgba(251,191,36,0.16)] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {isSharing ? "正在分享" : "分享到社区"}
                        </button>
                      )}
                    </div>
                  ) : isPaintingMode ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setGeneratedImageUrl("");
                          setDrawingError("");
                        }}
                        className="inline-flex h-11 items-center justify-center rounded-full border border-[#f5c5d7] bg-white px-6 text-base font-black text-[#d25586] shadow-[0_10px_22px_rgba(148,163,184,0.08)]"
                      >
                        清空画板
                      </button>
                      <button
                        type="button"
                        onClick={handleGenerateImage}
                        disabled={isDrawing}
                        className="inline-flex h-11 items-center justify-center rounded-full bg-[linear-gradient(90deg,#ffd7e8_0%,#ffe7d2_48%,#dcecff_100%)] px-7 text-base font-black text-slate-700 shadow-[0_14px_28px_rgba(251,191,188,0.18)]"
                      >
                        {isDrawing ? "作画中" : "开始作画"}
                      </button>
                      {generatedImageUrl && (
                        <button
                          type="button"
                          onClick={openShareConfirm}
                          disabled={isSharing}
                          className="inline-flex h-11 items-center justify-center rounded-full bg-[linear-gradient(90deg,#ffd9ea_0%,#ffe7c7_52%,#dcecff_100%)] px-6 text-base font-black text-slate-700 shadow-[0_14px_28px_rgba(251,191,188,0.2)] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {isSharing ? "正在分享" : "分享到社区"}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-500 shadow-[0_10px_20px_rgba(148,163,184,0.12)]">
                        预览待命中
                      </div>
                      <div className={`rounded-full px-4 py-2 text-sm font-bold ${activeVisual.pillClass}`}>
                        {activeComingSoon?.badge}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {isCodingMode ? (
                <div className="relative z-10 flex min-h-0 flex-1 flex-col">
                  <div className="px-6 pt-3 lg:px-8">
                    {hasGeneratedCode && !isLoading && (
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setIsCodeGuideOpen(true)}
                          className="rounded-full bg-[#f4f0ff] px-4 py-3 text-sm font-bold text-[#7a67db] shadow-[0_12px_28px_rgba(129,140,248,0.16)]"
                        >
                          查看代码
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
                          onClick={openShareConfirm}
                          disabled={isSharing}
                          className="rounded-full bg-[linear-gradient(90deg,#ffd9ea_0%,#ffe7c7_52%,#dcecff_100%)] px-4 py-3 text-sm font-bold text-slate-700 shadow-[0_12px_28px_rgba(251,191,188,0.2)] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {isSharing ? "正在分享" : "分享到社区"}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex min-h-0 flex-1 px-6 pb-6 pt-3 lg:px-8">
                    <div className="relative flex h-full w-full min-h-0 overflow-hidden rounded-[24px] border border-[#dbe7ff] bg-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.5),0_18px_40px_rgba(148,163,184,0.08)]">
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(248,251,255,0.96),rgba(238,245,255,0.92))]" />
                      <div className="relative flex min-h-0 w-full flex-1 flex-col p-3 lg:p-4">
                        <div
                          ref={previewShellRef}
                          className="relative flex min-h-0 flex-1 overflow-hidden rounded-[20px] border border-[#dce8ff] bg-white"
                        >
                          {isLoading ? (
                            <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-[#fff3d2] via-[#fff7fb] to-[#edf6ff] px-6 text-center">
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

                              <p className="mt-5 min-h-[64px] max-w-[320px] text-lg font-black leading-8 text-slate-600">
                                {loadingMessages[loadingMessageIndex]}
                              </p>
                            </div>
                          ) : (
                            <iframe
                              ref={previewIframeRef}
                              title="小程序实时预览"
                              className="block h-full min-h-0 w-full bg-white"
                              srcDoc={codingPreviewDoc}
                              scrolling="yes"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : isWritingMode ? (
                <div className="relative z-10 flex min-h-0 flex-1 flex-col">
                  <div className="flex min-h-0 flex-1 px-6 pb-6 pt-3 lg:px-8">
                    <div className="relative flex h-full w-full min-h-0 items-center justify-center overflow-hidden rounded-[24px] border border-[#f3df99] bg-[linear-gradient(180deg,rgba(255,247,219,0.66),rgba(255,251,238,0.92))] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6),0_18px_40px_rgba(245,158,11,0.08)]">
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),transparent_58%,rgba(251,191,36,0.08))]" />
                      <div className="absolute left-8 top-8 hidden h-40 w-40 rounded-full border border-white/45 lg:block" />
                      <div className="absolute right-8 bottom-8 hidden h-48 w-48 rounded-full border border-white/40 lg:block" />

                      <div className="relative flex h-full min-h-0 w-full items-center justify-center p-4 lg:p-5">
                        <div
                          className="flex h-full min-h-0 w-full rounded-[26px] bg-gradient-to-br from-[#fffdf4] via-[#fff9eb] to-[#fff1cf] p-4 shadow-[0_20px_50px_rgba(245,158,11,0.10)]"
                        >
                          <div
                            className="mx-auto flex h-full min-h-0 w-full rounded-[22px] border border-[#f9e7b2] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,252,241,0.98))] p-6 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.88)]"
                          >
                            {isWritingLoading ? (
                              <div
                                className="flex h-full min-h-0 w-full flex-col items-center justify-center text-center"
                              >
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
                              <div
                                ref={writingPreviewRef}
                                className="relative h-full min-h-0 w-full overflow-hidden rounded-[24px] border border-[#f6e4ae] bg-white px-8 py-10 shadow-[0_18px_45px_rgba(251,191,36,0.1)]"
                              >
                                <div className="absolute inset-y-0 left-6 w-px bg-[#f6b8c6]/80" />
                                <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-r from-[#fff2c8]/35 via-transparent to-[#ffe5ef]/35" />
                                <div className="relative h-full overflow-y-auto pl-4 pr-2">
                                  <div className="mb-6 inline-flex rounded-full bg-[#fff1c9] px-4 py-2 text-sm font-bold text-amber-700">
                                    今日成稿
                                  </div>
                                  <div className="space-y-4 whitespace-pre-wrap text-[17px] leading-9 text-slate-700">
                                    {writingResult}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div
                                className="flex h-full min-h-0 w-full flex-col items-center justify-center text-center"
                              >
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
                  </div>
                </div>
              ) : isPaintingMode ? (
                <div className="relative z-10 flex min-h-0 flex-1 flex-col">
                  <div className="flex min-h-0 flex-1 px-6 pb-6 pt-3 lg:px-8">
                    <div className="relative flex h-full w-full min-h-0 items-center justify-center overflow-hidden rounded-[24px] border border-[#f5c5d7] bg-[linear-gradient(180deg,rgba(244,248,255,0.7),rgba(255,246,250,0.92))] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6),0_18px_40px_rgba(251,191,188,0.08)]">
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),transparent_58%,rgba(125,211,252,0.08))]" />
                      <div className="absolute left-8 bottom-10 hidden h-44 w-44 rounded-full border border-white/40 lg:block" />
                      <div className="absolute right-8 top-8 hidden h-52 w-52 rounded-full border border-white/38 lg:block" />

                      <div className="relative flex h-full min-h-0 w-full items-center justify-center p-4 lg:p-5">
                        <div
                          className="flex h-full min-h-0 w-full rounded-[26px] bg-gradient-to-br from-white via-[#fff5fa] to-[#eef7ff] p-4 shadow-[0_20px_50px_rgba(125,211,252,0.12)]"
                        >
                          <div
                            className="mx-auto flex h-full min-h-0 w-full items-center justify-center rounded-[22px] border-2 border-dashed border-[#f5c5d7] bg-white/78 p-6 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.9)]"
                          >
                            {isDrawing ? (
                              <div className="flex h-full min-h-0 w-full flex-col items-center justify-center text-center">
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
                              <div
                                ref={paintingPreviewRef}
                                className="flex h-full min-h-0 w-full items-center justify-center overflow-y-auto"
                              >
                                <img
                                  src={generatedImageUrl}
                                  alt="智能生成的绘画作品"
                                  className="h-auto max-h-full w-auto max-w-full rounded-[24px] object-contain shadow-[0_22px_60px_rgba(148,163,184,0.2)]"
                                />
                              </div>
                            ) : (
                              <div className="flex h-full min-h-0 w-full flex-col items-center justify-center text-center">
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
                  </div>
                </div>
              ) : (
                <div className="relative z-10 flex min-h-0 flex-1 flex-col">
                  <div className="flex min-h-0 flex-1 px-6 pb-6 pt-3 lg:px-8">
                    <div className="relative flex h-full w-full min-h-0 items-center justify-center overflow-hidden rounded-[24px] border border-white/80 bg-[linear-gradient(180deg,rgba(238,244,255,0.66),rgba(250,247,255,0.92))] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6),0_18px_40px_rgba(148,163,184,0.08)]">
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),transparent_58%,rgba(147,197,253,0.08))]" />
                      <div className="absolute left-8 top-8 hidden h-44 w-44 rounded-full border border-white/42 lg:block" />
                      <div className="absolute right-8 bottom-8 hidden h-52 w-52 rounded-full border border-white/38 lg:block" />

                      <div className="relative flex h-full min-h-0 w-full items-center justify-center p-4 lg:p-5">
                        <div
                          className="relative flex h-full min-h-0 w-full rounded-[26px] bg-gradient-to-br from-white via-[#f7fbff] to-[#fff6f8] p-4 shadow-[0_20px_50px_rgba(148,163,184,0.12)]"
                        >
                          <div className="flex h-full min-h-0 w-full items-center justify-center rounded-[22px] border border-white/80 bg-white/82 p-8 text-center shadow-[0_18px_60px_rgba(148,163,184,0.12)] backdrop-blur-xl">
                            <div className="w-full max-w-2xl">
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

                            <div className="mt-8 grid gap-3 sm:grid-cols-2">
                              <div className="rounded-[22px] bg-[#f7fbff] px-5 py-5 text-left">
                                <p className="text-[11px] font-bold tracking-[0.14em] text-slate-400">
                                  视觉层
                                </p>
                                <p className="mt-2 text-sm font-black text-slate-700">
                                  工作台版式已经就绪
                                </p>
                              </div>
                              <div className="rounded-[22px] bg-[#fff8fb] px-5 py-5 text-left">
                                <p className="text-[11px] font-bold tracking-[0.14em] text-slate-400">
                                  能力层
                                </p>
                                <p className="mt-2 text-sm font-black text-slate-700">
                                  生成与交互能力正在接入
                                </p>
                              </div>
                            </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        </section>
      </div>

      {isShareConfirmOpen && (
        <div className="absolute inset-0 z-[70] flex items-center justify-center bg-[#7d8eb0]/18 px-6 backdrop-blur-md">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[36px] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,251,255,0.98))] p-6 shadow-[0_28px_80px_rgba(148,163,184,0.24)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold tracking-[0.16em] text-[#8aa0ca]">
                  分享确认
                </p>
                <h3 className="mt-2 font-['STZhongsong','Songti_SC','PingFang_SC',serif] text-[32px] font-black tracking-[-0.05em] text-slate-700">
                  把这份作品送进成长社区
                </h3>
                <p className="mt-3 max-w-xl text-sm leading-7 text-slate-500">
                  我们会先检查提示词和内容是否适合儿童社区公开展示，通过后才会出现在社区广场。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsShareConfirmOpen(false)}
                className="grid h-11 w-11 place-items-center rounded-full bg-white text-xl font-black text-slate-400 shadow-[0_12px_24px_rgba(148,163,184,0.12)] transition hover:text-slate-600"
              >
                ×
              </button>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(320px,0.9fr)_minmax(0,1fr)]">
              <section className="min-w-0 rounded-[28px] bg-white p-5 shadow-[0_18px_40px_rgba(148,163,184,0.14)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold tracking-[0.14em] text-slate-400">
                      {activeShareMode === "writing" ? "社区展示" : "社区封面"}
                    </p>
                    <p className="mt-2 text-sm font-bold text-slate-600">
                      {activeShareMode === "coding"
                        ? "拖动选框，决定社区里先看到哪一块"
                        : activeShareMode === "writing"
                          ? "这段文字会以可滚动的信纸展示在社区里"
                          : "这张图会作为社区卡片封面"}
                    </p>
                  </div>
                  {activeShareMode === "coding" && (
                    <button
                      type="button"
                      onClick={() => setShareCrop(DEFAULT_SHARE_CROP)}
                      className="rounded-full bg-[#f4f7ff] px-4 py-2 text-xs font-black text-[#5e78c7]"
                    >
                      重新居中
                    </button>
                  )}
                </div>

                {activeShareMode === "writing" ? (
                  <WritingSharePreview
                    title={shareTitle || getDefaultShareTitle("writing")}
                    content={writingResult}
                  />
                ) : shareSourceImageUrl ? (
                  activeShareMode === "coding" ? (
                    <div className="mt-4 rounded-[24px] bg-[#f5f8ff] p-3">
                      <div
                        ref={shareCropFrameRef}
                        className="relative overflow-hidden rounded-[20px] bg-white shadow-[inset_0_0_0_1px_rgba(219,234,254,0.9)]"
                      >
                        <img
                          src={shareSourceImageUrl}
                          alt="可裁剪的作品封面"
                          draggable={false}
                          onLoad={(event) =>
                            setShareCrop(
                              createInitialShareCrop(
                                event.currentTarget.naturalWidth,
                                event.currentTarget.naturalHeight,
                              ),
                            )
                          }
                          className="block max-h-[58vh] w-full select-none object-contain"
                        />
                        <div className="pointer-events-none absolute inset-0 bg-slate-900/26" />
                        <div
                          role="presentation"
                          onPointerDown={handleShareCropPointerDown}
                          className={`absolute rounded-[18px] border-2 border-white bg-white/10 shadow-[0_0_0_999px_rgba(15,23,42,0.32),0_16px_34px_rgba(15,23,42,0.22)] ring-2 ring-[#ffd6e8] ${
                            isShareCropDragging ? "cursor-grabbing" : "cursor-grab"
                          }`}
                          style={{
                            left: `${shareCrop.left * 100}%`,
                            top: `${shareCrop.top * 100}%`,
                            width: `${shareCrop.width * 100}%`,
                            height: `${shareCrop.height * 100}%`,
                            touchAction: "none",
                          }}
                        >
                          <div className="absolute inset-3 rounded-[14px] border border-dashed border-white/88" />
                          <div className="absolute left-1/2 top-1/2 rounded-full bg-white/92 px-3 py-1 text-xs font-black text-[#6b7fe8] shadow-[0_8px_18px_rgba(15,23,42,0.14)] -translate-x-1/2 -translate-y-1/2">
                            拖动封面
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 flex max-h-[54vh] justify-center overflow-hidden rounded-[24px] bg-[#f7fbff] p-3">
                      <img
                        src={shareSourceImageUrl}
                        alt="作品分享预览"
                        className="aspect-[4/5] max-h-[50vh] max-w-full rounded-[18px] object-contain"
                      />
                    </div>
                  )
                ) : (
                  <div className="mt-4 flex aspect-[4/5] items-center justify-center rounded-[24px] bg-[#f7fbff] text-sm font-bold text-slate-400">
                    正在准备预览
                  </div>
                )}
              </section>

              <section className="space-y-4">
                <div className="rounded-[26px] bg-white p-5 shadow-[0_16px_36px_rgba(148,163,184,0.1)]">
                  <label
                    htmlFor="share-title"
                    className="text-xs font-bold tracking-[0.14em] text-slate-400"
                  >
                    分享标题
                  </label>
                  <input
                    id="share-title"
                    value={shareTitle}
                    maxLength={48}
                    onChange={(event) => {
                      setShareTitle(event.target.value);
                      setShareTitleError("");
                    }}
                    placeholder="给作品起一个标题"
                    className="mt-3 w-full rounded-[18px] border border-[#dce7ff] bg-[#fbfdff] px-4 py-3 text-base font-black text-slate-700 outline-none transition focus:bg-white focus:shadow-[0_0_0_4px_rgba(219,234,254,0.55)]"
                  />
                  {shareTitleError && (
                    <p className="mt-2 text-sm font-bold text-[#d45b85]">
                      {shareTitleError}
                    </p>
                  )}
                </div>

                <div className="rounded-[26px] bg-white p-5 shadow-[0_16px_36px_rgba(148,163,184,0.1)]">
                  <label
                    htmlFor="share-description"
                    className="text-xs font-bold tracking-[0.14em] text-slate-400"
                  >
                    分享描述
                  </label>
                  <textarea
                    id="share-description"
                    value={shareDescription}
                    maxLength={160}
                    onChange={(event) => setShareDescription(event.target.value)}
                    placeholder="可以补充作品亮点、玩法或创作想法，不填也可以。"
                    className="mt-3 min-h-[112px] w-full resize-none rounded-[18px] border border-[#dce7ff] bg-[#fbfdff] px-4 py-3 text-sm leading-7 text-slate-700 outline-none transition placeholder:text-slate-400 focus:bg-white focus:shadow-[0_0_0_4px_rgba(219,234,254,0.55)]"
                  />
                </div>

                <div className="rounded-[26px] bg-white p-5 shadow-[0_16px_36px_rgba(148,163,184,0.1)]">
                  <p className="text-xs font-bold tracking-[0.14em] text-slate-400">
                    提示词内容
                  </p>
                  <p className="mt-3 max-h-[160px] overflow-y-auto whitespace-pre-wrap text-sm leading-7 text-slate-600">
                    {getSharePrompt()}
                  </p>
                </div>

                <div className="rounded-[24px] bg-[#fff7e8] px-4 py-3 text-sm font-bold leading-7 text-[#b7791f]">
                  分享后会优先经过规则审核，再进入智能复审，确保社区内容适合孩子们公开浏览。
                </div>
              </section>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsShareConfirmOpen(false)}
                className="rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-500 shadow-[0_12px_24px_rgba(148,163,184,0.12)]"
              >
                再看看
              </button>
              <button
                type="button"
                onClick={handleShareToCommunity}
                disabled={isSharing}
                className="rounded-full bg-[linear-gradient(90deg,#ffd9ea_0%,#ffe7c7_52%,#dcecff_100%)] px-6 py-3 text-sm font-black text-slate-700 shadow-[0_16px_34px_rgba(251,191,188,0.24)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSharing ? "正在送往社区" : "确认分享"}
              </button>
            </div>
          </div>
        </div>
      )}

      {shareFeedback && (
        <div className="absolute inset-0 z-[80] flex items-center justify-center bg-[#7d8eb0]/20 px-6 backdrop-blur-md">
          <div className="w-full max-w-xl rounded-[36px] bg-white p-8 text-center shadow-[0_28px_80px_rgba(148,163,184,0.24)]">
            <div
              className={`mx-auto grid h-20 w-20 place-items-center rounded-[28px] text-3xl font-black shadow-[0_16px_36px_rgba(148,163,184,0.12)] ${
                shareFeedback.type === "success"
                  ? "bg-gradient-to-br from-[#dff8ea] to-[#e8fff4] text-[#1e9b66]"
                  : shareFeedback.type === "pending"
                    ? "bg-gradient-to-br from-[#fff3d4] to-[#fff8e8] text-[#c88914]"
                    : "bg-gradient-to-br from-[#ffe5eb] to-[#fff2f5] text-[#d45b85]"
              }`}
            >
              {shareFeedback.type === "success"
                ? "成"
                : shareFeedback.type === "pending"
                  ? "审"
                  : "改"}
            </div>
            <h3 className="mt-6 font-['STZhongsong','Songti_SC','PingFang_SC',serif] text-[34px] font-black tracking-[-0.05em] text-slate-700">
              {shareFeedback.title}
            </h3>
            <p className="mt-4 text-[15px] leading-8 text-slate-500">
              {shareFeedback.message}
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {shareFeedback.type === "success" && (
                <button
                  type="button"
                  onClick={() => {
                    setShareFeedback(null);
                    router.push("/community");
                  }}
                  className="rounded-full bg-[#eef6ff] px-5 py-3 text-sm font-bold text-[#4b8fd6] shadow-[0_12px_24px_rgba(125,211,252,0.14)]"
                >
                  去社区看看
                </button>
              )}

              {shareFeedback.type === "pending" && (
                <button
                  type="button"
                  onClick={() => {
                    setShareFeedback(null);
                    router.push("/profile");
                  }}
                  className="rounded-full bg-[#fff6dc] px-5 py-3 text-sm font-bold text-[#c88914] shadow-[0_12px_24px_rgba(251,191,36,0.14)]"
                >
                  去我的主页查看状态
                </button>
              )}

              <button
                type="button"
                onClick={() => setShareFeedback(null)}
                className="rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-500 shadow-[0_12px_24px_rgba(148,163,184,0.12)]"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}

      {loginPromptMessage && (
        <div className="absolute inset-0 z-[82] flex items-center justify-center bg-[#7d8eb0]/22 px-6 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-[34px] bg-white p-8 text-center shadow-[0_28px_80px_rgba(148,163,184,0.24)]">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-[28px] bg-[linear-gradient(135deg,#eef4ff,#f7f1ff)] text-3xl font-black text-[#6b7fe8] shadow-[0_16px_36px_rgba(148,163,184,0.12)]">
              登
            </div>
            <h3 className="mt-6 font-['STZhongsong','Songti_SC','PingFang_SC',serif] text-[32px] font-black tracking-[-0.05em] text-slate-700">
              需要重新确认登录
            </h3>
            <p className="mt-4 text-[15px] leading-8 text-slate-500">
              {loginPromptMessage}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => setLoginPromptMessage("")}
                className="rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-500 shadow-[0_12px_24px_rgba(148,163,184,0.12)]"
              >
                先留在这里
              </button>
              <button
                type="button"
                onClick={redirectToLogin}
                className="rounded-full bg-[#eef4ff] px-5 py-3 text-sm font-black text-[#4b8fd6] shadow-[0_12px_24px_rgba(125,211,252,0.14)]"
              >
                去重新登录
              </button>
            </div>
          </div>
        </div>
      )}

      {isCodeGuideOpen && (
        <div className="absolute inset-0 z-[85] flex items-center justify-center bg-[#7d8eb0]/22 px-4 py-6 backdrop-blur-md">
          <div className="flex h-full max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-[34px] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,255,0.98))] shadow-[0_28px_80px_rgba(148,163,184,0.26)]">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e6eeff] px-6 py-5">
              <div>
                <p className="text-sm font-bold tracking-[0.16em] text-[#8aa0ca]">
                  小程序拆解课
                </p>
                <h3 className="mt-2 font-['STZhongsong','Songti_SC','PingFang_SC',serif] text-[30px] font-black text-slate-700">
                  先认功能积木，再认识背后的代码
                </h3>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">
                  左边不是冷冰冰的代码说明，而是一块一块可以看懂的功能积木。孩子可以先知道“这块负责什么”，再慢慢打开原始代码，看看真正的代码长什么样。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCodeGuideOpen(false)}
                className="grid h-11 w-11 place-items-center rounded-full bg-white text-xl font-black text-slate-400 shadow-[0_12px_24px_rgba(148,163,184,0.12)] transition hover:text-slate-600"
              >
                ×
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
              <div className="grid gap-5 xl:grid-cols-[460px_minmax(0,1fr)]">
                <section className="min-h-0 rounded-[28px] border border-[#f3d6e7] bg-[linear-gradient(180deg,#fff8fc_0%,#f9fbff_100%)] p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold tracking-[0.14em] text-[#d26a95]">
                        功能积木地图
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        先看懂这块积木在做什么，再去看它背后的原始代码。小朋友可以像拼积木一样，认识一个作品是怎么搭起来的。
                      </p>
                    </div>
                    <div className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#7a67db] shadow-[0_10px_20px_rgba(129,140,248,0.12)]">
                      共 {codeGuideRows.length} 块积木
                    </div>
                  </div>

                  <div className="max-h-[64vh] space-y-3 overflow-auto pr-1">
                    {codeGuideRows.map((row) => {
                      const targetMeta = codeGuideTargetMeta[row.previewTarget];
                      const isActiveGuide =
                        selectedCodeGuideMarkerId === row.markerId;

                      return (
                        <button
                          key={`guide-${row.markerId}`}
                          type="button"
                          onClick={() => setActiveCodeGuideMarkerId(row.markerId)}
                          className={`block w-full overflow-hidden rounded-[24px] border text-left shadow-[0_10px_24px_rgba(148,163,184,0.08)] transition ${
                            isActiveGuide
                              ? `border-[#7a67db] bg-gradient-to-br ${targetMeta.accentClass} shadow-[0_16px_36px_rgba(129,140,248,0.18)]`
                              : `border-white/80 bg-gradient-to-br ${targetMeta.accentClass}`
                          }`}
                        >
                          <div className="border-b border-white/70 px-4 py-4">
                            <div className="flex items-start gap-3">
                              <span
                                className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${targetMeta.markerClass} text-sm font-black text-white`}
                              >
                                {row.markerId}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-base font-black text-slate-700">
                                    {targetMeta.title}
                                  </p>
                                  <span
                                    className={`rounded-full px-3 py-1 text-[11px] font-black ${targetMeta.chipClass}`}
                                  >
                                    {targetMeta.badge}
                                  </span>
                                </div>
                                <p className="mt-2 text-sm font-bold leading-7 text-slate-600">
                                  {targetMeta.mission}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="px-4 py-4">
                            <div className="rounded-[18px] bg-white/88 px-4 py-4">
                              <p className="text-[11px] font-black tracking-[0.14em] text-slate-400">
                                这块积木现在做的事
                              </p>
                              <p className="mt-2 text-sm font-bold leading-7 text-slate-700">
                                {row.meaning}
                              </p>
                            </div>

                            <div className="mt-3 flex items-center gap-2 text-[#7a67db]">
                              <span className="text-xl font-black">→</span>
                              <span className="text-xs font-black tracking-[0.12em]">
                                点我，在右边看这个功能点
                              </span>
                            </div>

                            <details className="mt-3 rounded-[18px] bg-[#0f172a] px-4 py-3 text-[#dbeafe]">
                              <summary className="cursor-pointer list-none text-xs font-black tracking-[0.12em] text-[#9ec5ff]">
                                打开看原始代码
                              </summary>
                              <div className="mt-3 border-t border-white/10 pt-3">
                                <p className="mb-2 text-[11px] font-bold text-[#93c5fd]">
                                  第 {row.lineNumber} 行
                                </p>
                                <div className="font-mono text-xs leading-6">
                                  {row.code}
                                </div>
                              </div>
                            </details>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="min-h-0 rounded-[28px] border border-[#dce7ff] bg-[linear-gradient(180deg,#f6f9ff_0%,#eef5ff_100%)] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.5)]">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold tracking-[0.14em] text-[#8fb5ff]">
                        功能落点预览区
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        先点左边的一块积木，右边就会只出现这一块负责的位置。
                      </p>
                    </div>
                    <div className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500 shadow-[0_10px_20px_rgba(148,163,184,0.12)]">
                      一次只看一块，更容易学会
                    </div>
                  </div>

                  <div className="flex min-h-[66vh] rounded-[24px] bg-[linear-gradient(180deg,rgba(225,236,255,0.66),rgba(240,246,255,0.88))] p-4">
                    <div className="relative flex h-full min-h-[62vh] w-full overflow-hidden rounded-[22px] border border-[#dce7ff] bg-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.72)]">
                      <iframe
                        ref={codeGuidePreviewIframeRef}
                        title="代码对应预览"
                        className="block h-full min-h-[62vh] w-full bg-white"
                        srcDoc={codingPreviewDoc}
                        scrolling="yes"
                      />

                      {!selectedCodeGuideMarkerId && (
                        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-white/58 backdrop-blur-[2px]">
                          <div className="rounded-[24px] bg-white/96 px-6 py-5 text-center shadow-[0_18px_40px_rgba(148,163,184,0.14)]">
                            <p className="text-sm font-black text-[#7a67db]">
                              先点左边的一块功能积木
                            </p>
                            <p className="mt-2 text-sm leading-7 text-slate-500">
                              右边就会告诉你，这块积木在作品里负责哪里。
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="pointer-events-none absolute inset-0 z-20">
                        {codeGuideRows.map((row) => {
                          if (row.markerId !== selectedCodeGuideMarkerId) {
                            return null;
                          }

                          const layout = codeGuideMarkerLayouts[row.markerId];

                          if (!layout || !layout.visible) {
                            return null;
                          }

                          const translateClass =
                            layout.align === "end"
                              ? "-translate-x-full"
                              : layout.align === "center"
                                ? "-translate-x-1/2"
                                : "";
                          const labelAlignClass =
                            layout.align === "end"
                              ? "flex-row-reverse text-right"
                              : "text-left";
                          const showLabel = !layout.compact;

                          return (
                            <div
                              key={`marker-${row.markerId}`}
                              className={`absolute ${translateClass}`}
                              style={{
                                top: `${layout.top}px`,
                                left: `${layout.left}px`,
                              }}
                            >
                              <div
                                className={`flex items-center gap-2 ${labelAlignClass}`}
                              >
                                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#7a67db] text-sm font-black text-white shadow-[0_10px_24px_rgba(129,140,248,0.28)]">
                                  {row.markerId}
                                </span>
                                {showLabel && (
                                  <span className="hidden max-w-[110px] rounded-full bg-white/94 px-3 py-1 text-xs font-black leading-5 text-[#7a67db] shadow-[0_10px_20px_rgba(148,163,184,0.12)] md:block">
                                    {row.area}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export function WorkshopClientPage() {
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

export default WorkshopClientPage;
