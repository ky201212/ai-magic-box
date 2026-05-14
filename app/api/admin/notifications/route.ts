import { NextResponse } from "next/server";
import {
  createNotificationDraft,
  listNotifications,
  sendNotification,
} from "@/lib/admin-data";
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
      const notification = await sendNotification(body.notification_id);
      return NextResponse.json({ success: true, notification });
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

    if (body.action === "send") {
      const sentNotification = await sendNotification(notification.id);
      return NextResponse.json({ success: true, notification: sentNotification });
    }

    return NextResponse.json({ success: true, notification });
  } catch (requestError) {
    console.error("【后台通知操作失败】:", requestError);

    return NextResponse.json(
      { error: "通知操作失败，请稍后再试。" },
      { status: 500 },
    );
  }
}
