import "server-only";
import { randomUUID } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { PostgrestError } from "@supabase/supabase-js";
import {
  ADMIN_CREDIT_LOG_VISIBLE_DAYS,
  createCreditLogEntry,
  type CreditLogRow,
} from "@/lib/credits";
import {
  listAdminUserPaymentOrders,
  type PaymentOrder,
  type UserSubscription,
} from "@/lib/payments";
import { sendUserNotification } from "@/lib/user-notifications";
import { isBootstrapAdminPhone } from "@/lib/admin";
import {
  deleteCommunityPostPermanently,
  listCommunityAdminRecords,
  updateCommunityDashboardSetting,
  updateCommunityPostOperations,
  type CommunityAdminSearchRecord,
} from "@/lib/community";
import {
  defaultInfoContentPosts,
  normalizeInfoContentPosts,
  type InfoContentPost,
} from "@/lib/info-content";
import {
  listProfileBioReviewRecords,
  resolveProfileBioReview,
  type ProfileBioModerationStatus,
  type ProfileBioReviewRecord,
} from "@/lib/profile-bio-moderation";
import {
  PROFILE_BIO_MODERATION_DEFAULT_BLOCKED_KEYWORDS,
  PROFILE_BIO_MODERATION_DEFAULT_PROMPT,
  PROFILE_BIO_MODERATION_MODE_KEY,
} from "@/lib/profile-moderation-defaults";

export type SiteSettingRecord = {
  setting_key: string;
  setting_group: string;
  label: string;
  value: Record<string, unknown>;
  description: string | null;
  updated_at?: string;
};

export type CreditPolicyRecord = {
  initialCredits: number;
};

export type CommunityReviewSettingRecord = {
  aiApprovalMode: "auto_publish" | "manual_review";
  aiModerationInstruction: string;
  blockedKeywords: string[];
  lockManualApproveAfterAiReject: boolean;
  dailyPostLimit: number;
};

export type AiModeConfigRecord = {
  mode_key: string;
  mode_name: string;
  provider: string;
  endpoint_url: string;
  api_key_env: string;
  model: string;
  system_prompt: string;
  is_enabled: boolean;
  extra_payload: Record<string, unknown> | null;
  updated_at?: string;
};

export type AiModelPresetRecord = {
  id: string;
  mode_key: string;
  label: string;
  provider: string;
  endpoint_url: string;
  api_key_env: string;
  model: string;
  description: string;
  badge: string;
  image_size?: string;
  supportsImageEditing?: boolean;
};

export type AiSecretStatusRecord = {
  envName: string;
  available: boolean;
  source: "database" | "environment" | "missing";
  updatedAt: string | null;
};

export type AiSecretAuditRecord = {
  id: string;
  envName: string;
  action: "save" | "delete";
  actorUserId: string;
  actorDisplayName: string;
  actorPhone: string;
  createdAt: string;
};

export type AiSecretSecuritySummary = {
  masterKeySource: "dedicated" | "fallback" | "missing";
  storageEncryptionEnabled: boolean;
  warningMessage: string | null;
};

export type AiModelChainStatsRecord = {
  updatedAt: string | null;
  models: Array<{
    slot: "A" | "B" | "C";
    label: string;
    provider: string;
    model: string;
    endpointUrl: string;
    successCount: number;
    failureCount: number;
    timeoutCount: number;
    skipCount: number;
    consecutiveFailures: number;
    cooldownUntil: string | null;
    streamSupport: "supported" | "unsupported" | "unknown";
    lastStatus: string | null;
    lastError: string | null;
    lastUsedAt: string | null;
  }>;
  recentEvents: Array<{
    id: string;
    createdAt: string;
    slot: "A" | "B" | "C";
    label: string;
    provider: string;
    model: string;
    event:
      | "success"
      | "failure"
      | "timeout"
      | "skipped_missing_key"
      | "stopped";
    streamSupport?: "supported" | "unsupported";
    status?: number;
    latencyMs?: number;
    message?: string;
  }>;
};

export type CodingModelChainStatsRecord = AiModelChainStatsRecord;

export type DashboardStats = {
  usersTotal: number;
  communityPending: number;
  communityApproved: number;
  notificationsSent: number;
};

export type AdminCommunityPostRecord = {
  id: string;
  user_id: string;
  mode: "coding" | "writing" | "painting";
  title: string;
  prompt: string;
  preview_image_url: string;
  preview_code?: string;
  user_phone: string | null;
  user_nickname: string | null;
  user_display_name: string | null;
  moderation_status: "draft" | "pending" | "approved" | "rejected";
  moderation_reason: string | null;
  moderation_stage: "rule" | "ai" | "fallback" | "manual";
  moderation_detail: Record<string, unknown>;
  is_featured: boolean;
  like_count?: number;
  view_count?: number;
  share_count?: number;
  category?: string;
  manual_sort_order?: number;
  creator_score?: number;
  manual_creator_rank?: number | null;
  is_creator_star?: boolean;
  created_at: string;
  reviewed_at: string | null;
};

export type AdminUserRecord = {
  id: string;
  phone: string;
  nickname: string | null;
  profile_display_name: string | null;
  profile_bio: string | null;
  profile_bio_pending: string | null;
  profile_bio_status: ProfileBioModerationStatus;
  profile_bio_reason: string | null;
  profile_bio_stage: ProfileBioReviewRecord["stage"];
  profile_bio_updated_at: string | null;
  status: "active" | "disabled";
  last_login_at: string | null;
  avatar_url: string | null;
  notes: string | null;
  created_at: string;
  credits: number;
  postsCount: number;
  approvedPostsCount: number;
  pendingPostsCount: number;
  rejectedPostsCount: number;
  latestPostAt: string | null;
  totalCreditsAdded: number;
  totalCreditsSpent: number;
  lastCreditChangeAt: string | null;
  subscriptions: UserSubscription[];
  paymentOrders: PaymentOrder[];
  creditLogs: CreditLogRow[];
};

export type NotificationRecord = {
  id: string;
  title: string;
  body: string;
  target_type: "all" | "users" | "admins";
  target_user_ids: string[];
  status: "draft" | "sent";
  sent_at: string | null;
  created_at: string;
  updated_at: string;
  target_label?: string;
  recipient_count?: number;
  recipient_preview?: NotificationRecipientRecord[];
};

export type NotificationTargetAudience = "all" | "admins" | "selected" | "segment";

export type NotificationTargetFilters = {
  audience?: NotificationTargetAudience;
  query?: string;
  gender?: "any" | "male" | "female" | "unspecified";
  status?: "any" | "active" | "disabled";
  group?:
    | "all"
    | "active_subscription"
    | "no_subscription"
    | "creators"
    | "creator_stars"
    | "pending_review"
    | "rejected_posts"
    | "no_posts";
};

export type NotificationTargetUserRecord = {
  id: string;
  phone: string;
  nickname: string | null;
  status: "active" | "disabled";
  created_at: string;
  profile_display_name: string | null;
  gender: "male" | "female" | "unspecified";
  posts_count: number;
  pending_posts_count: number;
  rejected_posts_count: number;
  approved_posts_count: number;
  has_active_subscription: boolean;
  is_admin: boolean;
  is_creator_star: boolean;
};

export type NotificationRecipientRecord = NotificationTargetUserRecord & {
  notification_user_id?: string;
  is_read?: boolean;
  delivered_at?: string;
  read_at?: string | null;
};

export type InfoContentSettingRecord = {
  posts: InfoContentPost[];
};

export type UserNotificationRecord = {
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

export type UserNotificationsSummary = {
  notifications: UserNotificationRecord[];
  unreadCount: number;
};

const aiModelChainStatsMutationLocks = new Map<string, Promise<void>>();

async function withAiModelChainStatsMutationLock<T>(
  modeKey: string,
  work: () => Promise<T>,
) {
  const previous = aiModelChainStatsMutationLocks.get(modeKey) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });

  aiModelChainStatsMutationLocks.set(
    modeKey,
    previous.then(() => current),
  );

  await previous;

  try {
    return await work();
  } finally {
    release();

    if (aiModelChainStatsMutationLocks.get(modeKey) === current) {
      aiModelChainStatsMutationLocks.delete(modeKey);
    }
  }
}

export async function listSiteSettings(): Promise<SiteSettingRecord[]> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("site_settings")
    .select("setting_key, setting_group, label, value, description, updated_at")
    .order("setting_group", { ascending: true })
    .order("setting_key", { ascending: true })
    .returns<SiteSettingRecord[]>();

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function upsertSiteSettings(
  settings: Array<{
    setting_key: string;
    setting_group: string;
    label: string;
    value: Record<string, unknown>;
    description?: string;
    updated_by: string | null;
  }>,
) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("site_settings")
    .upsert(settings as never, { onConflict: "setting_key" })
    .select("setting_key, setting_group, label, value, description, updated_at")
    .returns<SiteSettingRecord[]>();

  if (error) {
    console.error("【site_settings 写入失败】:", {
      settingKeys: settings.map((item) => item.setting_key),
      error,
    });
    throw error;
  }

  return data ?? [];
}

export async function getSiteSettingValue<T>(
  settingKey: string,
  fallback: T,
) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("site_settings")
    .select("value")
    .eq("setting_key", settingKey)
    .maybeSingle<{ value: T }>();

  if (error || !data?.value) {
    return fallback;
  }

  return data.value;
}

export async function getCreditPolicySetting() {
  return getSiteSettingValue<CreditPolicyRecord>("credits.policy", {
    initialCredits: 50,
  });
}

export async function getCommunityReviewSetting() {
  return getSiteSettingValue<CommunityReviewSettingRecord>(
    "community.review.policy",
    {
      aiApprovalMode: "manual_review",
      aiModerationInstruction:
        "请优先保护未成年人社区安全，重点关注是否含有违法违规、血腥暴力、色情低俗、危险模仿、诱导沉迷、辱骂攻击或明显不适合儿童公开展示的内容。",
      blockedKeywords: [
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
      ],
      lockManualApproveAfterAiReject: true,
      dailyPostLimit: 0,
    },
  );
}

export async function getInfoContentSetting() {
  const result = await getSiteSettingValue<{ posts?: unknown }>(
    "content.info-posts",
    { posts: defaultInfoContentPosts },
  );

  const posts = normalizeInfoContentPosts(result.posts);

  return {
    posts: posts.length ? posts : defaultInfoContentPosts,
  };
}

export async function listInfoContentPosts(input?: {
  includeDrafts?: boolean;
  limit?: number;
}) {
  const setting = await getInfoContentSetting();
  const posts = input?.includeDrafts
    ? setting.posts
    : setting.posts.filter((post) => post.status === "published");

  const sortedPosts = [...posts].sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === "published" ? -1 : 1;
    }

    return a.sortOrder - b.sortOrder;
  });

  return typeof input?.limit === "number" && input.limit > 0
    ? sortedPosts.slice(0, input.limit)
    : sortedPosts;
}

export async function saveInfoContentPosts(input: {
  posts: InfoContentPost[];
  updatedBy: string;
}) {
  const normalizedPosts = normalizeInfoContentPosts(input.posts);

  await upsertSiteSettings([
    {
      setting_key: "content.info-posts",
      setting_group: "content",
      label: "科普资讯内容",
      value: { posts: normalizedPosts },
      description: "科普资讯页面展示的文章、视频、获奖喜讯和活动资讯。",
      updated_by: input.updatedBy,
    },
  ]);

  return normalizedPosts;
}

export async function listAiModeConfigs(): Promise<AiModeConfigRecord[]> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("ai_mode_configs")
    .select(
      "mode_key, mode_name, provider, endpoint_url, api_key_env, model, system_prompt, is_enabled, extra_payload, updated_at",
    )
    .order("mode_key", { ascending: true })
    .returns<AiModeConfigRecord[]>();

  if (error) {
    throw error;
  }

  const configs = data ?? [];
  const requiredFallbackConfigs: AiModeConfigRecord[] = [
    {
      mode_key: "coding",
      mode_name: "AI编程",
      provider: "mimo",
      endpoint_url: "https://token-plan-cn.xiaomimimo.com/v1/chat/completions",
      api_key_env: "AI_API_KEY",
      model: "mimo-v2.5-pro",
      system_prompt:
        "你是少儿编程导师。请根据用户要求生成一个可直接运行的单文件 HTML。必须内含 CSS、JavaScript，并通过 CDN 引入 Tailwind CSS。界面要童趣、清晰、适配手机。页面必须铺满整个预览视口：html、body、主容器都使用 width:100% 与 min-height:100vh；禁止额外绘制居中的手机外框、设备边框、小屏幕容器或限制整页 max-width。若内容较长，必须允许纵向滚动；禁止用 overflow:hidden 或固定 100vh 阻断滚动。只返回最终 HTML，不要 Markdown，不要解释。",
      is_enabled: true,
      extra_payload: {
        creditEnabled: false,
        creditCost: 0,
        reasoningEffort: "none",
        maxCompletionTokens: 900,
        streamPreviewEnabled: true,
        showModelRelayStatus: false,
        modelChain: [],
      },
    },
    {
      mode_key: "writing",
      mode_name: "AI写作",
      provider: "mimo",
      endpoint_url: "https://token-plan-cn.xiaomimimo.com/v1/chat/completions",
      api_key_env: "AI_API_KEY",
      model: "mimo-v2.5-pro",
      system_prompt:
        "你是一位充满童心、温柔又专业的少儿写作导师。请根据用户输入的写作需求，生成适合中小学生阅读和使用的中文写作内容。要求语言优美、生动、有画面感，同时保持自然、真诚、易懂。如果用户要童话，就写得温暖有想象力；如果用户要诗歌，就写得有节奏和意境；如果用户要演讲稿，就写得自信、清晰、有感染力。重要要求：只返回最终的纯文本内容，绝对不要包含 Markdown 代码块、标题符号、解释说明、创作分析或多余前后缀。",
      is_enabled: true,
      extra_payload: {
        creditEnabled: false,
        creditCost: 0,
        reasoningEffort: "low",
        maxCompletionTokens: 800,
        modelChain: [],
      },
    },
    {
      mode_key: "painting",
      mode_name: "AI绘画",
      provider: "siliconflow",
      endpoint_url: "https://api.siliconflow.cn/v1/images/generations",
      api_key_env: "SILICONFLOW_API_KEY",
      model: "Kwai-Kolors/Kolors",
      system_prompt: "请根据用户输入的中文绘画描述，生成适合儿童教育展示的图像。",
      is_enabled: true,
      extra_payload: {
        image_size: "1024x1024",
        creditEnabled: true,
        creditCost: 5,
        supportsImageEditing: false,
        modelChain: [],
      },
    },
    {
      mode_key: "video",
      mode_name: "AI视频",
      provider: "siliconflow",
      endpoint_url: "https://api.siliconflow.cn/v1/video/submit",
      api_key_env: "SILICONFLOW_API_KEY",
      model: "Wan-AI/Wan2.2-T2V-A14B",
      system_prompt:
        "请根据用户输入的中文故事提示，生成适合儿童教育展示的短视频镜头描述与动画结果。",
      is_enabled: true,
      extra_payload: {
        image_size: "1280x720",
        qualityModel: "Wan-AI/Wan2.2-T2V-A14B",
        creditEnabled: false,
        creditCost: 0,
        pollIntervalMs: 5000,
        pollTimeoutMs: 180000,
        modelChain: [],
      },
    },
    {
      mode_key: "speech",
      mode_name: "AI语音",
      provider: "siliconflow",
      endpoint_url: "https://api.siliconflow.cn/v1/audio/speech",
      api_key_env: "SILICONFLOW_API_KEY",
      model: "FunAudioLLM/CosyVoice2-0.5B",
      system_prompt: "请将用户输入的中文内容合成为适合儿童收听的自然语音。",
      is_enabled: true,
      extra_payload: {
        responseFormat: "mp3",
        voice: "alex",
        speed: 1,
        gain: 0,
        creditEnabled: false,
        creditCost: 0,
        modelChain: [],
      },
    },
    {
      mode_key: "transcribe",
      mode_name: "语音识别",
      provider: "siliconflow",
      endpoint_url: "https://api.siliconflow.cn/v1/audio/transcriptions",
      api_key_env: "SILICONFLOW_API_KEY",
      model: "FunAudioLLM/SenseVoiceSmall",
      system_prompt: "请将儿童语音内容准确识别为简体中文文本。",
      is_enabled: true,
      extra_payload: {
        creditEnabled: false,
        creditCost: 0,
        modelChain: [],
      },
    },
    {
      mode_key: "promptOptimize",
      mode_name: "提示词优化",
      provider: "mimo",
      endpoint_url: "https://token-plan-cn.xiaomimimo.com/v1/chat/completions",
      api_key_env: "AI_API_KEY",
      model: "mimo-v2.5-pro",
      system_prompt:
        "你是一位提示词润色助手。请把用户输入改写成更清晰、具体、结构化、更容易被 AI 正确理解的中文提示词。保留原本意图，不要编造不存在的需求，不要输出解释，只返回优化后的最终提示词正文。",
      is_enabled: true,
      extra_payload: {
        creditEnabled: false,
        creditCost: 0,
        reasoningEffort: "low",
        maxCompletionTokens: 600,
        modelChain: [],
      },
    },
    {
      mode_key: PROFILE_BIO_MODERATION_MODE_KEY,
      mode_name: "个人简介审核",
      provider: "mimo",
      endpoint_url: "https://token-plan-cn.xiaomimimo.com/v1/chat/completions",
      api_key_env: "AI_API_KEY",
      model: "mimo-v2.5-pro",
      system_prompt: PROFILE_BIO_MODERATION_DEFAULT_PROMPT,
      is_enabled: true,
      extra_payload: {
        creditEnabled: false,
        creditCost: 0,
        reasoningEffort: "low",
        maxCompletionTokens: 300,
        customBlockedKeywords: PROFILE_BIO_MODERATION_DEFAULT_BLOCKED_KEYWORDS.join("\n"),
        modelChain: [],
      },
    },
  ];

  return requiredFallbackConfigs.map(
    (fallback) =>
      configs.find((item) => item.mode_key === fallback.mode_key) ?? fallback,
  );
}

export async function getAiModeConfig(modeKey: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("ai_mode_configs")
    .select(
      "mode_key, mode_name, provider, endpoint_url, api_key_env, model, system_prompt, is_enabled, extra_payload, updated_at",
    )
    .eq("mode_key", modeKey)
    .maybeSingle<AiModeConfigRecord>();

  if (error) {
    throw error;
  }

  return data;
}

export async function saveAiModelPresets(input: {
  presets: AiModelPresetRecord[];
  updatedBy: string;
}) {
  const normalizedPresets = input.presets.map((preset) => ({
    ...preset,
    label: preset.label.trim(),
    provider: preset.provider.trim(),
    endpoint_url: preset.endpoint_url.trim(),
    api_key_env: preset.api_key_env.trim(),
    model: preset.model.trim(),
    description: preset.description.trim(),
    badge: preset.badge.trim(),
    image_size: preset.image_size?.trim() || undefined,
    supportsImageEditing: preset.supportsImageEditing === true,
  }));

  await upsertSiteSettings([
    {
      setting_key: "ai.model-presets",
      setting_group: "ai",
      label: "AI模型模板库",
      value: { presets: normalizedPresets },
      description: "后台 AI 配置页面使用的模型模板列表。",
      updated_by: input.updatedBy,
    },
  ]);

  return normalizedPresets;
}

export async function getAiModelPresetsSetting() {
  const result = await getSiteSettingValue<{ presets?: AiModelPresetRecord[] }>(
    "ai.model-presets",
    { presets: [] },
  );

  return result.presets ?? [];
}

export async function listAiModelPresets() {
  return getAiModelPresetsSetting();
}

function createDefaultAiModelChainStats(): AiModelChainStatsRecord {
  return {
    updatedAt: null,
    models: (["A", "B", "C"] as const).map((slot) => ({
      slot,
      label: `${slot} 模型`,
      provider: "",
      model: "",
      endpointUrl: "",
      successCount: 0,
      failureCount: 0,
      timeoutCount: 0,
      skipCount: 0,
      consecutiveFailures: 0,
      cooldownUntil: null,
      streamSupport: "unknown",
      lastStatus: null,
      lastError: null,
      lastUsedAt: null,
    })),
    recentEvents: [],
  };
}

function getAiModelChainStatsSettingKey(modeKey: string) {
  return `ai.${modeKey}-model-chain-stats`;
}

function getAiModelChainStatsLabel(modeKey: string) {
  const labelMap: Record<string, string> = {
    coding: "AI 编程",
    writing: "AI 写作",
    painting: "AI 绘画",
    video: "AI 视频",
    speech: "AI 语音",
    transcribe: "语音识别",
    promptOptimize: "提示词优化",
    [PROFILE_BIO_MODERATION_MODE_KEY]: "个人简介审核",
  };

  return labelMap[modeKey] ?? modeKey;
}

export async function getAiModelChainStats(modeKey: string) {
  return getSiteSettingValue<AiModelChainStatsRecord>(
    getAiModelChainStatsSettingKey(modeKey),
    createDefaultAiModelChainStats(),
  );
}

export async function getCodingModelChainStats() {
  return getAiModelChainStats("coding");
}

export async function recordAiModelChainEvent(input: {
  modeKey: string;
  slot: "A" | "B" | "C";
  label: string;
  provider?: string;
  model: string;
  endpointUrl: string;
  event: "success" | "failure" | "timeout" | "skipped_missing_key" | "stopped";
  streamSupport?: "supported" | "unsupported";
  status?: number;
  latencyMs?: number;
  message?: string;
  cooldownUntil?: string | null;
}) {
  try {
    return await withAiModelChainStatsMutationLock(input.modeKey, async () => {
      const current = await getAiModelChainStats(input.modeKey);
      const eventCreatedAt = new Date().toISOString();
      const nextModels = current.models.map((item) => {
        if (item.slot !== input.slot) {
          return item;
        }

        const isFailureLike =
          input.event === "failure" || input.event === "timeout";
        const nextConsecutiveFailures = input.event === "success"
          ? 0
          : isFailureLike
            ? item.consecutiveFailures + 1
            : item.consecutiveFailures;

        return {
          ...item,
          label: input.label.trim() || item.label,
          provider: input.provider?.trim() || item.provider,
          model: input.model.trim() || item.model,
          endpointUrl: input.endpointUrl.trim() || item.endpointUrl,
          successCount:
            item.successCount + (input.event === "success" ? 1 : 0),
          failureCount:
            item.failureCount + (input.event === "failure" ? 1 : 0),
          timeoutCount:
            item.timeoutCount + (input.event === "timeout" ? 1 : 0),
          skipCount:
            item.skipCount + (input.event === "skipped_missing_key" ? 1 : 0),
          consecutiveFailures: nextConsecutiveFailures,
          cooldownUntil:
            input.event === "success"
              ? null
              : input.cooldownUntil === undefined
                ? item.cooldownUntil
                : input.cooldownUntil,
          streamSupport: input.streamSupport ?? item.streamSupport ?? "unknown",
          lastStatus:
            typeof input.status === "number" ? String(input.status) : input.event,
          lastError: input.message?.trim() || null,
          lastUsedAt: eventCreatedAt,
        };
      });

      const nextStats: AiModelChainStatsRecord = {
        updatedAt: eventCreatedAt,
        models: nextModels,
        recentEvents: [
          {
            id: randomUUID(),
            createdAt: eventCreatedAt,
            slot: input.slot,
            label: input.label.trim() || `${input.slot} 模型`,
            provider: input.provider?.trim() || "",
            model: input.model.trim(),
            event: input.event,
            streamSupport: input.streamSupport,
            status: input.status,
            latencyMs:
              typeof input.latencyMs === "number" && Number.isFinite(input.latencyMs)
                ? Math.max(0, Math.round(input.latencyMs))
                : undefined,
            message: input.message?.trim() || undefined,
          },
          ...current.recentEvents,
        ].slice(0, 120),
      };

      await upsertSiteSettings([
        {
          setting_key: getAiModelChainStatsSettingKey(input.modeKey),
          setting_group: "ai",
          label: `${getAiModelChainStatsLabel(input.modeKey)}模型接力统计`,
          value: nextStats,
          description: `记录${getAiModelChainStatsLabel(input.modeKey)} A/B/C 模型接力的最近结果统计。`,
          updated_by: null,
        },
      ]);

      return nextStats;
    });
  } catch (error) {
    console.error("【AI 模型接力统计写入失败】:", {
      modeKey: input.modeKey,
      slot: input.slot,
      label: input.label,
      model: input.model,
      event: input.event,
      error,
    });

    return createDefaultAiModelChainStats();
  }
}

export async function recordCodingModelChainEvent(
  input: Omit<Parameters<typeof recordAiModelChainEvent>[0], "modeKey">,
) {
  return recordAiModelChainEvent({
    modeKey: "coding",
    ...input,
  });
}

export async function clearAiModelCooldown(modeKey: string, slot: "A" | "B" | "C") {
  return withAiModelChainStatsMutationLock(modeKey, async () => {
    const current = await getAiModelChainStats(modeKey);
    const nextStats: AiModelChainStatsRecord = {
      ...current,
      updatedAt: new Date().toISOString(),
      models: current.models.map((item) =>
        item.slot === slot
          ? {
              ...item,
              consecutiveFailures: 0,
              cooldownUntil: null,
              lastStatus: "manual_reset",
              lastError: null,
            }
          : item,
      ),
    };

    await upsertSiteSettings([
      {
        setting_key: getAiModelChainStatsSettingKey(modeKey),
        setting_group: "ai",
        label: `${getAiModelChainStatsLabel(modeKey)}模型接力统计`,
        value: nextStats,
        description: `记录${getAiModelChainStatsLabel(modeKey)} A/B/C 模型接力的最近结果统计。`,
        updated_by: null,
      },
    ]);

    return nextStats;
  });
}

export async function clearCodingModelCooldown(slot: "A" | "B" | "C") {
  return clearAiModelCooldown("coding", slot);
}

export async function upsertAiModeConfigs(
  configs: Array<
    AiModeConfigRecord & {
      updated_by: string;
    }
  >,
) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("ai_mode_configs")
    .upsert(configs as never, { onConflict: "mode_key" })
    .select(
      "mode_key, mode_name, provider, endpoint_url, api_key_env, model, system_prompt, is_enabled, extra_payload, updated_at",
    )
    .returns<AiModeConfigRecord[]>();

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabaseAdmin = getSupabaseAdmin();

  const [usersTotal, communityPending, communityApproved, notificationsSent] =
    await Promise.all([
      supabaseAdmin.from("users").select("*", { count: "exact", head: true }),
      supabaseAdmin
        .from("community_posts")
        .select("*", { count: "exact", head: true })
        .eq("moderation_status", "pending"),
      supabaseAdmin
        .from("community_posts")
        .select("*", { count: "exact", head: true })
        .eq("moderation_status", "approved"),
      supabaseAdmin
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("status", "sent"),
    ]);

  if (usersTotal.error) {
    throw usersTotal.error;
  }

  if (communityPending.error) {
    throw communityPending.error;
  }

  if (communityApproved.error) {
    throw communityApproved.error;
  }

  if (notificationsSent.error) {
    throw notificationsSent.error;
  }

  return {
    usersTotal: usersTotal.count ?? 0,
    communityPending: communityPending.count ?? 0,
    communityApproved: communityApproved.count ?? 0,
    notificationsSent: notificationsSent.count ?? 0,
  };
}

export async function listAdminCommunityPosts(input?: {
  includePreviewCode?: boolean;
  limit?: number;
  moderationStatus?: "draft" | "pending" | "approved" | "rejected";
}): Promise<AdminCommunityPostRecord[]> {
  const records = await listCommunityAdminRecords(input);
  return records as AdminCommunityPostRecord[];
}

export async function updateCommunityPostReview(
  postId: string,
  input: {
    moderation_status: "approved" | "pending" | "rejected";
    moderation_reason?: string | null;
    is_featured?: boolean;
    reviewed_by: string;
  },
) {
  const supabaseAdmin = getSupabaseAdmin();
  type CommunityPostReviewRow = {
    id: string;
    user_id: string;
    mode: "coding" | "writing" | "painting";
    title: string;
    prompt: string;
    preview_image_url: string;
    moderation_status: "draft" | "pending" | "approved" | "rejected";
    moderation_reason: string | null;
    moderation_stage: "rule" | "ai" | "fallback" | "manual";
    is_featured: boolean;
    created_at: string;
    reviewed_at: string | null;
    moderation_detail: Record<string, unknown>;
  };
  const reviewSetting = await getCommunityReviewSetting().catch(() => null);
  const primaryExistingPostResult = await supabaseAdmin
    .from("community_posts")
    .select("id, moderation_detail, moderation_status")
    .eq("id", postId)
    .single<{
      id: string;
      moderation_detail: Record<string, unknown>;
      moderation_status: "draft" | "pending" | "approved" | "rejected";
    }>();

  let existingPost = primaryExistingPostResult.data;
  let existingPostError = primaryExistingPostResult.error;

  if (existingPostError && isMissingModerationDetailSchemaError(existingPostError)) {
    const fallbackExistingPostResult = await supabaseAdmin
      .from("community_posts")
      .select("id, moderation_status")
      .eq("id", postId)
      .single<{
        id: string;
        moderation_status: "draft" | "pending" | "approved" | "rejected";
      }>();

    existingPost = fallbackExistingPostResult.data
      ? {
          ...fallbackExistingPostResult.data,
          moderation_detail: {},
        }
      : null;
    existingPostError = fallbackExistingPostResult.error;
  }

  if (existingPostError) {
    throw existingPostError;
  }

  const aiDetail = ((existingPost?.moderation_detail ?? {}).ai ?? {}) as {
    approved?: boolean | null;
  };

  if (
    input.moderation_status === "approved" &&
    reviewSetting?.lockManualApproveAfterAiReject &&
    aiDetail.approved === false
  ) {
    throw new Error("AI 已明确拒绝该作品，当前策略下不能直接人工改为已发布。");
  }

  const primaryUpdateResult = await supabaseAdmin
    .from("community_posts")
    .update(
      {
        moderation_status: input.moderation_status,
        moderation_reason: input.moderation_reason ?? null,
        is_featured: input.is_featured ?? false,
        reviewed_by: input.reviewed_by,
        reviewed_at: new Date().toISOString(),
        moderation_stage: "manual",
      } as never,
    )
    .eq("id", postId)
    .select(
      "id, user_id, mode, title, prompt, preview_image_url, moderation_status, moderation_reason, moderation_stage, moderation_detail, is_featured, created_at, reviewed_at",
    )
    .single();

  let data: CommunityPostReviewRow | null =
    (primaryUpdateResult.data as CommunityPostReviewRow | null) ?? null;
  let error = primaryUpdateResult.error;

  if (error && isMissingModerationDetailSchemaError(error)) {
    const fallbackUpdateResult = (await supabaseAdmin
      .from("community_posts")
      .update(
        {
          moderation_status: input.moderation_status,
          moderation_reason: input.moderation_reason ?? null,
          is_featured: input.is_featured ?? false,
          reviewed_by: input.reviewed_by,
          reviewed_at: new Date().toISOString(),
          moderation_stage: "manual",
        } as never,
      )
      .eq("id", postId)
      .select(
        "id, user_id, mode, title, prompt, preview_image_url, moderation_status, moderation_reason, moderation_stage, is_featured, created_at, reviewed_at",
      )
      .single()) as {
      data:
        | {
            id: string;
            user_id: string;
            mode: "coding" | "writing" | "painting";
            title: string;
            prompt: string;
            preview_image_url: string;
            moderation_status: "draft" | "pending" | "approved" | "rejected";
            moderation_reason: string | null;
            moderation_stage: "rule" | "ai" | "fallback" | "manual";
            is_featured: boolean;
            created_at: string;
            reviewed_at: string | null;
          }
        | null;
      error: PostgrestError | null;
    };

    data = fallbackUpdateResult.data
      ? {
          ...fallbackUpdateResult.data,
          moderation_detail: existingPost?.moderation_detail ?? {},
        }
      : null;
    error = fallbackUpdateResult.error;
  }

  if (error) {
    throw error;
  }

  const postRecord = data as AdminCommunityPostRecord;

  if (postRecord.user_id) {
    await sendUserNotification({
      userId: postRecord.user_id,
      title:
        input.moderation_status === "approved"
          ? "作品审核通过啦"
          : input.moderation_status === "rejected"
            ? "作品暂时没有通过审核"
            : "作品重新进入审核队列",
      body:
        input.moderation_status === "approved"
          ? "你的作品已经通过管理员审核，现在已经出现在成长社区里。"
          : input.moderation_status === "rejected"
            ? input.moderation_reason ?? "管理员判定该内容暂不适合公开展示。"
            : "你的作品已重新进入审核队列，稍后会继续通知你结果。",
    }).catch((notificationError) => {
      console.error("【后台审核后发送用户通知失败】:", notificationError);
    });
  }

  return postRecord;
}

export async function updateAdminCommunityOperations(
  postId: string,
  input: {
    title?: string;
    prompt?: string;
    category?: string;
    like_count?: number;
    view_count?: number;
    share_count?: number;
    manual_sort_order?: number;
    is_featured?: boolean;
    creator_score?: number;
    manual_creator_rank?: number | null;
    is_creator_star?: boolean;
    display_total_likes?: number;
    reviewed_by: string;
    note?: string | null;
  },
) {
  if (typeof input.display_total_likes === "number") {
    await updateCommunityDashboardSetting({
      displayTotalLikes: input.display_total_likes,
    });
  }

  const post = await updateCommunityPostOperations(postId, {
    title: input.title,
    prompt: input.prompt,
    category: input.category as CommunityAdminSearchRecord["category"],
    likeCount: input.like_count,
    viewCount: input.view_count,
    shareCount: input.share_count,
    manualSortOrder: input.manual_sort_order,
    isFeatured: input.is_featured,
    creatorScore: input.creator_score,
    manualCreatorRank: input.manual_creator_rank,
    isCreatorStar: input.is_creator_star,
    note: input.note,
    adminUserId: input.reviewed_by,
  });

  if (!post) {
    return null;
  }

  const latestPosts = await listAdminCommunityPosts();
  return latestPosts.find((item) => item.id === postId) ?? null;
}

export async function deleteAdminCommunityPost(postId: string) {
  return deleteCommunityPostPermanently(postId);
}

type AdminUserBaseRow = Omit<
  AdminUserRecord,
  | "profile_display_name"
  | "profile_bio"
  | "profile_bio_pending"
  | "profile_bio_status"
  | "profile_bio_reason"
  | "profile_bio_stage"
  | "profile_bio_updated_at"
  | "credits"
  | "postsCount"
  | "approvedPostsCount"
  | "pendingPostsCount"
  | "rejectedPostsCount"
  | "latestPostAt"
  | "totalCreditsAdded"
  | "totalCreditsSpent"
  | "lastCreditChangeAt"
  | "subscriptions"
  | "paymentOrders"
  | "creditLogs"
>;

type AdminUserPostRow = {
  user_id: string;
  moderation_status: "draft" | "pending" | "approved" | "rejected";
  created_at: string;
};

type AdminUserProfileRow = {
  user_id: string;
  display_name: string | null;
  bio: string | null;
};

function isMissingModerationDetailSchemaError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  if (
    "code" in error &&
    (error.code === "42703" || error.code === "PGRST204" || error.code === "PGRST205")
  ) {
    return true;
  }

  return (
    "message" in error &&
    typeof error.message === "string" &&
    error.message.includes("moderation_detail")
  );
}

function isMissingCreditLogTable(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code =
    "code" in error && typeof error.code === "string" ? error.code : "";
  const message =
    "message" in error && typeof error.message === "string" ? error.message : "";

  return (
    code === "PGRST205" ||
    code === "PGRST204" ||
    code === "42P01" ||
    code === "42703" ||
    message.includes("user_credit_logs") ||
    message.includes("created_at") ||
    message.includes("reason_label")
  );
}

function isMissingPaymentSchema(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code =
    "code" in error && typeof error.code === "string" ? error.code : "";
  const message =
    "message" in error && typeof error.message === "string" ? error.message : "";

  return (
    code === "PGRST205" ||
    code === "PGRST204" ||
    code === "42P01" ||
    code === "42703" ||
    message.includes("user_subscriptions") ||
    message.includes("subscription_plans")
  );
}

async function listAdminCreditLogsForUser(userId: string, limit = 30) {
  const supabaseAdmin = getSupabaseAdmin();
  const sinceDate = new Date();
  sinceDate.setUTCDate(sinceDate.getUTCDate() - ADMIN_CREDIT_LOG_VISIBLE_DAYS);
  const { data, error } = await supabaseAdmin
    .from("user_credit_logs")
    .select(
      "id, user_id, change_amount, balance_after, reason_code, reason_label, note, created_at",
    )
    .eq("user_id", userId)
    .gte("created_at", sinceDate.toISOString())
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<CreditLogRow[]>();

  if (!error) {
    return data ?? [];
  }

  if (!isMissingCreditLogTable(error)) {
    throw error;
  }

  const { data: fallback, error: fallbackError } = await supabaseAdmin
    .from("site_settings")
    .select("value")
    .eq("setting_key", `credits.logs.${userId}`)
    .maybeSingle<{ value: { logs?: CreditLogRow[] } }>();

  if (fallbackError) {
    throw fallbackError;
  }

  return (fallback?.value?.logs ?? [])
    .filter((log) => new Date(log.created_at) >= sinceDate)
    .slice(0, limit);
}

async function listAdminSubscriptionsForUsers(userIds: string[]) {
  const subscriptionsByUser = new Map<string, UserSubscription[]>();

  if (!userIds.length) {
    return subscriptionsByUser;
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("user_subscriptions")
    .select(
      "id, user_id, plan_id, status, start_date, end_date, last_grant_date, source, reference_id, created_at, subscription_plans(name, daily_coins, duration_days, price)",
    )
    .in("user_id", userIds)
    .order("created_at", { ascending: false })
    .returns<UserSubscription[]>();

  if (error) {
    if (isMissingPaymentSchema(error)) {
      return subscriptionsByUser;
    }

    throw error;
  }

  for (const subscription of data ?? []) {
    const current = subscriptionsByUser.get(subscription.user_id) ?? [];
    current.push(subscription);
    subscriptionsByUser.set(subscription.user_id, current);
  }

  return subscriptionsByUser;
}

export async function getAdminUserById(userId: string) {
  const users = await listAdminUsers({ userId, includeCreditLogs: true });
  return users[0] ?? null;
}

export async function listAdminUsers(input?: {
  userId?: string;
  includeCreditLogs?: boolean;
  limit?: number;
}): Promise<AdminUserRecord[]> {
  const supabaseAdmin = getSupabaseAdmin();
  const creditPolicy = await getCreditPolicySetting().catch(() => ({
    initialCredits: 50,
  }));
  const usersQuery = supabaseAdmin
    .from("users")
    .select("id, phone, nickname, status, last_login_at, avatar_url, notes, created_at")
    .order("created_at", { ascending: false });
  const creditsQuery = supabaseAdmin
    .from("user_credits")
    .select("user_id, credits");

  if (input?.userId) {
    usersQuery.eq("id", input.userId);
    creditsQuery.eq("user_id", input.userId);
  } else if (typeof input?.limit === "number" && input.limit > 0) {
    usersQuery.limit(input.limit);
  }

  const [
    { data: users, error: usersError },
    { data: credits, error: creditsError },
  ] = await Promise.all([
    usersQuery.returns<AdminUserBaseRow[]>(),
    creditsQuery.returns<Array<{ user_id: string; credits: number }>>(),
  ]);

  if (usersError) {
    throw usersError;
  }

  if (creditsError) {
    throw creditsError;
  }

  const creditsMap = new Map(
    (credits ?? []).map((item) => [item.user_id as string, item.credits as number]),
  );

  const userIds = (users ?? []).map((user) => user.id);
  let posts: AdminUserPostRow[] = [];
  let profilesMap = new Map<string, AdminUserProfileRow>();
  let profileBioReviewsMap = new Map<string, ProfileBioReviewRecord>();

  if (userIds.length) {
    const [postsResult, profilesResult, bioReviewsResult] = await Promise.all([
      supabaseAdmin
        .from("community_posts")
        .select("user_id, moderation_status, created_at")
        .in("user_id", userIds)
        .returns<AdminUserPostRow[]>(),
      supabaseAdmin
        .from("user_profiles")
        .select("user_id, display_name, bio")
        .in("user_id", userIds)
        .returns<AdminUserProfileRow[]>(),
      listProfileBioReviewRecords(userIds),
    ]);

    if (postsResult.error) {
      throw postsResult.error;
    }

    if (profilesResult.error) {
      throw profilesResult.error;
    }

    posts = postsResult.data ?? [];
    profilesMap = new Map(
      (profilesResult.data ?? []).map((profile) => [profile.user_id, profile]),
    );
    profileBioReviewsMap = bioReviewsResult;
  }

  const postsByUser = new Map<
    string,
    {
      postsCount: number;
      approvedPostsCount: number;
      pendingPostsCount: number;
      rejectedPostsCount: number;
      latestPostAt: string | null;
    }
  >();

  for (const post of posts ?? []) {
    const current = postsByUser.get(post.user_id) ?? {
      postsCount: 0,
      approvedPostsCount: 0,
      pendingPostsCount: 0,
      rejectedPostsCount: 0,
      latestPostAt: null,
    };

    current.postsCount += 1;
    if (post.moderation_status === "approved") {
      current.approvedPostsCount += 1;
    } else if (post.moderation_status === "rejected") {
      current.rejectedPostsCount += 1;
    } else {
      current.pendingPostsCount += 1;
    }

    if (!current.latestPostAt || post.created_at > current.latestPostAt) {
      current.latestPostAt = post.created_at;
    }

    postsByUser.set(post.user_id, current);
  }

  const creditLogsByUser = new Map<string, CreditLogRow[]>();
  const paymentOrdersByUser = new Map<string, PaymentOrder[]>();

  if (input?.includeCreditLogs === true) {
    const detailEntries = await Promise.all(
      (users ?? []).map(
        async (
          user,
        ): Promise<[string, CreditLogRow[], PaymentOrder[]]> => [
          user.id,
          await listAdminCreditLogsForUser(user.id, 500).catch((error) => {
            console.error("【后台用户账本读取失败，已回退为空】:", {
              userId: user.id,
              error,
            });
            return [];
          }),
          await listAdminUserPaymentOrders(user.id, 30).catch((error) => {
            console.error("【后台用户订单读取失败，已回退为空】:", {
              userId: user.id,
              error,
            });
            return [];
          }),
        ],
      ),
    );

    for (const [userId, logs, orders] of detailEntries) {
      creditLogsByUser.set(userId, logs);
      paymentOrdersByUser.set(userId, orders);
    }
  }

  const subscriptionsByUser = await listAdminSubscriptionsForUsers(userIds);

  return (users ?? []).map((user) => {
    const userPosts = postsByUser.get(user.id) ?? {
      postsCount: 0,
      approvedPostsCount: 0,
      pendingPostsCount: 0,
      rejectedPostsCount: 0,
      latestPostAt: null,
    };
    const creditLogs = creditLogsByUser.get(user.id) ?? [];
    const paymentOrders = paymentOrdersByUser.get(user.id) ?? [];
    const profile = profilesMap.get(user.id);
    const bioReview = profileBioReviewsMap.get(user.id);
    const totalCreditsAdded = creditLogs.reduce(
      (total, item) => total + Math.max(0, item.change_amount),
      0,
    );
    const totalCreditsSpent = creditLogs.reduce(
      (total, item) => total + Math.max(0, -item.change_amount),
      0,
    );

    return {
      ...user,
      profile_display_name: profile?.display_name ?? null,
      profile_bio: profile?.bio ?? null,
      profile_bio_pending: bioReview?.pendingBio ?? null,
      profile_bio_status: bioReview?.status ?? "approved",
      profile_bio_reason: bioReview?.reason ?? null,
      profile_bio_stage: bioReview?.stage ?? "manual",
      profile_bio_updated_at: bioReview?.updatedAt ?? null,
      credits:
        creditsMap.get(user.id as string) ??
        Math.max(0, creditPolicy.initialCredits ?? 50),
      ...userPosts,
      totalCreditsAdded,
      totalCreditsSpent,
      lastCreditChangeAt: creditLogs[0]?.created_at ?? null,
      subscriptions: subscriptionsByUser.get(user.id) ?? [],
      paymentOrders,
      creditLogs,
    };
  });
}

export async function updateAdminUser(
  userId: string,
  input: {
    nickname?: string | null;
    profileDisplayName?: string | null;
    profileBio?: string | null;
    profileBioAction?: "approve" | "reject" | "clear" | "update";
    profileBioReason?: string | null;
    adminUserId?: string;
    status?: "active" | "disabled";
    notes?: string | null;
    credits?: number;
    creditLogNote?: string | null;
  },
) {
  const supabaseAdmin = getSupabaseAdmin();

  if (input.status === "disabled") {
    const { data: targetUser } = await supabaseAdmin
      .from("users")
      .select("phone")
      .eq("id", userId)
      .maybeSingle<{ phone: string | null }>();

    if (targetUser?.phone && isBootstrapAdminPhone(targetUser.phone)) {
      throw new Error("系统保底超级管理员不能被停用，以免后台被彻底锁死。");
    }
  }

  if (
    input.nickname !== undefined ||
    input.status !== undefined ||
    input.notes !== undefined
  ) {
    const { error: userError } = await supabaseAdmin
      .from("users")
      .update(
        {
          nickname: input.nickname ?? null,
          status: input.status,
          notes: input.notes ?? null,
        } as never,
      )
      .eq("id", userId);

    if (userError) {
      throw userError;
    }

    if (input.status === "disabled") {
      const { error: sessionError } = await supabaseAdmin
        .from("user_sessions")
        .delete()
        .eq("user_id", userId);

      if (sessionError) {
        throw sessionError;
      }
    }
  }

  if (input.profileDisplayName !== undefined) {
    const { error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .upsert(
        {
          user_id: userId,
          display_name: input.profileDisplayName?.trim() || null,
        } as never,
        { onConflict: "user_id" },
      );

    if (profileError) {
      throw profileError;
    }
  }

  if (input.profileBioAction) {
    await resolveProfileBioReview({
      userId,
      action: input.profileBioAction,
      approvedBio: input.profileBio?.trim() || null,
      reason: input.profileBioReason?.trim() || null,
      adminUserId: input.adminUserId ?? "admin",
    });
  }

  if (typeof input.credits === "number") {
    const previousCreditsResult = await supabaseAdmin
      .from("user_credits")
      .select("credits")
      .eq("user_id", userId)
      .maybeSingle<{ credits: number }>();

    const previousCredits = previousCreditsResult.data?.credits ?? 0;
    const nextCredits = Math.max(0, input.credits);

    const { error: creditsError } = await supabaseAdmin
      .from("user_credits")
      .upsert({ user_id: userId, credits: nextCredits } as never, {
        onConflict: "user_id",
      });

    if (creditsError) {
      throw creditsError;
    }

    const delta = nextCredits - previousCredits;

    if (delta !== 0) {
      await createCreditLogEntry({
        userId,
        changeAmount: delta,
        balanceAfter: nextCredits,
        reasonCode: "admin_adjustment",
        reasonLabel: "管理员调整魔法币",
        note:
          input.creditLogNote ??
          (delta > 0
            ? `管理员补充了 ${delta} 个魔法币。`
            : `管理员扣减了 ${Math.abs(delta)} 个魔法币。`),
      });
    }
  }
}

function normalizeNotificationQuery(value?: string) {
  return value?.trim().toLowerCase() ?? "";
}

function uniqueIds(ids: string[]) {
  return Array.from(new Set(ids.filter((id) => id.trim().length > 0)));
}

function isMissingDatabaseField(error: unknown, fieldName: string) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const message =
    "message" in error && typeof error.message === "string"
      ? error.message
      : "";
  const details =
    "details" in error && typeof error.details === "string"
      ? error.details
      : "";

  return (
    ("code" in error &&
      (error.code === "42703" ||
        error.code === "PGRST204" ||
        error.code === "PGRST205")) ||
    message.includes(fieldName) ||
    details.includes(fieldName)
  );
}

async function listNotificationCommunityPostRows(userIds: string[]) {
  if (!userIds.length) {
    return [];
  }

  const supabaseAdmin = getSupabaseAdmin();
  const result = await supabaseAdmin
    .from("community_posts")
    .select("user_id, moderation_status, is_creator_star")
    .in("user_id", userIds)
    .returns<
      Array<{
        user_id: string;
        moderation_status: "draft" | "pending" | "approved" | "rejected";
        is_creator_star?: boolean | null;
      }>
    >();

  if (!result.error) {
    return result.data ?? [];
  }

  if (!isMissingDatabaseField(result.error, "is_creator_star")) {
    throw result.error;
  }

  const fallback = await supabaseAdmin
    .from("community_posts")
    .select("user_id, moderation_status")
    .in("user_id", userIds)
    .returns<
      Array<{
        user_id: string;
        moderation_status: "draft" | "pending" | "approved" | "rejected";
      }>
    >();

  if (fallback.error) {
    throw fallback.error;
  }

  return (fallback.data ?? []).map((post) => ({
    ...post,
    is_creator_star: false,
  }));
}

async function listProfileRowsForNotificationUsers(userIds: string[]) {
  if (!userIds.length) {
    return new Map<string, { display_name: string | null; gender: "male" | "female" | "unspecified" }>();
  }

  const supabaseAdmin = getSupabaseAdmin();
  const result = await supabaseAdmin
    .from("user_profiles")
    .select("user_id, display_name, gender")
    .in("user_id", userIds)
    .returns<
      Array<{
        user_id: string;
        display_name: string | null;
        gender: "male" | "female" | "unspecified" | null;
      }>
    >();

  if (result.error) {
    const fallback = await supabaseAdmin
      .from("user_profiles")
      .select("user_id, display_name")
      .in("user_id", userIds)
      .returns<Array<{ user_id: string; display_name: string | null }>>();

    if (fallback.error) {
      throw fallback.error;
    }

    return new Map(
      (fallback.data ?? []).map((profile) => [
        profile.user_id,
        {
          display_name: profile.display_name,
          gender: "unspecified" as const,
        },
      ]),
    );
  }

  return new Map(
    (result.data ?? []).map((profile) => [
      profile.user_id,
      {
        display_name: profile.display_name,
        gender: profile.gender ?? "unspecified",
      },
    ]),
  );
}

async function buildNotificationTargetUsers(input?: {
  filters?: NotificationTargetFilters;
  userIds?: string[];
  limit?: number;
}) {
  const supabaseAdmin = getSupabaseAdmin();
  const filters = input?.filters ?? {};
  const limit = input?.limit ?? 5000;
  const requestedUserIds = uniqueIds(input?.userIds ?? []);
  const usersQuery = supabaseAdmin
    .from("users")
    .select("id, phone, nickname, status, created_at");

  if (requestedUserIds.length) {
    usersQuery.in("id", requestedUserIds);
  } else if (filters.status === "active" || filters.status === "disabled") {
    usersQuery.eq("status", filters.status);
  }

  const { data: users, error: usersError } = await usersQuery
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<
      Array<{
        id: string;
        phone: string;
        nickname: string | null;
        status: "active" | "disabled";
        created_at: string;
      }>
    >();

  if (usersError) {
    throw usersError;
  }

  const userIds = (users ?? []).map((user) => user.id);
  const [profilesMap, posts, adminsResult, subscriptionsByUser] =
    await Promise.all([
      listProfileRowsForNotificationUsers(userIds),
      listNotificationCommunityPostRows(userIds),
      supabaseAdmin
        .from("admin_users")
        .select("user_id")
        .eq("is_active", true)
        .returns<Array<{ user_id: string }>>(),
      listAdminSubscriptionsForUsers(userIds).catch(() => new Map<string, UserSubscription[]>()),
    ]);

  if (adminsResult.error) {
    throw adminsResult.error;
  }

  const adminIds = new Set((adminsResult.data ?? []).map((item) => item.user_id));
  const postsByUser = new Map<
    string,
    {
      postsCount: number;
      pendingPostsCount: number;
      rejectedPostsCount: number;
      approvedPostsCount: number;
      isCreatorStar: boolean;
    }
  >();

  for (const post of posts) {
    const current = postsByUser.get(post.user_id) ?? {
      postsCount: 0,
      pendingPostsCount: 0,
      rejectedPostsCount: 0,
      approvedPostsCount: 0,
      isCreatorStar: false,
    };
    current.postsCount += 1;
    current.isCreatorStar = current.isCreatorStar || post.is_creator_star === true;

    if (post.moderation_status === "pending") {
      current.pendingPostsCount += 1;
    } else if (post.moderation_status === "rejected") {
      current.rejectedPostsCount += 1;
    } else if (post.moderation_status === "approved") {
      current.approvedPostsCount += 1;
    }

    postsByUser.set(post.user_id, current);
  }

  const query = normalizeNotificationQuery(filters.query);
  const nowDateOnly = new Date().toISOString().slice(0, 10);

  return (users ?? [])
    .map<NotificationTargetUserRecord>((user) => {
      const profile = profilesMap.get(user.id);
      const posts = postsByUser.get(user.id) ?? {
        postsCount: 0,
        pendingPostsCount: 0,
        rejectedPostsCount: 0,
        approvedPostsCount: 0,
        isCreatorStar: false,
      };
      const hasActiveSubscription = (subscriptionsByUser.get(user.id) ?? []).some(
        (subscription) =>
          subscription.status === "active" && subscription.end_date >= nowDateOnly,
      );

      return {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        status: user.status,
        created_at: user.created_at,
        profile_display_name: profile?.display_name ?? null,
        gender: profile?.gender ?? "unspecified",
        posts_count: posts.postsCount,
        pending_posts_count: posts.pendingPostsCount,
        rejected_posts_count: posts.rejectedPostsCount,
        approved_posts_count: posts.approvedPostsCount,
        has_active_subscription: hasActiveSubscription,
        is_admin: adminIds.has(user.id),
        is_creator_star: posts.isCreatorStar,
      };
    })
    .filter((user) => {
      if (
        query &&
        ![
          user.phone,
          user.nickname ?? "",
          user.profile_display_name ?? "",
          user.id,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query)
      ) {
        return false;
      }

      if (
        filters.gender &&
        filters.gender !== "any" &&
        user.gender !== filters.gender
      ) {
        return false;
      }

      if (filters.audience === "admins" && !user.is_admin) {
        return false;
      }

      if (filters.group === "active_subscription" && !user.has_active_subscription) {
        return false;
      }

      if (filters.group === "no_subscription" && user.has_active_subscription) {
        return false;
      }

      if (filters.group === "creators" && user.posts_count <= 0) {
        return false;
      }

      if (filters.group === "creator_stars" && !user.is_creator_star) {
        return false;
      }

      if (filters.group === "pending_review" && user.pending_posts_count <= 0) {
        return false;
      }

      if (filters.group === "rejected_posts" && user.rejected_posts_count <= 0) {
        return false;
      }

      if (filters.group === "no_posts" && user.posts_count > 0) {
        return false;
      }

      return true;
    });
}

function getNotificationTargetLabel(notification: NotificationRecord) {
  if (notification.target_type === "all") {
    return "全部启用用户";
  }

  if (notification.target_type === "admins") {
    return "启用管理员";
  }

  return notification.target_user_ids.length
    ? `指定/筛选用户 ${notification.target_user_ids.length} 人`
    : "指定用户";
}

async function resolveNotificationTargetUserIds(input: {
  targetType: "all" | "users" | "admins";
  targetUserIds: string[];
  targetFilters?: NotificationTargetFilters;
}) {
  if (input.targetType === "users" && input.targetUserIds.length) {
    return uniqueIds(input.targetUserIds);
  }

  const audience =
    input.targetType === "all"
      ? "all"
      : input.targetType === "admins"
        ? "admins"
        : input.targetFilters?.audience ?? "segment";
  const filters: NotificationTargetFilters = {
    ...(input.targetFilters ?? {}),
    audience,
    status:
      input.targetFilters?.status ??
      (audience === "all" || audience === "segment" ? "active" : "any"),
  };

  const users = await buildNotificationTargetUsers({
    filters,
    limit: 5000,
  });

  return users.map((user) => user.id);
}

export async function searchNotificationTargetUsers(input: {
  query?: string;
  filters?: NotificationTargetFilters;
  limit?: number;
}) {
  return buildNotificationTargetUsers({
    filters: {
      status: "active",
      group: "all",
      ...(input.filters ?? {}),
      query: input.query ?? input.filters?.query ?? "",
    },
    limit: input.limit ?? 40,
  });
}

export async function listNotificationRecipients(
  notificationId: string,
  input?: { limit?: number; offset?: number },
) {
  const supabaseAdmin = getSupabaseAdmin();
  const limit = input?.limit ?? 200;
  const offset = input?.offset ?? 0;
  const { data, error, count } = await supabaseAdmin
    .from("user_notifications")
    .select("id, user_id, is_read, created_at, read_at", { count: "exact" })
    .eq("notification_id", notificationId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)
    .returns<
      Array<{
        id: string;
        user_id: string;
        is_read: boolean;
        created_at: string;
        read_at: string | null;
      }>
    >();

  if (error) {
    throw error;
  }

  const users = await buildNotificationTargetUsers({
    userIds: (data ?? []).map((item) => item.user_id),
    limit,
  });
  const usersById = new Map(users.map((user) => [user.id, user]));

  return {
    recipients: (data ?? []).map<NotificationRecipientRecord>((item) => ({
      ...(usersById.get(item.user_id) ?? {
        id: item.user_id,
        phone: "未知手机号",
        nickname: null,
        status: "active" as const,
        created_at: item.created_at,
        profile_display_name: null,
        gender: "unspecified" as const,
        posts_count: 0,
        pending_posts_count: 0,
        rejected_posts_count: 0,
        approved_posts_count: 0,
        has_active_subscription: false,
        is_admin: false,
        is_creator_star: false,
      }),
      notification_user_id: item.id,
      is_read: item.is_read,
      delivered_at: item.created_at,
      read_at: item.read_at,
    })),
    total: count ?? 0,
  };
}

async function enrichNotificationRecords(notifications: NotificationRecord[]) {
  if (!notifications.length) {
    return [];
  }

  return Promise.all(
    notifications.map(async (notification) => {
      const recipientResult =
        notification.status === "sent"
          ? await listNotificationRecipients(notification.id, { limit: 3 }).catch(() => ({
              recipients: [],
              total: 0,
            }))
          : {
              recipients: await buildNotificationTargetUsers({
                userIds: notification.target_user_ids,
                limit: 3,
              }).catch(() => []),
              total: notification.target_user_ids.length,
            };

      return {
        ...notification,
        target_label: getNotificationTargetLabel(notification),
        recipient_count: recipientResult.total,
        recipient_preview: recipientResult.recipients,
      };
    }),
  );
}

export async function getNotificationDetail(notificationId: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("notifications")
    .select(
      "id, title, body, target_type, target_user_ids, status, sent_at, created_at, updated_at",
    )
    .eq("id", notificationId)
    .maybeSingle<NotificationRecord>();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return (await enrichNotificationRecords([data]))[0];
}

export async function listNotifications(limit = 20): Promise<NotificationRecord[]> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("notifications")
    .select(
      "id, title, body, target_type, target_user_ids, status, sent_at, created_at, updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<NotificationRecord[]>();

  if (error) {
    throw error;
  }

  return enrichNotificationRecords(data ?? []);
}

export async function createNotificationDraft(input: {
  title: string;
  body: string;
  target_type: "all" | "users" | "admins";
  target_user_ids?: string[];
  target_filters?: NotificationTargetFilters;
  created_by: string;
}) {
  const supabaseAdmin = getSupabaseAdmin();
  const targetUserIds = await resolveNotificationTargetUserIds({
    targetType: input.target_type,
    targetUserIds: input.target_user_ids ?? [],
    targetFilters: input.target_filters,
  });
  const { data, error } = await supabaseAdmin
    .from("notifications")
    .insert(
      {
        title: input.title,
        body: input.body,
        target_type: input.target_type,
        target_user_ids: targetUserIds,
        status: "draft",
        created_by: input.created_by,
      } as never,
    )
    .select(
      "id, title, body, target_type, target_user_ids, status, sent_at, created_at, updated_at",
    )
    .single();

  if (error) {
    throw error;
  }

  return (await enrichNotificationRecords([data as NotificationRecord]))[0];
}

export async function sendNotification(notificationId: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: notification, error } = await supabaseAdmin
    .from("notifications")
    .select("id, title, body, target_type, target_user_ids, status")
    .eq("id", notificationId)
    .single<{
      id: string;
      title: string;
      body: string;
      target_type: "all" | "users" | "admins";
      target_user_ids: string[];
      status: "draft" | "sent";
    }>();

  if (error) {
    throw error;
  }

  const targetUserIds = notification.target_user_ids?.length
    ? uniqueIds(notification.target_user_ids)
    : await resolveNotificationTargetUserIds({
        targetType: notification.target_type,
        targetUserIds: [],
      });

  if (targetUserIds.length) {
    const rows = targetUserIds.map((userId) => ({
      notification_id: notification.id,
      user_id: userId,
    }));

    const { error: recipientsError } = await supabaseAdmin
      .from("user_notifications")
      .upsert(rows as never, { onConflict: "notification_id,user_id" });

    if (recipientsError) {
      throw recipientsError;
    }
  }

  const { data: updatedNotification, error: updateError } = await supabaseAdmin
    .from("notifications")
    .update(
      {
        status: "sent",
        sent_at: new Date().toISOString(),
      } as never,
    )
    .eq("id", notificationId)
    .select(
      "id, title, body, target_type, target_user_ids, status, sent_at, created_at, updated_at",
    )
    .single();

  if (updateError) {
    throw updateError;
  }

  return {
    notification: (await enrichNotificationRecords([updatedNotification as NotificationRecord]))[0],
    recipientCount: targetUserIds.length,
  };
}

export async function listUserNotifications(
  userId: string,
): Promise<UserNotificationsSummary> {
  const supabaseAdmin = getSupabaseAdmin();
  const [{ data, error }, unreadResult] = await Promise.all([
    supabaseAdmin
      .from("user_notifications")
      .select("id, is_read, created_at, read_at, notifications(title, body, sent_at)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(12)
      .returns<UserNotificationRecord[]>(),
    supabaseAdmin
      .from("user_notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false),
  ]);

  if (error) {
    throw error;
  }

  if (unreadResult.error) {
    throw unreadResult.error;
  }

  return {
    notifications: data ?? [],
    unreadCount: unreadResult.count ?? 0,
  };
}

export async function markUserNotificationsRead(userId: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const readAt = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("user_notifications")
    .update(
      {
        is_read: true,
        read_at: readAt,
      } as never,
    )
    .eq("user_id", userId)
    .eq("is_read", false)
    .select("id");

  if (error) {
    throw error;
  }

  return {
    updatedCount: data?.length ?? 0,
    readAt,
  };
}
