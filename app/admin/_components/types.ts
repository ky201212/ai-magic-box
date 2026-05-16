export type AdminNavItem = {
  href: string;
  label: string;
  description: string;
};

export type AdminNavGroup = {
  title: string;
  items: AdminNavItem[];
};

export type SiteSettingRecord = {
  setting_key: string;
  setting_group: string;
  label: string;
  value: Record<string, unknown>;
  description: string | null;
  updated_at?: string;
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

export type AiModelOptionsState = {
  models: string[];
  endpoint: string;
  warning: string;
  status: "idle" | "loading" | "success" | "error";
};

export type CommunityReviewSettingRecord = {
  aiApprovalMode: "auto_publish" | "manual_review";
  aiModerationInstruction: string;
  blockedKeywords: string[];
  lockManualApproveAfterAiReject: boolean;
};

export type AdminCommunityPostRecord = {
  id: string;
  user_id: string;
  title: string;
  prompt: string;
  preview_image_url: string;
  preview_code?: string;
  user_phone: string | null;
  user_nickname: string | null;
  user_display_name: string | null;
  moderation_status: "pending" | "approved" | "rejected";
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
  subscriptions: Array<{
    id: string;
    user_id: string;
    plan_id: string;
    status: "active" | "expired" | "cancelled";
    start_date: string;
    end_date: string;
    last_grant_date: string | null;
    source: "payment" | "activation_code";
    reference_id: string | null;
    created_at: string;
    subscription_plans?: {
      name: string;
      daily_coins: number;
      duration_days: number;
      price: number;
    } | null;
  }>;
  creditLogs: Array<{
    id: string;
    user_id: string;
    change_amount: number;
    balance_after: number;
    reason_code: string;
    reason_label: string;
    note: string | null;
    created_at: string;
  }>;
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
