import "server-only";
import crypto from "node:crypto";
import { cookies, headers } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const SESSION_COOKIE_NAME = "magic_session";
const SESSION_EXPIRES_DAYS = 30;

type CurrentUser = {
  user_id: string;
  users: {
    id: string;
    phone: string;
  } | null;
};

type UserSessionInsertPayload = {
  user_id: string;
  token_hash: string;
  expires_at: string;
};

function getSessionSecret() {
  const secret = process.env.AUTH_SESSION_SECRET;

  if (!secret) {
    throw new Error("缺少 AUTH_SESSION_SECRET 环境变量。");
  }

  return secret;
}

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function generateOtpCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generateSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

export async function hashOtpCode(code: string) {
  return sha256(`${getSessionSecret()}:${code}`);
}

async function resolveCookieSecureFlag() {
  const headerStore = await headers();
  const forwardedProto = headerStore.get("x-forwarded-proto");
  const forwardedSsl = headerStore.get("x-forwarded-ssl");
  const host = headerStore.get("host") ?? "";

  if (forwardedProto === "https" || forwardedSsl === "on") {
    return true;
  }

  if (
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    host.startsWith("0.0.0.0")
  ) {
    return false;
  }

  return process.env.NODE_ENV === "production" && forwardedProto !== "http";
}

export async function setSession(userId: string) {
  const token = generateSessionToken();
  const tokenHash = sha256(`${getSessionSecret()}:${token}`);
  const expiresAt = new Date(
    Date.now() + SESSION_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  const insertPayload: UserSessionInsertPayload = {
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt,
  };

  const supabaseAdmin = getSupabaseAdmin();

  const { error } = await supabaseAdmin
    .from("user_sessions")
    .insert(insertPayload as never);

  if (error) {
    throw error;
  }

  const cookieStore = await cookies();
  const secure = await resolveCookieSecureFlag();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: SESSION_EXPIRES_DAYS * 24 * 60 * 60,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    const tokenHash = sha256(`${getSessionSecret()}:${token}`);
    const supabaseAdmin = getSupabaseAdmin();

    await supabaseAdmin.from("user_sessions").delete().eq("token_hash", tokenHash);
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const tokenHash = sha256(`${getSessionSecret()}:${token}`);
  const supabaseAdmin = getSupabaseAdmin();

  const { data, error } = await supabaseAdmin
    .from("user_sessions")
    .select("user_id, users(id, phone)")
    .eq("token_hash", tokenHash)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle<CurrentUser>();

  if (error || !data) {
    return null;
  }

  return data;
}
