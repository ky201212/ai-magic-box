import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listUserNotifications } from "@/lib/admin-data";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.user_id) {
      return NextResponse.json({ notifications: [] });
    }

    const notifications = await listUserNotifications(currentUser.user_id);
    return NextResponse.json({ notifications });
  } catch (requestError) {
    console.error("【前台通知读取失败】:", requestError);
    return NextResponse.json(
      { error: "通知暂时读取失败，请稍后再试。" },
      { status: 500 },
    );
  }
}
