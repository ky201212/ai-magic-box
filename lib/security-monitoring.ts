import "server-only";
import { appendSecurityEventLog } from "@/lib/security-audit";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type AlertPayload = {
  key: string;
  title: string;
  body: string;
  cooldownMs?: number;
};

declare global {
  var __magicSecurityAlertCooldowns__: Map<string, number> | undefined;
}

function getAlertCooldownStore() {
  if (!globalThis.__magicSecurityAlertCooldowns__) {
    globalThis.__magicSecurityAlertCooldowns__ = new Map<string, number>();
  }

  return globalThis.__magicSecurityAlertCooldowns__;
}

function shouldSendAlertNow(key: string, cooldownMs: number) {
  const store = getAlertCooldownStore();
  const now = Date.now();
  const nextAllowedAt = store.get(key) ?? 0;

  if (now < nextAllowedAt) {
    return false;
  }

  store.set(key, now + cooldownMs);
  return true;
}

async function sendAdminSecurityAlert(input: AlertPayload) {
  const cooldownMs = Math.max(30_000, input.cooldownMs ?? 5 * 60 * 1000);

  if (!shouldSendAlertNow(input.key, cooldownMs)) {
    return false;
  }

  const supabase = getSupabaseAdmin();
  const { data: admins, error: adminError } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("is_active", true)
    .returns<Array<{ user_id: string }>>();

  if (adminError) {
    const message = String(adminError.message ?? "");

    if (
      adminError.code === "PGRST205" ||
      adminError.code === "42P01" ||
      message.includes("admin_users")
    ) {
      console.warn("管理员表暂不可用，已跳过安全告警站内通知。", adminError);
      return false;
    }

    throw adminError;
  }

  const targetUserIds = Array.from(
    new Set((admins ?? []).map((admin) => admin.user_id).filter(Boolean)),
  );

  if (!targetUserIds.length) {
    console.warn("当前没有可接收的管理员账号，已跳过安全告警站内通知。");
    return false;
  }

  const sentAt = new Date().toISOString();
  const { data: notification, error: notificationError } = await supabase
    .from("notifications")
    .insert(
      {
        title: input.title,
        body: input.body,
        target_type: "admins",
        target_user_ids: targetUserIds,
        status: "sent",
        sent_at: sentAt,
        created_by: null,
      } as never,
    )
    .select("id")
    .single<{ id: string }>();

  if (notificationError) {
    const message = String(notificationError.message ?? "");

    if (
      notificationError.code === "PGRST205" ||
      notificationError.code === "42P01" ||
      message.includes("notifications")
    ) {
      console.warn("通知表暂不可用，已跳过安全告警站内通知。", notificationError);
      return false;
    }

    throw notificationError;
  }

  const { error: recipientError } = await supabase
    .from("user_notifications")
    .upsert(
      targetUserIds.map((userId) => ({
        notification_id: notification.id,
        user_id: userId,
      })) as never,
      { onConflict: "notification_id,user_id" },
    );

  if (recipientError) {
    const message = String(recipientError.message ?? "");

    if (
      recipientError.code === "PGRST205" ||
      recipientError.code === "42P01" ||
      message.includes("user_notifications")
    ) {
      console.warn("用户通知表暂不可用，已跳过安全告警站内通知。", recipientError);
      return false;
    }

    throw recipientError;
  }

  return true;
}

export async function recordSecuritySignal(input: {
  request: Request;
  userId?: string | null;
  eventType: string;
  action: string;
  outcome?: "success" | "failure" | "blocked";
  accountIdentifier?: string | null;
  detail?: Record<string, unknown>;
  alert?: AlertPayload;
}) {
  const outcome = input.outcome ?? "blocked";
  const detail = input.detail ?? {};

  console.warn("【安全事件】", {
    eventType: input.eventType,
    action: input.action,
    outcome,
    detail,
  });

  await appendSecurityEventLog({
    request: input.request,
    userId: input.userId ?? null,
    eventType: input.eventType,
    action: input.action,
    outcome,
    accountIdentifier: input.accountIdentifier ?? input.userId ?? null,
    detail,
  }).catch((error) => {
    console.warn("安全事件审计日志写入失败，已跳过。", error);
  });

  if (!input.alert) {
    return;
  }

  await sendAdminSecurityAlert(input.alert).catch((error) => {
    console.warn("安全事件管理员告警发送失败，已跳过。", error);
  });
}

export async function recordRateLimitSignal(input: {
  request: Request;
  scope: string;
  userId?: string | null;
  detail?: Record<string, unknown>;
  cooldownMs?: number;
  message?: string;
}) {
  const pathname = new URL(input.request.url).pathname;
  const principal = input.userId?.trim() ? `用户 ${input.userId}` : "匿名来源";

  await recordSecuritySignal({
    request: input.request,
    userId: input.userId ?? null,
    eventType: "rate_limit",
    action: input.scope,
    outcome: "blocked",
    accountIdentifier: input.userId ?? null,
    detail: {
      path: pathname,
      reason: input.message ?? null,
      ...input.detail,
    },
    alert: {
      key: `rate-limit:${input.scope}`,
      title: "检测到接口限流拦截",
      body: `${principal} 在 ${pathname} 触发了限流拦截（${input.scope}）。`,
      cooldownMs: input.cooldownMs,
    },
  });
}
