import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  inferCommunityCategory,
  normalizeCommunityCategory,
  type CommunityCategory,
} from "@/lib/community-config";

export type UserProfile = {
  user_id: string;
  display_name: string | null;
  avatar_color: string | null;
  bio: string | null;
};

export type CommunityPostStatus = "pending" | "approved" | "rejected";

export type UserCommunityPost = {
  id: string;
  user_id: string;
  title: string;
  prompt: string;
  preview_image_url: string;
  moderation_status: CommunityPostStatus;
  moderation_reason: string | null;
  like_count: number;
  view_count: number;
  share_count: number;
  category: CommunityCategory;
  created_at: string;
};

export type CommunityPostRow = {
  id: string;
  user_id: string;
  mode: "coding";
  title: string;
  prompt: string;
  preview_image_url: string;
  preview_code: string;
  moderation_status: CommunityPostStatus;
  moderation_reason: string | null;
  like_count: number;
  created_at: string;
  updated_at: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  moderation_stage?: "rule" | "ai" | "fallback" | "manual";
  is_featured?: boolean;
  moderation_detail?: Record<string, unknown>;
};

type CommunityUserRow = {
  id: string;
  phone: string;
  nickname: string | null;
};

type CommunityProfileRow = {
  user_id: string;
  display_name: string | null;
  avatar_color: string | null;
};

export type ApprovedCommunityPost = {
  id: string;
  user_id: string;
  title: string;
  prompt: string;
  preview_image_url: string;
  like_count: number;
  view_count: number;
  share_count: number;
  category: CommunityCategory;
  created_at: string;
  is_featured: boolean;
  manual_sort_order: number;
  creator_score: number;
  manual_creator_rank: number | null;
  is_creator_star: boolean;
  users: CommunityUserRow | null;
  user_profiles: CommunityProfileRow | null;
};

export type CommunityPostDetail = ApprovedCommunityPost & {
  preview_code: string;
  moderation_reason: string | null;
  viewer_has_liked: boolean;
};

export type CommunityActivityLog = {
  id: string;
  user_id: string | null;
  activity_type: "view" | "like" | "unlike" | "share" | "admin_adjust";
  delta_value: number;
  note: string | null;
  created_at: string;
};

export type CommunityCreatorSummary = {
  user_id: string;
  name: string;
  avatar_color: string | null;
  works_count: number;
  total_likes: number;
  total_views: number;
  total_shares: number;
  categories: CommunityCategory[];
  manual_rank: number | null;
  creator_score: number;
  is_creator_star: boolean;
};

export type CommunityOverview = {
  totalWorks: number;
  totalCreators: number;
  totalLikes: number;
  totalViews: number;
  totalShares: number;
  displayTotalLikes: number;
  activeCreators: CommunityCreatorSummary[];
  creatorStars: CommunityCreatorSummary[];
};

export type CommunityAdminSearchRecord = {
  id: string;
  user_id: string;
  title: string;
  prompt: string;
  preview_image_url: string;
  preview_code?: string;
  moderation_status: CommunityPostStatus;
  moderation_reason: string | null;
  moderation_stage: "rule" | "ai" | "fallback" | "manual";
  like_count: number;
  view_count: number;
  share_count: number;
  category: CommunityCategory;
  manual_sort_order: number;
  is_featured: boolean;
  creator_score: number;
  manual_creator_rank: number | null;
  is_creator_star: boolean;
  created_at: string;
  reviewed_at: string | null;
  user_phone: string | null;
  user_nickname: string | null;
  user_display_name: string | null;
  moderation_detail: Record<string, unknown>;
};

type CommunityPostInsert = {
  userId: string;
  title: string;
  prompt: string;
  previewImageUrl: string;
  previewCode: string;
  mode: "coding";
  moderationStatus: CommunityPostStatus;
  moderationReason?: string;
  moderationDetail?: Record<string, unknown>;
};

type PostMeta = {
  category?: string;
  viewCount?: number;
  shareCount?: number;
  manualSortOrder?: number;
  isFeatured?: boolean;
  creatorScore?: number;
  manualCreatorRank?: number | null;
  isCreatorStar?: boolean;
};

type CommunityListOptions = {
  category?: CommunityCategory;
  search?: string;
  creatorUserId?: string;
  sort?: "featured" | "latest" | "likes" | "views" | "shares";
};

type CommunityLikeFallbackValue = {
  userIds: string[];
};

type CommunityActivityFallbackValue = {
  logs: CommunityActivityLog[];
};

type CommunityDashboardSetting = {
  displayTotalLikes?: number;
};

function getModerationDetailFallbackKey(postId: string) {
  return `community.moderation-detail.${postId}`;
}

function getActivityFallbackKey(postId: string) {
  return `community.activity.${postId}`;
}

function isMissingSchemaObject(error: unknown, name: string) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const message =
    "message" in error && typeof error.message === "string"
      ? error.message
      : "";

  return (
    ("code" in error && (error.code === "PGRST204" || error.code === "PGRST205")) ||
    message.includes(name)
  );
}

function normalizePostMeta(input: unknown): PostMeta {
  if (!input || typeof input !== "object") {
    return {};
  }

  return input as PostMeta;
}

function normalizeCount(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function getPostMeta(detail?: Record<string, unknown>) {
  return normalizePostMeta(detail?.community_meta);
}

async function getModerationDetailFallback(postId: string) {
  return getSiteSettingValue<Record<string, unknown>>(
    getModerationDetailFallbackKey(postId),
    {},
  );
}

async function writeModerationDetailFallback(
  postId: string,
  detail: Record<string, unknown>,
) {
  await upsertSiteSetting({
    settingKey: getModerationDetailFallbackKey(postId),
    settingGroup: "community",
    label: "社区审核详情兼容存储",
    value: detail,
    description: "当 community_posts.moderation_detail 不可用时保存审核详情。",
  });
}

async function getSiteSettingValue<T>(settingKey: string, fallback: T) {
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

async function upsertSiteSetting(input: {
  settingKey: string;
  settingGroup: string;
  label: string;
  value: Record<string, unknown>;
  description: string;
}) {
  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin.from("site_settings").upsert(
    {
      setting_key: input.settingKey,
      setting_group: input.settingGroup,
      label: input.label,
      value: input.value,
      description: input.description,
    } as never,
    { onConflict: "setting_key" },
  );

  if (error) {
    throw error;
  }
}

function getLikesFallbackKey(postId: string) {
  return `community.likes.${postId}`;
}

function getDashboardSettingKey() {
  return "community.dashboard.metrics";
}

function mergeCommunityDetail(
  detail: Record<string, unknown> | undefined,
  meta: Partial<PostMeta>,
) {
  const current = detail ?? {};
  const currentMeta = getPostMeta(current);

  return {
    ...current,
    community_meta: {
      ...currentMeta,
      ...meta,
    },
  };
}

function resolveCategory(post: {
  title: string;
  prompt: string;
  moderation_detail?: Record<string, unknown>;
}) {
  const meta = getPostMeta(post.moderation_detail);
  return normalizeCommunityCategory(
    typeof meta.category === "string" ? meta.category : null,
  ) || inferCommunityCategory({ title: post.title, prompt: post.prompt });
}

function resolveFeatured(post: {
  is_featured?: boolean;
  moderation_detail?: Record<string, unknown>;
}) {
  const meta = getPostMeta(post.moderation_detail);
  return Boolean(post.is_featured ?? meta.isFeatured ?? false);
}

function resolveManualSortOrder(post: { moderation_detail?: Record<string, unknown> }) {
  const meta = getPostMeta(post.moderation_detail);
  return normalizeCount(meta.manualSortOrder);
}

function resolveViewCount(post: { moderation_detail?: Record<string, unknown> }) {
  const meta = getPostMeta(post.moderation_detail);
  return normalizeCount(meta.viewCount);
}

function resolveShareCount(post: { moderation_detail?: Record<string, unknown> }) {
  const meta = getPostMeta(post.moderation_detail);
  return normalizeCount(meta.shareCount);
}

function resolveCreatorScore(post: { moderation_detail?: Record<string, unknown> }) {
  const meta = getPostMeta(post.moderation_detail);
  return normalizeCount(meta.creatorScore);
}

function resolveManualCreatorRank(post: { moderation_detail?: Record<string, unknown> }) {
  const meta = getPostMeta(post.moderation_detail);
  return typeof meta.manualCreatorRank === "number" ? meta.manualCreatorRank : null;
}

function resolveCreatorStar(post: { moderation_detail?: Record<string, unknown> }) {
  const meta = getPostMeta(post.moderation_detail);
  return Boolean(meta.isCreatorStar);
}

async function loadCommunityUsers(userIds: string[]) {
  const supabaseAdmin = getSupabaseAdmin();
  const [{ data: users, error: usersError }, { data: profiles, error: profilesError }] =
    await Promise.all([
      supabaseAdmin
        .from("users")
        .select("id, phone, nickname")
        .in("id", userIds)
        .returns<CommunityUserRow[]>(),
      supabaseAdmin
        .from("user_profiles")
        .select("user_id, display_name, avatar_color")
        .in("user_id", userIds)
        .returns<CommunityProfileRow[]>(),
    ]);

  if (usersError) {
    throw usersError;
  }

  if (profilesError) {
    throw profilesError;
  }

  return {
    usersById: new Map((users ?? []).map((user) => [user.id, user])),
    profilesById: new Map((profiles ?? []).map((profile) => [profile.user_id, profile])),
  };
}

async function listLikeUserIds(postId: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("community_post_likes")
    .select("user_id")
    .eq("post_id", postId)
    .returns<Array<{ user_id: string }>>();

  if (!error) {
    return (data ?? []).map((item) => item.user_id);
  }

  if (!isMissingSchemaObject(error, "community_post_likes")) {
    throw error;
  }

  const fallback = await getSiteSettingValue<CommunityLikeFallbackValue>(
    getLikesFallbackKey(postId),
    { userIds: [] },
  );

  return fallback.userIds ?? [];
}

async function writeLikeUserIds(postId: string, userIds: string[]) {
  await upsertSiteSetting({
    settingKey: getLikesFallbackKey(postId),
    settingGroup: "community",
    label: "社区点赞用户记录",
    value: { userIds },
    description: "社区作品点赞用户的兼容存储。",
  });
}

async function appendActivityFallback(postId: string, log: CommunityActivityLog) {
  const current = await getSiteSettingValue<CommunityActivityFallbackValue>(
    getActivityFallbackKey(postId),
    { logs: [] },
  );

  await upsertSiteSetting({
    settingKey: getActivityFallbackKey(postId),
    settingGroup: "community",
    label: "社区互动流水",
    value: {
      logs: [log, ...(current.logs ?? [])].slice(0, 80),
    },
    description: "社区作品互动流水的兼容存储。",
  });
}

export async function ensureUserProfile(userId: string, phone: string) {
  const supabaseAdmin = getSupabaseAdmin();

  const { data: existingProfile, error: fetchError } = await supabaseAdmin
    .from("user_profiles")
    .select("user_id, display_name, avatar_color, bio")
    .eq("user_id", userId)
    .maybeSingle<UserProfile>();

  if (fetchError) {
    throw fetchError;
  }

  if (existingProfile) {
    return existingProfile;
  }

  const suffix = phone.slice(-4);
  const { data: insertedProfile, error: insertError } = await supabaseAdmin
    .from("user_profiles")
    .insert(
      {
        user_id: userId,
        display_name: `小创作者${suffix}`,
      } as never,
    )
    .select("user_id, display_name, avatar_color, bio")
    .single<UserProfile>();

  if (insertError) {
    throw insertError;
  }

  return insertedProfile;
}

export async function getUserProfile(userId: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .select("user_id, display_name, avatar_color, bio")
    .eq("user_id", userId)
    .maybeSingle<UserProfile>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createCommunityPost(input: CommunityPostInsert) {
  const supabaseAdmin = getSupabaseAdmin();
  const category = inferCommunityCategory({
    title: input.title,
    prompt: input.prompt,
  });

  const detail = mergeCommunityDetail(input.moderationDetail, {
    category,
    viewCount: 0,
    shareCount: 0,
    manualSortOrder: 0,
    isFeatured: false,
    creatorScore: 0,
    manualCreatorRank: null,
    isCreatorStar: false,
  });

  const primaryResult = await supabaseAdmin
    .from("community_posts")
    .insert(
      {
        user_id: input.userId,
        title: input.title,
        prompt: input.prompt,
        preview_image_url: input.previewImageUrl,
        preview_code: input.previewCode,
        mode: input.mode,
        moderation_status: input.moderationStatus,
        moderation_reason: input.moderationReason ?? null,
        moderation_detail: detail,
      } as never,
    )
    .select("*")
    .single();

  if (!primaryResult.error) {
    return primaryResult.data as CommunityPostRow;
  }

  if (!isMissingSchemaObject(primaryResult.error, "moderation_detail")) {
    throw primaryResult.error;
  }

  const fallbackResult = (await supabaseAdmin
    .from("community_posts")
    .insert(
      {
        user_id: input.userId,
        title: input.title,
        prompt: input.prompt,
        preview_image_url: input.previewImageUrl,
        preview_code: input.previewCode,
        mode: input.mode,
        moderation_status: input.moderationStatus,
        moderation_reason: input.moderationReason ?? null,
      } as never,
    )
    .select("*")
    .single()) as {
    data: CommunityPostRow | null;
    error: unknown;
  };

  if (fallbackResult.error) {
    throw fallbackResult.error;
  }

  if (input.moderationDetail && fallbackResult.data?.id) {
    await writeModerationDetailFallback(
      fallbackResult.data.id,
      input.moderationDetail,
    );
  }

  return fallbackResult.data as CommunityPostRow;
}

export async function getCommunityPostById(postId: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("community_posts")
    .select("*")
    .eq("id", postId)
    .maybeSingle<CommunityPostRow>();

  if (error) {
    throw error;
  }

  if (data && !data.moderation_detail) {
    const fallbackModerationDetail = await getModerationDetailFallback(postId);

    if (Object.keys(fallbackModerationDetail).length) {
      return {
        ...data,
        moderation_detail: fallbackModerationDetail,
      };
    }
  }

  return data;
}

export async function updateCommunityPostModeration(
  postId: string,
  input: {
    moderationStatus: CommunityPostStatus;
    moderationReason?: string | null;
    moderationDetail?: Record<string, unknown>;
    moderationStage?: "rule" | "ai" | "fallback" | "manual";
    reviewedAt?: string | null;
    reviewedBy?: string | null;
  },
) {
  const supabaseAdmin = getSupabaseAdmin();

  const primaryResult = await supabaseAdmin
    .from("community_posts")
    .update(
      {
        moderation_status: input.moderationStatus,
        moderation_reason: input.moderationReason ?? null,
        moderation_detail: input.moderationDetail ?? {},
        moderation_stage: input.moderationStage ?? "manual",
        reviewed_at: input.reviewedAt ?? null,
        reviewed_by: input.reviewedBy ?? null,
      } as never,
    )
    .eq("id", postId)
    .select("*")
    .single();

  if (!primaryResult.error) {
    return primaryResult.data as CommunityPostRow;
  }

  if (!isMissingSchemaObject(primaryResult.error, "moderation_detail")) {
    throw primaryResult.error;
  }

  const fallbackResult = await supabaseAdmin
    .from("community_posts")
    .update(
      {
        moderation_status: input.moderationStatus,
        moderation_reason: input.moderationReason ?? null,
        moderation_stage: input.moderationStage ?? "manual",
        reviewed_at: input.reviewedAt ?? null,
        reviewed_by: input.reviewedBy ?? null,
      } as never,
    )
    .eq("id", postId)
    .select("*")
    .single();

  if (fallbackResult.error) {
    throw fallbackResult.error;
  }

  if (input.moderationDetail) {
    await writeModerationDetailFallback(postId, input.moderationDetail);
  }

  return fallbackResult.data as CommunityPostRow;
}

function sortPosts(posts: ApprovedCommunityPost[], sort: CommunityListOptions["sort"]) {
  const next = [...posts];

  next.sort((a, b) => {
    if (sort === "latest") {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }

    if (sort === "likes") {
      return b.like_count - a.like_count;
    }

    if (sort === "views") {
      return b.view_count - a.view_count || b.like_count - a.like_count;
    }

    if (sort === "shares") {
      return b.share_count - a.share_count || b.like_count - a.like_count;
    }

    return (
      Number(b.is_featured) - Number(a.is_featured) ||
      a.manual_sort_order - b.manual_sort_order ||
      b.like_count - a.like_count ||
      b.view_count - a.view_count ||
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  });

  return next;
}

export async function listApprovedCommunityPosts(
  options?: CommunityListOptions,
): Promise<ApprovedCommunityPost[]> {
  const supabaseAdmin = getSupabaseAdmin();
  const primaryResult = await supabaseAdmin
    .from("community_posts")
    .select(
      "id, user_id, title, prompt, preview_image_url, like_count, created_at, is_featured, moderation_detail",
    )
    .eq("moderation_status", "approved")
    .order("created_at", { ascending: false })
    .returns<
      Array<
        Pick<
          CommunityPostRow,
          | "id"
          | "user_id"
          | "title"
          | "prompt"
          | "preview_image_url"
          | "like_count"
          | "created_at"
          | "is_featured"
          | "moderation_detail"
        >
      >
    >();

  let data = primaryResult.data;
  let error = primaryResult.error;

  if (error && isMissingSchemaObject(error, "moderation_detail")) {
    const fallbackResult = await supabaseAdmin
      .from("community_posts")
      .select(
        "id, user_id, title, prompt, preview_image_url, like_count, created_at, is_featured",
      )
      .eq("moderation_status", "approved")
      .order("created_at", { ascending: false })
      .returns<
        Array<
          Pick<
            CommunityPostRow,
            | "id"
            | "user_id"
            | "title"
            | "prompt"
            | "preview_image_url"
            | "like_count"
            | "created_at"
            | "is_featured"
          >
        >
      >();

    data = (fallbackResult.data ?? []).map((post) => ({
      ...post,
      moderation_detail: undefined,
    })) as typeof data;
    error = fallbackResult.error;
  }

  if (error) {
    throw error;
  }

  const posts = data ?? [];
  if (!posts.length) {
    return [];
  }

  const userIds = [...new Set(posts.map((post) => post.user_id))];
  const { usersById, profilesById } = await loadCommunityUsers(userIds);

  let enriched = posts.map((post) => ({
    id: post.id,
    user_id: post.user_id,
    title: post.title,
    prompt: post.prompt,
    preview_image_url: post.preview_image_url,
    like_count: normalizeCount(post.like_count),
    view_count: resolveViewCount(post),
    share_count: resolveShareCount(post),
    category: resolveCategory(post),
    created_at: post.created_at,
    is_featured: resolveFeatured(post),
    manual_sort_order: resolveManualSortOrder(post),
    creator_score: resolveCreatorScore(post),
    manual_creator_rank: resolveManualCreatorRank(post),
    is_creator_star: resolveCreatorStar(post),
    users: usersById.get(post.user_id) ?? null,
    user_profiles: profilesById.get(post.user_id) ?? null,
  }));

  if (options?.category) {
    enriched = enriched.filter((post) => post.category === options.category);
  }

  if (options?.creatorUserId) {
    enriched = enriched.filter((post) => post.user_id === options.creatorUserId);
  }

  const keyword = options?.search?.trim().toLowerCase();
  if (keyword) {
    enriched = enriched.filter((post) =>
      [
        post.title,
        post.prompt,
        post.category,
        post.user_profiles?.display_name ?? "",
        post.users?.nickname ?? "",
        post.users?.phone ?? "",
      ]
        .join("\n")
        .toLowerCase()
        .includes(keyword),
    );
  }

  return sortPosts(enriched, options?.sort ?? "featured");
}

export async function listUserCommunityPosts(
  userId: string,
): Promise<UserCommunityPost[]> {
  const supabaseAdmin = getSupabaseAdmin();
  const primaryResult = await supabaseAdmin
    .from("community_posts")
    .select(
      "id, user_id, title, prompt, preview_image_url, moderation_status, moderation_reason, like_count, created_at, moderation_detail",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .returns<
      Array<
        Pick<
          CommunityPostRow,
          | "id"
          | "user_id"
          | "title"
          | "prompt"
          | "preview_image_url"
          | "moderation_status"
          | "moderation_reason"
          | "like_count"
          | "created_at"
          | "moderation_detail"
        >
      >
    >();

  let data = primaryResult.data;
  let error = primaryResult.error;

  if (error && isMissingSchemaObject(error, "moderation_detail")) {
    const fallbackResult = await supabaseAdmin
      .from("community_posts")
      .select(
        "id, user_id, title, prompt, preview_image_url, moderation_status, moderation_reason, like_count, created_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .returns<
        Array<
          Pick<
            CommunityPostRow,
            | "id"
            | "user_id"
            | "title"
            | "prompt"
            | "preview_image_url"
            | "moderation_status"
            | "moderation_reason"
            | "like_count"
            | "created_at"
          >
        >
      >();

    data = (fallbackResult.data ?? []).map((post) => ({
      ...post,
      moderation_detail: undefined,
    })) as typeof data;
    error = fallbackResult.error;
  }

  if (error) {
    throw error;
  }

  return (data ?? []).map((post) => ({
    ...post,
    view_count: resolveViewCount(post),
    share_count: resolveShareCount(post),
    category: resolveCategory(post),
  }));
}

export async function getApprovedCommunityPostDetail(
  postId: string,
  viewerUserId?: string | null,
): Promise<CommunityPostDetail | null> {
  const post = await getCommunityPostById(postId);

  if (!post || post.moderation_status !== "approved") {
    return null;
  }

  const { usersById, profilesById } = await loadCommunityUsers([post.user_id]);
  const likeUserIds = viewerUserId ? await listLikeUserIds(postId) : [];

  return {
    id: post.id,
    user_id: post.user_id,
    title: post.title,
    prompt: post.prompt,
    preview_image_url: post.preview_image_url,
    preview_code: post.preview_code,
    like_count: normalizeCount(post.like_count),
    view_count: resolveViewCount(post),
    share_count: resolveShareCount(post),
    category: resolveCategory(post),
    created_at: post.created_at,
    is_featured: resolveFeatured(post),
    manual_sort_order: resolveManualSortOrder(post),
    creator_score: resolveCreatorScore(post),
    manual_creator_rank: resolveManualCreatorRank(post),
    is_creator_star: resolveCreatorStar(post),
    users: usersById.get(post.user_id) ?? null,
    user_profiles: profilesById.get(post.user_id) ?? null,
    moderation_reason: post.moderation_reason ?? null,
    viewer_has_liked: viewerUserId ? likeUserIds.includes(viewerUserId) : false,
  };
}

export async function toggleCommunityPostLike(postId: string, userId: string) {
  const post = await getApprovedCommunityPostDetail(postId, userId);

  if (!post) {
    throw new Error("当前作品暂时不能点赞。");
  }

  const likeUserIds = await listLikeUserIds(postId);
  const liked = likeUserIds.includes(userId);
  const nextUserIds = liked
    ? likeUserIds.filter((item) => item !== userId)
    : [...likeUserIds, userId];

  await writeLikeUserIds(postId, nextUserIds);

  const supabaseAdmin = getSupabaseAdmin();
  const nextLikeCount = nextUserIds.length;
  const { error } = await supabaseAdmin
    .from("community_posts")
    .update({ like_count: nextLikeCount } as never)
    .eq("id", postId);

  if (error) {
    throw error;
  }

  await recordCommunityActivity({
    postId,
    userId,
    activityType: liked ? "unlike" : "like",
    deltaValue: liked ? -1 : 1,
    note: liked ? "取消点赞" : "点了赞",
  });

  return {
    liked: !liked,
    likeCount: nextLikeCount,
  };
}

export async function updateCommunityPostOperationMeta(
  postId: string,
  input: Partial<PostMeta>,
) {
  const post = await getCommunityPostById(postId);

  if (!post) {
    throw new Error("没有找到要更新的社区作品。");
  }

  const supabaseAdmin = getSupabaseAdmin();
  const nextDetail = mergeCommunityDetail(post.moderation_detail, input);

  const primary = await supabaseAdmin
    .from("community_posts")
    .update({
      moderation_detail: nextDetail,
      is_featured:
        typeof input.isFeatured === "boolean"
          ? input.isFeatured
          : resolveFeatured(post),
    } as never)
    .eq("id", postId);

  if (!primary.error) {
    return;
  }

  if (!isMissingSchemaObject(primary.error, "moderation_detail")) {
    throw primary.error;
  }

  if (typeof input.isFeatured === "boolean") {
    const fallback = await supabaseAdmin
      .from("community_posts")
      .update({ is_featured: input.isFeatured } as never)
      .eq("id", postId);

    if (fallback.error) {
      throw fallback.error;
    }
  }
}

export async function incrementCommunityMetric(
  postId: string,
  metric: "view" | "share",
  userId?: string | null,
) {
  const post = await getApprovedCommunityPostDetail(postId, userId);

  if (!post) {
    throw new Error("当前作品暂时无法记录互动。");
  }

  const nextValue =
    metric === "view" ? post.view_count + 1 : post.share_count + 1;

  await updateCommunityPostOperationMeta(postId, {
    ...(metric === "view" ? { viewCount: nextValue } : { shareCount: nextValue }),
  });

  await recordCommunityActivity({
    postId,
    userId: userId ?? null,
    activityType: metric === "view" ? "view" : "share",
    deltaValue: 1,
    note: metric === "view" ? "查看了作品" : "分享了作品",
  });

  return nextValue;
}

export async function recordCommunityActivity(input: {
  postId: string;
  userId?: string | null;
  activityType: CommunityActivityLog["activity_type"];
  deltaValue?: number;
  note?: string | null;
}) {
  const log: CommunityActivityLog = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
    user_id: input.userId ?? null,
    activity_type: input.activityType,
    delta_value: input.deltaValue ?? 0,
    note: input.note ?? null,
    created_at: new Date().toISOString(),
  };

  const supabaseAdmin = getSupabaseAdmin();
  const insertResult = await supabaseAdmin.from("community_post_activity_logs").insert(
    {
      post_id: input.postId,
      user_id: log.user_id,
      activity_type: log.activity_type,
      delta_value: log.delta_value,
      note: log.note,
    } as never,
  );

  if (!insertResult.error) {
    return;
  }

  if (!isMissingSchemaObject(insertResult.error, "community_post_activity_logs")) {
    throw insertResult.error;
  }

  await appendActivityFallback(input.postId, log);
}

export async function listCommunityActivityLogs(postId: string, limit = 20) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("community_post_activity_logs")
    .select("id, user_id, activity_type, delta_value, note, created_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<CommunityActivityLog[]>();

  if (!error) {
    return data ?? [];
  }

  if (!isMissingSchemaObject(error, "community_post_activity_logs")) {
    throw error;
  }

  const fallback = await getSiteSettingValue<CommunityActivityFallbackValue>(
    getActivityFallbackKey(postId),
    { logs: [] },
  );

  return (fallback.logs ?? []).slice(0, limit);
}

export async function updateCommunityPostOperations(
  postId: string,
  input: {
    title?: string;
    prompt?: string;
    category?: CommunityCategory;
    likeCount?: number;
    viewCount?: number;
    shareCount?: number;
    manualSortOrder?: number;
    isFeatured?: boolean;
    creatorScore?: number;
    manualCreatorRank?: number | null;
    isCreatorStar?: boolean;
    note?: string | null;
    adminUserId?: string;
  },
) {
  const post = await getCommunityPostById(postId);

  if (!post) {
    throw new Error("没有找到要更新的社区作品。");
  }

  const supabaseAdmin = getSupabaseAdmin();
  const updatePayload: Record<string, unknown> = {};

  if (typeof input.title === "string") {
    updatePayload.title = input.title.trim();
  }

  if (typeof input.prompt === "string") {
    updatePayload.prompt = input.prompt.trim();
  }

  if (typeof input.likeCount === "number") {
    updatePayload.like_count = Math.max(0, Math.floor(input.likeCount));
  }

  if (Object.keys(updatePayload).length) {
    const { error } = await supabaseAdmin
      .from("community_posts")
      .update(updatePayload as never)
      .eq("id", postId);

    if (error) {
      throw error;
    }
  }

  await updateCommunityPostOperationMeta(postId, {
    category: input.category,
    viewCount:
      typeof input.viewCount === "number" ? Math.max(0, Math.floor(input.viewCount)) : undefined,
    shareCount:
      typeof input.shareCount === "number"
        ? Math.max(0, Math.floor(input.shareCount))
        : undefined,
    manualSortOrder:
      typeof input.manualSortOrder === "number"
        ? Math.max(0, Math.floor(input.manualSortOrder))
        : undefined,
    isFeatured: input.isFeatured,
    creatorScore:
      typeof input.creatorScore === "number"
        ? Math.max(0, Math.floor(input.creatorScore))
        : undefined,
    manualCreatorRank:
      input.manualCreatorRank === undefined
        ? undefined
        : input.manualCreatorRank === null
          ? null
          : Math.max(0, Math.floor(input.manualCreatorRank)),
    isCreatorStar: input.isCreatorStar,
  });

  if (typeof input.likeCount === "number") {
    const likeUserIds = await listLikeUserIds(postId);
    if (likeUserIds.length !== Math.max(0, Math.floor(input.likeCount))) {
      await writeLikeUserIds(postId, likeUserIds.slice(0, Math.max(0, Math.floor(input.likeCount))));
    }
  }

  await recordCommunityActivity({
    postId,
    userId: input.adminUserId ?? null,
    activityType: "admin_adjust",
    note: input.note ?? "管理员更新了社区运营数据。",
  });

  return getCommunityPostById(postId);
}

export async function deleteCommunityPostPermanently(postId: string) {
  const supabaseAdmin = getSupabaseAdmin();

  const post = await getCommunityPostById(postId);

  if (!post) {
    throw new Error("没有找到要删除的社区作品。");
  }

  const deleteLikesResult = await supabaseAdmin
    .from("community_post_likes")
    .delete()
    .eq("post_id", postId);

  if (
    deleteLikesResult.error &&
    !isMissingSchemaObject(deleteLikesResult.error, "community_post_likes")
  ) {
    throw deleteLikesResult.error;
  }

  const deleteActivityResult = await supabaseAdmin
    .from("community_post_activity_logs")
    .delete()
    .eq("post_id", postId);

  if (
    deleteActivityResult.error &&
    !isMissingSchemaObject(deleteActivityResult.error, "community_post_activity_logs")
  ) {
    throw deleteActivityResult.error;
  }

  const deletePostResult = await supabaseAdmin
    .from("community_posts")
    .delete()
    .eq("id", postId);

  if (deletePostResult.error) {
    throw deletePostResult.error;
  }

  const cleanupFallbackKeys = [
    getLikesFallbackKey(postId),
    getActivityFallbackKey(postId),
    getModerationDetailFallbackKey(postId),
  ];

  const cleanupFallbackResult = await supabaseAdmin
    .from("site_settings")
    .delete()
    .in("setting_key", cleanupFallbackKeys);

  if (cleanupFallbackResult.error) {
    throw cleanupFallbackResult.error;
  }

  return {
    id: post.id,
    title: post.title,
    user_id: post.user_id,
  };
}

export async function getCommunityOverview() {
  const posts = await listApprovedCommunityPosts();
  const creatorsMap = new Map<string, CommunityCreatorSummary>();

  for (const post of posts) {
    const existing = creatorsMap.get(post.user_id);
    const postScore = post.creator_score;
    const postManualRank = post.manual_creator_rank;
    const postIsCreatorStar = post.is_creator_star;

    if (existing) {
      existing.works_count += 1;
      existing.total_likes += post.like_count;
      existing.total_views += post.view_count;
      existing.total_shares += post.share_count;
      if (!existing.categories.includes(post.category)) {
        existing.categories.push(post.category);
      }
      existing.creator_score += postScore;
      if (existing.manual_rank === null && postManualRank !== null) {
        existing.manual_rank = postManualRank;
      }
      if (postIsCreatorStar) {
        existing.is_creator_star = true;
      }
      continue;
    }

    creatorsMap.set(post.user_id, {
      user_id: post.user_id,
      name:
        post.user_profiles?.display_name ||
        post.users?.nickname ||
        post.users?.phone ||
        "小创作者",
      avatar_color: post.user_profiles?.avatar_color ?? null,
      works_count: 1,
      total_likes: post.like_count,
      total_views: post.view_count,
      total_shares: post.share_count,
      categories: [post.category],
      manual_rank: postManualRank,
      creator_score: postScore,
      is_creator_star: postIsCreatorStar,
    });
  }

  const creators = [...creatorsMap.values()].sort(
    (a, b) =>
      (a.manual_rank ?? Number.MAX_SAFE_INTEGER) -
        (b.manual_rank ?? Number.MAX_SAFE_INTEGER) ||
      b.creator_score - a.creator_score ||
      b.total_likes - a.total_likes,
  );

  const dashboardSetting = await getSiteSettingValue<CommunityDashboardSetting>(
    getDashboardSettingKey(),
    {},
  );

  const totalLikes = posts.reduce((sum, post) => sum + post.like_count, 0);

  return {
    totalWorks: posts.length,
    totalCreators: creators.length,
    totalLikes,
    totalViews: posts.reduce((sum, post) => sum + post.view_count, 0),
    totalShares: posts.reduce((sum, post) => sum + post.share_count, 0),
    displayTotalLikes:
      typeof dashboardSetting.displayTotalLikes === "number"
        ? dashboardSetting.displayTotalLikes
        : totalLikes,
    activeCreators: creators.slice(0, 12),
    creatorStars: creators.filter((creator) => creator.is_creator_star).slice(0, 6),
  };
}

export async function updateCommunityDashboardSetting(input: {
  displayTotalLikes?: number;
}) {
  const current = await getSiteSettingValue<CommunityDashboardSetting>(
    getDashboardSettingKey(),
    {},
  );

  await upsertSiteSetting({
    settingKey: getDashboardSettingKey(),
    settingGroup: "community",
    label: "社区展示指标设置",
    value: {
      ...current,
      ...(typeof input.displayTotalLikes === "number"
        ? { displayTotalLikes: Math.max(0, Math.floor(input.displayTotalLikes)) }
        : {}),
    },
    description: "成长社区首页展示指标的后台控制。",
  });
}

export async function listCommunityAdminRecords(input?: {
  includePreviewCode?: boolean;
  limit?: number;
  moderationStatus?: CommunityPostStatus;
}) {
  const supabaseAdmin = getSupabaseAdmin();
  const selectFields = [
    "id",
    "user_id",
    "title",
    "prompt",
    "preview_image_url",
    input?.includePreviewCode ? "preview_code" : null,
    "moderation_status",
    "moderation_reason",
    "moderation_stage",
    "like_count",
    "created_at",
    "reviewed_at",
    "is_featured",
    "moderation_detail",
  ]
    .filter(Boolean)
    .join(", ");

  const baseQuery = supabaseAdmin
    .from("community_posts")
    .select(selectFields)
    .order("created_at", { ascending: false });

  if (input?.moderationStatus) {
    baseQuery.eq("moderation_status", input.moderationStatus);
  }

  if (typeof input?.limit === "number" && input.limit > 0) {
    baseQuery.limit(input.limit);
  }

  const primaryResult = await baseQuery.returns<
    Array<
      Pick<
        CommunityPostRow,
        | "id"
        | "user_id"
        | "title"
        | "prompt"
        | "preview_image_url"
        | "preview_code"
        | "moderation_status"
        | "moderation_reason"
        | "moderation_stage"
        | "like_count"
        | "created_at"
        | "reviewed_at"
        | "is_featured"
        | "moderation_detail"
      >
    >
  >();

  let data = primaryResult.data;
  let error = primaryResult.error;

  if (error && isMissingSchemaObject(error, "moderation_detail")) {
    const fallbackSelectFields = [
      "id",
      "user_id",
      "title",
      "prompt",
      "preview_image_url",
      input?.includePreviewCode ? "preview_code" : null,
      "moderation_status",
      "moderation_reason",
      "moderation_stage",
      "like_count",
      "created_at",
      "reviewed_at",
      "is_featured",
    ]
      .filter(Boolean)
      .join(", ");

    const fallbackQuery = supabaseAdmin
      .from("community_posts")
      .select(fallbackSelectFields)
      .order("created_at", { ascending: false });

    if (input?.moderationStatus) {
      fallbackQuery.eq("moderation_status", input.moderationStatus);
    }

    if (typeof input?.limit === "number" && input.limit > 0) {
      fallbackQuery.limit(input.limit);
    }

    const fallbackResult = await fallbackQuery.returns<
      Array<
        Pick<
          CommunityPostRow,
          | "id"
          | "user_id"
          | "title"
          | "prompt"
          | "preview_image_url"
          | "preview_code"
          | "moderation_status"
          | "moderation_reason"
          | "moderation_stage"
          | "like_count"
          | "created_at"
          | "reviewed_at"
          | "is_featured"
        >
      >
    >();

    data = (fallbackResult.data ?? []).map((post) => ({
      ...post,
      moderation_detail: undefined,
    })) as typeof data;
    error = fallbackResult.error;
  }

  if (error) {
    throw error;
  }

  const posts = data ?? [];
  if (!posts.length) {
    return [];
  }

  const userIds = [...new Set(posts.map((post) => post.user_id))];
  const { usersById, profilesById } = await loadCommunityUsers(userIds);

  return posts.map((post) => ({
    id: post.id,
    user_id: post.user_id,
    title: post.title,
    prompt: post.prompt,
    preview_image_url: post.preview_image_url,
    preview_code: post.preview_code,
    moderation_status: post.moderation_status,
    moderation_reason: post.moderation_reason ?? null,
    moderation_stage: post.moderation_stage ?? "rule",
    like_count: normalizeCount(post.like_count),
    view_count: resolveViewCount(post),
    share_count: resolveShareCount(post),
    category: resolveCategory(post),
    manual_sort_order: resolveManualSortOrder(post),
    is_featured: resolveFeatured(post),
    creator_score: resolveCreatorScore(post),
    manual_creator_rank: resolveManualCreatorRank(post),
    is_creator_star: resolveCreatorStar(post),
    created_at: post.created_at,
    reviewed_at: post.reviewed_at ?? null,
    user_phone: usersById.get(post.user_id)?.phone ?? null,
    user_nickname: usersById.get(post.user_id)?.nickname ?? null,
    user_display_name: profilesById.get(post.user_id)?.display_name ?? null,
    moderation_detail: post.moderation_detail ?? {},
  })) satisfies CommunityAdminSearchRecord[];
}
