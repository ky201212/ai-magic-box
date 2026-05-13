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

type ModerationInput = {
  title: string;
  prompt: string;
  previewCode: string;
};

export type ModerationResult = {
  approved: boolean;
  reason?: string;
  stage: "rule" | "ai" | "fallback";
  suggestedStatus: "approved" | "pending" | "rejected";
};

type AiModerationResponse = {
  approved?: boolean;
  reason?: string;
};

function buildModerationPrompt(input: ModerationInput) {
  return [
    "你是一名面向中国青少年产品的社区内容审核助手。",
    "请根据中国法律法规、未成年人保护要求和儿童社区规范，审核下面这份作品内容是否适合公开展示。",
    "审核重点：违法违规、暴力血腥、色情低俗、诈骗赌博、极端危险、仇恨攻击、诱导未成年人不当行为、明显不适合儿童的内容。",
    "如果内容适合儿童社区公开展示，返回 approved=true。",
    "如果不适合，返回 approved=false，并用一句简短中文说明原因。",
    "你必须只返回 JSON，格式严格为：{\"approved\":true,\"reason\":\"...\"}。",
    "",
    `标题：${input.title}`,
    `提示词：${input.prompt}`,
    `代码片段：${input.previewCode.slice(0, 5000)}`,
  ].join("\n");
}

export function moderateCommunityPostByRules(
  input: ModerationInput,
): ModerationResult {
  const combinedText = `${input.title}\n${input.prompt}\n${input.previewCode}`.toLowerCase();

  const hitKeyword = bannedKeywords.find((keyword) =>
    combinedText.includes(keyword.toLowerCase()),
  );

  if (hitKeyword) {
    return {
      approved: false,
      reason: `内容包含敏感词：${hitKeyword}`,
      stage: "rule",
      suggestedStatus: "rejected",
    };
  }

  if (input.prompt.trim().length < 8) {
    return {
      approved: false,
      reason: "提示词内容太短，暂不适合直接公开展示。",
      stage: "rule",
      suggestedStatus: "rejected",
    };
  }

  if (input.previewCode.length < 120) {
    return {
      approved: false,
      reason: "生成内容太少，建议完善后再分享。",
      stage: "rule",
      suggestedStatus: "rejected",
    };
  }

  return {
    approved: true,
    stage: "rule",
    suggestedStatus: "approved",
  };
}

export async function moderateCommunityPostWithAi(
  input: ModerationInput,
): Promise<ModerationResult> {
  const aiApiKey = process.env.AI_API_KEY;

  if (!aiApiKey) {
    return {
      approved: false,
      reason: "审核服务暂时不可用，作品已进入人工复审队列。",
      stage: "fallback",
      suggestedStatus: "pending",
    };
  }

  const aiApiUrl =
    process.env.AI_API_URL ??
    "https://token-plan-cn.xiaomimimo.com/v1/chat/completions";

  try {
    const response = await fetch(aiApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${aiApiKey}`,
      },
      body: JSON.stringify({
        model: "mimo-v2.5-pro",
        messages: [
          {
            role: "system",
            content:
              "你是一名严格但克制的儿童社区内容审核助手，只允许返回 JSON。",
          },
          {
            role: "user",
            content: buildModerationPrompt(input),
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("【AI审核报错详情】:", errorText);

      return {
        approved: false,
        reason: "智能审核暂时不可用，作品已进入人工复审队列。",
        stage: "fallback",
        suggestedStatus: "pending",
      };
    }

    const data = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };

    const rawContent = data.choices?.[0]?.message?.content?.trim();

    if (!rawContent) {
      return {
        approved: false,
        reason: "智能审核未返回结果，作品已进入人工复审队列。",
        stage: "fallback",
        suggestedStatus: "pending",
      };
    }

    const cleanedContent = rawContent
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(cleanedContent) as AiModerationResponse;

    if (parsed.approved) {
      return {
        approved: true,
        reason: parsed.reason,
        stage: "ai",
        suggestedStatus: "approved",
      };
    }

    return {
      approved: false,
      reason: parsed.reason || "内容暂不适合公开展示。",
      stage: "ai",
      suggestedStatus: "rejected",
    };
  } catch (error) {
    console.error("【AI审核异常】:", error);
    return {
      approved: false,
      reason: "智能审核异常，作品已进入人工复审队列。",
      stage: "fallback",
      suggestedStatus: "pending",
    };
  }
}

export async function moderateCommunityPost(input: ModerationInput) {
  const ruleResult = moderateCommunityPostByRules(input);

  if (!ruleResult.approved) {
    return ruleResult;
  }

  return moderateCommunityPostWithAi(input);
}
