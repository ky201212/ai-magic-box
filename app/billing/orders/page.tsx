import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listUserPaymentOrders } from "@/lib/payments";
import { marketingNavItems } from "@/app/_components/marketing-nav";

function formatMoney(price: number) {
  return `¥${(price / 100).toFixed(2)}`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "暂无";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatPaymentMethod(method: string) {
  if (method === "alipay_pc") {
    return "支付宝支付";
  }

  if (method === "wechat_pc") {
    return "微信支付";
  }

  return "Mock 支付";
}

function formatOrderStatus(status: string) {
  if (status === "pending") {
    return "待支付";
  }

  if (status === "paid") {
    return "已支付";
  }

  if (status === "cancelled") {
    return "已取消";
  }

  if (status === "refunded") {
    return "已退款";
  }

  return status;
}

function formatOrderSummary(order: {
  order_type: "coin_purchase" | "subscription";
  detail: Record<string, unknown>;
}) {
  if (order.order_type === "coin_purchase") {
    const coins = Number(order.detail.coins ?? 0);
    return coins > 0 ? `充值 ${coins} 魔法币` : "魔法币充值";
  }

  const planName = String(order.detail.planName ?? "").trim();
  const dailyCoins = Number(order.detail.dailyCoins ?? 0);
  const durationDays = Number(order.detail.durationDays ?? 0);

  if (planName) {
    return `${planName}${dailyCoins > 0 && durationDays > 0 ? ` · 每日 ${dailyCoins} 币 / ${durationDays} 天` : ""}`;
  }

  return "订阅购买";
}

export default async function BillingOrdersPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser?.user_id) {
    redirect("/login?redirect=/billing/orders");
  }

  const orders = await listUserPaymentOrders(currentUser.user_id, 100);

  return (
    <main className="min-h-screen bg-[#f7f8ff] text-[#17213f]">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_10%,rgba(117,159,255,0.34),transparent_26%),radial-gradient(circle_at_84%_14%,rgba(255,166,213,0.28),transparent_24%),linear-gradient(180deg,#ffffff_0%,#f8f9ff_44%,#eff5ff_100%)]" />
        <div className="home-grid pointer-events-none absolute inset-0 opacity-80" />

        <div className="relative mx-auto w-full max-w-[1280px] px-4 py-5 sm:px-6 sm:py-6 lg:px-10">
          <header className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-white/80 bg-white/72 px-4 py-3 shadow-[0_18px_50px_rgba(84,107,170,0.12)] backdrop-blur-2xl">
            <Link href="/" prefetch className="text-lg font-black text-[#17213f]">
              小红车魔法工坊
            </Link>

            <div className="flex flex-wrap items-center gap-5">
              {marketingNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch
                  className="hidden text-sm font-semibold text-[#6a7392] sm:inline-flex"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/billing"
                prefetch
                className="rounded-full border border-[#dce5ff] bg-white px-4 py-2 text-sm font-bold text-[#5c6688]"
              >
                返回充值中心
              </Link>
            </div>
          </header>

          <section className="pt-8">
            <div className="rounded-[30px] border border-white/80 bg-white/78 p-6 shadow-[0_18px_54px_rgba(91,111,185,0.1)] backdrop-blur-2xl sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-black tracking-[0.14em] text-[#7b88ac]">
                    订单记录
                  </p>
                  <h1 className="mt-3 text-[30px] font-black tracking-[-0.05em] text-[#151f3d] sm:text-[40px]">
                    全部充值与订阅订单
                  </h1>
                  <p className="mt-3 text-sm leading-7 text-[#687394]">
                    这里会保留你的充值、订阅和支付状态记录，未完成支付的订单会自动记为失败。
                  </p>
                </div>
                <div className="rounded-[18px] border border-[#e4eaff] bg-white px-4 py-3 text-sm font-semibold text-[#5f6b8e]">
                  共 {orders.length} 条
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {orders.length ? (
                orders.map((order) => (
                  <article
                    key={order.order_id}
                    className="rounded-[24px] border border-white/80 bg-white/82 p-5 shadow-[0_14px_40px_rgba(91,111,185,0.1)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="text-base font-black text-[#17213f]">
                            {order.order_type === "coin_purchase" ? "魔法币充值" : "订阅购买"}
                          </p>
                          <span className="rounded-full bg-[#f2f5ff] px-3 py-1 text-xs font-bold text-[#60709a]">
                            {formatOrderStatus(order.status)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-[#687394]">
                          {formatOrderSummary(order)}
                        </p>
                        <p className="mt-2 break-all text-sm text-[#687394]">
                          订单号：{order.order_id}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[#8c98b8]">
                          <span>支付方式：{formatPaymentMethod(order.payment_method)}</span>
                          <span>创建于 {formatDate(order.created_at)}</span>
                          <span>支付时间：{formatDate(order.paid_at)}</span>
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <p className="text-2xl font-black text-[#17213f]">
                          {formatMoney(order.amount)}
                        </p>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-[24px] border border-dashed border-[#dce5ff] bg-[#f8faff] px-5 py-10 text-center text-sm text-[#687394]">
                  你还没有订单记录。
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
