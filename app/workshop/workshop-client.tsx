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
  type ChangeEvent,
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

const compositionTopicBank = [
  {
    grade: "一年级",
    semesters: {
      上学期: ["看图写话：秋天来了", "我的新朋友", "可爱的小动物", "快乐的一天"],
      下学期: ["春天来了", "我学会了", "帮家人做一件事", "我喜欢的玩具"],
    },
  },
  {
    grade: "二年级",
    semesters: {
      上学期: ["我喜欢的玩具", "有趣的一天", "小动物观察记", "看图讲故事"],
      下学期: ["我的好朋友", "难忘的节日", "如果我会飞", "我的小制作"],
    },
  },
  {
    grade: "三年级",
    semesters: {
      上学期: ["猜猜他是谁", "我来编童话", "续写故事", "这儿真美", "写日记"],
      下学期: ["我的植物朋友", "身边有特点的人", "国宝大熊猫", "奇妙的想象"],
    },
  },
  {
    grade: "四年级",
    semesters: {
      上学期: ["推荐一个好地方", "小小动物园", "写观察日记", "我和神话人物过一天"],
      下学期: ["我的乐园", "我的奇思妙想", "游览过的地方", "我学会了", "故事新编"],
    },
  },
  {
    grade: "五年级",
    semesters: {
      上学期: ["我的心爱之物", "漫画老师", "二十年后的家乡", "介绍一种事物", "推荐一本书"],
      下学期: ["那一刻我长大了", "他陶醉了", "形形色色的人", "中国的世界文化遗产", "神奇的探险之旅"],
    },
  },
  {
    grade: "六年级",
    semesters: {
      上学期: ["变形记", "多彩的活动", "笔尖流出的故事", "围绕中心意思写", "我的拿手好戏"],
      下学期: ["家乡的风俗", "写作品梗概", "让真情自然流露", "心愿", "插上科学的翅膀飞"],
    },
  },
] as const;

const handbillTopics = [
  {
    label: "国庆节",
    note: "红色主题",
    prompt:
      "画一张小学生国庆节主题手抄报模板，标题写“喜迎国庆”，画面有五星红旗、天安门、灯笼、烟花、和平鸽和长城元素，整体喜庆明亮，保留3个干净的文字框和清晰标题区，不要生成密集小字。",
  },
  {
    label: "五一劳动节",
    note: "劳动最光荣",
    prompt:
      "画一张小学生五一劳动节主题手抄报模板，标题写“劳动最光荣”，画面有工人、农民、医生、老师、清洁员等劳动者元素，色彩温暖阳光，保留多个空白文字框，适合孩子后期填写内容。",
  },
  {
    label: "端午节",
    note: "传统节日",
    prompt:
      "画一张小学生端午节主题手抄报模板，标题写“粽香端午”，画面有粽子、龙舟、艾草、香囊、江水波纹和中国风边框，配色清新，保留空白文字区，不要生成大段文字。",
  },
  {
    label: "读书",
    note: "阅读成长",
    prompt:
      "画一张小学生读书主题手抄报模板，标题写“快乐阅读”，画面有翻开的书、书架、小台灯、星星、孩子读书和知识小树，风格温柔清爽，保留4个文字框，适合填写读书名言和阅读心得。",
  },
  {
    label: "科技",
    note: "未来探索",
    prompt:
      "画一张小学生科技主题手抄报模板，标题写“科技点亮未来”，画面有火箭、机器人、星球、芯片、实验器材和未来城市，蓝白配色，科技感但要可爱，保留清楚的文字框和标题区。",
  },
  {
    label: "英语",
    note: "English",
    prompt:
      "画一张小学生英语主题手抄报模板，标题写“Happy English”，画面有英文字母、单词卡片、地球、书本、彩虹和可爱对话气泡，色彩活泼，保留空白文字框，方便填写英语单词和短句。",
  },
] as const;

const videoCreationPresets = [
  {
    label: "作文朗读视频",
    note: "作品展示",
    template:
      "请把下面这篇小学生作文变成一个适合孩子展示的朗读视频。画面要像温柔的动画绘本：有孩子在书桌前朗读、作文内容对应的场景插画、镜头缓慢推进、字幕感留白、明亮干净、适合校园展示。不要生成真实人物特写，不要出现复杂文字。作文内容：",
  },
  {
    label: "演讲小主播",
    note: "上台练习",
    template:
      "请把下面这段演讲稿变成一个小学生上台演讲练习视频。画面要有明亮教室、小舞台、孩子背影或卡通小主播、观众掌声、自然镜头切换，氛围自信温暖，适合练习表达。不要生成密集文字。演讲稿内容：",
  },
  {
    label: "绘本动画",
    note: "故事成片",
    template:
      "请把下面的故事变成一段儿童绘本动画视频。画面要有清晰的主角、连续场景、柔和色彩、轻微镜头运动和温暖童话氛围，像一本绘本被慢慢翻开。不要生成恐怖或危险画面。故事内容：",
  },
  {
    label: "知识讲解",
    note: "科普表达",
    template:
      "请把下面这段知识内容变成一段适合小学生看的科普讲解视频。画面要有卡通黑板、简单图示、关键物体动画、清楚的镜头层次和轻松课堂感，不要出现密集小字。讲解内容：",
  },
] as const;

const speechVoiceOptions = [
  { id: "alex", label: "阳光男声", description: "清楚稳重，适合朗读作文" },
  { id: "anna", label: "温柔女声", description: "亲切自然，适合讲故事" },
  { id: "bella", label: "活泼女声", description: "明亮有精神，适合儿童内容" },
  { id: "benjamin", label: "沉稳男声", description: "适合演讲稿和说明文" },
  { id: "charles", label: "故事男声", description: "节奏感更强，适合绘本旁白" },
  { id: "claire", label: "清亮女声", description: "适合诗歌和短文朗读" },
  { id: "david", label: "自然男声", description: "适合知识讲解" },
  { id: "diana", label: "柔和女声", description: "适合睡前故事和温柔朗读" },
] as const;

const speechTextPresets = [
  {
    label: "作文朗读",
    text: "请把这里替换成孩子写好的作文。朗读时语气自然、有感情，停顿清楚。",
  },
  {
    label: "演讲练习",
    text: "大家好，我今天演讲的题目是：请把这里替换成演讲稿内容。",
  },
  {
    label: "故事旁白",
    text: "从前，有一个充满想象力的小朋友，开始了一段奇妙的冒险。",
  },
  {
    label: "英语跟读",
    text: "Hello everyone. Today I want to share a happy story with you.",
  },
] as const;

const modeTabs = [
  { id: "coding", label: "AI编程", subtitle: "做出会互动的小程序" },
  { id: "writing", label: "AI写作", subtitle: "把念头写成完整文章" },
  { id: "painting", label: "AI绘画", subtitle: "把想象变成一张画" },
  { id: "music", label: "AI语音", subtitle: "把文字变成朗读音频" },
  { id: "video", label: "AI视频", subtitle: "生成故事短片" },
  { id: "modeling", label: "AI建模", subtitle: "搭建立体小世界" },
] as const;

const LANDSCAPE_STAGE_WIDTH = 1648;
const LANDSCAPE_STAGE_HEIGHT = 1040;
const LANDSCAPE_STAGE_GUTTER = 20;

type ModeId = (typeof modeTabs)[number]["id"];
type ShareableMode = Extract<ModeId, "coding" | "writing" | "painting">;
type PromptTarget = "coding" | "writing" | "painting" | "speech" | "video";

type AiCapabilitiesMap = Partial<
  Record<
    "coding" | "writing" | "painting" | "video" | "speech" | "transcribe" | "promptOptimize",
    {
      isEnabled: boolean;
      modeName: string;
      extraPayload: Record<string, unknown>;
    }
  >
>;

type CodingModelAttempt = {
  slot: "A" | "B" | "C";
  label: string;
  model: string;
  endpointUrl: string;
  result:
    | "success"
    | "failure"
    | "timeout"
    | "skipped_missing_key"
    | "stopped"
    | "cooldown_skipped";
  status?: number;
  message?: string;
};

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
  speechText: string;
  videoPrompt: string;
  generatedCode: string;
  generatedImageUrl: string;
  generatedSpeechUrl: string;
  generatedVideoUrl: string;
};

type CommunityReusePayload = {
  post: {
    id: string;
    mode: "coding" | "writing" | "painting";
    title: string;
    description: string | null;
    prompt: string;
    preview_image_url: string;
    preview_code: string;
    moderation_status: "draft" | "pending" | "approved" | "rejected";
  };
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

function wrapCanvasText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
  options?: {
    shouldEllipsize?: boolean;
  },
) {
  const normalizedText = text.replace(/\s+/g, " ").trim();

  if (!normalizedText) {
    return [""];
  }

  const tokens = Array.from(normalizedText);
  const lines: string[] = [];
  let currentLine = "";

  tokens.forEach((token) => {
    const nextLine = `${currentLine}${token}`;

    if (!currentLine || context.measureText(nextLine).width <= maxWidth) {
      currentLine = nextLine;
      return;
    }

    lines.push(currentLine);
    currentLine = token;
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  if (lines.length <= maxLines) {
    return lines;
  }

  const clippedLines = lines.slice(0, maxLines);

  if (!options?.shouldEllipsize) {
    return clippedLines;
  }

  const ellipsis = "...";
  let lastLine = clippedLines[maxLines - 1] ?? "";

  while (
    lastLine &&
    context.measureText(`${lastLine}${ellipsis}`).width > maxWidth
  ) {
    lastLine = lastLine.slice(0, -1);
  }

  clippedLines[maxLines - 1] = `${lastLine}${ellipsis}`;

  return clippedLines;
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
    speechText: typeof draft.speechText === "string" ? draft.speechText : "",
    videoPrompt: typeof draft.videoPrompt === "string" ? draft.videoPrompt : "",
    generatedCode:
      typeof draft.generatedCode === "string" && draft.generatedCode.trim()
        ? draft.generatedCode
        : defaultPreviewHtml,
    generatedImageUrl:
      typeof draft.generatedImageUrl === "string"
        ? draft.generatedImageUrl
        : "",
    generatedSpeechUrl:
      typeof draft.generatedSpeechUrl === "string"
        ? draft.generatedSpeechUrl
        : "",
    generatedVideoUrl:
      typeof draft.generatedVideoUrl === "string"
        ? draft.generatedVideoUrl
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
  Exclude<ModeId, "coding" | "painting" | "writing" | "music">,
  { title: string; description: string; badge: string }
> = {
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

const codingCompileMessages = [
  "正在为你整理代码结构",
  "正在检查页面样式和脚本",
  "正在把代码编译成可运行预览",
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

const ensurePreviewHtmlDocument = (rawHtml: string) => {
  let cleanedHtml = rawHtml
    .replace(/```(?:html|htm|xml)?/gi, "")
    .replace(/```/g, "")
    .trim();

  cleanedHtml = cleanedHtml
    .replace(/^\uFEFF/, "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<\|[^>]+?\|>/g, "")
    .trim();

  const wrappedByQuotes =
    (cleanedHtml.startsWith('"') && cleanedHtml.endsWith('"')) ||
    (cleanedHtml.startsWith("'") && cleanedHtml.endsWith("'"));
  const serializedEscapeCount =
    cleanedHtml.match(/\\(?:r|n|t|"|'|\\|u[0-9a-fA-F]{4})/g)?.length ?? 0;

  if (wrappedByQuotes || serializedEscapeCount >= 3) {
    cleanedHtml = cleanedHtml
      .replace(/^['"]|['"]$/g, "")
      .replace(/\\r\\n/g, "\n")
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\u003[cC]/g, "<")
      .replace(/\\u003[eE]/g, ">")
      .replace(/\\u0026/gi, "&")
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'")
      .replace(/\\\\/g, "\\")
      .trim();
  }

  const htmlStartIndex = cleanedHtml.search(/<!doctype html|<html\b/i);

  if (htmlStartIndex > 0) {
    cleanedHtml = cleanedHtml.slice(htmlStartIndex).trim();
  }

  if (!cleanedHtml) {
    return defaultPreviewHtml;
  }

  const normalizedHtml = cleanedHtml.toLowerCase();

  if (
    normalizedHtml.startsWith("<!doctype html") ||
    normalizedHtml.startsWith("<html")
  ) {
    return cleanedHtml;
  }

  return `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      * { box-sizing: border-box; }
      html, body { width: 100%; min-height: 100vh; margin: 0; }
      body {
        font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
        background: linear-gradient(180deg, #f8fbff 0%, #fff7fb 46%, #edf6ff 100%);
        color: #334155;
      }
      .preview-shell {
        min-height: 100vh;
        padding: 24px;
      }
      pre {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
        font: 14px/1.75 Consolas, "SFMono-Regular", Monaco, monospace;
      }
    </style>
  </head>
  <body>
    <main class="preview-shell">
      <pre>${cleanedHtml
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")}</pre>
    </main>
  </body>
</html>`;
};

const getCodingAttemptResultLabel = (result: CodingModelAttempt["result"]) => {
  switch (result) {
    case "success":
      return "已成功";
    case "failure":
      return "失败";
    case "timeout":
      return "超时";
    case "skipped_missing_key":
      return "缺少密钥";
    case "stopped":
      return "已停止";
    case "cooldown_skipped":
      return "冷却跳过";
    default:
      return "处理中";
  }
};

const getCodingAttemptResultTone = (result: CodingModelAttempt["result"]) => {
  switch (result) {
    case "success":
      return "bg-[#ecfdf3] text-[#16794d]";
    case "failure":
    case "timeout":
    case "stopped":
      return "bg-[#fff1f2] text-[#d45b85]";
    case "skipped_missing_key":
    case "cooldown_skipped":
      return "bg-[#fff8e8] text-[#c5871f]";
    default:
      return "bg-[#eef4ff] text-[#4b6fcc]";
  }
};

const buildStreamingCodePreviewHtml = (rawCode: string) => {
  const escapedCode = rawCode
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      * { box-sizing: border-box; }
      html, body { width: 100%; min-height: 100vh; margin: 0; }
      body {
        font-family: Consolas, "SFMono-Regular", Monaco, "Courier New", monospace;
        background: linear-gradient(180deg, #f8fbff 0%, #fff7fb 48%, #edf6ff 100%);
        color: #334155;
      }
      .shell {
        min-height: 100vh;
        padding: 20px;
      }
      .card {
        min-height: calc(100vh - 40px);
        border-radius: 24px;
        border: 1px solid #dbe7ff;
        background: rgba(255,255,255,0.92);
        box-shadow: 0 18px 40px rgba(148,163,184,0.10);
        overflow: hidden;
      }
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 16px 18px;
        border-bottom: 1px solid #e5edff;
        background: rgba(248,251,255,0.95);
      }
      .badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border-radius: 999px;
        background: #eef4ff;
        color: #4b6fcc;
        padding: 8px 12px;
        font-size: 12px;
        font-weight: 700;
      }
      .dot {
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: #7d8cff;
        animation: pulse 1.2s ease-in-out infinite;
      }
      .hint {
        color: #64748b;
        font-size: 12px;
        font-weight: 700;
      }
      pre {
        margin: 0;
        min-height: calc(100vh - 90px);
        padding: 20px;
        white-space: pre-wrap;
        word-break: break-word;
        font: 13px/1.75 Consolas, "SFMono-Regular", Monaco, "Courier New", monospace;
      }
      @keyframes pulse {
        0%, 100% { opacity: 0.35; transform: scale(0.92); }
        50% { opacity: 1; transform: scale(1); }
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <section class="card">
        <header class="header">
          <div class="badge"><span class="dot"></span> AI 正在生成代码</div>
          <div class="hint">代码写完后会自动切换到可运行预览</div>
        </header>
        <pre>${escapedCode}</pre>
      </section>
    </main>
  </body>
</html>`;
};

async function playStreamingCodePreview(input: {
  rawCode: string;
  setStreamingCodePreview: (value: string) => void;
  setCodingTaskMessage: (value: string) => void;
}) {
  const source = input.rawCode.trim();

  if (!source) {
    input.setStreamingCodePreview("");
    return;
  }

  const maxAnimatedLength = 18000;
  const animationSource =
    source.length > maxAnimatedLength
      ? `${source.slice(0, maxAnimatedLength)}\n\n<!-- 代码较长，剩余部分正在继续整理 -->`
      : source;

  const step =
    animationSource.length > 12000
      ? 360
      : animationSource.length > 6000
        ? 220
        : 120;

  let cursor = 0;

  while (cursor < animationSource.length) {
    cursor = Math.min(animationSource.length, cursor + step);
    input.setStreamingCodePreview(
      buildStreamingCodePreviewHtml(animationSource.slice(0, cursor)),
    );
    input.setCodingTaskMessage("代码已经生成完成，正在为你整理并编译预览。");
    await new Promise((resolve) => window.setTimeout(resolve, 36));
  }
}

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
  const hasAppliedCommunityReuseRef = useRef(false);
  const [isDraftRestoreReady, setIsDraftRestoreReady] = useState(false);
  const [promptText, setPromptText] = useState("");
  const [writingPrompt, setWritingPrompt] = useState("");
  const [writingResult, setWritingResult] = useState("");
  const [drawingPrompt, setDrawingPrompt] = useState("");
  const [selectedCompositionGrade, setSelectedCompositionGrade] = useState("三年级");
  const [speechText, setSpeechText] = useState("");
  const [speechVoice, setSpeechVoice] = useState<(typeof speechVoiceOptions)[number]["id"]>("alex");
  const [speechSpeed, setSpeechSpeed] = useState(1);
  const [speechGain, setSpeechGain] = useState(0);
  const [videoPrompt, setVideoPrompt] = useState("");
  const [videoSpeedMode, setVideoSpeedMode] = useState<"fast" | "quality">("fast");
  const [videoTaskIdInput, setVideoTaskIdInput] = useState("");
  const [isVideoTaskLookupOpen, setIsVideoTaskLookupOpen] = useState(false);
  const [aiCapabilities, setAiCapabilities] = useState<AiCapabilitiesMap>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isCodingCompiling, setIsCodingCompiling] = useState(false);
  const [isWritingLoading, setIsWritingLoading] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSpeechGenerating, setIsSpeechGenerating] = useState(false);
  const [isVideoGenerating, setIsVideoGenerating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTarget, setRecordingTarget] = useState<PromptTarget>("coding");
  const [isOptimizingPrompt, setIsOptimizingPrompt] = useState(false);
  const [optimizingTarget, setOptimizingTarget] = useState<PromptTarget>("coding");
  const [voiceError, setVoiceError] = useState("");
  const [optimizeError, setOptimizeError] = useState("");
  const [writingError, setWritingError] = useState("");
  const [generatedCode, setGeneratedCode] = useState(defaultPreviewHtml);
  const [streamingCodePreview, setStreamingCodePreview] = useState("");
  const [generatedImageUrl, setGeneratedImageUrl] = useState("");
  const [generatedSpeechUrl, setGeneratedSpeechUrl] = useState("");
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState("");
  const [drawingReferenceImages, setDrawingReferenceImages] = useState<string[]>([]);
  const [drawingError, setDrawingError] = useState("");
  const [speechError, setSpeechError] = useState("");
  const [videoError, setVideoError] = useState("");
  const [codingTaskMessage, setCodingTaskMessage] = useState("");
  const [codingModelAttempts, setCodingModelAttempts] = useState<
    CodingModelAttempt[]
  >([]);
  const [videoTaskMessage, setVideoTaskMessage] = useState("");
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [codingCompileMessageIndex, setCodingCompileMessageIndex] = useState(0);
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
  const [isLandscapeCompactViewport, setIsLandscapeCompactViewport] =
    useState(false);
  const [landscapeStageScale, setLandscapeStageScale] = useState(1);
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
  const isSpeechMode = activeMode === "music";
  const isVideoMode = activeMode === "video";
  const transcribeEnabled = aiCapabilities.transcribe?.isEnabled !== false;
  const promptOptimizeEnabled =
    aiCapabilities.promptOptimize?.isEnabled !== false;
  const paintingSupportsImageEditing =
    aiCapabilities.painting?.extraPayload?.supportsImageEditing === true;
  const selectedCompositionGroup =
    compositionTopicBank.find((item) => item.grade === selectedCompositionGrade) ??
    compositionTopicBank[2];
  const compositionTopicsBySemester = selectedCompositionGroup.semesters;
  const activeShareMode: ShareableMode | null =
    isCodingMode || isWritingMode || isPaintingMode
      ? (activeMode as ShareableMode)
      : null;
  const hasGeneratedCode =
    Boolean(generatedCode.trim()) && generatedCode !== defaultPreviewHtml;
  const codingPreviewDoc = hasGeneratedCode ? generatedCode : defaultPreviewHtml;
  const hasStreamingCodePreview = Boolean(streamingCodePreview.trim());
  const codeGuideRows = useMemo(
    () => buildCodeGuideRows(codingPreviewDoc),
    [codingPreviewDoc],
  );

  useEffect(() => {
    const syncLandscapeStage = () => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const compactLandscape =
        viewportWidth <= 1100 && viewportWidth > viewportHeight;

      setIsLandscapeCompactViewport(compactLandscape);

      if (!compactLandscape) {
        setLandscapeStageScale(1);
        return;
      }

      const availableWidth = Math.max(
        viewportWidth - LANDSCAPE_STAGE_GUTTER,
        320,
      );
      const availableHeight = Math.max(
        viewportHeight - LANDSCAPE_STAGE_GUTTER,
        320,
      );
      const nextScale = Math.min(
        availableWidth / LANDSCAPE_STAGE_WIDTH,
        availableHeight / LANDSCAPE_STAGE_HEIGHT,
      );

      setLandscapeStageScale(
        Number.isFinite(nextScale) ? Math.max(nextScale, 0.32) : 1,
      );
    };

    syncLandscapeStage();
    window.addEventListener("resize", syncLandscapeStage);
    window.addEventListener("orientationchange", syncLandscapeStage);

    return () => {
      window.removeEventListener("resize", syncLandscapeStage);
      window.removeEventListener("orientationchange", syncLandscapeStage);
    };
  }, []);
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
      speechText,
      videoPrompt,
      generatedCode,
      generatedImageUrl,
      generatedSpeechUrl,
      generatedVideoUrl,
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

  const getPromptValueByTarget = (target: PromptTarget) => {
    if (target === "coding") {
      return promptText;
    }

    if (target === "writing") {
      return writingPrompt;
    }

    if (target === "painting") {
      return drawingPrompt;
    }

    if (target === "speech") {
      return speechText;
    }

    return videoPrompt;
  };

  const setPromptValueByTarget = (target: PromptTarget, value: string) => {
    if (target === "coding") {
      setPromptText(value);
      return;
    }

    if (target === "writing") {
      setWritingPrompt(value);
      return;
    }

    if (target === "painting") {
      setDrawingPrompt(value);
      return;
    }

    if (target === "speech") {
      setSpeechText(value);
      return;
    }

    setVideoPrompt(value);
  };

  const appendPromptValueByTarget = (target: PromptTarget, value: string) => {
    const currentValue = getPromptValueByTarget(target).trim();
    setPromptValueByTarget(
      target,
      currentValue ? `${currentValue}\n${value}` : value,
    );
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
          setSpeechText(savedDraft.speechText);
          setVideoPrompt(savedDraft.videoPrompt);
          setGeneratedCode(savedDraft.generatedCode);
          setGeneratedImageUrl(savedDraft.generatedImageUrl);
          setGeneratedSpeechUrl(savedDraft.generatedSpeechUrl);
          setGeneratedVideoUrl(savedDraft.generatedVideoUrl);
        }
      } catch {
        window.sessionStorage.removeItem(WORKSHOP_DRAFT_STORAGE_KEY);
        window.localStorage.removeItem(LOCAL_WORKSHOP_DRAFT_STORAGE_KEY);
        window.console.error("创作草稿恢复失败");
      } finally {
        hasRestoredDraftRef.current = true;
        setIsDraftRestoreReady(true);
      }
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadAiCapabilities = async () => {
      try {
        const response = await fetch("/api/ai-capabilities", {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as {
          capabilities?: AiCapabilitiesMap;
        };

        if (!cancelled && data.capabilities) {
          setAiCapabilities(data.capabilities);
        }
      } catch {
        window.console.warn("AI 能力配置读取失败");
      }
    };

    void loadAiCapabilities();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isDraftRestoreReady || hasAppliedCommunityReuseRef.current) {
      return;
    }

    const fromCommunityPostId = searchParams.get("fromCommunity");

    if (!fromCommunityPostId) {
      return;
    }

    hasAppliedCommunityReuseRef.current = true;

    const applyCommunityReuse = async () => {
      try {
        const response = await fetch(`/api/community/posts/${fromCommunityPostId}`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as CommunityReusePayload & {
          error?: string;
        };

        if (!response.ok || !payload.post) {
          throw new Error(payload.error ?? "社区作品读取失败。");
        }

        const sourcePost = payload.post;

        if (sourcePost.mode === "writing") {
          setWritingPrompt(sourcePost.prompt);
          setWritingResult(sourcePost.preview_code);
          setDrawingPrompt("");
          setGeneratedImageUrl("");
          setSpeechText("");
          setGeneratedSpeechUrl("");
          setVideoPrompt("");
          setGeneratedVideoUrl("");
          setPromptText("");
          setGeneratedCode(defaultPreviewHtml);
        } else if (sourcePost.mode === "painting") {
          setDrawingPrompt(sourcePost.prompt);
          setGeneratedImageUrl(sourcePost.preview_image_url);
          setPromptText("");
          setGeneratedCode(defaultPreviewHtml);
          setWritingPrompt("");
          setWritingResult("");
          setSpeechText("");
          setGeneratedSpeechUrl("");
          setVideoPrompt("");
          setGeneratedVideoUrl("");
        } else {
          setPromptText(sourcePost.prompt);
          setGeneratedCode(
            sourcePost.preview_code.trim() ? sourcePost.preview_code : defaultPreviewHtml,
          );
          setWritingPrompt("");
          setWritingResult("");
          setDrawingPrompt("");
          setGeneratedImageUrl("");
          setSpeechText("");
          setGeneratedSpeechUrl("");
          setVideoPrompt("");
          setGeneratedVideoUrl("");
        }

        setShareMessage(`已载入《${sourcePost.title}》，现在可以继续修改和复用。`);
      } catch (error) {
        setShareMessage(
          error instanceof Error ? error.message : "社区作品复用失败，请稍后再试。",
        );
      }
    };

    void applyCommunityReuse();
  }, [isDraftRestoreReady, searchParams]);

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
          videoPrompt,
          generatedCode,
          generatedImageUrl,
          generatedVideoUrl,
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
    videoPrompt,
    generatedCode,
    generatedImageUrl,
    generatedVideoUrl,
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
    if (!isCodingCompiling) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setCodingCompileMessageIndex(
        (currentIndex) => (currentIndex + 1) % codingCompileMessages.length,
      );
    }, 1600);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isCodingCompiling]);

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

  const handleCompositionTopicClick = (
    topic: string,
    semester: "上学期" | "下学期",
  ) => {
    setWritingPrompt(
      `请按小学${selectedCompositionGrade}${semester}常见课内作文要求，帮我写一篇《${topic}》。要求：结构完整，有开头、经过和结尾；语言适合${selectedCompositionGrade}学生；内容具体，有细节描写和真情实感；不要写得太像模板；字数控制在适合这个年级的范围内。`,
    );
  };

  const handleHandbillTopicClick = (prompt: string) => {
    setDrawingPrompt(prompt);
  };

  const handleVideoPresetClick = (template: string) => {
    const existingPrompt = videoPrompt.trim();

    setVideoPrompt(`${template}${existingPrompt ? `\n${existingPrompt}` : "\n"}`);
  };

  const videoSpeedModes = [
    {
      key: "fast",
      label: "快速预览",
      note: "优先更快出片",
    },
    {
      key: "quality",
      label: "高清精制",
      note: "画质更好但更久",
    },
  ] as const;

  const checkExistingVideoTask = async (requestId: string) => {
    const trimmedRequestId = requestId.trim();

    if (!trimmedRequestId) {
      window.alert("请先输入任务号。");
      return;
    }

    setGeneratedVideoUrl("");
    setVideoError("");
    setVideoTaskMessage("正在查询视频任务，请稍等。");
    setIsVideoGenerating(true);

    try {
      const response = await fetch("/api/generate-video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requestId: trimmedRequestId }),
      });
      const { data, rawText } = await parseApiResponse<{
        videoUrl?: string;
        error?: string;
        message?: string;
        endpointUrl?: string;
        model?: string;
        status?: string;
      }>(response);

      if (response.status === 202) {
        setVideoError("这个任务还在生成中，请过一会儿再查询。任务号：" + trimmedRequestId);
        return;
      }

      if (!response.ok || !data?.videoUrl) {
        setVideoError(
          toReadableApiError(
            response,
            "任务查询失败，请确认任务号是否正确。",
            data?.error,
            rawText,
          ),
        );
        return;
      }

      setVideoTaskIdInput("");
      setVideoError("");
      setGeneratedVideoUrl(data.videoUrl);
    } catch {
      setVideoError("任务查询失败，请稍后再试。");
    } finally {
      setVideoTaskMessage("");
      setIsVideoGenerating(false);
    }
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
      return createWritingShareCoverImage({
        title: buildShareTitle(),
        prompt: getSharePrompt("writing"),
        result: writingResult.trim(),
      });
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

  const transcribeAudio = async (audioBlob: Blob, target: PromptTarget) => {
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
    appendPromptValueByTarget(target, recognizedText);
  };

  const handleVoiceMagic = async (target: PromptTarget) => {
    if (!transcribeEnabled) {
      setVoiceError("当前站点暂未开启语音识别功能。");
      return;
    }

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
      setOptimizeError("");
      setRecordingTarget(target);
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
          await transcribeAudio(audioBlob, target);
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

  const handleOptimizePrompt = async (target: PromptTarget) => {
    if (!promptOptimizeEnabled) {
      setOptimizeError("当前站点暂未开启提示词优化功能。");
      return;
    }

    const sourceText = getPromptValueByTarget(target).trim();

    if (!sourceText) {
      setOptimizeError("请先输入一点内容，再来优化提示词。");
      return;
    }

    setIsOptimizingPrompt(true);
    setOptimizingTarget(target);
    setOptimizeError("");
    setVoiceError("");

    try {
      const response = await fetch("/api/optimize-prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: sourceText,
        }),
      });
      const data = (await response.json()) as {
        optimizedPrompt?: string;
        error?: string;
        remainingCredits?: number;
      };

      if (response.status === 401) {
        showLoginPrompt(
          "登录状态需要重新确认，这次提示词优化还没有完成。你刚刚写的内容已经保留。",
        );
        return;
      }

      if (typeof data.remainingCredits === "number") {
        setMagicCredits(data.remainingCredits);
      }

      if (!response.ok || !data.optimizedPrompt) {
        setOptimizeError(data.error ?? "提示词优化失败，请稍后再试。");
        return;
      }

      setPromptValueByTarget(target, data.optimizedPrompt);
    } catch {
      setOptimizeError("提示词优化失败，请稍后再试。");
    } finally {
      setIsOptimizingPrompt(false);
    }
  };

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
          return;
        }

        reject(new Error("图片读取失败"));
      };
      reader.onerror = () => reject(new Error("图片读取失败"));
      reader.readAsDataURL(file);
    });

  const handleDrawingReferenceUpload = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files ?? []).slice(0, 3);

    if (!files.length) {
      return;
    }

    try {
      const images = await Promise.all(files.map(fileToDataUrl));
      setDrawingReferenceImages(images);
      setDrawingError("");
    } catch {
      setDrawingError("参考图读取失败，请换一张图片再试。");
    } finally {
      event.target.value = "";
    }
  };

  const renderPromptAssistTools = (target: PromptTarget) => (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => handleVoiceMagic(target)}
        disabled={isTranscribing || !transcribeEnabled}
        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold shadow-[0_10px_24px_rgba(148,163,184,0.12)] transition ${
          isRecording && recordingTarget === target
            ? "animate-pulse bg-[#ffd7df] text-[#bf4d74]"
            : isTranscribing && recordingTarget === target
              ? "bg-[#fff2cf] text-[#b67e18]"
              : "bg-gradient-to-r from-[#eef3ff] via-[#fff0f5] to-[#fff7d8] text-slate-600 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        }`}
      >
        <span className="grid h-6 w-6 place-items-center rounded-full bg-white/80 text-[12px]">
          {isRecording && recordingTarget === target
            ? "停"
            : isTranscribing && recordingTarget === target
              ? "识"
              : "录"}
        </span>
        {isRecording && recordingTarget === target
          ? "停止并识别"
          : isTranscribing && recordingTarget === target
            ? "正在识别"
            : "语音转文字"}
      </button>

      <button
        type="button"
        onClick={() => handleOptimizePrompt(target)}
        disabled={isOptimizingPrompt || !promptOptimizeEnabled}
        className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-600 shadow-[0_10px_24px_rgba(148,163,184,0.12)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="grid h-6 w-6 place-items-center rounded-full bg-[#f4f7ff] text-[12px] text-[#6c79df]">
          优
        </span>
        {isOptimizingPrompt && optimizingTarget === target
          ? "正在优化"
          : "优化提示词"}
      </button>
    </div>
  );

  const renderPromptAssistFeedback = (target: PromptTarget) => (
    <>
      {((isRecording && recordingTarget === target) ||
        (isTranscribing && recordingTarget === target)) && (
        <div className="mt-3 rounded-[18px] bg-white/92 px-4 py-3 text-xs font-bold text-[#cf6f8b] shadow-[0_8px_20px_rgba(148,163,184,0.12)]">
          {isRecording ? "正在聆听" : "正在转成文字"}
        </div>
      )}

      {voiceError && recordingTarget === target && (
        <div className="mt-3 rounded-[18px] bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#d45b85]">
          {voiceError}
        </div>
      )}

      {optimizeError && optimizingTarget === target && (
        <div className="mt-3 rounded-[18px] bg-[#fff8e8] px-4 py-3 text-sm font-bold text-[#c5871f]">
          {optimizeError}
        </div>
      )}
    </>
  );

  const handleGenerate = async () => {
    if (!promptText.trim()) {
      window.alert("请先在左侧写下创作想法。");
      return;
    }

    setShareMessage("");
    setShareFeedback(null);
    setGeneratedCode("");
    setStreamingCodePreview("");
    setIsCodingCompiling(false);
    setCodingCompileMessageIndex(0);
    setCodingTaskMessage("正在准备创作任务，请稍等。");
    setCodingModelAttempts([]);
    setLoadingMessageIndex(0);
    setIsLoading(true);

    try {
      const requestCodingResult = async (body: {
        prompt?: string;
        taskId?: string;
        mode?: "coding";
      }) => {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        const parsed = await parseApiResponse<{
          code?: string;
          partialCode?: string;
          error?: string;
          message?: string;
          remainingCredits?: number;
          degraded?: boolean;
          degradedReason?: string;
          modelAttempts?: CodingModelAttempt[];
          requestId?: string;
          taskId?: string;
          status?: string;
        }>(response);

        return {
          response,
          ...parsed,
        };
      };

      let result = await requestCodingResult({
        prompt: promptText,
        mode: "coding",
      });
      let response = result.response;
      let data = result.data;
      let rawText = result.rawText;

      if (response.status === 202 && data?.taskId) {
        const startedAt = Date.now();
        const maxClientWaitMs = 5 * 60 * 1000;
        setCodingTaskMessage(
          data.message ?? "这次内容比较复杂，已经切换到后台继续生成。",
        );

        while (response.status === 202 && Date.now() - startedAt < maxClientWaitMs) {
          await new Promise((resolve) => {
            setTimeout(resolve, 2500);
          });

          if (!data?.taskId) {
            break;
          }

          result = await requestCodingResult({
            taskId: data.taskId,
            mode: "coding",
          });
          response = result.response;
          data = result.data;
          rawText = result.rawText;

          if (typeof data?.partialCode === "string" && data.partialCode.trim()) {
            setStreamingCodePreview(
              buildStreamingCodePreviewHtml(data.partialCode),
            );
          }

          if (Array.isArray(data?.modelAttempts)) {
            setCodingModelAttempts(data.modelAttempts);
          }

          if (data?.message) {
            setCodingTaskMessage(data.message);
          } else {
            setCodingTaskMessage("作品还在后台生成中，请继续等待。");
          }
        }
      }

      const normalizedData = data as {
        code?: string;
        partialCode?: string;
        error?: string;
        message?: string;
        remainingCredits?: number;
        degraded?: boolean;
        degradedReason?: string;
        modelAttempts?: CodingModelAttempt[];
        requestId?: string;
        taskId?: string;
      } | null;

      if (response.status === 401) {
        if (isUpstreamCredentialError(normalizedData?.error)) {
          setGeneratedCode(
            createMessagePreviewHtml(
              "模型密钥需要检查",
              normalizedData?.error ?? "模型密钥无效，请检查后台 AI 配置里的 key。",
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

      if (typeof normalizedData?.remainingCredits === "number") {
        setMagicCredits(normalizedData.remainingCredits);
      }

      if (Array.isArray(normalizedData?.modelAttempts)) {
        setCodingModelAttempts(normalizedData.modelAttempts);
      }

      if (response.status === 202 && normalizedData?.taskId) {
        if (!normalizedData.partialCode?.trim()) {
          setGeneratedCode(
            createMessagePreviewHtml(
              "仍在生成中",
              "这次内容比较复杂，系统正在后台稳定生成。请继续等待，作品完成后会自动返回结果。",
            ),
          );
        }
        return;
      }

      if (!response.ok || !normalizedData?.code) {
        setGeneratedCode(
          createMessagePreviewHtml(
            "生成未完成",
            toReadableApiError(
              response,
              "这次创作没有成功，我们再试一次。",
              normalizedData?.error,
              rawText,
            ),
          ),
        );
        return;
      }

      const finalPreviewDoc = ensurePreviewHtmlDocument(normalizedData.code);
      await playStreamingCodePreview({
        rawCode: normalizedData.code,
        setStreamingCodePreview,
        setCodingTaskMessage,
      });
      setIsLoading(false);
      setIsCodingCompiling(true);
      setCodingTaskMessage("正在为你编译并装载可运行预览。");
      await new Promise((resolve) => window.setTimeout(resolve, 900));
      setGeneratedCode(finalPreviewDoc);
      setStreamingCodePreview("");
      setIsCodingCompiling(false);
      setCodingTaskMessage("");

      if (normalizedData.requestId) {
        window.console.info("AI 编程请求号：", normalizedData.requestId);
      }

      if (normalizedData.modelAttempts?.length) {
        window.console.info("AI 编程模型接力明细：", normalizedData.modelAttempts);
      }

      if (normalizedData.degraded && normalizedData.degradedReason) {
        window.console.warn("AI 编程已切换兜底生成：", {
          requestId: normalizedData.requestId ?? null,
          reason: normalizedData.degradedReason,
          modelAttempts: normalizedData.modelAttempts ?? [],
        });
      }
    } catch {
      setCodingTaskMessage("");
      setCodingModelAttempts([]);
      setStreamingCodePreview("");
      setIsCodingCompiling(false);
      setGeneratedCode(
        createMessagePreviewHtml(
          "连接中断",
          "刚刚和创作引擎失去了一下联系，请稍后再试试。",
        ),
      );
    } finally {
      setIsLoading(false);
      setIsCodingCompiling(false);
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
          suggestedStatus?: "draft" | "approved" | "pending" | "rejected";
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

      if (data.moderation?.suggestedStatus === "draft") {
        setShareFeedback({
          type: "pending",
          title: "作品已保存到个人主页",
          message:
            data.message ??
            "今天的发布次数已经用完，这份作品已经保存在你的个人主页，之后还能继续复用或再发布。",
        });
        return;
      }

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

    if (!paintingSupportsImageEditing && drawingReferenceImages.length) {
      setDrawingReferenceImages([]);
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
          referenceImages: drawingReferenceImages,
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

  const handleGenerateSpeech = async () => {
    if (!speechText.trim()) {
      window.alert("请先输入要朗读的文字。");
      return;
    }

    setGeneratedSpeechUrl("");
    setSpeechError("");
    setShareMessage("");
    setShareFeedback(null);
    setIsShareConfirmOpen(false);
    setIsSpeechGenerating(true);

    try {
      const response = await fetch("/api/generate-speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: speechText,
          voice: speechVoice,
          speed: speechSpeed,
          gain: speechGain,
        }),
      });

      if (response.status === 401) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;

        if (isUpstreamCredentialError(data?.error)) {
          setSpeechError(
            data?.error ?? "模型密钥无效，请检查后台 AI 配置里的 key。",
          );
          return;
        }

        showLoginPrompt(
          "登录状态断开了，这次语音还没有完成。当前内容已经保留，重新登录后可以继续。",
        );
        return;
      }

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
          remainingCredits?: number;
        } | null;

        if (typeof data?.remainingCredits === "number") {
          setMagicCredits(data.remainingCredits);
        }

        setSpeechError(data?.error ?? "这次语音没有生成成功，我们再试一次。");
        return;
      }

      const remainingCreditsHeader = response.headers.get("X-Remaining-Credits");

      if (remainingCreditsHeader) {
        const parsedCredits = Number(remainingCreditsHeader);

        if (Number.isFinite(parsedCredits)) {
          setMagicCredits(parsedCredits);
        }
      }

      const audioBlob = await response.blob();

      if (!audioBlob.size) {
        setSpeechError("语音接口没有返回可播放的音频。");
        return;
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      setSpeechError("");
      setGeneratedSpeechUrl((previousUrl) => {
        if (previousUrl.startsWith("blob:")) {
          URL.revokeObjectURL(previousUrl);
        }

        return audioUrl;
      });
    } catch {
      setSpeechError("刚刚和语音工坊失去了一下联系，请稍后再试试。");
    } finally {
      setIsSpeechGenerating(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!videoPrompt.trim()) {
      window.alert("请先写下这段视频想讲的故事和画面。");
      return;
    }

    setGeneratedVideoUrl("");
    setVideoError("");
    setVideoTaskMessage("正在提交视频任务，请稍等。");
    setShareMessage("");
    setShareFeedback(null);
    setIsShareConfirmOpen(false);
    setIsVideoGenerating(true);

    try {
      const requestVideoResult = async (body: {
        prompt?: string;
        requestId?: string;
        speedMode?: "fast" | "quality";
        endpointUrl?: string;
        model?: string;
      }) => {
        const response = await fetch("/api/generate-video", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        const parsed = await parseApiResponse<{
          videoUrl?: string;
          error?: string;
          message?: string;
          requestId?: string;
          endpointUrl?: string;
          model?: string;
          status?: string;
          remainingCredits?: number;
        }>(response);

        return {
          response,
          ...parsed,
        };
      };
      let result = await requestVideoResult({
        prompt: videoPrompt,
        speedMode: videoSpeedMode,
      });
      let response = result.response;
      let data = result.data;
      let rawText = result.rawText;

      if (response.status === 202 && data?.requestId) {
        const startedAt = Date.now();
        const maxClientWaitMs = 10 * 60 * 1000;

        setVideoTaskMessage(data.message ?? "视频任务已提交，正在生成中。");

        while (response.status === 202 && Date.now() - startedAt < maxClientWaitMs) {
          await new Promise((resolve) => {
            setTimeout(resolve, 5000);
          });

          const pollingRequestId = data?.requestId;

          if (!pollingRequestId) {
            break;
          }

          result = await requestVideoResult({
            requestId: pollingRequestId,
            speedMode: videoSpeedMode,
            endpointUrl: data?.endpointUrl,
            model: data?.model,
          });
          response = result.response;
          data = result.data;
          rawText = result.rawText;

          if (data?.message) {
            setVideoTaskMessage(data.message);
          } else {
            setVideoTaskMessage("视频还在生成中，请继续等待。");
          }
        }
      }

      if (response.status === 202 && data?.requestId) {
        setVideoError("视频任务还在生成中，平台这次比较慢。请复制这个任务号发给管理员查询，或稍后再试。任务号：" + data.requestId);
        setGeneratedVideoUrl("");
        return;
      }

      if (response.status === 401) {
        if (isUpstreamCredentialError(data?.error)) {
          setVideoError(
            data?.error ?? "模型密钥无效，请检查后台 AI 配置里的 key。",
          );
          return;
        }

        showLoginPrompt(
          "登录状态断开了，这次视频还没有完成。当前内容已经保留，重新登录后可以继续。",
        );
        return;
      }

      if (typeof data?.remainingCredits === "number") {
        setMagicCredits(data.remainingCredits);
      }

      if (!response.ok || !data?.videoUrl) {
        setVideoError(
          toReadableApiError(
            response,
            "这次视频没有生成成功，我们再试一次。",
            data?.error,
            rawText,
          ),
        );
        setGeneratedVideoUrl("");
        return;
      }

      if (!/^https?:\/\//i.test(data.videoUrl.trim())) {
        setGeneratedVideoUrl("");
        setVideoError("视频接口没有返回可播放的视频地址，请检查后台 AI 视频配置。");
        return;
      }

      setVideoError("");
      setVideoTaskMessage("");
      setGeneratedVideoUrl(data.videoUrl);
    } catch {
      setVideoError("刚刚和光影工坊失去了一下联系，请稍后再试试。");
    } finally {
      setVideoTaskMessage("");
      setIsVideoGenerating(false);
    }
  };

  const activeComingSoon =
    isCodingMode || isPaintingMode || isWritingMode || isSpeechMode || isVideoMode
      ? null
      : comingSoonConfig[activeMode];
  const completedGoalCount =
    Number(Boolean(hasGeneratedCode)) +
    Number(Boolean(writingResult.trim())) +
    Number(Boolean(generatedImageUrl.trim())) +
    Number(Boolean(generatedSpeechUrl.trim()));
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
  const landscapeStageStyle = isLandscapeCompactViewport
    ? {
        width: `${LANDSCAPE_STAGE_WIDTH * landscapeStageScale}px`,
        height: `${LANDSCAPE_STAGE_HEIGHT * landscapeStageScale}px`,
      }
    : undefined;
  const landscapeCanvasStyle = isLandscapeCompactViewport
    ? {
        width: `${LANDSCAPE_STAGE_WIDTH}px`,
        minWidth: `${LANDSCAPE_STAGE_WIDTH}px`,
        height: `${LANDSCAPE_STAGE_HEIGHT}px`,
        minHeight: `${LANDSCAPE_STAGE_HEIGHT}px`,
        transform: `scale(${landscapeStageScale})`,
        transformOrigin: "top center",
      }
    : undefined;

  return (
    <main className="workshop-root relative min-h-screen overflow-hidden bg-[#edf4ff] text-slate-700">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.96),rgba(238,244,255,0.94)_34%,rgba(231,239,255,0.96)_62%,rgba(244,247,255,1)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(140deg,rgba(180,208,255,0.22),transparent_26%,rgba(255,217,229,0.18)_58%,rgba(255,238,190,0.18)_84%,transparent)]" />
        <div className="absolute -left-16 top-10 h-72 w-72 rounded-full bg-[#ffd9e4]/45 blur-3xl" />
        <div className="absolute left-[28%] top-0 h-80 w-80 rounded-full bg-[#d7e6ff]/55 blur-3xl" />
        <div className="absolute right-8 top-12 h-80 w-80 rounded-full bg-[#dff5ff]/55 blur-3xl" />
        <div className="absolute bottom-0 left-[20%] h-80 w-80 rounded-full bg-[#fff0bf]/35 blur-3xl" />
        <div className="absolute bottom-[-60px] right-[12%] h-96 w-96 rounded-full bg-[#cfe0ff]/35 blur-3xl" />
      </div>

      <div className="workshop-shell relative flex min-h-screen w-full px-2 py-2 sm:px-3 sm:py-3 lg:px-4 lg:py-4">
        <div
          className="workshop-mobile-stage w-full"
          style={landscapeStageStyle}
        >
          <section
            className="workshop-canvas flex min-h-[calc(100vh-1rem)] w-full flex-col overflow-hidden rounded-[32px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(246,249,255,0.98))] shadow-[0_26px_80px_rgba(148,163,184,0.14)] backdrop-blur-xl"
            style={landscapeCanvasStyle}
          >
            <header className="workshop-header flex flex-wrap items-center justify-between gap-3 border-b border-white/80 px-4 py-4 lg:px-7 lg:py-5">
            <div className="workshop-header-brand flex min-w-0 items-center gap-4">
              <Image
                src={brand.logoUrl}
                alt={brand.siteName}
                width={56}
                height={56}
                className="rounded-[18px] shadow-[0_12px_28px_rgba(248,113,113,0.14)]"
                unoptimized
              />
              <div className="workshop-header-brand-copy min-w-0">
                <h1 className="truncate text-[18px] font-black text-slate-800 lg:text-[20px]">
                  {brand.siteName}
                </h1>
                <p className="mt-1 truncate text-sm text-slate-500">
                  {brand.tagline}
                </p>
              </div>
            </div>

            <div className="workshop-header-actions relative flex flex-wrap items-center gap-3">
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
                <div className="absolute right-0 top-[calc(100%+12px)] z-20 w-[min(320px,calc(100vw-32px))] rounded-[24px] border border-white/80 bg-white/96 p-4 shadow-[0_22px_50px_rgba(148,163,184,0.14)] backdrop-blur-xl">
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

          <div className="workshop-layout-grid grid min-h-0 flex-1 gap-4 p-3 sm:p-4 xl:grid-cols-[320px_minmax(500px,1.02fr)_minmax(760px,1.68fr)] xl:p-5 2xl:grid-cols-[350px_minmax(560px,1.06fr)_minmax(900px,1.86fr)]">
            <aside className="workshop-sidebar flex min-h-0 flex-col rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(246,249,255,0.96))] p-4 shadow-[0_18px_50px_rgba(148,163,184,0.1)]">
              <div>
                <p className="text-[13px] font-black tracking-[0.08em] text-[#4165c7]">
                  模式选择
                </p>
              </div>

              <div className="workshop-mode-list mt-5 flex-1 space-y-3 overflow-y-auto pr-1">
                {modeTabs.map((tab) => {
                  const isActive = activeMode === tab.id;
                  const visual = modeVisuals[tab.id];

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleModeChange(tab.id)}
                      className={`workshop-mode-card flex w-full items-center gap-4 rounded-[24px] border px-5 py-4 text-left transition ${
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
                      <div className="workshop-mode-copy min-w-0 flex-1">
                        <p className="workshop-mode-title text-[15px] font-black text-slate-700">
                          {tab.label}
                        </p>
                        <p className="workshop-mode-subtitle mt-1 text-[13px] leading-6 text-slate-400">
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

              <div className="workshop-daily-goal mt-4 rounded-[24px] border border-white/80 bg-white/82 p-5 shadow-[0_10px_24px_rgba(148,163,184,0.08)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-12 w-12 place-items-center rounded-[16px] bg-gradient-to-br from-[#efe4ff] to-[#dcecff] text-sm font-black text-[#6f6ad8]">
                      今日
                    </div>
                    <div>
                      <p className="whitespace-nowrap text-sm font-black text-[#4165c7]">
                        今日学习小目标
                      </p>
                      <p className="mt-1 whitespace-nowrap text-sm text-slate-500">
                        {dailyGoalDescription}
                      </p>
                    </div>
                  </div>
                  <p className="whitespace-nowrap text-sm font-black text-[#5f84d8]">
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

            <section className="workshop-editor flex min-h-0 flex-col rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,250,255,0.98))] p-6 shadow-[0_18px_50px_rgba(148,163,184,0.1)]">
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

                    <div className="rounded-[22px] border border-white/80 bg-white/90 p-5 shadow-[0_10px_24px_rgba(148,163,184,0.08)]">
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
                              <p className="mt-2 pr-1 text-[12px] leading-6 text-slate-500">
                                {scene.description}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-5 rounded-[22px] border border-white/80 bg-white/90 p-5 shadow-[0_10px_24px_rgba(148,163,184,0.08)]">
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
                        {renderPromptAssistTools("coding")}
                      </div>

                      <div className="relative">
                        <textarea
                          id="prompt"
                          rows={13}
                          value={promptText}
                          onChange={(event) => setPromptText(event.target.value)}
                          placeholder="输入你的想法或问题，告诉 AI 你想要什么..."
                          className="w-full resize-none rounded-[22px] border border-[#d7e6ff] bg-[#fbfdff] px-5 py-5 text-base leading-8 text-slate-700 outline-none transition placeholder:text-slate-400 focus:bg-white focus:shadow-[0_0_0_4px_rgba(219,234,254,0.55)]"
                        />
                      </div>

                      {renderPromptAssistFeedback("coding")}

                      <div className="mt-4 flex gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setGeneratedCode(defaultPreviewHtml);
                            setStreamingCodePreview("");
                            setCodingTaskMessage("");
                            setCodingModelAttempts([]);
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

                    <div className="mt-5 rounded-[22px] border border-white/80 bg-white/90 p-5 shadow-[0_10px_24px_rgba(148,163,184,0.08)]">
                      <p className="text-[15px] font-black text-slate-700">创作提示</p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[18px] bg-[#f7fbff] px-4 py-4">
                          <p className="text-[11px] font-bold tracking-[0.14em] text-slate-400">
                            预览状态
                          </p>
                          <p className="mt-2 text-sm font-black text-slate-700">
                            {isLoading
                              ? codingTaskMessage || "小程序正在生成"
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
                            {isLoading && codingTaskMessage
                              ? "已自动切到后台稳态生成，完成后会直接回到预览区。"
                              : "生成完成后可在右侧放大查看细节"}
                          </p>
                        </div>
                      </div>

                      {isLoading || codingModelAttempts.length ? (
                        <div className="mt-4 rounded-[18px] bg-[#f8fbff] px-4 py-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-[11px] font-bold tracking-[0.14em] text-slate-400">
                              模型接力状态
                            </p>
                            <p className="text-xs font-bold text-slate-500">
                              {codingModelAttempts.length
                                ? `已记录 ${codingModelAttempts.length} 次尝试`
                                : "正在准备第一条模型线路"}
                            </p>
                          </div>

                          <div className="mt-3 space-y-3">
                            {codingModelAttempts.length ? (
                              codingModelAttempts.map((attempt, index) => (
                                <div
                                  key={`${attempt.slot}-${attempt.result}-${index}`}
                                  className="rounded-[16px] border border-white/90 bg-white px-4 py-3 shadow-[0_8px_18px_rgba(148,163,184,0.08)]"
                                >
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-full bg-[#eef4ff] px-2.5 py-1 text-[11px] font-black text-[#4b6fcc]">
                                      {attempt.slot}
                                    </span>
                                    <p className="text-sm font-black text-slate-700">
                                      {attempt.label || `${attempt.slot} 模型`}
                                    </p>
                                    <span
                                      className={`rounded-full px-2.5 py-1 text-[11px] font-black ${getCodingAttemptResultTone(attempt.result)}`}
                                    >
                                      {getCodingAttemptResultLabel(attempt.result)}
                                    </span>
                                  </div>
                                  <p className="mt-2 text-xs font-bold text-slate-500">
                                    {attempt.model || "未配置模型"}
                                    {typeof attempt.status === "number"
                                      ? ` · HTTP ${attempt.status}`
                                      : ""}
                                  </p>
                                  <p className="mt-1 text-xs leading-6 text-slate-500">
                                    {attempt.message ||
                                      (attempt.result === "success"
                                        ? "这一条模型线路已经返回结果。"
                                        : "系统正在根据当前结果继续处理。")}
                                  </p>
                                </div>
                              ))
                            ) : (
                              <div className="rounded-[16px] border border-dashed border-[#d7e6ff] bg-white/80 px-4 py-4 text-sm font-bold text-slate-500">
                                系统正在连接第一条模型线路，马上就会开始显示接力过程。
                              </div>
                            )}
                          </div>
                        </div>
                      ) : null}
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

                    <div className="rounded-[22px] border border-[#f7e8b7] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,250,233,0.98))] p-5 shadow-[0_10px_24px_rgba(217,119,6,0.08)]">
                      <p className="text-[15px] font-black text-amber-900">课内作文题库</p>
                      <p className="mt-1 text-xs leading-6 text-amber-600/80">
                        常见教材作文主题和常用写作任务都放在这里，切换年级后，上下学期内容会同时显示。
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {compositionTopicBank.map((group) => (
                          <button
                            key={group.grade}
                            type="button"
                            onClick={() => setSelectedCompositionGrade(group.grade)}
                            className={`rounded-full px-3 py-1.5 text-xs font-black transition ${
                              selectedCompositionGrade === group.grade
                                ? "bg-amber-500 text-white shadow-[0_8px_18px_rgba(245,158,11,0.18)]"
                                : "bg-white text-amber-700"
                            }`}
                          >
                            {group.grade}
                          </button>
                        ))}
                      </div>
                      <div className="mt-4 grid gap-4 xl:grid-cols-2">
                        <div className="space-y-3">
                          <div className="rounded-[18px] bg-[#fff4d8] px-4 py-3 text-sm font-black text-amber-900">
                            上学期
                          </div>
                          <div className="grid gap-2">
                            {compositionTopicsBySemester["上学期"].map((topic) => (
                              <button
                                key={`top-${topic}`}
                                type="button"
                                onClick={() => handleCompositionTopicClick(topic, "上学期")}
                                className="rounded-[16px] border border-[#f7e8b7] bg-white px-3 py-2 text-left text-xs font-bold leading-5 text-amber-900 transition hover:-translate-y-0.5 hover:bg-[#fff8e9]"
                              >
                                {topic}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="rounded-[18px] bg-[#fff4d8] px-4 py-3 text-sm font-black text-amber-900">
                            下学期
                          </div>
                          <div className="grid gap-2">
                            {compositionTopicsBySemester["下学期"].map((topic) => (
                              <button
                                key={`bottom-${topic}`}
                                type="button"
                                onClick={() => handleCompositionTopicClick(topic, "下学期")}
                                className="rounded-[16px] border border-[#f7e8b7] bg-white px-3 py-2 text-left text-xs font-bold leading-5 text-amber-900 transition hover:-translate-y-0.5 hover:bg-[#fff8e9]"
                              >
                                {topic}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-2 sm:grid-cols-3">
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
                              className={`rounded-[18px] bg-gradient-to-br ${capsuleClasses[index]} px-4 py-4 text-left shadow-[0_10px_24px_rgba(217,119,6,0.08)] transition hover:-translate-y-0.5`}
                            >
                              <p className="text-sm font-black text-amber-900">
                                {item.label}
                              </p>
                              <p className="mt-2 text-[11px] font-bold text-amber-600">
                                {item.note}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-5 rounded-[22px] border border-[#f7e8b7] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,251,238,0.98))] p-5 shadow-[0_10px_24px_rgba(217,119,6,0.08)]">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <label
                          htmlFor="writing-prompt"
                          className="block text-[15px] font-black text-amber-900"
                        >
                          写作需求
                        </label>
                        {renderPromptAssistTools("writing")}
                      </div>
                      <textarea
                        id="writing-prompt"
                        rows={13}
                        value={writingPrompt}
                        onChange={(event) => setWritingPrompt(event.target.value)}
                        placeholder="输入你的主题和想法..."
                        className="w-full resize-none rounded-[22px] border border-[#f3df99] bg-white px-5 py-5 text-base leading-8 text-amber-900 outline-none transition placeholder:text-amber-500/70 focus:shadow-[0_0_0_4px_rgba(253,230,138,0.35)]"
                      />
                      {renderPromptAssistFeedback("writing")}
                    </div>

                    <button
                      type="button"
                      onClick={handleGenerateWriting}
                      disabled={isWritingLoading}
                      className="inline-flex h-14 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#ffe2a9] via-[#fff0c8] to-[#ffdcb6] px-6 text-lg font-black text-amber-900 shadow-[0_16px_34px_rgba(251,191,36,0.24)] transition duration-200 hover:-translate-y-1"
                    >
                      {isWritingLoading ? "正在创作" : "开始创作"}
                    </button>

                    <div className="mt-5 rounded-[22px] border border-[#f7e8b7] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,251,238,0.98))] p-5 shadow-[0_10px_24px_rgba(217,119,6,0.08)]">
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
                    <div className="rounded-[22px] border border-white/80 bg-white/92 p-5 shadow-[0_10px_24px_rgba(148,163,184,0.08)]">
                      <div className="flex items-start gap-3">
                        <div>
                          <p className="text-[15px] font-black text-slate-700">绘画创作台</p>
                          <p className="mt-1 text-sm leading-6 text-slate-400">
                            把场景、颜色、角色和光影写清楚，画面会更完整。
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[22px] border border-[#f3d5e6] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,247,251,0.98))] p-4 shadow-[0_10px_24px_rgba(244,114,182,0.08)]">
                      <p className="text-[15px] font-black text-slate-700">手抄报主题</p>
                      <p className="mt-1 text-xs leading-6 text-slate-400">
                        常用作业主题，点一下生成适合留白填写的版面描述。
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {handbillTopics.map((topic) => (
                          <button
                            key={topic.label}
                            type="button"
                            onClick={() => handleHandbillTopicClick(topic.prompt)}
                            className="rounded-[18px] bg-white px-3 py-3 text-left shadow-[0_8px_20px_rgba(244,114,182,0.08)] transition hover:-translate-y-0.5 hover:bg-[#fff7fb]"
                          >
                            <span className="block text-sm font-black text-slate-700">
                              {topic.label}
                            </span>
                            <span className="mt-1 block text-[11px] font-bold text-[#d25586]">
                              {topic.note}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[22px] border border-white/80 bg-white/92 p-4 shadow-[0_10px_24px_rgba(148,163,184,0.08)]">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[15px] font-black text-slate-700">绘画描述</p>
                          <p className="mt-1 text-sm leading-6 text-slate-400">
                            可以写清场景、角色、颜色、光线和风格。
                          </p>
                        </div>
                        {renderPromptAssistTools("painting")}
                      </div>
                      <textarea
                        id="drawing-prompt"
                        rows={13}
                        value={drawingPrompt}
                        onChange={(event) => setDrawingPrompt(event.target.value)}
                        placeholder="输入你的绘画描述..."
                        className="mt-4 w-full resize-none rounded-[22px] border border-[#f3d5e6] bg-white px-5 py-5 text-base leading-8 text-slate-700 outline-none transition placeholder:text-slate-400 focus:shadow-[0_0_0_4px_rgba(251,207,232,0.35)]"
                      />
                      {paintingSupportsImageEditing ? (
                        <div className="mt-4 space-y-3">
                          <label className="inline-flex cursor-pointer items-center gap-3 rounded-full bg-[#fff7fb] px-4 py-2 text-sm font-bold text-[#bf4d74] shadow-[0_8px_20px_rgba(244,114,182,0.08)]">
                            <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-[12px]">
                              图
                            </span>
                            上传参考图
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={handleDrawingReferenceUpload}
                              className="hidden"
                            />
                          </label>
                          {drawingReferenceImages.length ? (
                            <div className="grid grid-cols-3 gap-3">
                              {drawingReferenceImages.map((image, index) => (
                                <div
                                  key={`${image.slice(0, 24)}-${index}`}
                                  className="overflow-hidden rounded-[18px] border border-[#f8d9e8] bg-[#fff9fc]"
                                >
                                  <img
                                    src={image}
                                    alt={`参考图 ${index + 1}`}
                                    className="h-24 w-full object-cover"
                                  />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="rounded-[18px] bg-[#fff9fc] px-4 py-3 text-sm text-slate-500">
                              当前模型支持图像编辑。上传参考图后，系统会结合你的文字描述一起作画。
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="mt-4 rounded-[18px] bg-[#f8fbff] px-4 py-3 text-sm text-slate-500">
                          当前绘画模型未开启图像编辑，只支持文生图。
                        </div>
                      )}
                      {renderPromptAssistFeedback("painting")}
                    </div>

                    <button
                      type="button"
                      onClick={handleGenerateImage}
                      disabled={isDrawing}
                      className="inline-flex h-14 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#ffd7e8] via-[#ffe7d2] to-[#dcecff] px-6 text-lg font-black text-slate-700 shadow-[0_16px_34px_rgba(251,191,188,0.24)] transition duration-200 hover:-translate-y-1"
                    >
                      {isDrawing ? "正在作画" : "开始作画"}
                    </button>

                    <div className="mt-5 rounded-[22px] border border-white/80 bg-white/92 p-5 shadow-[0_10px_24px_rgba(148,163,184,0.08)]">
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
                ) : isSpeechMode ? (
                  <div className="space-y-4">
                    <div className="rounded-[22px] border border-white/80 bg-white/92 p-5 shadow-[0_10px_24px_rgba(148,163,184,0.08)]">
                      <div className="flex items-start gap-3">
                        <div>
                          <p className="text-[15px] font-black text-slate-700">语音合成台</p>
                          <p className="mt-1 text-sm leading-6 text-slate-400">
                            把作文、演讲稿或故事变成可播放的朗读音频。
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[22px] border border-[#ddd6fe] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(250,247,255,0.98))] p-4 shadow-[0_10px_24px_rgba(147,51,234,0.08)]">
                      <p className="text-[15px] font-black text-slate-700">快捷文本</p>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {speechTextPresets.map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => setSpeechText(preset.text)}
                            className="rounded-[18px] bg-white px-3 py-3 text-left text-sm font-black text-slate-700 shadow-[0_8px_20px_rgba(147,51,234,0.08)] transition hover:-translate-y-0.5 hover:bg-[#faf7ff]"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[22px] border border-white/80 bg-white/92 p-4 shadow-[0_10px_24px_rgba(148,163,184,0.08)]">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[15px] font-black text-slate-700">朗读文字</p>
                          <p className="mt-1 text-sm leading-6 text-slate-400">
                            可以粘贴作文、演讲稿、故事或英语短句。
                          </p>
                        </div>
                        {renderPromptAssistTools("speech")}
                      </div>
                      <textarea
                        id="speech-text"
                        rows={11}
                        value={speechText}
                        onChange={(event) => setSpeechText(event.target.value)}
                        placeholder="输入要合成为语音的文字..."
                        className="mt-4 w-full resize-none rounded-[22px] border border-[#ddd6fe] bg-white px-5 py-5 text-base leading-8 text-slate-700 outline-none transition placeholder:text-slate-400 focus:shadow-[0_0_0_4px_rgba(221,214,254,0.45)]"
                      />
                      {renderPromptAssistFeedback("speech")}
                    </div>

                    <div className="rounded-[22px] border border-[#ddd6fe] bg-white/92 p-4 shadow-[0_10px_24px_rgba(147,51,234,0.08)]">
                      <p className="text-[15px] font-black text-slate-700">声音设置</p>
                      <label className="mt-4 block text-sm font-bold text-slate-600">
                        音色
                        <select
                          value={speechVoice}
                          onChange={(event) =>
                            setSpeechVoice(
                              event.target.value as (typeof speechVoiceOptions)[number]["id"],
                            )
                          }
                          className="mt-2 h-12 w-full rounded-[18px] border border-[#ddd6fe] bg-white px-4 text-slate-700 outline-none"
                        >
                          {speechVoiceOptions.map((voice) => (
                            <option key={voice.id} value={voice.id}>
                              {voice.label} - {voice.description}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <label className="block text-sm font-bold text-slate-600">
                          语速：{speechSpeed.toFixed(1)}
                          <input
                            type="range"
                            min="0.5"
                            max="2"
                            step="0.1"
                            value={speechSpeed}
                            onChange={(event) => setSpeechSpeed(Number(event.target.value))}
                            className="mt-3 w-full accent-[#8b5cf6]"
                          />
                        </label>
                        <label className="block text-sm font-bold text-slate-600">
                          音量增益：{speechGain.toFixed(1)} dB
                          <input
                            type="range"
                            min="-10"
                            max="10"
                            step="0.5"
                            value={speechGain}
                            onChange={(event) => setSpeechGain(Number(event.target.value))}
                            className="mt-3 w-full accent-[#8b5cf6]"
                          />
                        </label>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleGenerateSpeech}
                      disabled={isSpeechGenerating}
                      className="inline-flex h-14 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#d8d4ff] via-[#ede9fe] to-[#fce7f3] px-6 text-lg font-black text-[#5b4fb8] shadow-[0_16px_34px_rgba(147,51,234,0.16)] transition duration-200 hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isSpeechGenerating ? "正在合成语音" : "生成语音"}
                    </button>

                    <div className="mt-5 rounded-[22px] border border-white/80 bg-white/92 p-5 shadow-[0_10px_24px_rgba(148,163,184,0.08)]">
                      <p className="text-[15px] font-black text-slate-700">创作提示</p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[18px] bg-[#f5f3ff] px-4 py-4">
                          <p className="text-[11px] font-bold tracking-[0.14em] text-slate-400">
                            当前状态
                          </p>
                          <p className="mt-2 text-sm font-black text-slate-700">
                            {isSpeechGenerating
                              ? "语音正在合成"
                              : generatedSpeechUrl
                                ? "语音已生成"
                                : "等待开始合成"}
                          </p>
                        </div>
                        <div className="rounded-[18px] bg-[#fff8fb] px-4 py-4">
                          <p className="text-[11px] font-bold tracking-[0.14em] text-slate-400">
                            展示方式
                          </p>
                          <p className="mt-2 text-sm font-black text-slate-700">
                            音频会在右侧播放器中播放
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : isVideoMode ? (
                  <div className="space-y-4">
                    <div className="rounded-[22px] border border-white/80 bg-white/92 p-5 shadow-[0_10px_24px_rgba(148,163,184,0.08)]">
                      <div className="flex items-start gap-3">
                        <div>
                          <p className="text-[15px] font-black text-slate-700">视频故事台</p>
                          <p className="mt-1 text-sm leading-6 text-slate-400">
                            把作文、演讲稿或故事粘进来，先选一种视频形式。
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[22px] border border-[#cae6f7] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(239,251,255,0.98))] p-4 shadow-[0_10px_24px_rgba(56,189,248,0.08)]">
                      <p className="text-[15px] font-black text-slate-700">视频作业模板</p>
                      <p className="mt-1 text-xs leading-6 text-slate-400">
                        先点模板，再把孩子的作文或演讲稿粘进去。
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {videoCreationPresets.map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => handleVideoPresetClick(preset.template)}
                            className="rounded-[18px] bg-white px-3 py-3 text-left shadow-[0_8px_20px_rgba(56,189,248,0.08)] transition hover:-translate-y-0.5 hover:bg-[#f2fcff]"
                          >
                            <span className="block text-sm font-black text-slate-700">
                              {preset.label}
                            </span>
                            <span className="mt-1 block text-[11px] font-bold text-[#178ca7]">
                              {preset.note}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[22px] border border-white/80 bg-white/92 p-4 shadow-[0_10px_24px_rgba(148,163,184,0.08)]">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[15px] font-black text-slate-700">视频提示词</p>
                          <p className="mt-1 text-sm leading-6 text-slate-400">
                            可以直接粘贴作文、演讲稿、故事或知识点。
                          </p>
                        </div>
                        {renderPromptAssistTools("video")}
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        {videoSpeedModes.map((mode) => (
                          <button
                            key={mode.key}
                            type="button"
                            onClick={() => setVideoSpeedMode(mode.key)}
                            className={`rounded-[18px] px-3 py-3 text-left transition ${
                              videoSpeedMode === mode.key
                                ? "bg-[#ddf8ff] text-[#176b86] shadow-[0_8px_20px_rgba(56,189,248,0.12)]"
                                : "bg-white text-slate-500 shadow-[0_8px_20px_rgba(148,163,184,0.08)]"
                            }`}
                          >
                            <span className="block text-sm font-black">
                              {mode.label}
                            </span>
                            <span className="mt-1 block text-[11px] font-bold opacity-80">
                              {mode.note}
                            </span>
                          </button>
                        ))}
                      </div>
                      <textarea
                        id="video-prompt"
                        rows={13}
                        value={videoPrompt}
                        onChange={(event) => setVideoPrompt(event.target.value)}
                        placeholder="先选模板，或直接输入想生成的视频内容..."
                        className="mt-4 w-full resize-none rounded-[22px] border border-[#cae6f7] bg-white px-5 py-5 text-base leading-8 text-slate-700 outline-none transition placeholder:text-slate-400 focus:shadow-[0_0_0_4px_rgba(191,219,254,0.35)]"
                      />
                      {renderPromptAssistFeedback("video")}
                    </div>

                    <button
                      type="button"
                      onClick={handleGenerateVideo}
                      disabled={isVideoGenerating}
                      className="inline-flex h-14 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#c8f3eb] via-[#d9f0ff] to-[#e4f3ff] px-6 text-lg font-black text-[#1e5d7d] shadow-[0_16px_34px_rgba(56,189,248,0.18)] transition duration-200 hover:-translate-y-1"
                    >
                      {isVideoGenerating ? "正在生成视频" : "开始生成视频"}
                    </button>

                    <div className="mt-5 rounded-[22px] border border-white/80 bg-white/92 p-5 shadow-[0_10px_24px_rgba(148,163,184,0.08)]">
                      <p className="text-[15px] font-black text-slate-700">创作提示</p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[18px] bg-[#eefcff] px-4 py-4">
                          <p className="text-[11px] font-bold tracking-[0.14em] text-slate-400">
                            当前状态
                          </p>
                          <p className="mt-2 text-sm font-black text-slate-700">
                            {isVideoGenerating
                              ? "光影镜头正在生成"
                              : generatedVideoUrl
                                ? "视频已完成"
                                : "等待开始生成"}
                          </p>
                        </div>
                        <div className="rounded-[18px] bg-[#f7fbff] px-4 py-4">
                          <p className="text-[11px] font-bold tracking-[0.14em] text-slate-400">
                            展示方式
                          </p>
                          <p className="mt-2 text-sm font-black text-slate-700">
                            成片会在右侧视频舞台中播放
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[22px] border border-[#cae6f7] bg-white/92 shadow-[0_10px_24px_rgba(56,189,248,0.08)]">
                      <button
                        type="button"
                        onClick={() => setIsVideoTaskLookupOpen((current) => !current)}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                      >
                        <span className="text-[15px] font-black text-slate-700">
                          取回已生成视频
                        </span>
                        <span className="rounded-full bg-[#ddf8ff] px-3 py-1 text-xs font-black text-[#176b86]">
                          {isVideoTaskLookupOpen ? "收起" : "展开"}
                        </span>
                      </button>
                      {isVideoTaskLookupOpen ? (
                        <div className="border-t border-[#d9f1fb] px-4 pb-4 pt-3">
                          <p className="text-xs leading-6 text-slate-400">
                            如果页面提示任务号，把任务号粘到这里继续查询。
                          </p>
                          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                            <input
                              value={videoTaskIdInput}
                              onChange={(event) => setVideoTaskIdInput(event.target.value)}
                              placeholder="输入任务号"
                              className="h-11 min-w-0 flex-1 rounded-[16px] border border-[#cae6f7] bg-white px-4 text-sm text-slate-700 outline-none placeholder:text-slate-400"
                            />
                            <button
                              type="button"
                              onClick={() => checkExistingVideoTask(videoTaskIdInput)}
                              disabled={isVideoGenerating}
                              className="h-11 rounded-[16px] bg-[#ddf8ff] px-4 text-sm font-black text-[#176b86] transition hover:bg-[#cdf3fb] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              查询结果
                            </button>
                          </div>
                        </div>
                      ) : null}
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

            <section className="workshop-preview-panel relative flex min-h-0 min-w-0 flex-col rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(247,250,255,0.98))] shadow-[0_18px_50px_rgba(148,163,184,0.1)]">
              <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.94),rgba(237,244,255,0.92)_54%,rgba(230,239,255,0.98)_100%)]" />
                <div className="absolute right-0 top-10 h-72 w-72 rounded-full bg-[#dfe8ff]/55 blur-3xl" />
                <div className="absolute bottom-0 left-[18%] h-60 w-60 rounded-full bg-[#fff0c9]/35 blur-3xl" />
              </div>

              <div className="workshop-preview-header relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-white/80 px-5 py-4 lg:px-7 lg:py-5 2xl:px-8">
                <div>
                  <p className="text-[13px] font-black tracking-[0.08em] text-[#4165c7]">
                    {isCodingMode
                      ? "预览区"
                      : isWritingMode
                        ? "展示区"
                        : isPaintingMode
                          ? "画板区"
                          : isSpeechMode
                            ? "听音区"
                          : isVideoMode
                            ? "放映区"
                          : "预览区"}
                  </p>
                  <h2 className="mt-2 text-[18px] font-black text-slate-800">
                    {isCodingMode
                      ? "手机预览"
                      : isWritingMode
                        ? "灵感信纸"
                        : isPaintingMode
                          ? "梦幻画板"
                          : isSpeechMode
                            ? "朗读播放器"
                          : isVideoMode
                            ? "光影舞台"
                          : activeTab.label}
                  </h2>
                </div>

                <div className="workshop-preview-actions flex flex-wrap items-center gap-3">
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
                  ) : isSpeechMode ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setGeneratedSpeechUrl("");
                          setSpeechError("");
                        }}
                        className="inline-flex h-11 items-center justify-center rounded-full border border-[#ddd6fe] bg-white px-6 text-base font-black text-[#6d5bcf] shadow-[0_10px_22px_rgba(148,163,184,0.08)]"
                      >
                        清空音频
                      </button>
                      <button
                        type="button"
                        onClick={handleGenerateSpeech}
                        disabled={isSpeechGenerating}
                        className="inline-flex h-11 items-center justify-center rounded-full bg-[linear-gradient(90deg,#d8d4ff_0%,#ede9fe_48%,#fce7f3_100%)] px-7 text-base font-black text-[#5b4fb8] shadow-[0_14px_28px_rgba(147,51,234,0.16)]"
                      >
                        {isSpeechGenerating ? "合成中" : "生成语音"}
                      </button>
                    </div>
                  ) : isVideoMode ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setGeneratedVideoUrl("");
                          setVideoError("");
                        }}
                        className="inline-flex h-11 items-center justify-center rounded-full border border-[#bfe4f4] bg-white px-6 text-base font-black text-[#1d7592] shadow-[0_10px_22px_rgba(148,163,184,0.08)]"
                      >
                        清空舞台
                      </button>
                      <button
                        type="button"
                        onClick={handleGenerateVideo}
                        disabled={isVideoGenerating}
                        className="inline-flex h-11 items-center justify-center rounded-full bg-[linear-gradient(90deg,#c8f3eb_0%,#d9f0ff_48%,#e4f3ff_100%)] px-7 text-base font-black text-[#1e5d7d] shadow-[0_14px_28px_rgba(56,189,248,0.18)]"
                      >
                        {isVideoGenerating ? "生成中" : "生成视频"}
                      </button>
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
                  <div className="px-5 pt-3 lg:px-7 2xl:px-8">
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
                  <div className="flex min-h-0 flex-1 px-5 pb-5 pt-3 lg:px-7 lg:pb-6 2xl:px-8">
                    <div className="relative flex h-full w-full min-h-0 overflow-hidden rounded-[24px] border border-[#dbe7ff] bg-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.5),0_18px_40px_rgba(148,163,184,0.08)]">
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(248,251,255,0.96),rgba(238,245,255,0.92))]" />
                      <div className="relative flex min-h-0 w-full flex-1 flex-col p-3 lg:p-4 2xl:p-5">
                        <div
                          ref={previewShellRef}
                          className="workshop-preview-shell relative flex min-h-[74vh] flex-1 overflow-hidden rounded-[20px] border border-[#dce8ff] bg-white 2xl:min-h-[78vh]"
                        >
                          {isLoading && !hasStreamingCodePreview ? (
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

                              <p className="mt-5 min-h-[64px] max-w-[320px] text-base font-black leading-7 text-slate-600 sm:text-lg sm:leading-8">
                                {loadingMessages[loadingMessageIndex]}
                              </p>
                            </div>
                          ) : isLoading && hasStreamingCodePreview ? (
                            <iframe
                              title="代码实时草稿预览"
                              className="block h-full min-h-0 w-full bg-white"
                              srcDoc={streamingCodePreview}
                              scrolling="yes"
                            />
                          ) : isCodingCompiling ? (
                            <div className="relative h-full w-full bg-white">
                              {hasStreamingCodePreview ? (
                                <iframe
                                  title="代码生成草稿预览"
                                  className="block h-full min-h-0 w-full bg-white"
                                  srcDoc={streamingCodePreview}
                                  scrolling="yes"
                                />
                              ) : null}
                              <div className="absolute inset-0 flex items-center justify-center bg-[rgba(248,251,255,0.72)] backdrop-blur-[3px]">
                                <div className="mx-6 w-full max-w-md rounded-[28px] border border-white/80 bg-white/92 px-6 py-7 text-center shadow-[0_22px_50px_rgba(148,163,184,0.16)]">
                                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,#eaf4ff_0%,#f8f0ff_100%)] shadow-[0_14px_28px_rgba(125,140,180,0.14)]">
                                    <div className="h-8 w-8 rounded-[14px] border-2 border-dashed border-[#7d8cff] animate-spin" />
                                  </div>
                                  <p className="mt-5 text-lg font-black text-slate-700">
                                    正在为你编译可运行预览
                                  </p>
                                  <p className="mt-2 text-sm font-bold text-slate-500">
                                    {codingCompileMessages[codingCompileMessageIndex]}
                                  </p>
                                </div>
                              </div>
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
                  <div className="flex min-h-0 flex-1 px-5 pb-5 pt-3 lg:px-7 lg:pb-6 2xl:px-8">
                    <div className="relative flex h-full w-full min-h-0 items-center justify-center overflow-hidden rounded-[24px] border border-[#f3df99] bg-[linear-gradient(180deg,rgba(255,247,219,0.66),rgba(255,251,238,0.92))] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6),0_18px_40px_rgba(245,158,11,0.08)]">
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),transparent_58%,rgba(251,191,36,0.08))]" />
                      <div className="absolute left-8 top-8 hidden h-40 w-40 rounded-full border border-white/45 lg:block" />
                      <div className="absolute right-8 bottom-8 hidden h-48 w-48 rounded-full border border-white/40 lg:block" />

                      <div className="relative flex h-full min-h-0 w-full items-center justify-center p-4 lg:p-5 2xl:p-6">
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
                  <div className="flex min-h-0 flex-1 px-5 pb-5 pt-3 lg:px-7 lg:pb-6 2xl:px-8">
                    <div className="relative flex h-full w-full min-h-0 items-center justify-center overflow-hidden rounded-[24px] border border-[#f5c5d7] bg-[linear-gradient(180deg,rgba(244,248,255,0.7),rgba(255,246,250,0.92))] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6),0_18px_40px_rgba(251,191,188,0.08)]">
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),transparent_58%,rgba(125,211,252,0.08))]" />
                      <div className="absolute left-8 bottom-10 hidden h-44 w-44 rounded-full border border-white/40 lg:block" />
                      <div className="absolute right-8 top-8 hidden h-52 w-52 rounded-full border border-white/38 lg:block" />

                      <div className="relative flex h-full min-h-0 w-full items-center justify-center p-4 lg:p-5 2xl:p-6">
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
              ) : isSpeechMode ? (
                <div className="relative z-10 flex min-h-0 flex-1 flex-col">
                  <div className="flex min-h-0 flex-1 px-5 pb-5 pt-3 lg:px-7 lg:pb-6 2xl:px-8">
                    <div className="relative flex h-full w-full min-h-0 items-center justify-center overflow-hidden rounded-[24px] border border-[#ddd6fe] bg-[linear-gradient(180deg,rgba(245,243,255,0.72),rgba(255,247,251,0.92))] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6),0_18px_40px_rgba(147,51,234,0.08)]">
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),transparent_58%,rgba(216,180,254,0.08))]" />
                      <div className="relative flex h-full min-h-0 w-full items-center justify-center p-4 lg:p-5">
                        <div className="flex h-full min-h-0 w-full rounded-[26px] bg-gradient-to-br from-white via-[#faf7ff] to-[#fff7fb] p-4 shadow-[0_20px_50px_rgba(147,51,234,0.10)]">
                          <div className="mx-auto flex h-full min-h-0 w-full items-center justify-center rounded-[22px] border-2 border-dashed border-[#ddd6fe] bg-white/78 p-6 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.9)]">
                            {isSpeechGenerating ? (
                              <div className="flex h-full min-h-0 w-full flex-col items-center justify-center text-center">
                                <div className="relative flex h-28 w-28 items-center justify-center">
                                  <div className="absolute inset-0 rounded-full border-4 border-dashed border-[#ddd6fe] animate-spin" />
                                  <div className="absolute inset-3 rounded-full bg-white/82" />
                                  <div className="relative grid h-12 w-12 place-items-center rounded-[18px] bg-gradient-to-br from-[#d8d4ff] to-[#fce7f3]">
                                    <Image
                                      src="/landing-assets/icon-music.png"
                                      alt="语音图标"
                                      width={28}
                                      height={28}
                                      className="h-7 w-7 object-contain"
                                    />
                                  </div>
                                </div>
                                <div className="mt-6 rounded-full bg-white px-4 py-2 text-sm font-bold text-[#6d5bcf] shadow-[0_10px_24px_rgba(148,163,184,0.12)]">
                                  正在合成朗读音频
                                </div>
                                <p className="mt-5 max-w-md text-lg font-black leading-8 text-slate-600">
                                  正在把文字变成自然语音，请稍等一会儿。
                                </p>
                              </div>
                            ) : generatedSpeechUrl ? (
                              <div className="w-full max-w-xl rounded-[28px] border border-[#ddd6fe] bg-white px-6 py-7 text-center shadow-[0_22px_60px_rgba(147,51,234,0.12)]">
                                <div className="mx-auto grid h-24 w-24 place-items-center rounded-[30px] bg-gradient-to-br from-[#d8d4ff] via-[#ede9fe] to-[#fce7f3]">
                                  <Image
                                    src="/landing-assets/icon-music.png"
                                    alt="语音图标"
                                    width={44}
                                    height={44}
                                    className="h-11 w-11 object-contain"
                                  />
                                </div>
                                <p className="mt-5 font-['STZhongsong','Songti_SC','PingFang_SC',serif] text-3xl font-black text-slate-700">
                                  语音已生成
                                </p>
                                <audio
                                  src={generatedSpeechUrl}
                                  controls
                                  className="mt-6 w-full"
                                />
                              </div>
                            ) : (
                              <div className="flex h-full min-h-0 w-full flex-col items-center justify-center text-center">
                                <div className="grid h-28 w-28 place-items-center rounded-[30px] bg-gradient-to-br from-[#d8d4ff] via-[#ede9fe] to-[#fce7f3] shadow-[0_16px_36px_rgba(148,163,184,0.12)]">
                                  <Image
                                    src="/landing-assets/icon-music.png"
                                    alt="语音图标"
                                    width={44}
                                    height={44}
                                    className="h-11 w-11 object-contain"
                                  />
                                </div>
                                <p className="mt-6 font-['STZhongsong','Songti_SC','PingFang_SC',serif] text-3xl font-black text-slate-700">
                                  等待朗读
                                </p>
                                <p className="mt-3 max-w-md text-base leading-8 text-slate-500">
                                  在左侧输入文字并选择音色，生成后这里会播放完整语音。
                                </p>
                                {speechError && (
                                  <div className="mt-5 max-w-md rounded-[22px] bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#d45b85]">
                                    {speechError}
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
              ) : isVideoMode ? (
                <div className="relative z-10 flex min-h-0 flex-1 flex-col">
                  <div className="flex min-h-0 flex-1 px-5 pb-5 pt-3 lg:px-7 lg:pb-6 2xl:px-8">
                    <div className="relative flex h-full w-full min-h-0 items-center justify-center overflow-hidden rounded-[24px] border border-[#bfe4f4] bg-[linear-gradient(180deg,rgba(236,254,255,0.72),rgba(239,246,255,0.92))] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6),0_18px_40px_rgba(56,189,248,0.08)]">
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),transparent_58%,rgba(56,189,248,0.08))]" />
                      <div className="absolute left-8 bottom-10 hidden h-44 w-44 rounded-full border border-white/40 lg:block" />
                      <div className="absolute right-8 top-8 hidden h-52 w-52 rounded-full border border-white/38 lg:block" />

                      <div className="relative flex h-full min-h-0 w-full items-center justify-center p-4 lg:p-5">
                        <div className="flex h-full min-h-0 w-full rounded-[26px] bg-gradient-to-br from-white via-[#f0fbff] to-[#eef6ff] p-4 shadow-[0_20px_50px_rgba(56,189,248,0.12)]">
                          <div className="mx-auto flex h-full min-h-0 w-full items-center justify-center rounded-[22px] border-2 border-dashed border-[#bfe4f4] bg-white/78 p-6 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.9)]">
                            {isVideoGenerating ? (
                              <div className="flex h-full min-h-0 w-full flex-col items-center justify-center text-center">
                                <div className="relative flex h-28 w-28 items-center justify-center">
                                  <div className="absolute inset-0 rounded-full border-4 border-dashed border-[#bfe4f4] animate-spin" />
                                  <div className="absolute inset-3 rounded-full bg-white/82" />
                                  <div className="relative h-12 w-12 rounded-[18px] bg-gradient-to-br from-[#c8f3eb] to-[#dcecff]" />
                                  <div className="absolute -right-1 top-3 h-3 w-3 rounded-full bg-[#d8f4ff] animate-ping" />
                                  <div className="absolute -left-1 bottom-4 h-2.5 w-2.5 rounded-full bg-[#b7f0e3] animate-pulse" />
                                </div>
                                <div className="mt-6 rounded-full bg-white px-4 py-2 text-sm font-bold text-[#178ca7] shadow-[0_10px_24px_rgba(148,163,184,0.12)]">
                                  正在整理镜头和画面
                                </div>
                                <p className="mt-5 max-w-md text-lg font-black leading-8 text-slate-600">
                                  {videoSpeedMode === "fast"
                                    ? "正在用快速预览模式生成，视频仍然会比图片更久一点。"
                                    : "高清精制模式会更慢，我们正在等待完整成片返回。"}
                                </p>
                                {videoTaskMessage ? (
                                  <p className="mt-3 max-w-md text-sm font-bold leading-7 text-[#178ca7]">
                                    {videoTaskMessage}
                                  </p>
                                ) : null}
                              </div>
                            ) : generatedVideoUrl ? (
                              <div className="flex h-full min-h-0 w-full items-center justify-center overflow-hidden rounded-[24px] bg-[#f3fbff]">
                                <video
                                  src={generatedVideoUrl}
                                  controls
                                  className="h-full max-h-full w-full rounded-[24px] object-contain shadow-[0_22px_60px_rgba(148,163,184,0.2)]"
                                />
                              </div>
                            ) : (
                              <div className="flex h-full min-h-0 w-full flex-col items-center justify-center text-center">
                                <div className="grid h-28 w-28 place-items-center rounded-[30px] bg-gradient-to-br from-[#c8f3eb] via-[#dff8ff] to-[#dcecff] shadow-[0_16px_36px_rgba(148,163,184,0.12)]">
                                  <Image
                                    src="/landing-assets/icon-video.png"
                                    alt="视频图标"
                                    width={44}
                                    height={44}
                                    className="h-11 w-11 object-contain"
                                  />
                                </div>
                                <p className="mt-6 font-['STZhongsong','Songti_SC','PingFang_SC',serif] text-3xl font-black text-slate-700">
                                  空白舞台
                                </p>
                                <p className="mt-3 max-w-md text-base leading-8 text-slate-500">
                                  在左侧写下故事和镜头，开始生成后，右边会播放完整视频作品。
                                </p>
                                {videoError && (
                                  <div className="mt-5 max-w-md rounded-[22px] bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#d45b85]">
                                    {videoError}
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
                  <div className="flex min-h-0 flex-1 px-5 pb-5 pt-3 lg:px-7 lg:pb-6 2xl:px-8">
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
      </div>

      {isShareConfirmOpen && (
        <div className="absolute inset-0 z-[70] flex items-center justify-center bg-[#7d8eb0]/18 px-3 py-3 backdrop-blur-md sm:px-6">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[28px] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,251,255,0.98))] p-4 shadow-[0_28px_80px_rgba(148,163,184,0.24)] sm:rounded-[36px] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold tracking-[0.16em] text-[#8aa0ca]">
                  分享确认
                </p>
                <h3 className="mt-2 font-['STZhongsong','Songti_SC','PingFang_SC',serif] text-[26px] font-black tracking-[-0.05em] text-slate-700 sm:text-[32px]">
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
        <div className="absolute inset-0 z-[80] flex items-center justify-center bg-[#7d8eb0]/20 px-4 backdrop-blur-md sm:px-6">
          <div className="w-full max-w-xl rounded-[28px] bg-white p-5 text-center shadow-[0_28px_80px_rgba(148,163,184,0.24)] sm:rounded-[36px] sm:p-8">
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
            <h3 className="mt-6 font-['STZhongsong','Songti_SC','PingFang_SC',serif] text-[28px] font-black tracking-[-0.05em] text-slate-700 sm:text-[34px]">
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
        <div className="absolute inset-0 z-[82] flex items-center justify-center bg-[#7d8eb0]/22 px-4 backdrop-blur-md sm:px-6">
          <div className="w-full max-w-lg rounded-[28px] bg-white p-5 text-center shadow-[0_28px_80px_rgba(148,163,184,0.24)] sm:rounded-[34px] sm:p-8">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-[28px] bg-[linear-gradient(135deg,#eef4ff,#f7f1ff)] text-3xl font-black text-[#6b7fe8] shadow-[0_16px_36px_rgba(148,163,184,0.12)]">
              登
            </div>
            <h3 className="mt-6 font-['STZhongsong','Songti_SC','PingFang_SC',serif] text-[26px] font-black tracking-[-0.05em] text-slate-700 sm:text-[32px]">
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
        <div className="absolute inset-0 z-[85] flex items-center justify-center bg-[#7d8eb0]/22 px-3 py-3 backdrop-blur-md sm:px-4 sm:py-6">
          <div className="flex h-full max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-[28px] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,255,0.98))] shadow-[0_28px_80px_rgba(148,163,184,0.26)] sm:rounded-[34px]">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e6eeff] px-4 py-4 sm:px-6 sm:py-5">
              <div>
                <p className="text-sm font-bold tracking-[0.16em] text-[#8aa0ca]">
                  小程序拆解课
                </p>
                <h3 className="mt-2 font-['STZhongsong','Songti_SC','PingFang_SC',serif] text-[24px] font-black text-slate-700 sm:text-[30px]">
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

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
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
