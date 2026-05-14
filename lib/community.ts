import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

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
  created_at: string;
};

type ApprovedPostRow = {
  id: string;
  user_id: string;
  title: string;
  prompt: string;
  preview_image_url: string;
  like_count: number;
  created_at: string;
};

type CommunityUserRow = {
  id: string;
  phone: string;
};

type CommunityProfileRow = {
  user_id: string;
  display_name: string | null;
  avatar_color: string | null;
};

export type ApprovedCommunityPost = ApprovedPostRow & {
  users: {
    id: string;
    phone: string;
  } | null;
  user_profiles: {
    user_id: string;
    display_name: string | null;
    avatar_color: string | null;
  } | null;
};

type CommunityPostInsert = {
  userId: string;
  title: string;
  prompt: string;
  previewImageUrl: string;
  previewCode: string;
  mode: "coding";
  moderationStatus: "pending" | "approved" | "rejected";
  moderationReason?: string;
  moderationDetail?: Record<string, unknown>;
};

type UserProfileInsertPayload = {
  user_id: string;
  display_name: string;
};

type CommunityPostInsertPayload = {
  user_id: string;
  title: string;
  prompt: string;
  preview_image_url: string;
  preview_code: string;
  mode: "coding";
  moderation_status: "pending" | "approved" | "rejected";
  moderation_reason: string | null;
  moderation_detail: Record<string, unknown>;
};

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
  const insertPayload: UserProfileInsertPayload = {
    user_id: userId,
    display_name: `小创作者${suffix}`,
  };
  const { data: insertedProfile, error: insertError } = await supabaseAdmin
    .from("user_profiles")
    .insert(insertPayload as never)
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
  const insertPayload: CommunityPostInsertPayload = {
    user_id: input.userId,
    title: input.title,
    prompt: input.prompt,
    preview_image_url: input.previewImageUrl,
    preview_code: input.previewCode,
    mode: input.mode,
    moderation_status: input.moderationStatus,
    moderation_reason: input.moderationReason ?? null,
    moderation_detail: input.moderationDetail ?? {},
  };

  const { data, error } = await supabaseAdmin
    .from("community_posts")
    .insert(insertPayload as never)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getCommunityPostById(postId: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("community_posts")
    .select("*")
    .eq("id", postId)
    .maybeSingle();

  if (error) {
    throw error;
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
  const { data, error } = await supabaseAdmin
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

  if (error) {
    throw error;
  }

  return data;
}

export async function listApprovedCommunityPosts(): Promise<ApprovedCommunityPost[]> {
  const supabaseAdmin = getSupabaseAdmin();

  const { data, error } = await supabaseAdmin
    .from("community_posts")
    .select("id, user_id, title, prompt, preview_image_url, like_count, created_at")
    .eq("moderation_status", "approved")
    .order("created_at", { ascending: false })
    .returns<ApprovedPostRow[]>();

  if (error) {
    throw error;
  }

  const posts = data ?? [];

  if (!posts.length) {
    return [];
  }

  const userIds = [...new Set(posts.map((post) => post.user_id))];

  const [{ data: users, error: usersError }, { data: profiles, error: profilesError }] =
    await Promise.all([
      supabaseAdmin
        .from("users")
        .select("id, phone")
        .in("id", userIds)
        .returns<CommunityUserRow[]>(),
      supabaseAdmin
        .from("user_profiles")
        .select("user_id, display_name, avatar_color")
        .in("user_id", userIds),
    ]);

  if (usersError) {
    throw usersError;
  }

  if (profilesError) {
    throw profilesError;
  }

  const usersById = new Map((users ?? []).map((user) => [user.id, user]));
  const profilesById = new Map(
    ((profiles ?? []) as CommunityProfileRow[]).map((profile) => [
      profile.user_id,
      profile,
    ]),
  );

  return posts.map((post) => ({
    ...post,
    users: usersById.get(post.user_id) ?? null,
    user_profiles: profilesById.get(post.user_id) ?? null,
  }));
}

export async function listUserCommunityPosts(
  userId: string,
): Promise<UserCommunityPost[]> {
  const supabaseAdmin = getSupabaseAdmin();

  const { data, error } = await supabaseAdmin
    .from("community_posts")
    .select(
      "id, title, prompt, preview_image_url, moderation_status, moderation_reason, like_count, created_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .returns<UserCommunityPost[]>();

  if (error) {
    throw error;
  }

  return data ?? [];
}
