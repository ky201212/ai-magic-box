import "server-only";
import { randomUUID } from "node:crypto";
import { getAiSecret } from "@/lib/ai-secrets";
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

function findBlockedKeyword(value: string) {
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

  return null;
}

function buildProfileBioModerationPrompt(input: {
  displayName: string;
  bio: string;
}) {
  return [
    "你是一名非常严格的中国未成年人平台个人资料审核员，只允许返回 JSON。",
    "请审核用户昵称和个人简介是否允许在儿童/青少年 AI 创作平台公开展示。",
    "审核目标：优先保护小朋友，宁可转人工复审，也不要放过可疑内容。",
    "必须重点拦截：微信、QQ、小红书、抖音、快手、微博、群号、手机号、网址、邮箱、二维码、私聊私信等任何引流或私下联系信息。",
    "也要拦截：色情低俗、擦边、暴力伤害、自杀自残、毒品赌博诈骗、政治敏感、违法违规、辱骂霸凌、诱导未成年人危险行为。",
    "如果明确安全，返回 decision=approved。",
    "如果明显违规，返回 decision=rejected。",
    "如果存在较大概率风险、隐晦表达、谐音变体、疑似联系方式或你不确定，返回 decision=pending，交给人工审核。",
    "你必须只返回 JSON，格式：{\"decision\":\"approved|pending|rejected\",\"confidence\":\"low|medium|high\",\"reason\":\"一句中文原因\"}。",
    "",
    `昵称：${input.displayName}`,
    `个人简介：${input.bio}`,
  ].join("\n");
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

  const keywordHit = findBlockedKeyword(`${input.displayName}\n${bio}`);

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

  const aiApiKey = await getAiSecret("AI_API_KEY");

  if (!aiApiKey) {
    const record: ProfileBioReviewRecord = {
      status: "pending",
      approvedBio: input.currentApprovedBio,
      pendingBio: bio,
      reason: "AI 审核服务暂时不可用，已转入人工审核。",
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
              "你是一名极其严格的未成年人平台资料审核助手，只允许返回 JSON。",
          },
          {
            role: "user",
            content: buildProfileBioModerationPrompt({
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
