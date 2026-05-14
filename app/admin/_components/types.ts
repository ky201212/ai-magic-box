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
