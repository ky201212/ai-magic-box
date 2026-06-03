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
import { getCurrentUser, hashOtpCode } from "@/lib/auth";
import {
  listUserPaymentOrders,
  listUserSubscriptions,
  toPublicPaymentOrder,
} from "@/lib/payments";
import { getDefaultProfileAvatarPreset } from "@/lib/profile-avatar-presets";
import {
  CHINA_MAINLAND_PHONE_PATTERN,
  validateProfileDisplayName,
} from "@/lib/profile-settings-validation";
import { normalizeChinaPhone } from "@/lib/phone";
import { consumeRateLimit, getRequestIp } from "@/lib/rate-limit";
import { getSmsAuthRiskControlSetting } from "@/lib/sms-auth-security";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type PhoneOtpRow = {
  phone: string;
  code_hash: string;
  expires_at: string;
  failed_attempts: number;
};

type PhoneOtpUpdatePayload = {
  failed_attempts?: number;
};

async function verifyPhoneChangeCode(input: {
  request: Request;
  phone: string;
  code: string;
}) {
  const ip = getRequestIp(input.request);
  const settings = await getSmsAuthRiskControlSetting();
  const ipRateLimit = consumeRateLimit({
    key: `profile:phone-code:verify:${ip}`,
    limit: settings.verifyPerIpLimit,
    windowMs: settings.verifyPerIpWindowSeconds * 1000,
  });

  if (!ipRateLimit.allowed) {
    return {
      ok: false as const,
      status: 429,
      error: `尝试太频繁了，请 ${ipRateLimit.retryAfterSeconds} 秒后再试。`,
    };
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data: otpRow, error: fetchError } = await supabaseAdmin
    .from("phone_otps")
    .select("phone, code_hash, expires_at, failed_attempts")
    .eq("phone", input.phone)
    .maybeSingle<PhoneOtpRow>();

  if (fetchError) {
    throw fetchError;
  }

  if (!otpRow) {
    return {
      ok: false as const,
      status: 400,
      error: "验证码不存在，请重新获取。",
    };
  }

  if (new Date(otpRow.expires_at).getTime() < Date.now()) {
    return {
      ok: false as const,
      status: 400,
      error: "验证码已过期，请重新获取。",
    };
  }

  if (otpRow.failed_attempts >= settings.maxVerifyAttemptsPerCode) {
    return {
      ok: false as const,
      status: 429,
      error: "验证码尝试次数过多，请重新获取验证码。",
    };
  }

  const codeHash = await hashOtpCode(input.code.trim());

  if (codeHash !== otpRow.code_hash) {
    const updatePayload: PhoneOtpUpdatePayload = {
      failed_attempts: otpRow.failed_attempts + 1,
    };

    await supabaseAdmin
      .from("phone_otps")
      .update(updatePayload as never)
      .eq("phone", input.phone);

    return {
      ok: false as const,
      status: 400,
      error: "验证码不正确，请重新输入。",
    };
  }

  return { ok: true as const };
}

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
      phoneCode?: string;
    };

    const displayNameValidation = validateProfileDisplayName(body.displayName ?? "");
    const phone = normalizeChinaPhone(body.phone ?? "") ?? "";
    const bio = body.bio?.trim() ?? "";
    const avatarUrl = body.avatarUrl?.trim() ?? "";
    const avatarColor = body.avatarColor?.trim() ?? "";
    const phoneCode = body.phoneCode?.trim() ?? "";

    if (!displayNameValidation.ok) {
      return NextResponse.json(
        { error: displayNameValidation.error },
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

    const isPhoneChanged = phone !== currentUser.users.phone;

    if (isPhoneChanged) {
      if (!phoneCode) {
        return NextResponse.json(
          { error: "更换手机号前，请先输入短信验证码。" },
          { status: 400 },
        );
      }

      const verification = await verifyPhoneChangeCode({
        request,
        phone,
        code: phoneCode,
      });

      if (!verification.ok) {
        return NextResponse.json(
          { error: verification.error },
          { status: verification.status },
        );
      }
    }

    const result = await updateUserProfileSettings({
      userId: currentUser.user_id,
      currentPhone: currentUser.users.phone,
      nextPhone: phone,
      displayName: displayNameValidation.value,
      bio,
      avatarUrl,
      avatarColor,
    });

    if (isPhoneChanged) {
      await getSupabaseAdmin().from("phone_otps").delete().eq("phone", phone);
    }

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
