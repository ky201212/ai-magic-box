import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { rejectWhenRateLimited } from "@/lib/request-security";
import { recordRateLimitSignal } from "@/lib/security-monitoring";
import {
  completeMockPayment,
  isMockPaymentEnabled,
  toPublicPaymentOrder,
} from "@/lib/payments";

export async function POST(request: Request) {
  try {
    if (!isMockPaymentEnabled()) {
      return NextResponse.json(
        { error: "Mock 支付未启用。" },
        { status: 404 },
      );
    }

    const currentUser = await getCurrentUser();

    if (!currentUser?.user_id) {
      return NextResponse.json({ error: "请先登录后再支付。" }, { status: 401 });
    }

    const rateLimitError = rejectWhenRateLimited({
      request,
      scope: "billing-mock-pay",
      userId: currentUser.user_id,
      limit: 6,
      windowMs: 5 * 60 * 1000,
      message: "支付确认请求过于频繁，请稍后再试。",
    });

    if (rateLimitError) {
      await recordRateLimitSignal({
        request,
        scope: "billing-mock-pay",
        userId: currentUser.user_id,
        message: "支付确认请求过于频繁，请稍后再试。",
      });
      return rateLimitError;
    }

    const body = (await request.json()) as {
      orderId?: string;
    };

    if (!body.orderId) {
      return NextResponse.json({ error: "缺少订单号。" }, { status: 400 });
    }

    const order = await completeMockPayment(body.orderId, currentUser.user_id);

    return NextResponse.json({
      success: true,
      order: toPublicPaymentOrder(order),
    });
  } catch (error) {
    console.error("【Mock 支付失败】:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "支付失败，请稍后再试。" },
      { status: 500 },
    );
  }
}
