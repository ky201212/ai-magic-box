import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  USER_CREDIT_LOG_VISIBLE_DAYS,
  ensureUserCredits,
  listUserCreditLogsByWindow,
} from "@/lib/credits";
import {
  getMagicCoinRate,
  listCoinRechargePackages,
  listSubscriptionPlans,
  listUserPaymentOrders,
  listUserSubscriptions,
} from "@/lib/payments";
import { BillingClient, type BillingPayload } from "./billing-client";

export default async function BillingPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser?.user_id) {
    redirect("/login?redirect=/billing");
  }

  const [credits, creditLogs, rate, packages, plans, orders, subscriptions] = await Promise.all([
    ensureUserCredits(currentUser.user_id),
    listUserCreditLogsByWindow(currentUser.user_id, {
      limit: 120,
      sinceDays: USER_CREDIT_LOG_VISIBLE_DAYS,
    }),
    getMagicCoinRate(),
    listCoinRechargePackages(),
    listSubscriptionPlans(),
    listUserPaymentOrders(currentUser.user_id),
    listUserSubscriptions(currentUser.user_id),
  ]);

  void creditLogs;

  const initialData: BillingPayload = {
    credits,
    rate,
    packages,
    plans,
    orders,
    subscriptions,
  };

  return <BillingClient initialData={initialData} />;
}
