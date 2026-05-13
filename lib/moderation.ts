import "server-only";

const bannedKeywords = [
  "赌博",
  "诈骗",
  "色情",
  "暴力",
  "毒品",
  "枪支",
  "自杀",
  "反动",
  "恐怖",
  "违法",
];

type ModerationResult = {
  approved: boolean;
  reason?: string;
};

export function moderateCommunityPost(input: {
  title: string;
  prompt: string;
  previewCode: string;
}): ModerationResult {
  const combinedText = `${input.title}\n${input.prompt}\n${input.previewCode}`.toLowerCase();

  const hitKeyword = bannedKeywords.find((keyword) =>
    combinedText.includes(keyword.toLowerCase()),
  );

  if (hitKeyword) {
    return {
      approved: false,
      reason: `内容包含敏感词：${hitKeyword}`,
    };
  }

  if (input.prompt.length < 8) {
    return {
      approved: false,
      reason: "提示词内容太短，无法通过审核。",
    };
  }

  return { approved: true };
}
