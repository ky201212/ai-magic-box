import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  listUserNotifications,
  markUserNotificationsRead,
} from "@/lib/admin-data";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.user_id) {
      return NextResponse.json({ notifications: [], unreadCount: 0 });
    }

    const result = await listUserNotifications(currentUser.user_id);
    return NextResponse.json(result);
  } catch (requestError) {
    console.error("【前台通知读取失败】:", requestError);
    return NextResponse.json(
      { error: "通知暂时读取失败，请稍后再试。" },
      { status: 500 },
    );
  }
}

export async function PATCH() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.user_id) {
      return NextResponse.json({ success: true, updatedCount: 0 });
    }

    const result = await markUserNotificationsRead(currentUser.user_id);
    return NextResponse.json({ success: true, ...result });
  } catch (requestError) {
    console.error("【前台通知已读状态更新失败】:", requestError);
    return NextResponse.json(
      { error: "通知状态更新失败，请稍后再试。" },
      { status: 500 },
    );
  }
}
