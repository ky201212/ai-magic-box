import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  createCoinPurchaseOrder,
  createSubscriptionOrder,
  type PaymentMethod,
} from "@/lib/payments";

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.user_id) {
      return NextResponse.json({ error: "请先登录后再创建订单。" }, { status: 401 });
    }

    const body = (await request.json()) as {
      orderType?: "coin_purchase" | "subscription";
      coins?: number;
      planId?: string;
      paymentMethod?: PaymentMethod;
    };

    if (body.orderType === "coin_purchase") {
      const result = await createCoinPurchaseOrder({
        userId: currentUser.user_id,
        coins: Number(body.coins ?? 0),
        paymentMethod: body.paymentMethod ?? "mock",
      });

      return NextResponse.json(result);
    }

    if (body.orderType === "subscription" && body.planId) {
      const result = await createSubscriptionOrder({
        userId: currentUser.user_id,
        planId: body.planId,
        paymentMethod: body.paymentMethod ?? "mock",
      });

      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: "订单类型或购买内容不正确。" },
      { status: 400 },
    );
  } catch (error) {
    console.error("【创建订单失败】:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "订单创建失败，请稍后再试。" },
      { status: 500 },
    );
  }
}
