import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { appendSecurityEventLog } from "@/lib/security-audit";
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
      packageId?: string;
      planId?: string;
      paymentMethod?: PaymentMethod;
    };

    if (body.orderType === "coin_purchase" && body.packageId) {
      const result = await createCoinPurchaseOrder({
        userId: currentUser.user_id,
        packageId: body.packageId,
        paymentMethod: body.paymentMethod ?? "mock",
      });

      await appendSecurityEventLog({
        request,
        userId: currentUser.user_id,
        eventType: "payment",
        action: "create_coin_purchase_order",
        accountIdentifier: currentUser.user_id,
        detail: {
          orderId: result.order.order_id,
          packageId: body.packageId,
          paymentMethod: body.paymentMethod ?? "mock",
        },
      }).catch((auditError) => {
        console.error("【创建充值订单安全日志写入失败】:", auditError);
      });

      return NextResponse.json(result);
    }

    if (body.orderType === "subscription" && body.planId) {
      const result = await createSubscriptionOrder({
        userId: currentUser.user_id,
        planId: body.planId,
        paymentMethod: body.paymentMethod ?? "mock",
      });

      await appendSecurityEventLog({
        request,
        userId: currentUser.user_id,
        eventType: "payment",
        action: "create_subscription_order",
        accountIdentifier: currentUser.user_id,
        detail: {
          orderId: result.order.order_id,
          planId: body.planId,
          paymentMethod: body.paymentMethod ?? "mock",
        },
      }).catch((auditError) => {
        console.error("【创建订阅订单安全日志写入失败】:", auditError);
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
