import "server-only";
import { getCommunityReviewSetting } from "@/lib/admin-data";
import { getAiSecret } from "@/lib/ai-secrets";

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
  detail: {
    rule: {
      approved: boolean;
      reason: string | null;
      matchedKeyword: string | null;
    };
    ai: {
      executed: boolean;
      approved: boolean | null;
      reason: string | null;
      raw: string | null;
      error: string | null;
    };
  };
};

type AiModerationResponse = {
  approved?: boolean;
  reason?: string;
};

function buildModerationPrompt(input: ModerationInput) {
  const defaultInstruction =
    "请优先保护未成年人社区安全，重点关注是否含有违法违规、血腥暴力、色情低俗、危险模仿、诱导沉迷、辱骂攻击或明显不适合儿童公开展示的内容。";

  return [
    "你是一名面向中国青少年产品的社区内容审核助手。",
    "请根据中国法律法规、未成年人保护要求和儿童社区规范，审核下面这份作品内容是否适合公开展示。",
    defaultInstruction,
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

  const defaultBlockedKeywords = [
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

  const blockedKeywords = defaultBlockedKeywords;

  const hitKeyword = blockedKeywords.find((keyword) =>
    combinedText.includes(keyword.toLowerCase()),
  );

  if (hitKeyword) {
    return {
      approved: false,
      reason: `内容包含敏感词：${hitKeyword}`,
      stage: "rule",
      suggestedStatus: "rejected",
      detail: {
        rule: {
          approved: false,
          reason: `内容包含敏感词：${hitKeyword}`,
          matchedKeyword: hitKeyword,
        },
        ai: {
          executed: false,
          approved: null,
          reason: null,
          raw: null,
          error: null,
        },
      },
    };
  }

  if (input.previewCode.length < 120) {
    return {
      approved: false,
      reason: "生成内容太少，建议完善后再分享。",
      stage: "rule",
      suggestedStatus: "rejected",
      detail: {
        rule: {
          approved: false,
          reason: "生成内容太少，建议完善后再分享。",
          matchedKeyword: null,
        },
        ai: {
          executed: false,
          approved: null,
          reason: null,
          raw: null,
          error: null,
        },
      },
    };
  }

  return {
    approved: true,
    stage: "rule",
    suggestedStatus: "approved",
    detail: {
      rule: {
        approved: true,
        reason: null,
        matchedKeyword: null,
      },
      ai: {
        executed: false,
        approved: null,
        reason: null,
        raw: null,
        error: null,
      },
    },
  };
}

export async function moderateCommunityPostWithAi(
  input: ModerationInput,
): Promise<ModerationResult> {
  const reviewSetting = await getCommunityReviewSetting().catch(() => null);
  const aiApiKey = await getAiSecret("AI_API_KEY");

  if (!aiApiKey) {
    return {
      approved: false,
      reason: "审核服务暂时不可用，作品已进入人工复审队列。",
      stage: "fallback",
      suggestedStatus: "pending",
      detail: {
        rule: {
          approved: true,
          reason: null,
          matchedKeyword: null,
        },
        ai: {
          executed: false,
          approved: null,
          reason: null,
          raw: null,
          error: "缺少 AI_API_KEY，已进入人工复审队列。",
        },
      },
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
            content: [
              buildModerationPrompt(input),
              "",
              `额外审核要求：${
                reviewSetting?.aiModerationInstruction ||
                "请优先保护未成年人社区安全。"
              }`,
            ].join("\n"),
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
        detail: {
          rule: {
            approved: true,
            reason: null,
            matchedKeyword: null,
          },
          ai: {
            executed: true,
            approved: null,
            reason: null,
            raw: errorText,
            error: "上游智能审核接口调用失败。",
          },
        },
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
        detail: {
          rule: {
            approved: true,
            reason: null,
            matchedKeyword: null,
          },
          ai: {
            executed: true,
            approved: null,
            reason: null,
            raw: null,
            error: "智能审核未返回结果。",
          },
        },
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
        detail: {
          rule: {
            approved: true,
            reason: null,
            matchedKeyword: null,
          },
          ai: {
            executed: true,
            approved: true,
            reason: parsed.reason ?? null,
            raw: cleanedContent,
            error: null,
          },
        },
      };
    }

    return {
      approved: false,
      reason: parsed.reason || "内容暂不适合公开展示。",
      stage: "ai",
      suggestedStatus: "rejected",
      detail: {
        rule: {
          approved: true,
          reason: null,
          matchedKeyword: null,
        },
        ai: {
          executed: true,
          approved: false,
          reason: parsed.reason || "内容暂不适合公开展示。",
          raw: cleanedContent,
          error: null,
        },
      },
    };
  } catch (error) {
    console.error("【AI审核异常】:", error);
    return {
      approved: false,
      reason: "智能审核异常，作品已进入人工复审队列。",
      stage: "fallback",
      suggestedStatus: "pending",
      detail: {
        rule: {
          approved: true,
          reason: null,
          matchedKeyword: null,
        },
        ai: {
          executed: true,
          approved: null,
          reason: null,
          raw: null,
          error: error instanceof Error ? error.message : "智能审核异常。",
        },
      },
    };
  }
}

export async function moderateCommunityPost(input: ModerationInput) {
  const reviewSetting = await getCommunityReviewSetting().catch(() => null);
  const combinedText = `${input.title}\n${input.prompt}\n${input.previewCode}`.toLowerCase();
  const blockedKeywords =
    reviewSetting?.blockedKeywords?.filter(
      (keyword) => typeof keyword === "string" && keyword.trim().length > 0,
    ) ?? [
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
  const hitKeyword = blockedKeywords.find((keyword) =>
    combinedText.includes(keyword.toLowerCase()),
  );

  const ruleResult = hitKeyword
    ? {
        approved: false,
        reason: `内容包含敏感词：${hitKeyword}`,
        stage: "rule" as const,
        suggestedStatus: "rejected" as const,
        detail: {
          rule: {
            approved: false,
            reason: `内容包含敏感词：${hitKeyword}`,
            matchedKeyword: hitKeyword,
          },
          ai: {
            executed: false,
            approved: null,
            reason: null,
            raw: null,
            error: null,
          },
        },
      }
    : moderateCommunityPostByRules(input);

  if (!ruleResult.approved) {
    return ruleResult;
  }

  return moderateCommunityPostWithAi(input);
}
