import "server-only";
import crypto from "node:crypto";
import { addCredits, deductCredits, ensureUserCredits } from "@/lib/credits";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  getPaymentGateway,
  type PaymentMethod,
  type PaymentNotifyPayload,
  type PaymentQueryResult,
} from "@/lib/payment-gateway";

export type { PaymentMethod } from "@/lib/payment-gateway";

export type OrderType = "coin_purchase" | "subscription";

export type MagicCoinRate = {
  id: boolean;
  coin_per_yuan: number;
  updated_by: string | null;
  updated_at: string;
};

export type SubscriptionPlan = {
  id: string;
  name: string;
  daily_coins: number;
  duration_days: number;
  refresh_time: string;
  price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CoinRechargePackage = {
  id: string;
  name: string;
  coins: number;
  price: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PaymentOrder = {
  order_id: string;
  user_id: string;
  order_type: OrderType;
  amount: number;
  status: "pending" | "paid" | "cancelled" | "refunded";
  payment_method: PaymentMethod;
  trade_no: string | null;
  provider_name: string | null;
  buyer_account: string | null;
  buyer_id: string | null;
  notify_status: string | null;
  failure_reason: string | null;
  detail: Record<string, unknown>;
  payment_request: Record<string, unknown>;
  payment_response: Record<string, unknown>;
  notify_payload: Record<string, unknown> | null;
  refund_payload: Record<string, unknown> | null;
  paid_at: string | null;
  refunded_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminPaymentOrder = PaymentOrder & {
  user: {
    id: string;
    phone: string;
    nickname: string | null;
  } | null;
};

export type PublicPaymentOrder = Pick<
  PaymentOrder,
  | "order_id"
  | "order_type"
  | "amount"
  | "status"
  | "payment_method"
  | "detail"
  | "paid_at"
  | "created_at"
>;

export type ActivationCodeBatch = {
  id: string;
  name: string;
  code_type: "coin" | "subscription";
  value: string;
  quantity: number;
  expire_at: string | null;
  created_by: string | null;
  created_at: string;
};

export type ActivationCodeRecord = {
  id: string;
  code_preview: string;
  plain_code?: string | null;
  type: "coin" | "subscription";
  value: string;
  status: "unused" | "used" | "disabled";
  used_by_user_id: string | null;
  used_at: string | null;
  batch_id: string | null;
  expire_at: string | null;
  created_at: string;
  used_by_user?: {
    id: string;
    phone: string;
    nickname: string | null;
  } | null;
};

export type UserSubscription = {
  id: string;
  user_id: string;
  plan_id: string;
  status: "active" | "expired" | "cancelled";
  start_date: string;
  end_date: string;
  last_grant_date: string | null;
  source: "payment" | "activation_code";
  reference_id: string | null;
  created_at: string;
  subscription_plans?: Pick<
    SubscriptionPlan,
    "name" | "daily_coins" | "duration_days" | "price"
  > | null;
};

type InsertCoinTransactionPayload = {
  user_id: string;
  amount: number;
  type:
    | "recharge"
    | "subscription_daily"
    | "exchange_code"
    | "consume"
    | "admin_adjust"
    | "refund"
    | "signup_bonus";
  reference_id: string;
  balance_after: number;
  signature: string;
};

function isMissingPaymentInfrastructure(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code =
    "code" in error && typeof error.code === "string" ? error.code : "";
  const message =
    "message" in error && typeof error.message === "string" ? error.message : "";

  return (
    code === "PGRST205" ||
    code === "PGRST204" ||
    code === "42P01" ||
    code === "42703" ||
    message.includes("payment_orders") ||
    message.includes("coin_recharge_packages") ||
    message.includes("subscription_plans") ||
    message.includes("magic_coin_rate") ||
    message.includes("user_subscriptions") ||
    message.includes("activation_codes") ||
    message.includes("activation_code_batches") ||
    message.includes("coin_transactions") ||
    message.includes("subscription_grants")
  );
}

function asPaymentInfrastructureError(error: unknown) {
  if (isMissingPaymentInfrastructure(error)) {
    return new Error(
      "支付系统数据库还没有初始化，请先执行 supabase/payments-schema.sql。",
    );
  }

  return error;
}

function getPaymentSigningSecret() {
  return (
    process.env.PAYMENT_SIGNING_SECRET ||
    process.env.AUTH_SESSION_SECRET ||
    "dev-payment-signing-secret"
  );
}

function getActivationCodePepper() {
  return (
    process.env.ACTIVATION_CODE_PEPPER ||
    process.env.AUTH_SESSION_SECRET ||
    "dev-activation-code-pepper"
  );
}

function hmac(input: string) {
  return crypto
    .createHmac("sha256", getPaymentSigningSecret())
    .update(input)
    .digest("hex");
}

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function normalizeCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

function hashActivationCode(code: string) {
  return sha256(`${getActivationCodePepper()}:${normalizeCode(code)}`);
}

function signActivationCode(input: {
  codeHash: string;
  type: string;
  value: string;
  expireAt?: string | null;
}) {
  return hmac(
    [input.codeHash, input.type, input.value, input.expireAt ?? ""].join("|"),
  );
}

function signCoinTransaction(input: Omit<InsertCoinTransactionPayload, "signature">) {
  return hmac(
    [
      input.user_id,
      input.amount,
      input.type,
      input.reference_id,
      input.balance_after,
    ].join("|"),
  );
}

function createReadableActivationCode() {
  const raw = crypto.randomBytes(9).toString("base64url").toUpperCase();
  const compact = raw.replace(/[^A-Z0-9]/g, "").padEnd(12, "X").slice(0, 12);
  return `${compact.slice(0, 4)}-${compact.slice(4, 8)}-${compact.slice(8, 12)}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function formatPrice(priceInCents: number) {
  return `¥${(priceInCents / 100).toFixed(2)}`;
}

function parseAmountToCents(input: unknown) {
  if (typeof input !== "string" || !input.trim()) {
    return null;
  }

  const normalized = Number(input);

  if (!Number.isFinite(normalized)) {
    return null;
  }

  return Math.round(normalized * 100);
}

function isPaidGatewayStatus(status: string | null | undefined) {
  return status === "TRADE_SUCCESS" || status === "TRADE_FINISHED";
}

function createRefundRequestId(orderId: string) {
  return `refund_${orderId.replaceAll("-", "").slice(0, 24)}_${Date.now()}`;
}

export function isMockPaymentEnabled() {
  return (
    process.env.ENABLE_MOCK_PAYMENTS === "true" ||
    process.env.NODE_ENV !== "production"
  );
}

function resolveRequestedPaymentMethod(method?: PaymentMethod) {
  const resolvedMethod = method ?? "alipay_pc";

  if (resolvedMethod === "mock" && !isMockPaymentEnabled()) {
    throw new Error("Mock 支付仅在开发环境或显式启用时可用。");
  }

  if (resolvedMethod === "wechat_pc") {
    throw new Error("微信支付暂未启用。");
  }

  return resolvedMethod;
}

export function toPublicPaymentOrder(order: PaymentOrder): PublicPaymentOrder {
  return {
    order_id: order.order_id,
    order_type: order.order_type,
    amount: order.amount,
    status: order.status,
    payment_method: order.payment_method,
    detail: order.detail,
    paid_at: order.paid_at,
    created_at: order.created_at,
  };
}

const PAYMENT_ORDER_SELECT = `
  order_id,
  user_id,
  order_type,
  amount,
  status,
  payment_method,
  trade_no,
  provider_name,
  buyer_account,
  buyer_id,
  notify_status,
  failure_reason,
  detail,
  payment_request,
  payment_response,
  notify_payload,
  refund_payload,
  paid_at,
  refunded_at,
  closed_at,
  created_at,
  updated_at
`;

async function enrichOrdersWithUsers<T extends PaymentOrder>(orders: T[]) {
  if (!orders.length) {
    return [] as Array<T & { user: AdminPaymentOrder["user"] }>;
  }

  const userIds = Array.from(new Set(orders.map((order) => order.user_id).filter(Boolean)));

  if (!userIds.length) {
    return orders.map((order) => ({ ...order, user: null }));
  }

  const supabase = getSupabaseAdmin();
  const { data: users, error } = await supabase
    .from("users")
    .select("id, phone, nickname")
    .in("id", userIds)
    .returns<Array<{ id: string; phone: string; nickname: string | null }>>();

  if (error) {
    throw error;
  }

  const userMap = new Map((users ?? []).map((user) => [user.id, user]));

  return orders.map((order) => ({
    ...order,
    user: userMap.get(order.user_id) ?? null,
  }));
}

export async function getMagicCoinRate() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("magic_coin_rate")
    .select("id, coin_per_yuan, updated_by, updated_at")
    .eq("id", true)
    .maybeSingle<MagicCoinRate>();

  if (error) {
    if (isMissingPaymentInfrastructure(error)) {
      console.warn("支付基础表暂不可用，已回退到默认汇率。", error);
      return {
        id: true,
        coin_per_yuan: 10,
        updated_by: null,
        updated_at: new Date().toISOString(),
      };
    }

    throw error;
  }

  return (
    data ?? {
      id: true,
      coin_per_yuan: 10,
      updated_by: null,
      updated_at: new Date().toISOString(),
    }
  );
}

export async function updateMagicCoinRate(coinPerYuan: number, adminUserId: string) {
  const supabase = getSupabaseAdmin();
  const normalizedRate = Math.max(1, Math.floor(coinPerYuan));
  const { data, error } = await supabase
    .from("magic_coin_rate")
    .upsert(
      {
        id: true,
        coin_per_yuan: normalizedRate,
        updated_by: adminUserId,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "id" },
    )
    .select("id, coin_per_yuan, updated_by, updated_at")
    .single<MagicCoinRate>();

  if (error) {
    throw asPaymentInfrastructureError(error);
  }

  return data;
}

export async function listSubscriptionPlans(options?: { includeInactive?: boolean }) {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("subscription_plans")
    .select(
      "id, name, daily_coins, duration_days, refresh_time, price, is_active, created_at, updated_at",
    )
    .order("price", { ascending: true });

  if (!options?.includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query.returns<SubscriptionPlan[]>();

  if (error) {
    if (isMissingPaymentInfrastructure(error)) {
      console.warn("支付基础表暂不可用，订阅套餐列表回退为空。", error);
      return [];
    }

    throw error;
  }

  return data ?? [];
}

export async function listCoinRechargePackages(options?: {
  includeInactive?: boolean;
}) {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("coin_recharge_packages")
    .select("id, name, coins, price, sort_order, is_active, created_at, updated_at")
    .order("sort_order", { ascending: true })
    .order("price", { ascending: true });

  if (!options?.includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query.returns<CoinRechargePackage[]>();

  if (error) {
    if (isMissingPaymentInfrastructure(error)) {
      console.warn("充值档位表暂不可用，已回退到默认档位。", error);
      const rate = await getMagicCoinRate();
      return [10, 30, 50, 100, 200].map((yuan) => ({
        id: `fallback-${yuan}`,
        name: `${yuan} 元魔法币包`,
        coins: yuan * rate.coin_per_yuan,
        price: yuan * 100,
        sort_order: yuan,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
    }

    throw error;
  }

  return data ?? [];
}

export async function upsertCoinRechargePackage(input: {
  id?: string;
  name: string;
  coins: number;
  price: number;
  sortOrder: number;
  isActive: boolean;
}) {
  const supabase = getSupabaseAdmin();
  const payload = {
    ...(input.id ? { id: input.id } : {}),
    name: input.name.trim() || "魔法币充值包",
    coins: Math.max(1, Math.floor(input.coins)),
    price: Math.max(1, Math.floor(input.price)),
    sort_order: Math.max(0, Math.floor(input.sortOrder)),
    is_active: input.isActive,
  };

  const { data, error } = await supabase
    .from("coin_recharge_packages")
    .upsert(payload as never)
    .select("id, name, coins, price, sort_order, is_active, created_at, updated_at")
    .single<CoinRechargePackage>();

  if (error) {
    throw asPaymentInfrastructureError(error);
  }

  return data;
}

export async function deleteCoinRechargePackage(packageId: string) {
  const supabase = getSupabaseAdmin();
  const normalizedPackageId = packageId.trim();

  if (!normalizedPackageId) {
    throw new Error("缺少要删除的充值档位 ID。");
  }

  const { data: packageRecord, error: fetchError } = await supabase
    .from("coin_recharge_packages")
    .select("id, name")
    .eq("id", normalizedPackageId)
    .maybeSingle<{ id: string; name: string }>();

  if (fetchError) {
    throw asPaymentInfrastructureError(fetchError);
  }

  if (!packageRecord) {
    throw new Error("没有找到这个充值档位。");
  }

  const { error } = await supabase
    .from("coin_recharge_packages")
    .delete()
    .eq("id", normalizedPackageId);

  if (error) {
    throw asPaymentInfrastructureError(error);
  }

  return packageRecord;
}

export async function upsertSubscriptionPlan(input: {
  id?: string;
  name: string;
  dailyCoins: number;
  durationDays: number;
  refreshTime: string;
  price: number;
  isActive: boolean;
}) {
  const supabase = getSupabaseAdmin();
  const payload = {
    ...(input.id ? { id: input.id } : {}),
    name: input.name.trim(),
    daily_coins: Math.max(1, Math.floor(input.dailyCoins)),
    duration_days: Math.max(1, Math.floor(input.durationDays)),
    refresh_time: input.refreshTime || "06:00:00",
    price: Math.max(0, Math.floor(input.price)),
    is_active: input.isActive,
  };

  const { data, error } = await supabase
    .from("subscription_plans")
    .upsert(payload as never)
    .select(
      "id, name, daily_coins, duration_days, refresh_time, price, is_active, created_at, updated_at",
    )
    .single<SubscriptionPlan>();

  if (error) {
    throw asPaymentInfrastructureError(error);
  }

  return data;
}

export async function deleteSubscriptionPlan(planId: string) {
  const supabase = getSupabaseAdmin();
  const normalizedPlanId = planId.trim();
  const today = toDateOnly(new Date());

  if (!normalizedPlanId) {
    throw new Error("缺少要删除的套餐 ID。");
  }

  const { data: plan, error: planError } = await supabase
    .from("subscription_plans")
    .select("id, name")
    .eq("id", normalizedPlanId)
    .maybeSingle<{ id: string; name: string }>();

  if (planError) {
    throw asPaymentInfrastructureError(planError);
  }

  if (!plan) {
    throw new Error("没有找到这个套餐。");
  }

  const { error: syncSubscriptionError } = await supabase
    .from("user_subscriptions")
    .update({
      status: "expired",
    } as never)
    .eq("plan_id", normalizedPlanId)
    .eq("status", "active")
    .lt("end_date", today);

  if (syncSubscriptionError) {
    throw asPaymentInfrastructureError(syncSubscriptionError);
  }

  const [
    { count: activeSubscriptionCount, error: activeSubscriptionError },
    { data: staleSubscriptions, error: staleSubscriptionsError },
    { data: activationCodes, error: activationCodesError },
  ] = await Promise.all([
    supabase
      .from("user_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("plan_id", normalizedPlanId)
      .eq("status", "active")
      .gte("end_date", today),
    supabase
      .from("user_subscriptions")
      .select("id")
      .eq("plan_id", normalizedPlanId)
      .neq("status", "active")
      .returns<Array<Pick<UserSubscription, "id">>>(),
    supabase
      .from("activation_codes")
      .select("id, status")
      .eq("type", "subscription")
      .eq("value", normalizedPlanId)
      .returns<Array<Pick<ActivationCodeRecord, "id" | "status">>>(),
  ]);

  if (activeSubscriptionError) {
    throw asPaymentInfrastructureError(activeSubscriptionError);
  }

  if (staleSubscriptionsError) {
    throw asPaymentInfrastructureError(staleSubscriptionsError);
  }

  if (activationCodesError) {
    throw asPaymentInfrastructureError(activationCodesError);
  }

  if ((activeSubscriptionCount ?? 0) > 0) {
    throw new Error("这个套餐还有正在生效的订阅，暂时不能删除。");
  }

  await cancelPendingOrdersForPlan(normalizedPlanId);

  const staleSubscriptionIds = (staleSubscriptions ?? []).map((item) => item.id);

  if (staleSubscriptionIds.length) {
    const { error: removeSubscriptionsError } = await supabase
      .from("user_subscriptions")
      .delete()
      .in("id", staleSubscriptionIds);

    if (removeSubscriptionsError) {
      throw asPaymentInfrastructureError(removeSubscriptionsError);
    }
  }

  const removableActivationCodeIds = (activationCodes ?? [])
    .filter((item) => item.status !== "used")
    .map((item) => item.id);

  if (removableActivationCodeIds.length) {
    const { error: removeActivationCodesError } = await supabase
      .from("activation_codes")
      .delete()
      .in("id", removableActivationCodeIds);

    if (removeActivationCodesError) {
      throw asPaymentInfrastructureError(removeActivationCodesError);
    }
  }

  const { error: deleteError } = await supabase
    .from("subscription_plans")
    .delete()
    .eq("id", normalizedPlanId);

  if (deleteError) {
    if ("code" in deleteError && deleteError.code === "23503") {
      throw new Error("这个套餐还有历史生效记录没有清理完成，暂时不能删除。");
    }

    throw asPaymentInfrastructureError(deleteError);
  }

  return plan;
}

async function listPendingOrderIds(input: {
  userId?: string;
  orderType?: OrderType;
  planId?: string;
}) {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("payment_orders")
    .select("order_id")
    .eq("status", "pending");

  if (input.userId) {
    query = query.eq("user_id", input.userId);
  }

  if (input.orderType) {
    query = query.eq("order_type", input.orderType);
  }

  if (input.planId) {
    query = query.filter("detail->>planId", "eq", input.planId);
  }

  const { data, error } = await query.returns<Array<Pick<PaymentOrder, "order_id">>>();

  if (error) {
    throw asPaymentInfrastructureError(error);
  }

  return (data ?? []).map((item) => item.order_id);
}

async function cancelPendingOrdersByIds(orderIds: string[]) {
  if (!orderIds.length) {
    return 0;
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("payment_orders")
    .update({
      status: "cancelled",
    } as never)
    .in("order_id", orderIds)
    .eq("status", "pending");

  if (error) {
    throw asPaymentInfrastructureError(error);
  }

  return orderIds.length;
}

async function cancelPendingOrdersForUser(input: {
  userId: string;
  orderType: OrderType;
}) {
  const orderIds = await listPendingOrderIds({
    userId: input.userId,
    orderType: input.orderType,
  });

  return cancelPendingOrdersByIds(orderIds);
}

async function cancelPendingOrdersForPlan(planId: string) {
  const orderIds = await listPendingOrderIds({
    orderType: "subscription",
    planId,
  });

  return cancelPendingOrdersByIds(orderIds);
}

async function insertPaymentOrder(input: {
  userId: string;
  orderType: OrderType;
  amount: number;
  paymentMethod: PaymentMethod;
  detail: Record<string, unknown>;
}) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("payment_orders")
    .insert({
      user_id: input.userId,
      order_type: input.orderType,
      amount: input.amount,
      payment_method: input.paymentMethod,
      detail: input.detail,
    } as never)
    .select(PAYMENT_ORDER_SELECT)
    .single<PaymentOrder>();

  if (error) {
    throw asPaymentInfrastructureError(error);
  }

  return data;
}

export async function createCoinPurchaseOrder(input: {
  userId: string;
  packageId: string;
  paymentMethod?: PaymentMethod;
}) {
  const supabase = getSupabaseAdmin();
  const paymentMethod = resolveRequestedPaymentMethod(input.paymentMethod);
  const { data: packageRecord, error: packageError } = await supabase
    .from("coin_recharge_packages")
    .select("id, name, coins, price, sort_order, is_active, created_at, updated_at")
    .eq("id", input.packageId)
    .eq("is_active", true)
    .single<CoinRechargePackage>();

  if (packageError) {
    throw asPaymentInfrastructureError(packageError);
  }

  await cancelPendingOrdersForUser({
    userId: input.userId,
    orderType: "coin_purchase",
  });

  const order = await insertPaymentOrder({
    userId: input.userId,
    orderType: "coin_purchase",
    amount: packageRecord.price,
    paymentMethod,
    detail: {
      packageId: packageRecord.id,
      packageName: packageRecord.name,
      coins: packageRecord.coins,
    },
  });

  const payment = await PaymentService.createPayment(order, {
    title: packageRecord.name,
    detail: order.detail,
  });

  const paymentRequest = {
    title: packageRecord.name,
    orderType: order.order_type,
    itemSummary: `${packageRecord.coins} 魔法币`,
    amount: order.amount,
    detail: order.detail,
    ...(payment.requestPayload ?? {}),
  };

  const finalizedOrder = await updateOrderPaymentLifecycle(order.order_id, {
    providerName: payment.provider ?? payment.channel,
    paymentRequest,
    paymentResponse: payment.responsePayload ?? {
      paymentUrl: payment.paymentUrl,
      qrText: payment.qrText,
      expiresInSeconds: payment.expiresInSeconds,
      channel: payment.channel,
    },
  });

  return { order: finalizedOrder, payment };
}

export async function createSubscriptionOrder(input: {
  userId: string;
  planId: string;
  paymentMethod?: PaymentMethod;
}) {
  const supabase = getSupabaseAdmin();
  const paymentMethod = resolveRequestedPaymentMethod(input.paymentMethod);
  const { data: plan, error: planError } = await supabase
    .from("subscription_plans")
    .select(
      "id, name, daily_coins, duration_days, refresh_time, price, is_active, created_at, updated_at",
    )
    .eq("id", input.planId)
    .eq("is_active", true)
    .single<SubscriptionPlan>();

  if (planError) {
    throw asPaymentInfrastructureError(planError);
  }

  await cancelPendingOrdersForUser({
    userId: input.userId,
    orderType: "subscription",
  });

  const order = await insertPaymentOrder({
    userId: input.userId,
    orderType: "subscription",
    amount: plan.price,
    paymentMethod,
    detail: {
      planId: plan.id,
      planName: plan.name,
      dailyCoins: plan.daily_coins,
      durationDays: plan.duration_days,
    },
  });

  const payment = await PaymentService.createPayment(order, {
    title: plan.name,
    detail: order.detail,
  });

  const paymentRequest = {
    title: plan.name,
    orderType: order.order_type,
    itemSummary: `${plan.name} / ${plan.duration_days} 天 / 每日 ${plan.daily_coins} 币`,
    amount: order.amount,
    detail: order.detail,
    ...(payment.requestPayload ?? {}),
  };

  const finalizedOrder = await updateOrderPaymentLifecycle(order.order_id, {
    providerName: payment.provider ?? payment.channel,
    paymentRequest,
    paymentResponse: payment.responsePayload ?? {
      paymentUrl: payment.paymentUrl,
      qrText: payment.qrText,
      expiresInSeconds: payment.expiresInSeconds,
      channel: payment.channel,
    },
  });

  return { order: finalizedOrder, payment };
}

async function markOrderPaid(orderId: string, userId: string, payload: PaymentNotifyPayload) {
  const supabase = getSupabaseAdmin();
  const { data: paidOrder, error } = await supabase
    .from("payment_orders")
    .update({
      status: "paid",
      trade_no: payload.tradeNo,
      provider_name: payload.provider ?? null,
      buyer_account: payload.buyerAccount ?? null,
      buyer_id: payload.buyerId ?? null,
      notify_status: payload.status ?? "TRADE_SUCCESS",
      notify_payload: payload.raw,
      failure_reason: null,
      paid_at: payload.paidAt,
      closed_at: null,
    } as never)
    .eq("order_id", orderId)
    .eq("user_id", userId)
    .in("status", ["pending", "cancelled"])
    .select(PAYMENT_ORDER_SELECT)
    .single<PaymentOrder>();

  if (error) {
    throw asPaymentInfrastructureError(error);
  }

  return paidOrder;
}

async function markOrderPaidFromQuery(order: PaymentOrder, result: PaymentQueryResult) {
  const paidOrder = await markOrderPaid(order.order_id, order.user_id, {
    orderId: order.order_id,
    tradeNo: result.tradeNo ?? order.trade_no ?? `alipay_${order.order_id}`,
    paidAt: result.paidAt ?? new Date().toISOString(),
    raw: result.raw,
    provider: result.provider ?? order.provider_name ?? "alipay",
    buyerAccount: result.buyerAccount ?? null,
    buyerId: result.buyerId ?? null,
    status: result.status,
  });

  await fulfillPaidOrder(paidOrder);
  return paidOrder;
}

export async function completeMockPayment(orderId: string, userId: string) {
  const supabase = getSupabaseAdmin();
  const { data: order, error } = await supabase
    .from("payment_orders")
    .select(PAYMENT_ORDER_SELECT)
    .eq("order_id", orderId)
    .eq("user_id", userId)
    .single<PaymentOrder>();

  if (error) {
    throw asPaymentInfrastructureError(error);
  }

  if (order.status === "paid") {
    return order;
  }

  if (order.status !== "pending") {
    throw new Error("这个订单当前不能支付。");
  }

  const payload: PaymentNotifyPayload = {
    orderId: order.order_id,
    tradeNo: `mock_${order.order_id.replaceAll("-", "").slice(0, 18)}`,
    paidAt: new Date().toISOString(),
    raw: {},
  };

  const paidOrder = await markOrderPaid(order.order_id, userId, payload);
  await fulfillPaidOrder(paidOrder);
  return paidOrder;
}

export async function cancelPaymentOrder(orderId: string, userId: string) {
  const supabase = getSupabaseAdmin();
  const normalizedOrderId = orderId.trim();

  if (!normalizedOrderId) {
    throw new Error("缺少订单号。");
  }

  const { data: currentOrder, error: currentOrderError } = await supabase
    .from("payment_orders")
    .select(PAYMENT_ORDER_SELECT)
    .eq("order_id", normalizedOrderId)
    .eq("user_id", userId)
    .maybeSingle<PaymentOrder>();

  if (currentOrderError) {
    throw asPaymentInfrastructureError(currentOrderError);
  }

  if (!currentOrder) {
    throw new Error("没有找到这个订单。");
  }

  if (currentOrder.status !== "pending") {
    return currentOrder;
  }

  const { data: cancelledOrder, error: cancelError } = await supabase
    .from("payment_orders")
    .update({
      status: "cancelled",
      notify_status: currentOrder.notify_status ?? "CANCELLED",
      failure_reason: currentOrder.failure_reason ?? "用户取消或支付超时未完成",
      closed_at: new Date().toISOString(),
    } as never)
    .eq("order_id", normalizedOrderId)
    .eq("user_id", userId)
    .eq("status", "pending")
    .select(PAYMENT_ORDER_SELECT)
    .maybeSingle<PaymentOrder>();

  if (cancelError) {
    throw asPaymentInfrastructureError(cancelError);
  }

  if (cancelledOrder) {
    return cancelledOrder;
  }

  const latestOrder = await getPaymentOrderById(normalizedOrderId);

  if (!latestOrder || latestOrder.user_id !== userId) {
    throw new Error("订单状态更新失败，请稍后再试。");
  }

  return latestOrder;
}

export async function handlePaymentNotification(method: PaymentMethod, request: Request) {
  const payload = await PaymentService.parseNotifyPayload(method, request);
  const order = await getPaymentOrderById(payload.orderId);

  if (!order) {
    throw new Error("没有找到对应订单。");
  }

  if (order.payment_method !== method) {
    throw new Error("支付回调渠道与订单记录不一致。");
  }

  if (method === "alipay_pc") {
    const paidAmount = parseAmountToCents(payload.raw.total_amount);

    if (paidAmount === null) {
      throw new Error("支付宝通知缺少有效的支付金额。");
    }

    if (paidAmount !== order.amount) {
      throw new Error("支付宝通知金额与订单金额不一致。");
    }
  }

  if (order.status === "paid" || order.status === "refunded") {
    return order;
  }

  const paidOrder = await markOrderPaid(order.order_id, order.user_id, payload);
  await fulfillPaidOrder(paidOrder);
  return paidOrder;
}

export async function syncPaymentOrderFromGateway(orderId: string) {
  const order = await getPaymentOrderById(orderId);

  if (!order) {
    throw new Error("没有找到这个订单。");
  }

  const gateway = getPaymentGateway(order.payment_method);

  if (!gateway.queryPayment) {
    throw new Error("当前支付方式不支持主动查单。");
  }

  const result = await gateway.queryPayment(order.order_id);

  if (result.amount !== null && result.amount !== order.amount) {
    await updateOrderPaymentLifecycle(order.order_id, {
      notifyStatus: result.status,
      failureReason: "支付宝查单金额与本地订单金额不一致",
      notifyPayload: result.raw,
    });
    throw new Error("支付宝查单金额与本地订单金额不一致。");
  }

  if (order.status === "paid" || order.status === "refunded") {
    return updateOrderPaymentLifecycle(order.order_id, {
      providerName: result.provider ?? order.provider_name,
      notifyStatus: result.status,
      notifyPayload: result.raw,
      buyerAccount: result.buyerAccount ?? order.buyer_account,
      buyerId: result.buyerId ?? order.buyer_id,
      tradeNo: result.tradeNo ?? order.trade_no,
    });
  }

  if (
    (order.status === "pending" || order.status === "cancelled") &&
    isPaidGatewayStatus(result.status)
  ) {
    return markOrderPaidFromQuery(order, result);
  }

  if (
    order.status === "pending" &&
    (result.status === "TRADE_CLOSED" || result.status === "TRADE_CANCELED")
  ) {
    return closePaymentOrder(order, {
      notifyStatus: result.status,
      failureReason: "支付宝查单显示交易已关闭",
      notifyPayload: result.raw,
    });
  }

  return updateOrderPaymentLifecycle(order.order_id, {
    providerName: result.provider ?? order.provider_name,
    notifyStatus: result.status,
    notifyPayload: result.raw,
    buyerAccount: result.buyerAccount ?? order.buyer_account,
    buyerId: result.buyerId ?? order.buyer_id,
    tradeNo: result.tradeNo ?? order.trade_no,
  });
}

async function fulfillPaidOrder(order: PaymentOrder) {
  if (order.order_type === "coin_purchase") {
    const coins = Number(order.detail.coins ?? 0);
    const balanceAfter = await addCredits(order.user_id, coins, {
      reasonCode: "recharge",
      reasonLabel: "充值魔法币",
      note: `订单 ${order.order_id} 支付成功，到账 ${coins} 个魔法币。`,
    });

    await createSignedCoinTransaction({
      user_id: order.user_id,
      amount: coins,
      type: "recharge",
      reference_id: order.order_id,
      balance_after: balanceAfter,
    });
    return;
  }

  const planId = String(order.detail.planId ?? "");
  await createUserSubscription({
    userId: order.user_id,
    planId,
    source: "payment",
    referenceId: order.order_id,
  });
}

async function revokePaidOrderBenefit(order: PaymentOrder, reason: string) {
  if (order.order_type === "coin_purchase") {
    const coins = Number(order.detail.coins ?? 0);
    const balanceAfter = await deductCredits(order.user_id, coins, {
      reasonCode: "payment_refund_deduct",
      reasonLabel: "支付退款扣回",
      note: `订单 ${order.order_id} 已退款，扣回 ${coins} 个魔法币。${reason}`,
    });

    await createSignedCoinTransaction({
      user_id: order.user_id,
      amount: -Math.max(0, coins),
      type: "refund",
      reference_id: order.order_id,
      balance_after: balanceAfter,
    });
    return;
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("user_subscriptions")
    .update({
      status: "cancelled",
    } as never)
    .eq("user_id", order.user_id)
    .eq("reference_id", order.order_id)
    .eq("source", "payment");

  if (error) {
    throw asPaymentInfrastructureError(error);
  }
}

async function closePaymentOrder(
  order: PaymentOrder,
  input: {
    notifyStatus?: string | null;
    failureReason: string;
    notifyPayload?: Record<string, unknown>;
  },
) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("payment_orders")
    .update({
      status: "cancelled",
      notify_status: input.notifyStatus ?? order.notify_status,
      failure_reason: input.failureReason,
      notify_payload: input.notifyPayload ?? order.notify_payload,
      closed_at: new Date().toISOString(),
    } as never)
    .eq("order_id", order.order_id)
    .eq("status", "pending")
    .select(PAYMENT_ORDER_SELECT)
    .single<PaymentOrder>();

  if (error) {
    throw asPaymentInfrastructureError(error);
  }

  return data;
}

async function createSignedCoinTransaction(
  input: Omit<InsertCoinTransactionPayload, "signature">,
) {
  const supabase = getSupabaseAdmin();
  const payload: InsertCoinTransactionPayload = {
    ...input,
    signature: signCoinTransaction(input),
  };
  const { data, error } = await supabase
    .from("coin_transactions")
    .insert(payload as never)
    .select("id")
    .single<{ id: string }>();

  if (error) {
    throw asPaymentInfrastructureError(error);
  }

  return data.id;
}

async function grantSubscriptionCoins(input: {
  subscriptionId: string;
  userId: string;
  planName: string;
  amount: number;
  grantDate: string;
  reasonLabel: string;
  note: string;
}) {
  const supabase = getSupabaseAdmin();

  const { data: grantRow, error: grantError } = await supabase
    .from("subscription_grants")
    .insert({
      subscription_id: input.subscriptionId,
      user_id: input.userId,
      grant_date: input.grantDate,
      amount: input.amount,
    } as never)
    .select("id")
    .single<{ id: string }>();

  if (grantError) {
    throw asPaymentInfrastructureError(grantError);
  }

  await ensureUserCredits(input.userId);
  const balanceAfter = await addCredits(input.userId, input.amount, {
    reasonCode: "subscription_daily",
    reasonLabel: input.reasonLabel,
    note: input.note,
  });

  const transactionId = await createSignedCoinTransaction({
    user_id: input.userId,
    amount: input.amount,
    type: "subscription_daily",
    reference_id: grantRow.id,
    balance_after: balanceAfter,
  });

  const { error: updateGrantError } = await supabase
    .from("subscription_grants")
    .update({
      transaction_id: transactionId,
    } as never)
    .eq("id", grantRow.id);

  if (updateGrantError) {
    throw asPaymentInfrastructureError(updateGrantError);
  }

  return grantRow.id;
}

export async function createUserSubscription(input: {
  userId: string;
  planId: string;
  source: "payment" | "activation_code";
  referenceId?: string | null;
}) {
  const supabase = getSupabaseAdmin();
  const startDate = toDateOnly(new Date());
  const { data: plan, error: planError } = await supabase
    .from("subscription_plans")
    .select(
      "id, name, daily_coins, duration_days, refresh_time, price, is_active, created_at, updated_at",
    )
    .eq("id", input.planId)
    .single<SubscriptionPlan>();

  if (planError) {
    throw asPaymentInfrastructureError(planError);
  }

  const { error: expireExistingError } = await supabase
    .from("user_subscriptions")
    .update({
      status: "expired",
    } as never)
    .eq("user_id", input.userId)
    .eq("status", "active")
    .lt("end_date", startDate);

  if (expireExistingError) {
    throw asPaymentInfrastructureError(expireExistingError);
  }

  const { error: cancelExistingError } = await supabase
    .from("user_subscriptions")
    .update({
      status: "cancelled",
    } as never)
    .eq("user_id", input.userId)
    .eq("status", "active")
    .gte("end_date", startDate);

  if (cancelExistingError) {
    throw asPaymentInfrastructureError(cancelExistingError);
  }

  const endDate = toDateOnly(addDays(new Date(), Math.max(0, plan.duration_days - 1)));
  const { data, error } = await supabase
    .from("user_subscriptions")
    .insert({
      user_id: input.userId,
      plan_id: input.planId,
      status: "active",
      start_date: startDate,
      end_date: endDate,
      source: input.source,
      last_grant_date: startDate,
      reference_id: input.referenceId ?? null,
    } as never)
    .select(
      "id, user_id, plan_id, status, start_date, end_date, last_grant_date, source, reference_id, created_at",
    )
    .single<UserSubscription>();

  if (error) {
    throw asPaymentInfrastructureError(error);
  }

  await grantSubscriptionCoins({
    subscriptionId: data.id,
    userId: input.userId,
    planName: plan.name,
    amount: plan.daily_coins,
    grantDate: startDate,
    reasonLabel: "订阅开通首日到账",
    note:
      input.source === "activation_code"
        ? `${plan.name} 已激活，首日魔法币立即到账。`
        : `${plan.name} 已开通，首日魔法币立即到账。`,
  });

  return data;
}

export async function listUserSubscriptions(userId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("user_subscriptions")
    .select(
      "id, user_id, plan_id, status, start_date, end_date, last_grant_date, source, reference_id, created_at, subscription_plans(name, daily_coins, duration_days, price)",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .returns<UserSubscription[]>();

  if (error) {
    if (isMissingPaymentInfrastructure(error)) {
      console.warn("支付基础表暂不可用，用户订阅列表回退为空。", error);
      return [];
    }

    throw error;
  }

  return data ?? [];
}

export async function listUserPaymentOrders(userId: string, limit = 20) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("payment_orders")
    .select(PAYMENT_ORDER_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<PaymentOrder[]>();

  if (error) {
    if (isMissingPaymentInfrastructure(error)) {
      console.warn("支付基础表暂不可用，用户订单列表回退为空。", error);
      return [];
    }

    throw error;
  }

  return data ?? [];
}

export async function listAdminUserPaymentOrders(userId: string, limit = 30) {
  return listUserPaymentOrders(userId, limit);
}

export async function getPaymentOrderById(orderId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("payment_orders")
    .select(PAYMENT_ORDER_SELECT)
    .eq("order_id", orderId)
    .maybeSingle<PaymentOrder>();

  if (error) {
    if (isMissingPaymentInfrastructure(error)) {
      console.warn("支付基础表暂不可用，订单详情回退为空。", error);
      return null;
    }

    throw error;
  }

  return data;
}

async function updateOrderPaymentLifecycle(
  orderId: string,
  input: {
    providerName?: string | null;
    tradeNo?: string | null;
    buyerAccount?: string | null;
    buyerId?: string | null;
    paymentRequest?: Record<string, unknown>;
    paymentResponse?: Record<string, unknown>;
    notifyPayload?: Record<string, unknown> | null;
    refundPayload?: Record<string, unknown> | null;
    notifyStatus?: string | null;
    failureReason?: string | null;
    status?: PaymentOrder["status"];
    paidAt?: string | null;
    refundedAt?: string | null;
    closedAt?: string | null;
  },
) {
  const supabase = getSupabaseAdmin();
  const updatePayload: Record<string, unknown> = {};

  if (input.providerName !== undefined) {
    updatePayload.provider_name = input.providerName;
  }
  if (input.tradeNo !== undefined) {
    updatePayload.trade_no = input.tradeNo;
  }
  if (input.buyerAccount !== undefined) {
    updatePayload.buyer_account = input.buyerAccount;
  }
  if (input.buyerId !== undefined) {
    updatePayload.buyer_id = input.buyerId;
  }
  if (input.paymentRequest !== undefined) {
    updatePayload.payment_request = input.paymentRequest;
  }
  if (input.paymentResponse !== undefined) {
    updatePayload.payment_response = input.paymentResponse;
  }
  if (input.notifyPayload !== undefined) {
    updatePayload.notify_payload = input.notifyPayload;
  }
  if (input.refundPayload !== undefined) {
    updatePayload.refund_payload = input.refundPayload;
  }
  if (input.notifyStatus !== undefined) {
    updatePayload.notify_status = input.notifyStatus;
  }
  if (input.failureReason !== undefined) {
    updatePayload.failure_reason = input.failureReason;
  }
  if (input.status !== undefined) {
    updatePayload.status = input.status;
  }
  if (input.paidAt !== undefined) {
    updatePayload.paid_at = input.paidAt;
  }
  if (input.refundedAt !== undefined) {
    updatePayload.refunded_at = input.refundedAt;
  }
  if (input.closedAt !== undefined) {
    updatePayload.closed_at = input.closedAt;
  }

  const { data, error } = await supabase
    .from("payment_orders")
    .update(updatePayload as never)
    .eq("order_id", orderId)
    .select(PAYMENT_ORDER_SELECT)
    .single<PaymentOrder>();

  if (error) {
    throw asPaymentInfrastructureError(error);
  }

  return data;
}

export async function refundPaymentOrder(input: {
  orderId: string;
  reason?: string;
}) {
  const order = await getPaymentOrderById(input.orderId);

  if (!order) {
    throw new Error("没有找到这个订单。");
  }

  if (order.status === "refunded") {
    return order;
  }

  if (order.status !== "paid") {
    throw new Error("只有已支付订单可以退款。");
  }

  const gateway = getPaymentGateway(order.payment_method);

  if (!gateway.refundPayment) {
    throw new Error("当前支付方式不支持退款。");
  }

  const reason = input.reason?.trim() || "后台管理员发起全额退款";
  const refundResult = await gateway.refundPayment({
    orderId: order.order_id,
    tradeNo: order.trade_no,
    amount: order.amount,
    reason,
    refundRequestId: createRefundRequestId(order.order_id),
  });

  if (!refundResult.success) {
    await updateOrderPaymentLifecycle(order.order_id, {
      refundPayload: refundResult.raw,
      failureReason: "支付宝退款返回未成功",
    });
    throw new Error("支付宝退款返回未成功，请在支付宝后台核对。");
  }

  await revokePaidOrderBenefit(order, reason);

  return updateOrderPaymentLifecycle(order.order_id, {
    status: "refunded",
    providerName: refundResult.provider ?? order.provider_name,
    tradeNo: refundResult.tradeNo ?? order.trade_no,
    refundPayload: {
      refundRequestId: refundResult.refundNo,
      refundAmount: refundResult.refundAmount,
      reason,
      raw: refundResult.raw,
    },
    notifyStatus: "REFUNDED",
    failureReason: null,
    refundedAt: new Date().toISOString(),
  });
}

export async function listAdminPaymentOrders(limit = 80) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("payment_orders")
    .select(PAYMENT_ORDER_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<PaymentOrder[]>();

  if (error) {
    if (isMissingPaymentInfrastructure(error)) {
      console.warn("支付基础表暂不可用，后台订单列表回退为空。", error);
      return [];
    }

    throw error;
  }

  return enrichOrdersWithUsers(data ?? []);
}

export async function createActivationCodeBatch(input: {
  name: string;
  type: "coin" | "subscription";
  value: string;
  quantity: number;
  expireAt?: string | null;
  createdBy: string;
}) {
  const supabase = getSupabaseAdmin();
  const quantity = Math.min(500, Math.max(1, Math.floor(input.quantity)));
  const { data: batch, error: batchError } = await supabase
    .from("activation_code_batches")
    .insert({
      name: input.name.trim() || "未命名激活码批次",
      code_type: input.type,
      value: input.value,
      quantity,
      expire_at: input.expireAt ?? null,
      created_by: input.createdBy,
    } as never)
    .select("id, name, code_type, value, quantity, expire_at, created_by, created_at")
    .single<ActivationCodeBatch>();

  if (batchError) {
    throw asPaymentInfrastructureError(batchError);
  }

  const plaintextCodes = Array.from({ length: quantity }, () =>
    createReadableActivationCode(),
  );

  const rows = plaintextCodes.map((code) => {
    const codeHash = hashActivationCode(code);

    return {
      code_hash: codeHash,
      plain_code: code,
      code_preview: `${code.slice(0, 4)}-****-${code.slice(-4)}`,
      type: input.type,
      value: input.value,
      batch_id: batch.id,
      created_by: input.createdBy,
      expire_at: input.expireAt ?? null,
      signature: signActivationCode({
        codeHash,
        type: input.type,
        value: input.value,
        expireAt: input.expireAt ?? null,
      }),
    };
  });

  const { error: codeError } = await supabase
    .from("activation_codes")
    .insert(rows as never);

  if (codeError) {
    if (!String(codeError?.message ?? "").includes("plain_code")) {
      throw asPaymentInfrastructureError(codeError);
    }

    const fallbackRows = rows.map((item) => ({
      code_hash: item.code_hash,
      code_preview: item.code_preview,
      type: item.type,
      value: item.value,
      batch_id: item.batch_id,
      created_by: item.created_by,
      expire_at: item.expire_at,
      signature: item.signature,
    }));
    const { error: fallbackError } = await supabase
      .from("activation_codes")
      .insert(fallbackRows as never);

    if (fallbackError) {
      throw asPaymentInfrastructureError(fallbackError);
    }
  }

  return {
    batch,
    plaintextCodes,
  };
}

export async function listActivationCodeBatches(limit = 30) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("activation_code_batches")
    .select("id, name, code_type, value, quantity, expire_at, created_by, created_at")
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<ActivationCodeBatch[]>();

  if (error) {
    if (isMissingPaymentInfrastructure(error)) {
      console.warn("支付基础表暂不可用，激活码批次回退为空。", error);
      return [];
    }

    throw error;
  }

  return data ?? [];
}

export async function listActivationCodesByBatch(batchId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("activation_codes")
    .select(
      "id, code_preview, plain_code, type, value, status, used_by_user_id, used_at, batch_id, expire_at, created_at",
    )
    .eq("batch_id", batchId)
    .order("created_at", { ascending: false })
    .returns<ActivationCodeRecord[]>();

  let codes = data ?? [];

  if (error) {
    const missingPlainCode =
      "message" in error &&
      typeof error.message === "string" &&
      error.message.includes("plain_code");

    if (missingPlainCode) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("activation_codes")
        .select(
          "id, code_preview, type, value, status, used_by_user_id, used_at, batch_id, expire_at, created_at",
        )
        .eq("batch_id", batchId)
        .order("created_at", { ascending: false })
        .returns<ActivationCodeRecord[]>();

      if (fallbackError) {
        throw asPaymentInfrastructureError(fallbackError);
      }

      codes = fallbackData ?? [];
    } else if (isMissingPaymentInfrastructure(error)) {
      console.warn("支付基础表暂不可用，激活码明细回退为空。", error);
      return [];
    } else {
      throw error;
    }
  }

  const usedUserIds = Array.from(
    new Set(codes.map((item) => item.used_by_user_id).filter(Boolean)),
  ) as string[];

  if (!usedUserIds.length) {
    return codes;
  }

  const { data: usedUsers, error: userError } = await supabase
    .from("users")
    .select("id, phone, nickname")
    .in("id", usedUserIds)
    .returns<Array<{ id: string; phone: string; nickname: string | null }>>();

  if (userError) {
    throw userError;
  }

  const userMap = new Map((usedUsers ?? []).map((user) => [user.id, user]));

  return codes.map((item) => ({
    ...item,
    used_by_user: item.used_by_user_id
      ? userMap.get(item.used_by_user_id) ?? null
      : null,
  }));
}

export async function cancelUserSubscription(subscriptionId: string, userId: string) {
  const supabase = getSupabaseAdmin();
  const normalizedSubscriptionId = subscriptionId.trim();

  if (!normalizedSubscriptionId) {
    throw new Error("缺少要取消的订阅 ID。");
  }

  const { data: subscription, error: fetchError } = await supabase
    .from("user_subscriptions")
    .select(
      "id, user_id, plan_id, status, start_date, end_date, last_grant_date, source, reference_id, created_at, subscription_plans(name, daily_coins, duration_days, price)",
    )
    .eq("id", normalizedSubscriptionId)
    .eq("user_id", userId)
    .maybeSingle<UserSubscription>();

  if (fetchError) {
    throw asPaymentInfrastructureError(fetchError);
  }

  if (!subscription) {
    throw new Error("没有找到这个订阅记录。");
  }

  if (subscription.status !== "active") {
    throw new Error("这个订阅当前不是生效状态，无法取消。");
  }

  const { data, error } = await supabase
    .from("user_subscriptions")
    .update({
      status: "cancelled",
    } as never)
    .eq("id", normalizedSubscriptionId)
    .eq("user_id", userId)
    .eq("status", "active")
    .select(
      "id, user_id, plan_id, status, start_date, end_date, last_grant_date, source, reference_id, created_at, subscription_plans(name, daily_coins, duration_days, price)",
    )
    .single<UserSubscription>();

  if (error) {
    throw asPaymentInfrastructureError(error);
  }

  return data;
}

export async function redeemActivationCode(userId: string, code: string) {
  const supabase = getSupabaseAdmin();
  const codeHash = hashActivationCode(code);
  const { data: activationCode, error } = await supabase
    .from("activation_codes")
    .select("id, code_hash, type, value, status, used_by_user_id, used_at, batch_id, expire_at, signature, created_at")
    .eq("code_hash", codeHash)
    .maybeSingle<ActivationCodeRecord & { code_hash: string; signature: string }>();

  if (error) {
    throw error;
  }

  if (!activationCode) {
    throw new Error("没有找到这个激活码，请检查后再试。");
  }

  if (activationCode.status !== "unused") {
    throw new Error("这个激活码已经使用或已失效。");
  }

  if (activationCode.expire_at && new Date(activationCode.expire_at) < new Date()) {
    throw new Error("这个激活码已经过期。");
  }

  const expectedSignature = signActivationCode({
    codeHash,
    type: activationCode.type,
    value: activationCode.value,
    expireAt: activationCode.expire_at,
  });

  if (activationCode.signature !== expectedSignature) {
    throw new Error("激活码签名校验失败。");
  }

  const { data: updatedActivationCode, error: updateError } = await supabase
    .from("activation_codes")
    .update({
      status: "used",
      used_by_user_id: userId,
      used_at: new Date().toISOString(),
    } as never)
    .eq("id", activationCode.id)
    .eq("status", "unused")
    .select("id")
    .maybeSingle<{ id: string }>();

  if (updateError) {
    throw updateError;
  }

  if (!updatedActivationCode) {
    throw new Error("这个激活码已经被使用，请刷新后再试。");
  }

  if (activationCode.type === "coin") {
    const coins = Math.max(1, Math.floor(Number(activationCode.value)));
    const balanceAfter = await addCredits(userId, coins, {
      reasonCode: "exchange_code",
      reasonLabel: "激活码兑换",
      note: `成功兑换激活码 ${activationCode.id}。`,
    });

    await createSignedCoinTransaction({
      user_id: userId,
      amount: coins,
      type: "exchange_code",
      reference_id: activationCode.id,
      balance_after: balanceAfter,
    });

    return {
      type: "coin" as const,
      coins,
    };
  }

  const subscription = await createUserSubscription({
    userId,
    planId: activationCode.value,
    source: "activation_code",
    referenceId: activationCode.id,
  });

  return {
    type: "subscription" as const,
    subscription,
  };
}

export async function grantDailySubscriptionCoins(targetDate = new Date()) {
  const supabase = getSupabaseAdmin();
  const today = toDateOnly(targetDate);

  const { data: subscriptions, error } = await supabase
    .from("user_subscriptions")
    .select(
      "id, user_id, plan_id, status, start_date, end_date, last_grant_date, source, reference_id, created_at, subscription_plans(name, daily_coins, duration_days, price)",
    )
    .eq("status", "active")
    .lte("start_date", today)
    .gte("end_date", today)
    .or(`last_grant_date.is.null,last_grant_date.neq.${today}`)
    .returns<UserSubscription[]>();

  if (error) {
    throw error;
  }

  const granted: Array<{ subscriptionId: string; userId: string; amount: number }> = [];

  for (const subscription of subscriptions ?? []) {
    const amount = subscription.subscription_plans?.daily_coins ?? 0;

    if (!amount) {
      continue;
    }

    const { data: grantRow, error: grantError } = await supabase
      .from("subscription_grants")
      .insert({
        subscription_id: subscription.id,
        user_id: subscription.user_id,
        grant_date: today,
        amount,
      } as never)
      .select("id")
      .single<{ id: string }>();

    if (grantError) {
      continue;
    }

    await ensureUserCredits(subscription.user_id);
    const balanceAfter = await addCredits(subscription.user_id, amount, {
      reasonCode: "subscription_daily",
      reasonLabel: "订阅每日发放",
      note: `${subscription.subscription_plans?.name ?? "订阅套餐"} ${today} 每日魔法币到账。`,
    });

    await createSignedCoinTransaction({
      user_id: subscription.user_id,
      amount,
      type: "subscription_daily",
      reference_id: grantRow.id,
      balance_after: balanceAfter,
    });

    await supabase
      .from("user_subscriptions")
      .update({ last_grant_date: today } as never)
      .eq("id", subscription.id);

    granted.push({
      subscriptionId: subscription.id,
      userId: subscription.user_id,
      amount,
    });
  }

  await supabase
    .from("user_subscriptions")
    .update({ status: "expired" } as never)
    .eq("status", "active")
    .lt("end_date", today);

  return {
    date: today,
    count: granted.length,
    granted,
  };
}

export const PaymentService = {
  async createPayment(
    order: PaymentOrder,
    input: {
      title: string;
      returnUrl?: string;
      notifyUrl?: string;
      detail?: Record<string, unknown>;
    },
  ) {
    const gateway = getPaymentGateway(order.payment_method);
    return gateway.createPayment(
      {
        orderId: order.order_id,
        amount: order.amount,
        title: input.title,
        detail: input.detail,
      },
      {
        returnUrl: input.returnUrl,
        notifyUrl: input.notifyUrl,
      },
    );
  },
  async parseNotifyPayload(method: PaymentMethod, request: Request) {
    const gateway = getPaymentGateway(method);
    return gateway.parseNotifyPayload(request);
  },
};
