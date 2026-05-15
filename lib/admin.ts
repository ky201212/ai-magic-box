import "server-only";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { normalizeChinaPhone } from "@/lib/phone";
import { redirect } from "next/navigation";

export type AdminRole =
  | "super_admin"
  | "admin"
  | "editor"
  | "reviewer"
  | "operator";

export type AdminRecord = {
  user_id: string;
  role: AdminRole;
  is_active: boolean;
  display_name: string | null;
  permissions: string[] | null;
};

export type AdminContext = {
  userId: string;
  phone: string;
  role: AdminRole;
  displayName: string;
  permissions: string[];
};

type CurrentAdminRow = {
  user_id: string;
  role: AdminRole;
  is_active: boolean;
  display_name: string | null;
  permissions: string[] | null;
};

function parseBootstrapPhones() {
  const raw =
    process.env.ADMIN_BOOTSTRAP_PHONES ?? process.env.ADMIN_PHONE ?? "";

  return raw
    .split(",")
    .map((phone) => normalizeChinaPhone(phone.trim()))
    .filter((phone): phone is string => Boolean(phone));
}

export function isBootstrapAdminPhone(phone: string) {
  return parseBootstrapPhones().includes(normalizeChinaPhone(phone) ?? "");
}

async function ensureBootstrapAdmin(userId: string, phone: string) {
  const allowedPhones = parseBootstrapPhones();

  if (!allowedPhones.includes(phone)) {
    return null;
  }

  const supabaseAdmin = getSupabaseAdmin();

  const { data, error } = await supabaseAdmin
    .from("admin_users")
    .upsert(
      {
        user_id: userId,
        role: "super_admin",
        is_active: true,
        display_name: "创始管理员",
        permissions: [
          "site_settings",
          "ai_configs",
          "community_review",
          "user_management",
          "notifications",
        ],
      } as never,
      { onConflict: "user_id" },
    )
    .select("user_id, role, is_active, display_name, permissions")
    .single<CurrentAdminRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getAdminContext(): Promise<AdminContext | null> {
  const currentUser = await getCurrentUser();

  if (!currentUser?.user_id || !currentUser.users?.phone) {
    return null;
  }

  const supabaseAdmin = getSupabaseAdmin();
  const bootstrapAdminRecord = isBootstrapAdminPhone(currentUser.users.phone)
    ? await ensureBootstrapAdmin(currentUser.user_id, currentUser.users.phone)
    : null;

  const { data, error } = await supabaseAdmin
    .from("admin_users")
    .select("user_id, role, is_active, display_name, permissions")
    .eq("user_id", currentUser.user_id)
    .maybeSingle<CurrentAdminRow>();

  if (error) {
    throw error;
  }

  const adminRecord =
    bootstrapAdminRecord ??
    data ??
    (await ensureBootstrapAdmin(currentUser.user_id, currentUser.users.phone));

  if (!adminRecord?.is_active) {
    return null;
  }

  return {
    userId: currentUser.user_id,
    phone: currentUser.users.phone,
    role: adminRecord.role,
    displayName:
      adminRecord.display_name ||
      `管理员${currentUser.users.phone.slice(-4)}`,
    permissions: adminRecord.permissions ?? [],
  };
}

export function requireAiSecretManagerPermission(
  adminContext: AdminContext | null,
) {
  if (!adminContext) {
    return NextResponse.json({ error: "缺少管理员上下文。" }, { status: 403 });
  }

  if (
    adminContext.role === "super_admin" ||
    hasAdminPermission(adminContext, "site_settings")
  ) {
    return null;
  }

  return NextResponse.json(
    { error: "当前管理员账号没有管理或调用 AI 密钥的权限。" },
    { status: 403 },
  );
}

export async function requireAdminContext() {
  const adminContext = await getAdminContext();

  if (!adminContext) {
    return {
      error: NextResponse.json(
        { error: "你还没有后台访问权限，请联系超级管理员开通。" },
        { status: 403 },
      ),
      adminContext: null,
    };
  }

  return { error: null, adminContext };
}

export function hasAdminPermission(
  adminContext: AdminContext,
  permission: string,
) {
  if (adminContext.role === "super_admin") {
    return true;
  }

  return adminContext.permissions.includes(permission);
}

export function requirePermission(
  adminContext: AdminContext,
  permission: string,
) {
  if (hasAdminPermission(adminContext, permission)) {
    return null;
  }

  return NextResponse.json(
    { error: "当前管理员账号没有这一项操作权限。" },
    { status: 403 },
  );
}

export async function assertAdminPageAccess() {
  const adminContext = await getAdminContext();

  if (!adminContext) {
    return null;
  }

  return adminContext;
}

export async function assertAdminPagePermission(permission: string) {
  const adminContext = await assertAdminPageAccess();

  if (!adminContext) {
    redirect("/login?redirect=/admin");
  }

  if (!hasAdminPermission(adminContext, permission)) {
    redirect("/admin");
  }

  return adminContext;
}
