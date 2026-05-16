"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { marketingNavItems } from "../_components/marketing-nav";

type PaymentMethod = "alipay_pc" | "wechat_pc";
type SaveState = "idle" | "saving" | "success" | "error";

export type BillingPayload = {
  credits: {
    credits: number;
  };
  rate: {
    coin_per_yuan: number;
  };
  plans: Array<{
    id: string;
    name: string;
    daily_coins: number;
    duration_days: number;
    refresh_time: string;
    price: number;
    is_active: boolean;
  }>;
  orders: Array<{
    order_id: string;
    order_type: "coin_purchase" | "subscription";
    amount: number;
    status: "pending" | "paid" | "cancelled" | "refunded";
    payment_method: string;
    detail: Record<string, unknown>;
    paid_at: string | null;
    created_at: string;
  }>;
  subscriptions: Array<{
    id: string;
    status: "active" | "expired" | "cancelled";
    start_date: string;
    end_date: string;
    last_grant_date: string | null;
    subscription_plans?: {
      name: string;
      daily_coins: number;
      duration_days: number;
      price: number;
    } | null;
  }>;
};

function formatMoney(price: number) {
  return `¥${(price / 100).toFixed(2)}`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "暂无";
  }

  return new Intl.DateTimeFormat("zh-CN", {
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

export function BillingClient({ initialData }: { initialData: BillingPayload }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<BillingPayload>(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedCoins, setSelectedCoins] = useState(100);
  const [redeemCode, setRedeemCode] = useState("");
  const [coinOrderState, setCoinOrderState] = useState<SaveState>("idle");
  const [subscriptionOrderState, setSubscriptionOrderState] =
    useState<SaveState>("idle");
  const [activeSubscriptionPlanId, setActiveSubscriptionPlanId] = useState<string | null>(
    null,
  );
  const [redeemState, setRedeemState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>("alipay_pc");

  const activeSubscription = useMemo(
    () => data.subscriptions.find((item) => item.status === "active") ?? null,
    [data.subscriptions],
  );

  const fetchBillingSummary = useCallback(async () => {
    const response = await fetch("/api/billing/summary", { cache: "no-store" });
    const payload = (await response.json()) as BillingPayload & { error?: string };

    if (!response.ok) {
      throw new Error(payload.error ?? "支付中心加载失败。");
    }

    return payload;
  }, []);

  const refreshData = useCallback(async () => {
    setIsRefreshing(true);

    try {
      const payload = await fetchBillingSummary();
      setData(payload);
      setError("");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "支付中心加载失败。",
      );
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchBillingSummary]);

  useEffect(() => {
    const orderId = searchParams.get("order_id");
    const channel = searchParams.get("channel");

    if (!orderId || channel !== "alipay_pc") {
      return;
    }

    let cancelled = false;
    let attempts = 0;

    const pollOrder = async () => {
      while (!cancelled && attempts < 6) {
        attempts += 1;

        try {
          const response = await fetch(`/api/billing/orders/${orderId}`, {
            cache: "no-store",
          });
          const payload = (await response.json()) as {
            error?: string;
            order?: BillingPayload["orders"][number];
          };

          if (!response.ok) {
            throw new Error(payload.error ?? "读取订单状态失败。");
          }

          if (payload.order?.status === "paid") {
            setSubscriptionOrderState("success");
            setCoinOrderState("success");
            setMessage("支付成功，订单已经到账。");
            await refreshData();

            const nextParams = new URLSearchParams(searchParams.toString());
            nextParams.delete("order_id");
            nextParams.delete("channel");
            const nextQuery = nextParams.toString();
            router.replace(nextQuery ? `/billing?${nextQuery}` : "/billing");
            return;
          }

          if (attempts < 6) {
            await new Promise((resolve) => window.setTimeout(resolve, 1200));
          }
        } catch (requestError) {
          setCoinOrderState("error");
          setSubscriptionOrderState("error");
          setMessage(
            requestError instanceof Error
              ? requestError.message
              : "支付结果确认失败，请稍后刷新查看。",
          );
          return;
        }
      }

      if (!cancelled) {
        setMessage("支付处理中，订单状态可能稍后更新。");
      }
    };

    void pollOrder();

    return () => {
      cancelled = true;
    };
  }, [refreshData, router, searchParams]);

  const coinOptions = useMemo(() => {
    const rate = data.rate.coin_per_yuan ?? 10;
    return [10, 30, 50, 100, 200].map((yuan) => ({
      yuan,
      coins: yuan * rate,
    }));
  }, [data.rate.coin_per_yuan]);

  const returnOrderId = searchParams.get("order_id");
  const returnChannel = searchParams.get("channel");
  const statusMessage =
    message ||
    (returnOrderId && returnChannel === "alipay_pc"
      ? "正在确认支付结果"
      : "");

  const handleCreateCoinOrder = async () => {
    setCoinOrderState("saving");
    setMessage("");

    try {
      const response = await fetch("/api/billing/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderType: "coin_purchase",
          coins: selectedCoins,
          paymentMethod: selectedPaymentMethod,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        order?: { order_id: string };
        payment?: {
          paymentUrl: string;
          channel: PaymentMethod | "mock";
        };
      };

      if (!response.ok || !payload.order?.order_id || !payload.payment?.paymentUrl) {
        throw new Error(payload.error ?? "充值订单创建失败。");
      }

      setMessage("正在跳转到支付宝收银台。");
      window.location.assign(payload.payment.paymentUrl);
    } catch (requestError) {
      setCoinOrderState("error");
      setMessage(
        requestError instanceof Error
          ? requestError.message
          : "充值失败，请稍后再试。",
      );
    } finally {
      window.setTimeout(() => setCoinOrderState("idle"), 1800);
    }
  };

  const handleBuySubscription = async (planId: string) => {
    setSubscriptionOrderState("saving");
    setActiveSubscriptionPlanId(planId);
    setMessage("");

    try {
      const selectedPlan = data.plans.find((plan) => plan.id === planId) ?? null;

      if (activeSubscription) {
        const confirmed = window.confirm(
          `你当前正在使用“${activeSubscription.subscription_plans?.name ?? "已开通订阅"}”。继续购买“${selectedPlan?.name ?? "新套餐"}”后，当前订阅会被新订阅覆盖。`,
        );

        if (!confirmed) {
          setSubscriptionOrderState("idle");
          setActiveSubscriptionPlanId(null);
          return;
        }
      }

      const response = await fetch("/api/billing/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderType: "subscription",
          planId,
          paymentMethod: selectedPaymentMethod,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        order?: { order_id: string };
        payment?: {
          paymentUrl: string;
          channel: PaymentMethod | "mock";
        };
      };

      if (!response.ok || !payload.order?.order_id || !payload.payment?.paymentUrl) {
        throw new Error(payload.error ?? "订阅订单创建失败。");
      }

      setMessage("正在跳转到支付宝收银台。");
      window.location.assign(payload.payment.paymentUrl);
    } catch (requestError) {
      setSubscriptionOrderState("error");
      setMessage(
        requestError instanceof Error
          ? requestError.message
          : "订阅失败，请稍后再试。",
      );
    } finally {
      window.setTimeout(() => {
        setSubscriptionOrderState("idle");
        setActiveSubscriptionPlanId(null);
      }, 1800);
    }
  };

  const handleRedeemCode = async () => {
    setRedeemState("saving");
    setMessage("");

    try {
      const response = await fetch("/api/billing/redeem", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: redeemCode,
        }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "激活码兑换失败。");
      }

      setRedeemCode("");
      setRedeemState("success");
      setMessage("激活码兑换成功。");
      await refreshData();
    } catch (requestError) {
      setRedeemState("error");
      setMessage(
        requestError instanceof Error
          ? requestError.message
          : "激活码兑换失败。",
      );
    } finally {
      window.setTimeout(() => setRedeemState("idle"), 1800);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f8ff] text-[#17213f]">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_10%,rgba(117,159,255,0.34),transparent_26%),radial-gradient(circle_at_84%_14%,rgba(255,166,213,0.28),transparent_24%),linear-gradient(180deg,#ffffff_0%,#f8f9ff_44%,#eff5ff_100%)]" />
        <div className="home-grid pointer-events-none absolute inset-0 opacity-80" />

        <div className="relative mx-auto w-full max-w-[1480px] px-5 py-6 sm:px-8 lg:px-10">
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
                  className="text-sm font-semibold text-[#6a7392]"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/profile"
                prefetch
                className="rounded-full border border-[#dce5ff] bg-white px-4 py-2 text-sm font-bold text-[#5c6688]"
              >
                我的主页
              </Link>
            </div>
          </header>

          <section className="grid gap-6 py-8 xl:grid-cols-[340px_minmax(0,1fr)]">
            <aside className="space-y-4">
              <div className="rounded-[28px] border border-white/80 bg-white/82 p-6 shadow-[0_18px_54px_rgba(91,111,185,0.12)]">
                <p className="text-xs font-black tracking-[0.16em] text-[#7b88ac]">
                  钱包余额
                </p>
                <p className="mt-3 text-[48px] font-black tracking-[-0.06em] text-[#17213f]">
                  {data.credits.credits}
                </p>
                <p className="mt-3 text-sm leading-7 text-[#687394]">
                  可直接用于 AI 绘画等创作功能。
                </p>
              </div>

              <div className="rounded-[28px] border border-white/80 bg-white/82 p-6 shadow-[0_18px_54px_rgba(91,111,185,0.12)]">
                <p className="text-xs font-black tracking-[0.16em] text-[#7b88ac]">
                  激活码兑换
                </p>
                <input
                  value={redeemCode}
                  onChange={(event) => setRedeemCode(event.target.value)}
                  placeholder="输入激活码"
                  className="mt-4 h-12 w-full rounded-[18px] border border-[#dce5ff] bg-[#f8faff] px-4 text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={() => void handleRedeemCode()}
                  className="mt-4 w-full rounded-full bg-[#17213f] px-5 py-3 text-sm font-black text-white"
                >
                  {redeemState === "saving"
                    ? "兑换中"
                    : redeemState === "success"
                      ? "已兑换"
                      : redeemState === "error"
                        ? "重试兑换"
                        : "立即兑换"}
                </button>
              </div>

              <div className="rounded-[28px] border border-white/80 bg-white/82 p-6 shadow-[0_18px_54px_rgba(91,111,185,0.12)]">
                <p className="text-xs font-black tracking-[0.16em] text-[#7b88ac]">
                  当前订阅
                </p>
                <div className="mt-4 space-y-3">
                  {data.subscriptions.length ? (
                    data.subscriptions.slice(0, 3).map((subscription) => (
                      <div
                        key={subscription.id}
                        className="rounded-[20px] border border-[#e4eaff] bg-[#f8faff] px-4 py-4"
                      >
                        <p className="text-sm font-black text-[#17213f]">
                          {subscription.subscription_plans?.name ?? "订阅套餐"}
                        </p>
                        <p className="mt-2 text-sm text-[#687394]">
                          每日 {subscription.subscription_plans?.daily_coins ?? 0} 币
                        </p>
                        <p className="mt-1 text-xs text-[#8c98b8]">
                          到期：{subscription.end_date}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[20px] border border-dashed border-[#dce5ff] bg-[#f8faff] px-4 py-6 text-sm text-[#687394]">
                      你还没有开通订阅。
                    </div>
                  )}
                </div>
              </div>
            </aside>

            <section className="space-y-5">
              <div className="rounded-[30px] border border-white/80 bg-white/72 p-6 shadow-[0_18px_54px_rgba(91,111,185,0.1)] backdrop-blur-2xl">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h1 className="text-[42px] font-black tracking-[-0.06em] text-[#151f3d]">
                      充值、订阅与激活码
                    </h1>
                  </div>
                  {(statusMessage || error || isRefreshing) && (
                    <div className="rounded-[18px] border border-[#e4eaff] bg-white px-4 py-3 text-sm font-semibold text-[#5f6b8e]">
                      {statusMessage || error || (isRefreshing ? "正在刷新数据" : "")}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
                <section className="rounded-[28px] border border-white/80 bg-white/82 p-6 shadow-[0_18px_54px_rgba(91,111,185,0.12)]">
                  <div>
                    <p className="text-lg font-black text-[#17213f]">魔法币充值</p>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod("alipay_pc")}
                      className={`rounded-[22px] border px-5 py-4 text-left transition ${
                        selectedPaymentMethod === "alipay_pc"
                          ? "border-[#8e96ff] bg-[#f1f2ff] shadow-[0_12px_28px_rgba(98,92,255,0.14)]"
                          : "border-[#e4eaff] bg-[#fbfcff]"
                      }`}
                    >
                      <p className="text-sm font-black text-[#17213f]">支付宝支付</p>
                    </button>
                    <button
                      type="button"
                      disabled
                      className="rounded-[22px] border border-dashed border-[#dce5ff] bg-[#f8faff] px-5 py-4 text-left opacity-70"
                    >
                      <p className="text-sm font-black text-[#17213f]">微信支付</p>
                    </button>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {coinOptions.map((option) => (
                      <button
                        key={option.yuan}
                        type="button"
                        onClick={() => setSelectedCoins(option.coins)}
                        className={`rounded-[22px] border px-5 py-5 text-left transition ${
                          selectedCoins === option.coins
                            ? "border-[#8e96ff] bg-[#f1f2ff] shadow-[0_12px_28px_rgba(98,92,255,0.14)]"
                            : "border-[#e4eaff] bg-[#fbfcff]"
                        }`}
                      >
                        <p className="text-xs font-black tracking-[0.14em] text-[#7b88ac]">
                          {option.yuan} 元
                        </p>
                        <p className="mt-2 text-2xl font-black text-[#17213f]">
                          {option.coins}
                        </p>
                        <p className="mt-1 text-sm text-[#687394]">魔法币</p>
                      </button>
                    ))}
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-[22px] bg-[#f8faff] px-5 py-4">
                    <div>
                      <p className="text-sm font-black text-[#17213f]">
                        本次到账 {selectedCoins} 魔法币
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleCreateCoinOrder()}
                      className="rounded-full bg-[#625cff] px-6 py-3 text-sm font-black text-white"
                    >
                      {coinOrderState === "saving"
                        ? "跳转支付中"
                        : coinOrderState === "success"
                          ? "已到账"
                          : coinOrderState === "error"
                            ? "重新充值"
                            : "立即充值"}
                    </button>
                  </div>
                </section>

                <section className="rounded-[28px] border border-white/80 bg-white/82 p-6 shadow-[0_18px_54px_rgba(91,111,185,0.12)]">
                  <p className="text-lg font-black text-[#17213f]">订阅中心</p>

                  <div className="mt-3 rounded-[18px] border border-[#f4e2b2] bg-[#fffbf1] px-4 py-3 text-sm leading-7 text-[#8a7141]">
                    订阅套餐之间不能叠加。购买新的订阅会覆盖当前正在生效的订阅。
                  </div>

                  <div className="mt-5 space-y-4">
                    {data.plans.map((plan) => (
                      <article
                        key={plan.id}
                        className="rounded-[22px] border border-[#e4eaff] bg-[#fbfcff] p-5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <p className="text-xl font-black text-[#17213f]">{plan.name}</p>
                            <p className="mt-2 text-sm text-[#687394]">
                              每日 {plan.daily_coins} 币，持续 {plan.duration_days} 天
                            </p>
                            <p className="mt-1 text-sm text-[#8c98b8]">
                              总计约 {plan.daily_coins * plan.duration_days} 币
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-black text-[#17213f]">
                              {formatMoney(plan.price)}
                            </p>
                            <button
                              type="button"
                              onClick={() => void handleBuySubscription(plan.id)}
                              className="mt-3 rounded-full bg-[#17213f] px-5 py-2.5 text-sm font-black text-white"
                            >
                              {subscriptionOrderState === "saving" &&
                              activeSubscriptionPlanId === plan.id
                                ? "跳转支付中"
                                : "购买订阅"}
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              </div>

              <section className="rounded-[28px] border border-white/80 bg-white/82 p-6 shadow-[0_18px_54px_rgba(91,111,185,0.12)]">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-lg font-black text-[#17213f]">订单记录</p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {data.orders.length ? (
                    data.orders.map((order) => (
                      <div
                        key={order.order_id}
                        className="grid gap-3 rounded-[20px] border border-[#e4eaff] bg-[#fbfcff] px-4 py-4 md:grid-cols-[1fr_auto]"
                      >
                        <div>
                          <p className="text-sm font-black text-[#17213f]">
                            {order.order_type === "coin_purchase" ? "魔法币充值" : "订阅购买"}
                          </p>
                          <p className="mt-1 text-sm text-[#687394]">
                            支付方式：{formatPaymentMethod(order.payment_method)}
                          </p>
                          <p className="mt-1 text-sm text-[#687394]">
                            订单号：{order.order_id}
                          </p>
                          <p className="mt-1 text-xs text-[#8c98b8]">
                            创建于 {formatDate(order.created_at)}
                          </p>
                        </div>
                        <div className="text-left md:text-right">
                          <p className="text-lg font-black text-[#17213f]">
                            {formatMoney(order.amount)}
                          </p>
                          <p className="mt-1 text-sm text-[#687394]">
                            {formatOrderStatus(order.status)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[20px] border border-dashed border-[#dce5ff] bg-[#f8faff] px-4 py-8 text-sm text-[#687394]">
                      你还没有订单记录。
                    </div>
                  )}
                </div>
              </section>
            </section>
          </section>
        </div>
      </div>
    </main>
  );
}
