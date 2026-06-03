import { NextResponse } from "next/server";
import { generateOtpCode, getCurrentUser, hashOtpCode } from "@/lib/auth";
import { sendVerificationSms } from "@/lib/aliyun-sms";
import { normalizeChinaPhone } from "@/lib/phone";
import { consumeRateLimit, getRequestIp } from "@/lib/rate-limit";
import { getSmsAuthRiskControlSetting } from "@/lib/sms-auth-security";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type PhoneOtpRow = {
  phone: string;
  expires_at: string;
  send_count: number;
  first_sent_at: string;
  last_sent_at: string;
  failed_attempts: number;
};

type PhoneOtpWritePayload = {
  phone?: string;
  code_hash?: string;
  expires_at?: string;
  send_count?: number;
  first_sent_at?: string;
  last_sent_at?: string;
  failed_attempts?: number;
};

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.user_id || !currentUser.users?.phone) {
      return NextResponse.json({ error: "请先登录后再更换手机号。" }, { status: 401 });
    }

    const { phone } = (await request.json()) as { phone?: string };
    const normalizedPhone = normalizeChinaPhone(phone ?? "");

    if (!normalizedPhone) {
      return NextResponse.json(
        { error: "请输入有效的中国大陆手机号。" },
        { status: 400 },
      );
    }

    if (normalizedPhone === currentUser.users.phone) {
      return NextResponse.json(
        { error: "新手机号和当前手机号一样，不需要发送验证码。" },
        { status: 400 },
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: existingUser, error: userFetchError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("phone", normalizedPhone)
      .maybeSingle<{ id: string }>();

    if (userFetchError) {
      throw userFetchError;
    }

    if (existingUser && existingUser.id !== currentUser.user_id) {
      return NextResponse.json(
        { error: "这个手机号已经绑定其他账号了，请换一个手机号。" },
        { status: 409 },
      );
    }

    const ip = getRequestIp(request);
    const settings = await getSmsAuthRiskControlSetting();
    const ipRateLimit = consumeRateLimit({
      key: `profile:phone-code:send:${ip}`,
      limit: settings.sendPerIpLimit,
      windowMs: settings.sendPerIpWindowSeconds * 1000,
    });

    if (!ipRateLimit.allowed) {
      return NextResponse.json(
        { error: `请求太频繁了，请 ${ipRateLimit.retryAfterSeconds} 秒后再试。` },
        { status: 429 },
      );
    }

    const dailyPhoneRateLimit = consumeRateLimit({
      key: `auth:send-code:phone-day:${normalizedPhone}`,
      limit: settings.maxSendsPerPhonePerDay,
      windowMs: 24 * 60 * 60 * 1000,
    });

    if (!dailyPhoneRateLimit.allowed) {
      return NextResponse.json(
        { error: "该手机号今天获取验证码次数过多，请明天再试。" },
        { status: 429 },
      );
    }

    const now = Date.now();
    const { data: existingOtp, error: otpFetchError } = await supabaseAdmin
      .from("phone_otps")
      .select(
        "phone, expires_at, send_count, first_sent_at, last_sent_at, failed_attempts",
      )
      .eq("phone", normalizedPhone)
      .maybeSingle<PhoneOtpRow>();

    if (otpFetchError) {
      throw otpFetchError;
    }

    if (existingOtp) {
      const lastSentAt = new Date(existingOtp.last_sent_at).getTime();
      const firstSentAt = new Date(existingOtp.first_sent_at).getTime();
      const cooldownRemaining =
        settings.resendCooldownSeconds - Math.floor((now - lastSentAt) / 1000);

      if (cooldownRemaining > 0) {
        return NextResponse.json(
          { error: `发送太频繁了，请 ${cooldownRemaining} 秒后再试。` },
          { status: 429 },
        );
      }

      const isWithinOneHour = now - firstSentAt < 60 * 60 * 1000;

      if (
        isWithinOneHour &&
        existingOtp.send_count >= settings.maxSendsPerPhonePerHour
      ) {
        return NextResponse.json(
          { error: "该手机号发送次数过多，请 1 小时后再试。" },
          { status: 429 },
        );
      }
    }

    const code = generateOtpCode();
    const codeHash = await hashOtpCode(code);
    const expiresAt = new Date(
      now + settings.otpExpiresMinutes * 60 * 1000,
    ).toISOString();

    await sendVerificationSms(normalizedPhone, code, settings.otpExpiresMinutes);

    if (!existingOtp) {
      const nowIso = new Date(now).toISOString();
      const insertPayload: PhoneOtpWritePayload = {
        phone: normalizedPhone,
        code_hash: codeHash,
        expires_at: expiresAt,
        send_count: 1,
        first_sent_at: nowIso,
        last_sent_at: nowIso,
        failed_attempts: 0,
      };

      const { error: insertError } = await supabaseAdmin
        .from("phone_otps")
        .insert(insertPayload as never);

      if (insertError) {
        throw insertError;
      }
    } else {
      const firstSentAt = new Date(existingOtp.first_sent_at).getTime();
      const isWithinOneHour = now - firstSentAt < 60 * 60 * 1000;
      const nowIso = new Date(now).toISOString();
      const updatePayload: PhoneOtpWritePayload = {
        code_hash: codeHash,
        expires_at: expiresAt,
        last_sent_at: nowIso,
        first_sent_at: isWithinOneHour ? existingOtp.first_sent_at : nowIso,
        send_count: isWithinOneHour ? existingOtp.send_count + 1 : 1,
        failed_attempts: 0,
      };

      const { error: updateError } = await supabaseAdmin
        .from("phone_otps")
        .update(updatePayload as never)
        .eq("phone", normalizedPhone);

      if (updateError) {
        throw updateError;
      }
    }

    return NextResponse.json({ message: "验证码已发送，请注意查收短信。" });
  } catch (error) {
    console.error("【更换手机号验证码发送失败】:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "验证码发送失败，请稍后再试。",
      },
      { status: 500 },
    );
  }
}
