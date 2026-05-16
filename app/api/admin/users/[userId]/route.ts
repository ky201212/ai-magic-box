import { NextResponse } from "next/server";
import { getAdminUserById, updateAdminUser } from "@/lib/admin-data";
import { appendAdminAuditLog } from "@/lib/admin-audit";
import {
  requireAdminContext,
  requirePermission,
} from "@/lib/admin";
import { cancelUserSubscription } from "@/lib/payments";

type RouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
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
    const user = await getAdminUserById(userId);

    if (!user) {
      return NextResponse.json({ error: "没有找到这个用户。" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (requestError) {
    console.error("【后台用户详情读取失败】:", requestError);

    return NextResponse.json(
      { error: "用户详情读取失败，请稍后再试。" },
      { status: 500 },
    );
  }
}

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
      action?: "cancel_subscription";
      subscriptionId?: string;
      nickname?: string | null;
      status?: "active" | "disabled";
      notes?: string | null;
      credits?: number;
      creditLogNote?: string | null;
    };

    if (body.action === "cancel_subscription") {
      if (!body.subscriptionId) {
        return NextResponse.json({ error: "缺少要取消的订阅 ID。" }, { status: 400 });
      }

      const subscription = await cancelUserSubscription(body.subscriptionId, userId);

      await appendAdminAuditLog({
        actorUserId: adminContext.userId,
        actorDisplayName: adminContext.displayName,
        actorPhone: adminContext.phone,
        action: "user_subscription_cancel",
        targetType: "user_subscription",
        targetId: subscription.id,
        detail: {
          userId,
          planId: subscription.plan_id,
          planName: subscription.subscription_plans?.name ?? null,
        },
      });

      const user = await getAdminUserById(userId);

      return NextResponse.json({
        success: true,
        user,
      });
    }

    await updateAdminUser(userId, body);
    const user = await getAdminUserById(userId);

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (requestError) {
    console.error("【后台用户更新失败】:", requestError);

    return NextResponse.json(
      {
        error:
          requestError instanceof Error
            ? requestError.message
            : "用户信息更新失败，请稍后再试。",
      },
      { status: 500 },
    );
  }
}
