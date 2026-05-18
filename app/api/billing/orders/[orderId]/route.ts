import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { cancelPaymentOrder, getPaymentOrderById } from "@/lib/payments";

type RouteContext = {
  params: Promise<{
    orderId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.user_id) {
      return NextResponse.json({ error: "请先登录后再查看订单。" }, { status: 401 });
    }

    const { orderId } = await context.params;
    const order = await getPaymentOrderById(orderId);

    if (!order || order.user_id !== currentUser.user_id) {
      return NextResponse.json({ error: "没有找到这个订单。" }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error("【读取订单详情失败】:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "读取订单失败，请稍后再试。" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.user_id) {
      return NextResponse.json({ error: "请先登录后再操作订单。" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      action?: string;
    };

    if (body.action !== "cancel") {
      return NextResponse.json({ error: "不支持的订单操作。" }, { status: 400 });
    }

    const { orderId } = await context.params;
    const order = await cancelPaymentOrder(orderId, currentUser.user_id);

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("【更新订单状态失败】:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "订单状态更新失败，请稍后再试。" },
      { status: 500 },
    );
  }
}
