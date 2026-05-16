import { assertAdminPagePermission } from "@/lib/admin";
import { AdminPageHeader } from "../_components/admin-page-header";
import { PaymentsConsole } from "../_components/payments-console";
import {
  getMagicCoinRate,
  listActivationCodeBatches,
  listAdminPaymentOrders,
  listSubscriptionPlans,
} from "@/lib/payments";

export default async function AdminPaymentsPage() {
  await assertAdminPagePermission("site_settings");

  const [rate, plans, orders, batches] = await Promise.all([
    getMagicCoinRate(),
    listSubscriptionPlans({ includeInactive: true }),
    listAdminPaymentOrders(),
    listActivationCodeBatches(),
  ]);

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="支付与订阅"
        title="支付中心与激活码控制台"
        description="这里统一管理魔法币汇率、订阅套餐、激活码批次和订单记录。当前先走 Mock 支付链路，后续可以无缝替换到微信或支付宝。"
      />
      <PaymentsConsole
        initialRate={rate}
        initialPlans={plans}
        initialOrders={orders}
        initialBatches={batches}
      />
    </div>
  );
}
