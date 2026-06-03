import "server-only";
import { randomUUID } from "node:crypto";
import { getAiSecret } from "@/lib/ai-secrets";
import {
  PROFILE_BIO_MODERATION_DEFAULT_BLOCKED_KEYWORDS,
  PROFILE_BIO_MODERATION_DEFAULT_PROMPT,
  PROFILE_BIO_MODERATION_MODE_KEY,
} from "@/lib/profile-moderation-defaults";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type ProfileBioModerationStatus = "approved" | "pending" | "rejected";

export type ProfileBioReviewRecord = {
  status: ProfileBioModerationStatus;
  approvedBio: string | null;
  pendingBio: string | null;
  reason: string | null;
  stage: "rule" | "ai" | "fallback" | "manual";
  matchedKeyword: string | null;
  aiRaw: string | null;
  updatedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
};

type ProfileBioAiResponse = {
  decision?: "approved" | "pending" | "rejected";
  confidence?: "low" | "medium" | "high";
  reason?: string;
};

type ProfileBioAiConfig = {
  endpointUrl: string;
  apiKeyEnv: string;
  model: string;
  systemPrompt: string;
  isEnabled: boolean;
  extraPayload: Record<string, unknown>;
};

const defaultReviewRecord: ProfileBioReviewRecord = {
  status: "approved",
  approvedBio: null,
  pendingBio: null,
  reason: null,
  stage: "manual",
  matchedKeyword: null,
  aiRaw: null,
  updatedAt: new Date(0).toISOString(),
  reviewedAt: null,
  reviewedBy: null,
};

const fallbackProfileBioAiConfig: ProfileBioAiConfig = {
  endpointUrl:
    process.env.AI_API_URL ??
    "https://token-plan-cn.xiaomimimo.com/v1/chat/completions",
  apiKeyEnv: "AI_API_KEY",
  model: "mimo-v2.5-pro",
  systemPrompt: PROFILE_BIO_MODERATION_DEFAULT_PROMPT,
  isEnabled: true,
  extraPayload: {
    reasoningEffort: "low",
    maxCompletionTokens: 300,
    customBlockedKeywords: PROFILE_BIO_MODERATION_DEFAULT_BLOCKED_KEYWORDS.join("\n"),
  },
};

const blockedKeywordGroups = [
  {
    reason: "简介包含引流或私下联系方式，平台不允许发布。",
    keywords: [
      "加微信",
      "加我微信",
      "微信号",
      "vx",
      "v信",
      "weixin",
      "wechat",
      "qq",
      "扣扣",
      "企鹅号",
      "小红书号",
      "小红书",
      "红薯号",
      "抖音号",
      "快手号",
      "微博号",
      "公众号",
      "私聊",
      "私信我",
      "联系我",
      "二维码",
      "进群",
      "群号",
      "邮箱",
      "@",
      "http",
      "www.",
      ".com",
      ".cn",
    ],
  },
  {
    reason: "简介包含不适合未成年人平台的低俗或色情内容。",
    keywords: [
      "黄色",
      "色情",
      "约炮",
      "裸",
      "成人视频",
      "成人内容",
      "性",
      "开房",
      "援交",
      "擦边",
      "福利姬",
    ],
  },
  {
    reason: "简介包含暴力、伤害或危险诱导内容。",
    keywords: [
      "杀人",
      "砍人",
      "自杀",
      "轻生",
      "割腕",
      "跳楼",
      "血腥",
      "虐待",
      "炸弹",
      "枪支",
      "毒品",
      "吸毒",
      "校园暴力",
    ],
  },
  {
    reason: "简介包含政治敏感或违法违规内容。",
    keywords: [
      "反动",
      "恐怖主义",
      "极端组织",
      "邪教",
      "赌博",
      "诈骗",
      "洗钱",
      "代刷",
      "破解",
      "黑产",
    ],
  },
];

async function resolveProfileBioAiConfig(): Promise<ProfileBioAiConfig> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("ai_mode_configs")
    .select("endpoint_url, api_key_env, model, system_prompt, is_enabled, extra_payload")
    .eq("mode_key", PROFILE_BIO_MODERATION_MODE_KEY)
    .maybeSingle<{
      endpoint_url: string;
      api_key_env: string;
      model: string;
      system_prompt: string;
      is_enabled: boolean;
      extra_payload: Record<string, unknown> | null;
    }>();

  if (error || !data) {
    return fallbackProfileBioAiConfig;
  }

  return {
    endpointUrl: data.endpoint_url?.trim() || fallbackProfileBioAiConfig.endpointUrl,
    apiKeyEnv: data.api_key_env?.trim() || fallbackProfileBioAiConfig.apiKeyEnv,
    model: data.model?.trim() || fallbackProfileBioAiConfig.model,
    systemPrompt:
      data.system_prompt?.trim() || fallbackProfileBioAiConfig.systemPrompt,
    isEnabled: data.is_enabled,
    extraPayload: {
      ...fallbackProfileBioAiConfig.extraPayload,
      ...(data.extra_payload ?? {}),
    },
  };
}

function getReviewSettingKey(userId: string) {
  return `profile.bio-review.${userId}`;
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function compactText(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[._\-·:：,，。!！?？]/g, "");
}

function parseCustomBlockedKeywords(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(/[\n,，、]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function findBlockedKeyword(value: string, customKeywords: string[] = []) {
  const compact = compactText(value);
  const phonePattern = /1[3-9]\d{9}/;
  const qqPattern = /(?:qq|q群|群号)?[1-9]\d{5,11}/i;
  const obfuscatedContactPattern =
    /(加|找|联系|私聊|私信).{0,8}(v|vx|v信|微信|qq|扣扣|小红书|红薯|抖音|快手|群)/i;
  const accountLikePattern = /(v|vx|微信|qq|小红书|红薯|抖音|快手)[：:\-_]?[A-Za-z0-9_]{5,}/i;

  if (phonePattern.test(compact)) {
    return {
      keyword: "手机号",
      reason: "简介包含手机号或疑似私下联系方式，平台不允许发布。",
    };
  }

  if (qqPattern.test(value) && /(qq|扣扣|群|联系|加|私聊|私信)/i.test(value)) {
    return {
      keyword: "QQ/群号",
      reason: "简介包含 QQ、群号或疑似私下联系方式，平台不允许发布。",
    };
  }

  if (obfuscatedContactPattern.test(value) || accountLikePattern.test(value)) {
    return {
      keyword: "引流账号",
      reason: "简介包含疑似私下联系账号或引流信息，平台不允许发布。",
    };
  }

  for (const group of blockedKeywordGroups) {
    const keyword = group.keywords.find((item) =>
      compact.includes(compactText(item)),
    );

    if (keyword) {
      return {
        keyword,
        reason: group.reason,
      };
    }
  }

  const customKeyword = customKeywords.find((item) =>
    compact.includes(compactText(item)),
  );

  if (customKeyword) {
    return {
      keyword: customKeyword,
      reason: "简介包含后台配置的拦截关键词，平台不允许发布。",
    };
  }

  return null;
}

function buildProfileBioModerationUserContent(input: {
  displayName: string;
  bio: string;
}) {
  return [`昵称：${input.displayName}`, `个人简介：${input.bio}`].join("\n");
}

function resolveChatCompletionEndpoint(endpointUrl: string) {
  const trimmedEndpoint = endpointUrl.trim();
  const normalizedEndpoint = trimmedEndpoint.toLowerCase();

  if (normalizedEndpoint.endsWith("/chat/completions")) {
    return trimmedEndpoint;
  }

  if (normalizedEndpoint.endsWith("/v1")) {
    return `${trimmedEndpoint}/chat/completions`;
  }

  if (normalizedEndpoint.endsWith("/v1/")) {
    return `${trimmedEndpoint}chat/completions`;
  }

  return trimmedEndpoint;
}

async function upsertProfileBioReviewRecord(
  userId: string,
  record: ProfileBioReviewRecord,
) {
  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin.from("site_settings").upsert(
    {
      setting_key: getReviewSettingKey(userId),
      setting_group: "profile",
      label: "个人简介审核记录",
      value: record,
      description: "保存用户个人简介的自动审核和人工复审状态。",
    } as never,
    { onConflict: "setting_key" },
  );

  if (error) {
    throw error;
  }
}

export async function getProfileBioReviewRecord(userId: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("site_settings")
    .select("value")
    .eq("setting_key", getReviewSettingKey(userId))
    .maybeSingle<{ value: Partial<ProfileBioReviewRecord> }>();

  if (error || !data?.value) {
    return defaultReviewRecord;
  }

  return {
    ...defaultReviewRecord,
    ...data.value,
  };
}

export async function listProfileBioReviewRecords(userIds: string[]) {
  if (!userIds.length) {
    return new Map<string, ProfileBioReviewRecord>();
  }

  const keys = userIds.map((userId) => getReviewSettingKey(userId));
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("site_settings")
    .select("setting_key, value")
    .in("setting_key", keys)
    .returns<Array<{ setting_key: string; value: Partial<ProfileBioReviewRecord> }>>();

  if (error) {
    throw error;
  }

  return new Map(
    (data ?? []).map((item) => [
      item.setting_key.replace("profile.bio-review.", ""),
      {
        ...defaultReviewRecord,
        ...item.value,
      },
    ]),
  );
}

export async function moderateProfileBio(input: {
  userId: string;
  displayName: string;
  bio: string;
  currentApprovedBio: string | null;
}) {
  const bio = normalizeText(input.bio);
  const now = new Date().toISOString();

  if (!bio) {
    const record: ProfileBioReviewRecord = {
      status: "approved",
      approvedBio: null,
      pendingBio: null,
      reason: null,
      stage: "rule",
      matchedKeyword: null,
      aiRaw: null,
      updatedAt: now,
      reviewedAt: now,
      reviewedBy: null,
    };

    await upsertProfileBioReviewRecord(input.userId, record);
    return record;
  }

  const aiConfig = await resolveProfileBioAiConfig();
  const customBlockedKeywords = parseCustomBlockedKeywords(
    aiConfig.extraPayload.customBlockedKeywords,
  );
  const keywordHit = findBlockedKeyword(
    `${input.displayName}\n${bio}`,
    customBlockedKeywords,
  );

  if (keywordHit) {
    const record: ProfileBioReviewRecord = {
      status: "rejected",
      approvedBio: input.currentApprovedBio,
      pendingBio: bio,
      reason: keywordHit.reason,
      stage: "rule",
      matchedKeyword: keywordHit.keyword,
      aiRaw: null,
      updatedAt: now,
      reviewedAt: now,
      reviewedBy: null,
    };

    await upsertProfileBioReviewRecord(input.userId, record);
    return record;
  }

  if (!aiConfig.isEnabled) {
    const record: ProfileBioReviewRecord = {
      status: "pending",
      approvedBio: input.currentApprovedBio,
      pendingBio: bio,
      reason: "个人简介 AI 审核功能暂未启用，已转入人工审核。",
      stage: "fallback",
      matchedKeyword: null,
      aiRaw: null,
      updatedAt: now,
      reviewedAt: null,
      reviewedBy: null,
    };

    await upsertProfileBioReviewRecord(input.userId, record);
    return record;
  }

  const aiApiKey = await getAiSecret(aiConfig.apiKeyEnv);

  if (!aiApiKey) {
    const record: ProfileBioReviewRecord = {
      status: "pending",
      approvedBio: input.currentApprovedBio,
      pendingBio: bio,
      reason: `缺少 ${aiConfig.apiKeyEnv}，AI 审核服务暂时不可用，已转入人工审核。`,
      stage: "fallback",
      matchedKeyword: null,
      aiRaw: null,
      updatedAt: now,
      reviewedAt: null,
      reviewedBy: null,
    };

    await upsertProfileBioReviewRecord(input.userId, record);
    return record;
  }

  const aiApiUrl = resolveChatCompletionEndpoint(aiConfig.endpointUrl);
  const maxCompletionTokens =
    typeof aiConfig.extraPayload.maxCompletionTokens === "number"
      ? Math.max(1, Math.floor(aiConfig.extraPayload.maxCompletionTokens))
      : 300;

  try {
    const response = await fetch(aiApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${aiApiKey}`,
      },
      body: JSON.stringify({
        model: aiConfig.model,
        max_tokens: maxCompletionTokens,
        messages: [
          {
            role: "system",
            content:
              aiConfig.systemPrompt ||
              "你是一名极其严格的未成年人平台资料审核助手，只允许返回 JSON。",
          },
          {
            role: "user",
            content: buildProfileBioModerationUserContent({
              displayName: input.displayName,
              bio,
            }),
          },
        ],
      }),
    });

    if (!response.ok) {
      const raw = await response.text();
      const record: ProfileBioReviewRecord = {
        status: "pending",
        approvedBio: input.currentApprovedBio,
        pendingBio: bio,
        reason: "AI 审核暂时不可用，已转入人工审核。",
        stage: "fallback",
        matchedKeyword: null,
        aiRaw: raw,
        updatedAt: now,
        reviewedAt: null,
        reviewedBy: null,
      };

      await upsertProfileBioReviewRecord(input.userId, record);
      return record;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const rawContent = data.choices?.[0]?.message?.content?.trim() ?? "";
    const cleanedContent = rawContent
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    const parsed = JSON.parse(cleanedContent) as ProfileBioAiResponse;
    const decision = parsed.decision ?? "pending";
    const shouldApprove =
      decision === "approved" && parsed.confidence !== "low";

    const record: ProfileBioReviewRecord = shouldApprove
      ? {
          status: "approved",
          approvedBio: bio,
          pendingBio: null,
          reason: parsed.reason ?? null,
          stage: "ai",
          matchedKeyword: null,
          aiRaw: cleanedContent,
          updatedAt: now,
          reviewedAt: now,
          reviewedBy: null,
        }
      : {
          status: decision === "rejected" ? "rejected" : "pending",
          approvedBio: input.currentApprovedBio,
          pendingBio: bio,
          reason:
            parsed.reason ??
            "AI 审核认为存在风险，已转入人工审核。",
          stage: "ai",
          matchedKeyword: null,
          aiRaw: cleanedContent,
          updatedAt: now,
          reviewedAt: decision === "rejected" ? now : null,
          reviewedBy: null,
        };

    await upsertProfileBioReviewRecord(input.userId, record);
    return record;
  } catch (error) {
    const record: ProfileBioReviewRecord = {
      status: "pending",
      approvedBio: input.currentApprovedBio,
      pendingBio: bio,
      reason:
        error instanceof Error
          ? `AI 审核异常，已转入人工审核：${error.message}`
          : "AI 审核异常，已转入人工审核。",
      stage: "fallback",
      matchedKeyword: null,
      aiRaw: null,
      updatedAt: now,
      reviewedAt: null,
      reviewedBy: null,
    };

    await upsertProfileBioReviewRecord(input.userId, record);
    return record;
  }
}

export async function resolveProfileBioReview(input: {
  userId: string;
  action: "approve" | "reject" | "clear" | "update";
  approvedBio?: string | null;
  pendingBio?: string | null;
  reason?: string | null;
  adminUserId: string;
}) {
  const supabaseAdmin = getSupabaseAdmin();
  const currentRecord = await getProfileBioReviewRecord(input.userId);
  const now = new Date().toISOString();
  const nextApprovedBio =
    input.action === "approve"
      ? input.pendingBio ?? currentRecord.pendingBio ?? input.approvedBio ?? ""
      : input.action === "clear"
        ? null
        : input.action === "update"
          ? input.approvedBio ?? null
          : currentRecord.approvedBio;

  if (input.action === "approve" || input.action === "clear" || input.action === "update") {
    const { error } = await supabaseAdmin
      .from("user_profiles")
      .upsert(
        {
          user_id: input.userId,
          bio: nextApprovedBio,
        } as never,
        { onConflict: "user_id" },
      );

    if (error) {
      throw error;
    }
  }

  const record: ProfileBioReviewRecord = {
    status:
      input.action === "reject"
        ? "rejected"
        : "approved",
    approvedBio: nextApprovedBio,
    pendingBio: input.action === "reject" ? currentRecord.pendingBio : null,
    reason:
      input.reason ??
      (input.action === "approve"
        ? "管理员人工通过简介。"
        : input.action === "clear"
          ? "管理员已清空简介。"
          : input.action === "update"
            ? "管理员已修改简介。"
            : "管理员人工驳回简介。"),
    stage: "manual",
    matchedKeyword: null,
    aiRaw: currentRecord.aiRaw,
    updatedAt: now,
    reviewedAt: now,
    reviewedBy: input.adminUserId || randomUUID(),
  };

  await upsertProfileBioReviewRecord(input.userId, record);
  return record;
}
