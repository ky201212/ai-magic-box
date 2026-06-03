import { NextResponse } from "next/server";
import { grantDailySubscriptionCoins } from "@/lib/payments";

export async function POST(request: Request) {
  try {
    const secret = request.headers.get("x-cron-secret");
    const expectedSecret = process.env.CRON_SECRET?.trim();

    if (!expectedSecret) {
      console.error("【订阅每日发币失败】: 缺少 CRON_SECRET 配置。");
      return NextResponse.json(
        { error: "定时任务未完成安全配置。" },
        { status: 503 },
      );
    }

    if (secret !== expectedSecret) {
      return NextResponse.json({ error: "定时任务密钥不正确。" }, { status: 403 });
    }

    const result = await grantDailySubscriptionCoins();

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("【订阅每日发币失败】:", error);
    return NextResponse.json(
      { error: "订阅每日发币失败，请稍后再试。" },
      { status: 500 },
    );
  }
}
