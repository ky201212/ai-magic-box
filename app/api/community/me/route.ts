import { NextResponse } from "next/server";
import {
  ensureUserProfile,
  getUserProfile,
  listUserCommunityPosts,
  updateUserProfileSettings,
} from "@/lib/community";
import {
  USER_CREDIT_LOG_VISIBLE_DAYS,
  ensureUserCredits,
  listUserCreditLogsByWindow,
} from "@/lib/credits";
import { getCurrentUser } from "@/lib/auth";
import {
  listUserPaymentOrders,
  listUserSubscriptions,
  toPublicPaymentOrder,
} from "@/lib/payments";
import { getDefaultProfileAvatarPreset } from "@/lib/profile-avatar-presets";

const CHINA_MAINLAND_PHONE_PATTERN = /^1[3-9]\d{9}$/;

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
      listUserCreditLogsByWindow(currentUser.user_id, {
        limit: 500,
        sinceDays: USER_CREDIT_LOG_VISIBLE_DAYS,
      }).catch((error) => {
        console.error("【个人主页读取魔法币账本失败，已回退为空】:", error);
        return [];
      }),
      listUserPaymentOrders(currentUser.user_id, 6).catch((error) => {
        console.error("【个人主页读取订单失败，已回退为空】:", error);
        return [];
      }),
      listUserSubscriptions(currentUser.user_id).catch((error) => {
        console.error("【个人主页读取订阅失败，已回退为空】:", error);
        return [];
      }),
    ]);

    return NextResponse.json({
      profile,
      credits,
      creditLogs,
      posts,
      orders: orders.map(toPublicPaymentOrder),
      subscriptions,
      phone: currentUser.users.phone,
      avatarUrl: currentUser.users.avatar_url ?? getDefaultProfileAvatarPreset().url,
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

export async function PATCH(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.user_id || !currentUser.users?.phone) {
      return NextResponse.json({ error: "请先登录后再修改个人资料。" }, { status: 401 });
    }

    const body = (await request.json()) as {
      displayName?: string;
      phone?: string;
      bio?: string | null;
      avatarUrl?: string;
      avatarColor?: string;
    };

    const displayName = body.displayName?.trim() ?? "";
    const phone = body.phone?.trim() ?? "";
    const bio = body.bio?.trim() ?? "";
    const avatarUrl = body.avatarUrl?.trim() ?? "";
    const avatarColor = body.avatarColor?.trim() ?? "";

    if (displayName.length < 2 || displayName.length > 24) {
      return NextResponse.json(
        { error: "用户名需要 2 到 24 个字。" },
        { status: 400 },
      );
    }

    if (!CHINA_MAINLAND_PHONE_PATTERN.test(phone)) {
      return NextResponse.json(
        { error: "请输入有效的中国大陆手机号。" },
        { status: 400 },
      );
    }

    if (bio.length > 80) {
      return NextResponse.json(
        { error: "个人简介最多 80 个字。" },
        { status: 400 },
      );
    }

    if (!avatarUrl) {
      return NextResponse.json({ error: "请先选择一个头像。" }, { status: 400 });
    }

    const result = await updateUserProfileSettings({
      userId: currentUser.user_id,
      currentPhone: currentUser.users.phone,
      nextPhone: phone,
      displayName,
      bio,
      avatarUrl,
      avatarColor,
    });

    return NextResponse.json({
      success: true,
      profile: result.profile,
      phone: result.phone,
      avatarUrl: result.avatarUrl,
    });
  } catch (error) {
    console.error("【更新个人资料失败】:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "个人资料保存失败，请稍后再试。",
      },
      { status: 500 },
    );
  }
}
