import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPaymentOrderById } from "@/lib/payments";

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
