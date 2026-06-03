export const CHINA_MAINLAND_PHONE_PATTERN = /^1[3-9]\d{9}$/;

const DISPLAY_NAME_MAX_LENGTH = 16;
const DISPLAY_NAME_ALLOWED_PATTERN = /^[\p{Script=Han}A-Za-z0-9_\-\s·]+$/u;
const DISPLAY_NAME_LETTER_PATTERN = /[\p{Script=Han}A-Za-z]/u;

const reservedDisplayNameWords = [
  "admin",
  "administrator",
  "root",
  "system",
  "official",
  "openai",
  "chatgpt",
  "gpt",
  "ai",
  "小红车",
  "魔法工坊",
  "官方",
  "系统",
  "管理员",
  "管理",
  "客服",
  "审核",
  "版主",
  "站长",
  "测试",
  "游客",
  "未登录",
  "ai视图",
  "ai助手",
];

const blockedDisplayNameWords = [
  "你爸",
  "你爹",
  "傻",
  "蠢",
  "滚",
  "死",
  "操",
  "草",
  "靠",
  "垃圾",
  "废物",
  "骗子",
];

function normalizeDisplayNameForCheck(value: string) {
  return value
    .trim()
    .replace(/\s+/g, "")
    .replace(/[._\-·]/g, "")
    .toLowerCase();
}

export function normalizeProfileDisplayName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function validateProfileDisplayName(value: string) {
  const displayName = normalizeProfileDisplayName(value);
  const compactName = normalizeDisplayNameForCheck(displayName);

  if (displayName.length < 2 || displayName.length > DISPLAY_NAME_MAX_LENGTH) {
    return {
      ok: false as const,
      error: `用户名需要 2 到 ${DISPLAY_NAME_MAX_LENGTH} 个字。`,
    };
  }

  if (!DISPLAY_NAME_ALLOWED_PATTERN.test(displayName)) {
    return {
      ok: false as const,
      error: "用户名只能使用中文、英文、数字、空格、短横线和下划线。",
    };
  }

  if (!DISPLAY_NAME_LETTER_PATTERN.test(displayName)) {
    return {
      ok: false as const,
      error: "用户名至少要包含一个中文或英文字母，不能只用数字或符号。",
    };
  }

  if (/^(.)\1{3,}$/.test(compactName)) {
    return {
      ok: false as const,
      error: "用户名看起来太重复了，请换一个更像昵称的名字。",
    };
  }

  if (reservedDisplayNameWords.some((word) => compactName.includes(word))) {
    return {
      ok: false as const,
      error: "用户名不能使用官方、系统、管理员或 AI 相关保留词。",
    };
  }

  if (blockedDisplayNameWords.some((word) => compactName.includes(word))) {
    return {
      ok: false as const,
      error: "用户名里有不适合公开展示的词，请换一个友好的名字。",
    };
  }

  return {
    ok: true as const,
    value: displayName,
  };
}
