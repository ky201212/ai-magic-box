import { NextResponse } from "next/server";
import { listAdminUsers } from "@/lib/admin-data";
import {
  requireAdminContext,
  requirePermission,
} from "@/lib/admin";

export async function GET() {
  const { error, adminContext } = await requireAdminContext();

  if (error || !adminContext) {
    return error;
  }

  const permissionError = requirePermission(adminContext, "user_management");

  if (permissionError) {
    return permissionError;
  }

  try {
    const users = await listAdminUsers();
    return NextResponse.json({ users });
  } catch (requestError) {
    console.error("【后台用户列表读取失败】:", requestError);

    return NextResponse.json(
      { error: "用户列表读取失败，请稍后再试。" },
      { status: 500 },
    );
  }
}
