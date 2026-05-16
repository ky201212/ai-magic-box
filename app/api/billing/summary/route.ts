import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ensureUserCredits, listUserCreditLogs } from "@/lib/credits";
import {
  getMagicCoinRate,
  listSubscriptionPlans,
  listUserPaymentOrders,
  listUserSubscriptions,
} from "@/lib/payments";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.user_id) {
      return NextResponse.json({ error: "请先登录后再查看钱包。" }, { status: 401 });
    }

    const [credits, creditLogs, rate, plans, orders, subscriptions] =
      await Promise.all([
        ensureUserCredits(currentUser.user_id),
        listUserCreditLogs(currentUser.user_id, 12),
        getMagicCoinRate(),
        listSubscriptionPlans(),
        listUserPaymentOrders(currentUser.user_id),
        listUserSubscriptions(currentUser.user_id),
      ]);

    return NextResponse.json({
      credits,
      creditLogs,
      rate,
      plans,
      orders,
      subscriptions,
    });
  } catch (error) {
    console.error("【读取支付中心数据失败】:", error);
    return NextResponse.json(
      { error: "支付中心暂时读取失败，请稍后再试。" },
      { status: 500 },
    );
  }
}
