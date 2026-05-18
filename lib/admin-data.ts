import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { PostgrestError } from "@supabase/supabase-js";
import { createCreditLogEntry } from "@/lib/credits";
import type { CreditLogRow } from "@/lib/credits";
import type { UserSubscription } from "@/lib/payments";
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
    updated_by: string;
  }>,
) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("site_settings")
    .upsert(settings as never, { onConflict: "setting_key" })
    .select("setting_key, setting_group, label, value, description, updated_at")
    .returns<SiteSettingRecord[]>();

  if (error) {
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

  return data ?? [];
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
  | "creditLogs"
>;

type AdminUserPostRow = {
  user_id: string;
  moderation_status: "draft" | "pending" | "approved" | "rejected";
  created_at: string;
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

  return "code" in error && error.code === "PGRST205";
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
  const { data, error } = await supabaseAdmin
    .from("user_credit_logs")
    .select(
      "id, user_id, change_amount, balance_after, reason_code, reason_label, note, created_at",
    )
    .eq("user_id", userId)
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

  return (fallback?.value?.logs ?? []).slice(0, limit);
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

  if (userIds.length) {
    const postsQuery = supabaseAdmin
      .from("community_posts")
      .select("user_id, moderation_status, created_at")
      .in("user_id", userIds);

    const { data: postsData, error: postsError } =
      await postsQuery.returns<AdminUserPostRow[]>();

    if (postsError) {
      throw postsError;
    }

    posts = postsData ?? [];
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

  if (input?.includeCreditLogs === true) {
    const creditLogsEntries = await Promise.all(
      (users ?? []).map(async (user): Promise<[string, CreditLogRow[]]> => [
        user.id,
        await listAdminCreditLogsForUser(user.id, 30),
      ]),
    );

    for (const [userId, logs] of creditLogsEntries) {
      creditLogsByUser.set(userId, logs);
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
      credits:
        creditsMap.get(user.id as string) ??
        Math.max(0, creditPolicy.initialCredits ?? 50),
      ...userPosts,
      totalCreditsAdded,
      totalCreditsSpent,
      lastCreditChangeAt: creditLogs[0]?.created_at ?? null,
      subscriptions: subscriptionsByUser.get(user.id) ?? [],
      creditLogs,
    };
  });
}

export async function updateAdminUser(
  userId: string,
  input: {
    nickname?: string | null;
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

  return data ?? [];
}

export async function createNotificationDraft(input: {
  title: string;
  body: string;
  target_type: "all" | "users" | "admins";
  target_user_ids?: string[];
  created_by: string;
}) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("notifications")
    .insert(
      {
        title: input.title,
        body: input.body,
        target_type: input.target_type,
        target_user_ids: input.target_user_ids ?? [],
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

  return data as NotificationRecord;
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

  let targetUserIds: string[] = [];

  if (notification.target_type === "all") {
    const { data: users, error: usersError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("status", "active")
      .returns<Array<{ id: string }>>();

    if (usersError) {
      throw usersError;
    }

    targetUserIds = (users ?? []).map((user) => user.id as string);
  } else if (notification.target_type === "admins") {
    const { data: admins, error: adminsError } = await supabaseAdmin
      .from("admin_users")
      .select("user_id")
      .eq("is_active", true)
      .returns<Array<{ user_id: string }>>();

    if (adminsError) {
      throw adminsError;
    }

    targetUserIds = (admins ?? []).map((item) => item.user_id as string);
  } else {
    targetUserIds = notification.target_user_ids ?? [];
  }

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
    notification: updatedNotification as NotificationRecord,
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
