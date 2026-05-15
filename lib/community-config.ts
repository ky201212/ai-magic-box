export const COMMUNITY_CATEGORY_LABELS = [
  "创意编程",
  "绘画设计",
  "故事写作",
  "视频动画",
  "音乐创作",
  "科学实验",
] as const;

export type CommunityCategory = (typeof COMMUNITY_CATEGORY_LABELS)[number];

export const COMMUNITY_CATEGORY_KEYWORDS: Record<CommunityCategory, string[]> = {
  创意编程: ["程序", "编程", "互动", "按钮", "小游戏", "任务", "机器人", "科学"],
  绘画设计: ["绘画", "插画", "海报", "设计", "颜色", "画", "风景"],
  故事写作: ["故事", "童话", "小说", "日记", "冒险", "剧本", "写作"],
  视频动画: ["视频", "动画", "镜头", "短片", "剪辑"],
  音乐创作: ["音乐", "旋律", "节奏", "钢琴", "乐曲", "唱"],
  科学实验: ["实验", "火山", "电路", "物理", "化学", "观察"],
};

export const COMMUNITY_CATEGORY_ACCENT: Record<CommunityCategory, string> = {
  创意编程: "精选",
  绘画设计: "静态",
  故事写作: "故事",
  视频动画: "推荐",
  音乐创作: "新声",
  科学实验: "探索",
};

export const COMMUNITY_CATEGORY_DESCRIPTIONS: Record<CommunityCategory, string> = {
  创意编程: "把互动逻辑、小游戏和科普机关做成能玩的作品。",
  绘画设计: "用色彩、构图和想象力把一个世界画出来。",
  故事写作: "从一句灵感展开成完整角色、情节和结尾。",
  视频动画: "让画面、镜头和节奏串成一个可以观看的故事。",
  音乐创作: "把旋律、节拍和氛围感做成自己的主题曲。",
  科学实验: "把观察、猜想和实验过程变成可分享的小项目。",
};

export function normalizeCommunityCategory(value?: string | null): CommunityCategory {
  if (value && COMMUNITY_CATEGORY_LABELS.includes(value as CommunityCategory)) {
    return value as CommunityCategory;
  }

  return "创意编程";
}

export function inferCommunityCategory(input: {
  title: string;
  prompt: string;
}): CommunityCategory {
  const source = `${input.title} ${input.prompt}`.toLowerCase();

  for (const [label, keywords] of Object.entries(COMMUNITY_CATEGORY_KEYWORDS)) {
    if (keywords.some((keyword) => source.includes(keyword.toLowerCase()))) {
      return label as CommunityCategory;
    }
  }

  return "创意编程";
}
