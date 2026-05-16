import { NextResponse } from "next/server";
import { grantDailySubscriptionCoins } from "@/lib/payments";

export async function POST(request: Request) {
  try {
    const secret = request.headers.get("x-cron-secret");

    if (
      process.env.CRON_SECRET &&
      secret !== process.env.CRON_SECRET
    ) {
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
