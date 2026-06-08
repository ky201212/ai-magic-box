import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { redeemActivationCode } from "@/lib/payments";
import { rejectWhenRateLimited } from "@/lib/request-security";
import { recordRateLimitSignal } from "@/lib/security-monitoring";

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.user_id) {
      return NextResponse.json({ error: "请先登录后再兑换激活码。" }, { status: 401 });
    }

    const rateLimitError = await rejectWhenRateLimited({
      request,
      scope: "billing-redeem",
      userId: currentUser.user_id,
      limit: 5,
      windowMs: 60 * 1000,
      message: "激活码兑换太频繁了，请稍后再试。",
    });

    if (rateLimitError) {
      await recordRateLimitSignal({
        request,
        scope: "billing-redeem",
        userId: currentUser.user_id,
        message: "激活码兑换太频繁了，请稍后再试。",
      });
      return rateLimitError;
    }

    const body = (await request.json()) as {
      code?: string;
    };

    if (!body.code?.trim()) {
      return NextResponse.json({ error: "请输入激活码。" }, { status: 400 });
    }

    const result = await redeemActivationCode(currentUser.user_id, body.code);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("【激活码兑换失败】:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "激活码兑换失败，请稍后再试。" },
      { status: 400 },
    );
  }
}
