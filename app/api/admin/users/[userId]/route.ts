import { NextResponse } from "next/server";
import { getAdminUserById, updateAdminUser } from "@/lib/admin-data";
import {
  requireAdminContext,
  requirePermission,
} from "@/lib/admin";

type RouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { error, adminContext } = await requireAdminContext();

  if (error || !adminContext) {
    return error;
  }

  const permissionError = requirePermission(adminContext, "user_management");

  if (permissionError) {
    return permissionError;
  }

  try {
    const { userId } = await context.params;
    const body = (await request.json()) as {
      nickname?: string | null;
      status?: "active" | "disabled";
      notes?: string | null;
      credits?: number;
      creditLogNote?: string | null;
    };

    await updateAdminUser(userId, body);
    const user = await getAdminUserById(userId);

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (requestError) {
    console.error("【后台用户更新失败】:", requestError);

    return NextResponse.json(
      { error: "用户信息更新失败，请稍后再试。" },
      { status: 500 },
    );
  }
}
