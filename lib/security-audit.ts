import "server-only";
import crypto from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function getHeader(headers: Headers, name: string) {
  return headers.get(name)?.trim() || null;
}

export function getRequestIp(headers: Headers) {
  const forwardedFor = getHeader(headers, "x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || null;
  }

  return (
    getHeader(headers, "x-real-ip") ||
    getHeader(headers, "cf-connecting-ip") ||
    getHeader(headers, "x-client-ip")
  );
}

function getSourcePort(headers: Headers) {
  return (
    getHeader(headers, "x-forwarded-port") ||
    getHeader(headers, "x-real-port") ||
    getHeader(headers, "x-client-port")
  );
}

function createClientFingerprint(input: {
  userAgent: string | null;
  acceptLanguage: string | null;
  ip: string | null;
}) {
  return crypto
    .createHash("sha256")
    .update([input.userAgent ?? "", input.acceptLanguage ?? "", input.ip ?? ""].join("|"))
    .digest("hex");
}

export async function appendSecurityEventLog(input: {
  request: Request;
  userId?: string | null;
  eventType: string;
  action: string;
  accountIdentifier?: string | null;
  outcome?: "success" | "failure" | "blocked";
  detail?: Record<string, unknown>;
}) {
  const supabase = getSupabaseAdmin();
  const url = new URL(input.request.url);
  const userAgent = getHeader(input.request.headers, "user-agent");
  const ip = getRequestIp(input.request.headers);
  const acceptLanguage = getHeader(input.request.headers, "accept-language");

  const payload = {
    user_id: input.userId ?? null,
    event_type: input.eventType,
    action: input.action,
    account_identifier: input.accountIdentifier ?? null,
    source_ip: ip,
    target_url: url.toString(),
    source_port: getSourcePort(input.request.headers),
    user_agent: userAgent,
    client_fingerprint: createClientFingerprint({
      userAgent,
      acceptLanguage,
      ip,
    }),
    request_method: input.request.method,
    request_path: url.pathname,
    outcome: input.outcome ?? "success",
    detail: input.detail ?? {},
  };

  const { error } = await supabase
    .from("security_event_logs")
    .insert(payload as never);

  if (error) {
    const message = String(error.message ?? "");

    if (
      error.code === "PGRST205" ||
      error.code === "42P01" ||
      message.includes("security_event_logs")
    ) {
      console.warn("安全审计日志表暂不可用，已跳过本次日志写入。", error);
      return;
    }

    throw error;
  }
}
