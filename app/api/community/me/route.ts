import { NextResponse } from "next/server";
import {
  ensureUserProfile,
  getUserProfile,
  listUserCommunityPosts,
} from "@/lib/community";
import { ensureUserCredits, listUserCreditLogs } from "@/lib/credits";
import { getCurrentUser } from "@/lib/auth";
import { listUserPaymentOrders, listUserSubscriptions } from "@/lib/payments";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.user_id || !currentUser.users?.phone) {
      return NextResponse.json({ error: "请先登录后再查看个人主页。" }, { status: 401 });
    }

    await ensureUserProfile(currentUser.user_id, currentUser.users.phone);

    const [profile, credits, posts, creditLogs, orders, subscriptions] = await Promise.all([
      getUserProfile(currentUser.user_id),
      ensureUserCredits(currentUser.user_id),
      listUserCommunityPosts(currentUser.user_id),
      listUserCreditLogs(currentUser.user_id),
      listUserPaymentOrders(currentUser.user_id, 6),
      listUserSubscriptions(currentUser.user_id),
    ]);

    return NextResponse.json({
      profile,
      credits,
      creditLogs,
      posts,
      orders,
      subscriptions,
      phone: currentUser.users.phone,
    });
  } catch (error) {
    console.error("【读取个人主页数据失败】:", error);
    return NextResponse.json(
      { error: "个人主页暂时读取失败，请稍后再试。" },
      { status: 500 },
    );
  }
}

export async function HEAD() {
  return new Response(null, { status: 405 });
}
