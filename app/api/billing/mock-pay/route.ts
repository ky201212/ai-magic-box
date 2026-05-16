import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { completeMockPayment } from "@/lib/payments";

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.user_id) {
      return NextResponse.json({ error: "请先登录后再支付。" }, { status: 401 });
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
      order,
    });
  } catch (error) {
    console.error("【Mock 支付失败】:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "支付失败，请稍后再试。" },
      { status: 500 },
    );
  }
}
