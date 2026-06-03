import { NextResponse } from "next/server";
import {
  handlePaymentNotification,
  isMockPaymentEnabled,
  type PaymentMethod,
} from "@/lib/payments";
import { recordSecuritySignal } from "@/lib/security-monitoring";

type RouteContext = {
  params: Promise<{
    channel: string;
  }>;
};

function isSupportedChannel(channel: string): channel is PaymentMethod {
  return channel === "alipay_pc" || (channel === "mock" && isMockPaymentEnabled());
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
    const errorMessage =
      error instanceof Error ? error.message : "支付通知处理失败，请稍后再试。";
    const isSignatureFailure = /验签|签名|signature|sign/i.test(errorMessage);

    await recordSecuritySignal({
      request,
      eventType: isSignatureFailure
        ? "payment_callback_signature_failure"
        : "payment_callback_rejected",
      action: isSignatureFailure
        ? "payment_notify_verify_signature"
        : "payment_notify_rejected",
      outcome: "blocked",
      detail: {
        channel,
        message: errorMessage,
      },
      alert: {
        key: `${isSignatureFailure ? "payment-signature" : "payment-callback"}:${channel}`,
        title: isSignatureFailure ? "检测到支付回调验签失败" : "检测到支付回调异常",
        body: `支付回调 ${channel} 通道出现${isSignatureFailure ? "验签失败" : "异常拒绝"}，请尽快核查来源请求。`,
      },
    });

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
        error: errorMessage,
      },
      { status: 500 },
    );
  }
}
