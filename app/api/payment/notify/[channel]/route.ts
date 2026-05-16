import { NextResponse } from "next/server";
import { handlePaymentNotification, type PaymentMethod } from "@/lib/payments";

type RouteContext = {
  params: Promise<{
    channel: string;
  }>;
};

function isSupportedChannel(channel: string): channel is PaymentMethod {
  return channel === "mock" || channel === "wechat_pc" || channel === "alipay_pc";
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { channel } = await context.params;

    if (!isSupportedChannel(channel)) {
      return NextResponse.json({ error: "不支持的支付渠道。" }, { status: 400 });
    }

    const order = await handlePaymentNotification(channel, request);
    if (channel === "alipay_pc") {
      return new Response("success", {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    }

    return NextResponse.json({
      success: true,
      orderId: order.order_id,
      status: order.status,
    });
  } catch (error) {
    console.error("【支付通知处理失败】:", error);

    const { channel } = await context.params;

    if (channel === "alipay_pc") {
      return new Response("failure", {
        status: 500,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "支付通知处理失败，请稍后再试。",
      },
      { status: 500 },
    );
  }
}
