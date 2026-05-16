export const infoCategories = [
  {
    key: "science",
    title: "科普知识",
    eyebrow: "SCIENCE FACTS",
    body: "把天文、生命、人工智能、工程与自然现象讲清楚，帮孩子从一个好问题开始理解世界。",
    accent: "from-[#78a7ff] to-[#8bd7ff]",
  },
  {
    key: "video",
    title: "科普视频",
    eyebrow: "VIDEO",
    body: "用短视频、课堂片段和动画解释复杂概念，让孩子看见科学背后的过程和方法。",
    accent: "from-[#8f7dff] to-[#7fd7ff]",
  },
  {
    key: "honor",
    title: "获奖喜讯",
    eyebrow: "HONORS",
    body: "记录孩子作品、课程项目和团队活动中的获奖、入选、展示与成长时刻。",
    accent: "from-[#ffbc7c] to-[#ff8fc7]",
  },
  {
    key: "event",
    title: "活动资讯",
    eyebrow: "EVENTS",
    body: "发布科普课堂、公益活动、校园合作、主题营和线下体验的最新安排。",
    accent: "from-[#91d6a8] to-[#8daeff]",
  },
] as const;

export type InfoCategoryKey = (typeof infoCategories)[number]["key"];

export type InfoContentStatus = "draft" | "published";

export type InfoContentPost = {
  id: string;
  category: InfoCategoryKey;
  title: string;
  subtitle: string;
  summary: string;
  body: string;
  coverUrl: string;
  videoUrl: string;
  status: InfoContentStatus;
  sortOrder: number;
  publishedAt: string;
  updatedAt: string;
};

export const defaultInfoContentPosts: InfoContentPost[] = [
  {
    id: "default-science-rocket",
    category: "science",
    title: "为什么火箭能离开地球？",
    subtitle: "从推力、重力和轨道三个角度，带孩子理解航天发射的基本原理。",
    summary: "从推力、重力和轨道三个角度，带孩子理解航天发射的基本原理。",
    body: "孩子常常会问：火箭为什么能飞得那么高？\n\n这篇内容会用更容易理解的方式解释推力、燃料、重力和轨道之间的关系，也会带孩子认识火箭起飞时到底在“对抗”什么。\n\n家长可以和孩子一起从生活里的气球反冲实验出发，再过渡到真正的航天发射，让抽象原理变得更好懂。",
    coverUrl: "",
    videoUrl: "",
    status: "published",
    sortOrder: 10,
    publishedAt: "2026-05-16",
    updatedAt: "2026-05-16",
  },
  {
    id: "default-video-robot-voice",
    category: "video",
    title: "一分钟看懂机器人如何识别声音",
    subtitle: "用课堂演示拆解语音输入、识别和反馈的完整流程。",
    summary: "用课堂演示拆解语音输入、识别和反馈的完整流程。",
    body: "视频会把“听见声音”拆成录入、分析、匹配和回应四个步骤，让孩子知道机器人并不是魔法，而是一步步处理信息。\n\n如果后台上传了视频，这里会直接显示视频播放器，方便家长和孩子直接点开观看。",
    coverUrl: "",
    videoUrl: "",
    status: "published",
    sortOrder: 20,
    publishedAt: "2026-05-16",
    updatedAt: "2026-05-16",
  },
  {
    id: "default-honor-ai-show",
    category: "honor",
    title: "孩子 AI 创作作品入选主题展示",
    subtitle: "记录孩子把科学想象变成作品的真实成长瞬间。",
    summary: "记录孩子把科学想象变成作品的真实成长瞬间。",
    body: "从一个想法到一张完整作品，孩子经历了提问、尝试、修改和表达。\n\n这里会持续记录值得被看见的成长成果，也方便家长回看孩子一次次进步的过程。",
    coverUrl: "",
    videoUrl: "",
    status: "published",
    sortOrder: 30,
    publishedAt: "2026-05-16",
    updatedAt: "2026-05-16",
  },
  {
    id: "default-event-campus-day",
    category: "event",
    title: "小红车校园科普体验日开放报名",
    subtitle: "面向学校和机构开放主题科普活动预约，包含 AI 创作与科学实验。",
    summary: "面向学校和机构开放主题科普活动预约，包含 AI 创作与科学实验。",
    body: "体验日面向孩子和家长开放，内容包含趣味科学观察、AI 创作体验和作品展示。\n\n后台编辑时可以直接上传活动图片或活动视频，前台点开后就能看到完整介绍，不需要再另外跳外链。",
    coverUrl: "",
    videoUrl: "",
    status: "published",
    sortOrder: 40,
    publishedAt: "2026-05-16",
    updatedAt: "2026-05-16",
  },
];

export function isInfoCategoryKey(value: string): value is InfoCategoryKey {
  return infoCategories.some((category) => category.key === value);
}

export function getInfoCategoryTitle(categoryKey: InfoCategoryKey) {
  return (
    infoCategories.find((category) => category.key === categoryKey)?.title ??
    "科普资讯"
  );
}

export function getInfoCategoryHref(categoryKey: InfoCategoryKey) {
  return `/world/category/${categoryKey}`;
}

export function getInfoPostHref(postId: string) {
  return `/world/${postId}`;
}

export function getInfoPostExcerpt(post: Pick<InfoContentPost, "summary" | "subtitle" | "body">) {
  return (
    sanitizePlainText(post.summary) ||
    sanitizePlainText(post.subtitle) ||
    createExcerpt(post.body, 72)
  );
}

export function normalizeInfoContentPosts(input: unknown): InfoContentPost[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item, index) => normalizeInfoContentPost(item, index))
    .filter((item): item is InfoContentPost => Boolean(item))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function normalizeInfoContentPost(input: unknown, index: number) {
  if (!input || typeof input !== "object") {
    return null;
  }

  const record = input as Record<string, unknown>;
  const category = String(record.category ?? "");
  const title = String(record.title ?? "").trim();
  const subtitle = String(record.subtitle ?? "").trim();
  const summary = String(record.summary ?? "").trim();
  const body = String(record.body ?? "").trim();

  if (!isInfoCategoryKey(category) || !title) {
    return null;
  }

  const status = record.status === "draft" ? "draft" : "published";
  const sortOrder = Number(record.sortOrder ?? (index + 1) * 10);
  const now = new Date().toISOString().slice(0, 10);

  return {
    id: String(record.id ?? `info-${Date.now()}-${index}`),
    category,
    title,
    subtitle,
    summary: sanitizePlainText(summary) || sanitizePlainText(subtitle) || createExcerpt(body, 72),
    body,
    coverUrl: String(record.coverUrl ?? "").trim(),
    videoUrl: String(record.videoUrl ?? "").trim(),
    status,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : (index + 1) * 10,
    publishedAt: String(record.publishedAt ?? now).trim() || now,
    updatedAt: String(record.updatedAt ?? now).trim() || now,
  };
}

function sanitizePlainText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function createExcerpt(value: string, limit: number) {
  const normalized = sanitizePlainText(value);

  if (!normalized) {
    return "";
  }

  return normalized.length > limit
    ? `${normalized.slice(0, Math.max(0, limit - 1)).trim()}…`
    : normalized;
}
