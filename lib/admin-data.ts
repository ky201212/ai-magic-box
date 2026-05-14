import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

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

export type DashboardStats = {
  usersTotal: number;
  communityPending: number;
  communityApproved: number;
  notificationsSent: number;
};

export type AdminCommunityPostRecord = {
  id: string;
  user_id: string;
  title: string;
  prompt: string;
  preview_image_url: string;
  moderation_status: "pending" | "approved" | "rejected";
  moderation_reason: string | null;
  moderation_stage: "rule" | "ai" | "fallback" | "manual";
  moderation_detail: Record<string, unknown>;
  is_featured: boolean;
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

export async function listAdminCommunityPosts(): Promise<AdminCommunityPostRecord[]> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("community_posts")
    .select(
      "id, user_id, title, prompt, preview_image_url, moderation_status, moderation_reason, moderation_stage, moderation_detail, is_featured, created_at, reviewed_at",
    )
    .order("created_at", { ascending: false })
    .returns<AdminCommunityPostRecord[]>();

  if (error) {
    throw error;
  }

  return data ?? [];
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
  const { data, error } = await supabaseAdmin
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
      "id, user_id, title, prompt, preview_image_url, moderation_status, moderation_reason, moderation_stage, moderation_detail, is_featured, created_at, reviewed_at",
    )
    .single();

  if (error) {
    throw error;
  }

  return data as AdminCommunityPostRecord;
}

type AdminUserBaseRow = Omit<AdminUserRecord, "credits">;

export async function listAdminUsers(): Promise<AdminUserRecord[]> {
  const supabaseAdmin = getSupabaseAdmin();
  const creditPolicy = await getCreditPolicySetting().catch(() => ({
    initialCredits: 50,
  }));
  const [{ data: users, error: usersError }, { data: credits, error: creditsError }] =
    await Promise.all([
      supabaseAdmin
        .from("users")
        .select("id, phone, nickname, status, last_login_at, avatar_url, notes, created_at")
        .order("created_at", { ascending: false })
        .returns<AdminUserBaseRow[]>(),
      supabaseAdmin
        .from("user_credits")
        .select("user_id, credits")
        .returns<Array<{ user_id: string; credits: number }>>(),
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

  return (users ?? []).map((user) => ({
    ...user,
    credits:
      creditsMap.get(user.id as string) ??
      Math.max(0, creditPolicy.initialCredits ?? 50),
  }));
}

export async function updateAdminUser(
  userId: string,
  input: {
    nickname?: string | null;
    status?: "active" | "disabled";
    notes?: string | null;
    credits?: number;
  },
) {
  const supabaseAdmin = getSupabaseAdmin();

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
  }

  if (typeof input.credits === "number") {
    const { error: creditsError } = await supabaseAdmin
      .from("user_credits")
      .upsert({ user_id: userId, credits: Math.max(0, input.credits) } as never, {
        onConflict: "user_id",
      });

    if (creditsError) {
      throw creditsError;
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

  return updatedNotification as NotificationRecord;
}

export async function listUserNotifications(
  userId: string,
): Promise<UserNotificationRecord[]> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("user_notifications")
    .select("id, is_read, created_at, read_at, notifications(title, body, sent_at)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(12)
    .returns<UserNotificationRecord[]>();

  if (error) {
    throw error;
  }

  return data ?? [];
}
