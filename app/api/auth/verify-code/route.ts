import { NextResponse } from "next/server";
import { ensureUserByPhone } from "@/lib/users";
import { ensureUserCredits } from "@/lib/credits";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { hashOtpCode, setSession } from "@/lib/auth";
import { normalizeChinaPhone } from "@/lib/phone";
import { consumeRateLimit, getRequestIp } from "@/lib/rate-limit";

const MAX_VERIFY_ATTEMPTS = 5;
const MAX_VERIFY_PER_IP_PER_10_MINUTES = 20;

type PhoneOtpRow = {
  phone: string;
  code_hash: string;
  expires_at: string;
  failed_attempts: number;
};

type PhoneOtpUpdatePayload = {
  failed_attempts?: number;
};

export async function POST(request: Request) {
  try {
    const ip = getRequestIp(request);
    const ipRateLimit = consumeRateLimit({
      key: `auth:verify-code:${ip}`,
      limit: MAX_VERIFY_PER_IP_PER_10_MINUTES,
      windowMs: 10 * 60 * 1000,
    });

    if (!ipRateLimit.allowed) {
      return NextResponse.json(
        { error: `尝试太频繁了，请 ${ipRateLimit.retryAfterSeconds} 秒后再试。` },
        { status: 429 },
      );
    }

    const { phone, code } = (await request.json()) as {
      phone?: string;
      code?: string;
    };

    const normalizedPhone = normalizeChinaPhone(phone ?? "");

    if (!normalizedPhone || !code?.trim()) {
      return NextResponse.json(
        { error: "请输入有效的手机号和验证码。" },
        { status: 400 },
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: otpRow, error: fetchError } = await supabaseAdmin
      .from("phone_otps")
      .select("phone, code_hash, expires_at, failed_attempts")
      .eq("phone", normalizedPhone)
      .maybeSingle<PhoneOtpRow>();

    if (fetchError) {
      throw fetchError;
    }

    if (!otpRow) {
      return NextResponse.json(
        { error: "验证码不存在，请重新获取。" },
        { status: 400 },
      );
    }

    if (new Date(otpRow.expires_at).getTime() < Date.now()) {
      return NextResponse.json(
        { error: "验证码已过期，请重新获取。" },
        { status: 400 },
      );
    }

    if (otpRow.failed_attempts >= MAX_VERIFY_ATTEMPTS) {
      return NextResponse.json(
        { error: "验证码尝试次数过多，请重新获取验证码。" },
        { status: 429 },
      );
    }

    const codeHash = await hashOtpCode(code.trim());

    if (codeHash !== otpRow.code_hash) {
      const updatePayload: PhoneOtpUpdatePayload = {
        failed_attempts: otpRow.failed_attempts + 1,
      };

      await supabaseAdmin
        .from("phone_otps")
        .update(updatePayload as never)
        .eq("phone", normalizedPhone);

      return NextResponse.json(
        { error: "验证码不正确，请重新输入。" },
        { status: 400 },
      );
    }

    const user = await ensureUserByPhone(normalizedPhone);

    if (user.status === "disabled") {
      return NextResponse.json(
        { error: "该账号已被停用，请联系管理员处理。" },
        { status: 403 },
      );
    }

    await ensureUserCredits(user.id);
    await setSession(user.id);

    await supabaseAdmin.from("phone_otps").delete().eq("phone", normalizedPhone);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("【验证码登录失败】:", error);

    const detail =
      error instanceof Error ? error.message : "未知错误";

    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? `登录失败：${detail}`
            : "登录失败，请稍后再试。",
      },
      { status: 500 },
    );
  }
}
