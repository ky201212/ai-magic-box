import { NextResponse } from "next/server";
import {
  createNotificationDraft,
  listNotifications,
  sendNotification,
} from "@/lib/admin-data";
import { appendAdminAuditLog } from "@/lib/admin-audit";
import {
  requireAdminContext,
  requirePermission,
} from "@/lib/admin";

export async function GET() {
  const { error, adminContext } = await requireAdminContext();

  if (error || !adminContext) {
    return error;
  }

  const permissionError = requirePermission(adminContext, "notifications");

  if (permissionError) {
    return permissionError;
  }

  try {
    const notifications = await listNotifications();
    return NextResponse.json({ notifications });
  } catch (requestError) {
    console.error("【后台通知列表读取失败】:", requestError);

    return NextResponse.json(
      { error: "通知列表读取失败，请稍后再试。" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const { error, adminContext } = await requireAdminContext();

  if (error || !adminContext) {
    return error;
  }

  const permissionError = requirePermission(adminContext, "notifications");

  if (permissionError) {
    return permissionError;
  }

  try {
    const body = (await request.json()) as {
      title?: string;
      body?: string;
      target_type?: "all" | "users" | "admins";
      target_user_ids?: string[];
      action?: "draft" | "send";
      notification_id?: string;
    };

    if (body.action === "send" && body.notification_id) {
      const result = await sendNotification(body.notification_id);
      await appendAdminAuditLog({
        actorUserId: adminContext.userId,
        actorDisplayName: adminContext.displayName,
        actorPhone: adminContext.phone,
        action: "notification_send",
        targetType: "notification",
        targetId: body.notification_id,
        detail: {
          recipientCount: result.recipientCount,
        },
      });
      return NextResponse.json({
        success: true,
        notification: result.notification,
        recipientCount: result.recipientCount,
        message:
          result.recipientCount > 0
            ? `通知已发送给 ${result.recipientCount} 位目标用户。`
            : "通知已发布，但当前没有匹配到可接收的目标用户。",
      });
    }

    if (!body.title?.trim() || !body.body?.trim()) {
      return NextResponse.json(
        { error: "通知标题和内容都不能为空。" },
        { status: 400 },
      );
    }

    const notification = await createNotificationDraft({
      title: body.title.trim(),
      body: body.body.trim(),
      target_type: body.target_type ?? "all",
      target_user_ids: body.target_user_ids ?? [],
      created_by: adminContext.userId,
    });

    await appendAdminAuditLog({
      actorUserId: adminContext.userId,
      actorDisplayName: adminContext.displayName,
      actorPhone: adminContext.phone,
      action: body.action === "send" ? "notification_create_and_send" : "notification_create_draft",
      targetType: "notification",
      targetId: notification.id,
      detail: {
        targetType: body.target_type ?? "all",
        targetUserCount: (body.target_user_ids ?? []).length,
      },
    });

    if (body.action === "send") {
      const result = await sendNotification(notification.id);
      await appendAdminAuditLog({
        actorUserId: adminContext.userId,
        actorDisplayName: adminContext.displayName,
        actorPhone: adminContext.phone,
        action: "notification_send",
        targetType: "notification",
        targetId: notification.id,
        detail: {
          recipientCount: result.recipientCount,
        },
      });
      return NextResponse.json({
        success: true,
        notification: result.notification,
        recipientCount: result.recipientCount,
        message:
          result.recipientCount > 0
            ? `通知已发送给 ${result.recipientCount} 位目标用户。`
            : "通知已发布，但当前没有匹配到可接收的目标用户。",
      });
    }

    return NextResponse.json({
      success: true,
      notification,
      message: "通知草稿已保存。",
    });
  } catch (requestError) {
    console.error("【后台通知操作失败】:", requestError);

    const errorMessage =
      requestError instanceof Error
        ? requestError.message
        : "通知操作失败，请稍后再试。";

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 },
    );
  }
}
