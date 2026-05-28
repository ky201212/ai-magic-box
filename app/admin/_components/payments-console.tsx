"use client";

import { useMemo, useState } from "react";

type PaymentsConsoleProps = {
  initialRate: {
    coin_per_yuan: number;
  };
  initialPackages: Array<{
    id: string;
    name: string;
    coins: number;
    price: number;
    sort_order: number;
    is_active: boolean;
  }>;
  initialPlans: Array<{
    id: string;
    name: string;
    daily_coins: number;
    duration_days: number;
    refresh_time: string;
    price: number;
    is_active: boolean;
  }>;
  initialOrders: Array<{
    order_id: string;
    user_id: string;
    order_type: "coin_purchase" | "subscription";
    amount: number;
    status: string;
    payment_method: string;
    trade_no: string | null;
    provider_name: string | null;
    buyer_account: string | null;
    buyer_id: string | null;
    notify_status: string | null;
    failure_reason: string | null;
    created_at: string;
    paid_at: string | null;
    refunded_at: string | null;
    closed_at: string | null;
    detail: Record<string, unknown>;
    payment_request: Record<string, unknown>;
    payment_response: Record<string, unknown>;
    notify_payload: Record<string, unknown> | null;
    refund_payload: Record<string, unknown> | null;
    user: {
      id: string;
      phone: string;
      nickname: string | null;
    } | null;
  }>;
  initialBatches: Array<{
    id: string;
    name: string;
    code_type: "coin" | "subscription";
    value: string;
    quantity: number;
    expire_at: string | null;
    created_at: string;
  }>;
};

type SaveState = "idle" | "saving" | "success" | "error";
type ActivationCodeDetail = {
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
type BatchCodeState = {
  status: "idle" | "loading" | "ready" | "error";
  codes: ActivationCodeDetail[];
  message?: string;
};
type PlanFormState = {
  name: string;
  dailyCoins: number;
  durationDays: number;
  refreshTime: string;
  price: number;
  isActive: boolean;
};

type CoinPackageFormState = {
  name: string;
  coins: number;
  price: number;
  sortOrder: number;
  isActive: boolean;
};

function createDefaultCoinPackageDraft(): CoinPackageFormState {
  return {
    name: "",
    coins: 100,
    price: 1000,
    sortOrder: 10,
    isActive: true,
  };
}

function createCoinPackageDraftFromPackage(
  packageRecord: PaymentsConsoleProps["initialPackages"][number],
): CoinPackageFormState {
  return {
    name: packageRecord.name,
    coins: packageRecord.coins,
    price: packageRecord.price,
    sortOrder: packageRecord.sort_order,
    isActive: packageRecord.is_active,
  };
}

function createDefaultPlanDraft(): PlanFormState {
  return {
    name: "",
    dailyCoins: 300,
    durationDays: 30,
    refreshTime: "06:00:00",
    price: 1900,
    isActive: true,
  };
}

function createPlanDraftFromPlan(
  plan: PaymentsConsoleProps["initialPlans"][number],
): PlanFormState {
  return {
    name: plan.name,
    dailyCoins: plan.daily_coins,
    durationDays: plan.duration_days,
    refreshTime: plan.refresh_time,
    price: plan.price,
    isActive: plan.is_active,
  };
}

function formatPrice(price: number) {
  return `¥${(price / 100).toFixed(2)}`;
}

function formatDateTime(value: string | null) {
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

function formatOrderType(orderType: "coin_purchase" | "subscription") {
  return orderType === "coin_purchase" ? "魔法币充值" : "订阅购买";
}

function formatPaymentMethod(method: string) {
  if (method === "alipay_pc") {
    return "支付宝";
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
    return "已关闭";
  }

  if (status === "refunded") {
    return "已退款";
  }

  return status;
}

function getOrderStatusTone(status: string) {
  if (status === "paid") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "pending") {
    return "bg-amber-50 text-amber-700";
  }

  if (status === "refunded") {
    return "bg-sky-50 text-sky-700";
  }

  return "bg-slate-100 text-slate-600";
}

function summarizeOrderDetail(
  order: PaymentsConsoleProps["initialOrders"][number],
) {
  if (order.order_type === "subscription") {
    const planName = typeof order.detail.planName === "string" ? order.detail.planName : "订阅套餐";
    const durationDays =
      typeof order.detail.durationDays === "number" ? order.detail.durationDays : null;
    const dailyCoins =
      typeof order.detail.dailyCoins === "number" ? order.detail.dailyCoins : null;

    return `${planName}${durationDays ? ` / ${durationDays} 天` : ""}${
      dailyCoins ? ` / 每日 ${dailyCoins} 币` : ""
    }`;
  }

  const coins = typeof order.detail.coins === "number" ? order.detail.coins : null;
  return coins ? `${coins} 魔法币` : "魔法币充值";
}

function formatJson(value: Record<string, unknown> | null | undefined) {
  if (!value || !Object.keys(value).length) {
    return "暂无";
  }

  return JSON.stringify(value, null, 2);
}

function createCodePreview(code: string) {
  return `${code.slice(0, 4)}-****-${code.slice(-4)}`;
}

function getActivationCodeStatusLabel(status: ActivationCodeDetail["status"]) {
  if (status === "used") {
    return "已激活";
  }

  if (status === "disabled") {
    return "已停用";
  }

  return "未激活";
}

function getActivationCodeStatusTone(status: ActivationCodeDetail["status"]) {
  if (status === "used") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "disabled") {
    return "bg-slate-100 text-slate-500";
  }

  return "bg-amber-50 text-amber-700";
}

export function PaymentsConsole({
  initialRate,
  initialPackages,
  initialPlans,
  initialOrders,
  initialBatches,
}: PaymentsConsoleProps) {
  const [coinPerYuan, setCoinPerYuan] = useState(initialRate.coin_per_yuan);
  const [coinPackages, setCoinPackages] = useState(initialPackages);
  const [plans, setPlans] = useState(initialPlans);
  const [orders, setOrders] = useState(initialOrders);
  const [batches, setBatches] = useState(initialBatches);
  const [rateState, setRateState] = useState<SaveState>("idle");
  const [planState, setPlanState] = useState<SaveState>("idle");
  const [batchState, setBatchState] = useState<SaveState>("idle");
  const [coinPackageState, setCoinPackageState] = useState<SaveState>("idle");
  const [orderActionState, setOrderActionState] = useState<
    Record<string, "syncing" | "refunding" | undefined>
  >({});
  const [orderMessage, setOrderMessage] = useState("");
  const [plainCodes, setPlainCodes] = useState<string[]>([]);
  const [planDraft, setPlanDraft] = useState<PlanFormState>(createDefaultPlanDraft);
  const [coinPackageDraft, setCoinPackageDraft] = useState<CoinPackageFormState>(
    createDefaultCoinPackageDraft,
  );
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editingCoinPackageId, setEditingCoinPackageId] = useState<string | null>(
    null,
  );
  const [planMessage, setPlanMessage] = useState("");
  const [coinPackageMessage, setCoinPackageMessage] = useState("");
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const [deletingCoinPackageId, setDeletingCoinPackageId] = useState<string | null>(
    null,
  );
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);
  const [batchCodeDetails, setBatchCodeDetails] = useState<
    Record<string, BatchCodeState>
  >({});
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [batchDraft, setBatchDraft] = useState({
    name: "",
    type: "coin" as "coin" | "subscription",
    value: "100",
    quantity: 10,
    expireAt: "",
  });

  const activeCoinPackagesCount = useMemo(
    () => coinPackages.filter((packageRecord) => packageRecord.is_active).length,
    [coinPackages],
  );

  const pendingOrdersCount = useMemo(
    () => orders.filter((order) => order.status === "pending").length,
    [orders],
  );

  const planSubmitLabel =
    planState === "saving"
      ? "保存中"
      : planState === "success"
        ? "已保存"
        : planState === "error"
          ? "保存失败"
          : editingPlanId
            ? "保存修改"
            : "创建套餐";

  const coinPackageSubmitLabel =
    coinPackageState === "saving"
      ? "保存中"
      : coinPackageState === "success"
        ? "已保存"
        : coinPackageState === "error"
          ? "保存失败"
          : editingCoinPackageId
            ? "保存修改"
            : "创建档位";

  const resetPlanEditor = () => {
    setPlanDraft(createDefaultPlanDraft());
    setEditingPlanId(null);
  };

  const resetCoinPackageEditor = () => {
    setCoinPackageDraft(createDefaultCoinPackageDraft());
    setEditingCoinPackageId(null);
  };

  const handleSaveRate = async () => {
    setRateState("saving");

    try {
      const response = await fetch("/api/admin/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "update_rate",
          coinPerYuan,
        }),
      });

      if (!response.ok) {
        throw new Error("汇率保存失败");
      }

      setRateState("success");
    } catch {
      setRateState("error");
    } finally {
      window.setTimeout(() => setRateState("idle"), 1800);
    }
  };

  const handleSavePlan = async () => {
    setPlanState("saving");
    setPlanMessage("");

    try {
      const response = await fetch("/api/admin/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "upsert_plan",
          plan: {
            id: editingPlanId ?? undefined,
            ...planDraft,
          },
        }),
      });

      const payload = (await response.json()) as {
        plan?: PaymentsConsoleProps["initialPlans"][number];
        error?: string;
      };

      if (!response.ok || !payload.plan) {
        throw new Error(payload.error ?? "套餐保存失败");
      }

      setPlans((current) => {
        const next = current.filter((item) => item.id !== payload.plan!.id);
        return [payload.plan!, ...next];
      });
      resetPlanEditor();
      setPlanMessage(editingPlanId ? "套餐已更新。" : "套餐已创建。");
      setPlanState("success");
    } catch (error) {
      setPlanMessage(error instanceof Error ? error.message : "套餐保存失败。");
      setPlanState("error");
    } finally {
      window.setTimeout(() => setPlanState("idle"), 1800);
    }
  };

  const handleSaveCoinPackage = async () => {
    setCoinPackageState("saving");
    setCoinPackageMessage("");

    try {
      const response = await fetch("/api/admin/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "upsert_coin_package",
          package: {
            id: editingCoinPackageId ?? undefined,
            ...coinPackageDraft,
          },
        }),
      });
      const payload = (await response.json()) as {
        package?: PaymentsConsoleProps["initialPackages"][number];
        error?: string;
      };

      if (!response.ok || !payload.package) {
        throw new Error(payload.error ?? "充值档位保存失败");
      }

      setCoinPackages((current) => {
        const next = current.filter((item) => item.id !== payload.package!.id);
        return [payload.package!, ...next].sort(
          (left, right) => left.sort_order - right.sort_order || left.price - right.price,
        );
      });
      resetCoinPackageEditor();
      setCoinPackageMessage(editingCoinPackageId ? "充值档位已更新。" : "充值档位已创建。");
      setCoinPackageState("success");
    } catch (error) {
      setCoinPackageMessage(
        error instanceof Error ? error.message : "充值档位保存失败。",
      );
      setCoinPackageState("error");
    } finally {
      window.setTimeout(() => setCoinPackageState("idle"), 1800);
    }
  };

  const handleEditCoinPackage = (
    packageRecord: PaymentsConsoleProps["initialPackages"][number],
  ) => {
    setEditingCoinPackageId(packageRecord.id);
    setCoinPackageDraft(createCoinPackageDraftFromPackage(packageRecord));
    setCoinPackageMessage("");
    setCoinPackageState("idle");
  };

  const handleDeleteCoinPackage = async (
    packageRecord: PaymentsConsoleProps["initialPackages"][number],
  ) => {
    const confirmed = window.confirm(`确定删除充值档位“${packageRecord.name}”吗？`);

    if (!confirmed) {
      return;
    }

    setDeletingCoinPackageId(packageRecord.id);
    setCoinPackageMessage("");

    try {
      const response = await fetch("/api/admin/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "delete_coin_package",
          packageId: packageRecord.id,
        }),
      });
      const payload = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "充值档位删除失败");
      }

      setCoinPackages((current) =>
        current.filter((item) => item.id !== packageRecord.id),
      );
      if (editingCoinPackageId === packageRecord.id) {
        resetCoinPackageEditor();
      }
      setCoinPackageMessage(`充值档位“${packageRecord.name}”已删除。`);
      setCoinPackageState("success");
    } catch (error) {
      setCoinPackageMessage(
        error instanceof Error ? error.message : "充值档位删除失败。",
      );
      setCoinPackageState("error");
    } finally {
      setDeletingCoinPackageId(null);
      window.setTimeout(() => setCoinPackageState("idle"), 1800);
    }
  };

  const handleEditPlan = (plan: PaymentsConsoleProps["initialPlans"][number]) => {
    setEditingPlanId(plan.id);
    setPlanDraft(createPlanDraftFromPlan(plan));
    setPlanMessage("");
    setPlanState("idle");
  };

  const handleDeletePlan = async (plan: PaymentsConsoleProps["initialPlans"][number]) => {
    const confirmed = window.confirm(`确定删除套餐“${plan.name}”吗？`);

    if (!confirmed) {
      return;
    }

    setDeletingPlanId(plan.id);
    setPlanMessage("");

    try {
      const response = await fetch("/api/admin/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "delete_plan",
          planId: plan.id,
        }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "套餐删除失败");
      }

      setPlans((current) => current.filter((item) => item.id !== plan.id));
      if (editingPlanId === plan.id) {
        resetPlanEditor();
      }
      setPlanMessage(`套餐“${plan.name}”已删除。`);
      setPlanState("success");
    } catch (error) {
      setPlanMessage(error instanceof Error ? error.message : "套餐删除失败。");
      setPlanState("error");
    } finally {
      setDeletingPlanId(null);
      window.setTimeout(() => setPlanState("idle"), 1800);
    }
  };

  const handleToggleBatchDetails = async (
    batch: PaymentsConsoleProps["initialBatches"][number],
  ) => {
    if (expandedBatchId === batch.id) {
      setExpandedBatchId(null);
      return;
    }

    setExpandedBatchId(batch.id);

    if (batchCodeDetails[batch.id]?.status === "ready") {
      return;
    }

    setBatchCodeDetails((current) => ({
      ...current,
      [batch.id]: {
        status: "loading",
        codes: current[batch.id]?.codes ?? [],
      },
    }));

    try {
      const response = await fetch(`/api/admin/payments?batchId=${batch.id}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        codes?: ActivationCodeDetail[];
        error?: string;
      };

      if (!response.ok || !payload.codes) {
        throw new Error(payload.error ?? "激活码明细读取失败");
      }

      setBatchCodeDetails((current) => ({
        ...current,
        [batch.id]: {
          status: "ready",
          codes: payload.codes!,
        },
      }));
    } catch (error) {
      setBatchCodeDetails((current) => ({
        ...current,
        [batch.id]: {
          status: "error",
          codes: current[batch.id]?.codes ?? [],
          message:
            error instanceof Error ? error.message : "激活码明细读取失败",
        },
      }));
    }
  };

  const handleCopyActivationCode = async (code: ActivationCodeDetail) => {
    if (!code.plain_code) {
      return;
    }

    try {
      await navigator.clipboard.writeText(code.plain_code);
      setCopiedCodeId(code.id);
      window.setTimeout(() => {
        setCopiedCodeId((current) => (current === code.id ? null : current));
      }, 1200);
    } catch {
      window.alert("复制失败，请手动选择文本复制。");
    }
  };

  const handleCopyBatchCodes = async (batchId: string) => {
    const codes = batchCodeDetails[batchId]?.codes ?? [];
    const plainText = codes
      .map((code) => code.plain_code)
      .filter((code): code is string => Boolean(code))
      .join("\n");

    if (!plainText) {
      window.alert("这个批次没有可复制的明文激活码。");
      return;
    }

    try {
      await navigator.clipboard.writeText(plainText);
      setCopiedCodeId(`${batchId}:all`);
      window.setTimeout(() => {
        setCopiedCodeId((current) => (current === `${batchId}:all` ? null : current));
      }, 1200);
    } catch {
      window.alert("复制失败，请手动选择文本复制。");
    }
  };

  const handleCreateBatch = async () => {
    setBatchState("saving");

    try {
      const response = await fetch("/api/admin/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "create_activation_batch",
          batch: {
            ...batchDraft,
            expireAt: batchDraft.expireAt || null,
          },
        }),
      });

      const payload = (await response.json()) as {
        batch?: PaymentsConsoleProps["initialBatches"][number];
        plaintextCodes?: string[];
      };

      if (!response.ok || !payload.batch) {
        throw new Error("激活码生成失败");
      }

      setBatches((current) => [payload.batch!, ...current]);
      setPlainCodes(payload.plaintextCodes ?? []);
      const plainCodes = payload.plaintextCodes ?? [];
      if (plainCodes.length) {
        setBatchCodeDetails((current) => ({
          ...current,
          [payload.batch!.id]: {
            status: "ready",
            codes: plainCodes.map((code, index) => ({
              id: `${payload.batch!.id}-${index}`,
              code_preview: createCodePreview(code),
              plain_code: code,
              type: payload.batch!.code_type,
              value: payload.batch!.value,
              status: "unused",
              used_by_user_id: null,
              used_at: null,
              batch_id: payload.batch!.id,
              expire_at: payload.batch!.expire_at,
              created_at: payload.batch!.created_at,
              used_by_user: null,
            })),
          },
        }));
        setExpandedBatchId(payload.batch!.id);
      }
      setBatchState("success");
    } catch {
      setBatchState("error");
    } finally {
      window.setTimeout(() => setBatchState("idle"), 1800);
    }
  };

  const replaceOrder = (order: PaymentsConsoleProps["initialOrders"][number]) => {
    setOrders((current) =>
      current.map((item) => (item.order_id === order.order_id ? order : item)),
    );
  };

  const handleSyncOrder = async (
    order: PaymentsConsoleProps["initialOrders"][number],
  ) => {
    setOrderActionState((current) => ({
      ...current,
      [order.order_id]: "syncing",
    }));
    setOrderMessage("");

    try {
      const response = await fetch("/api/admin/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "sync_order",
          orderId: order.order_id,
        }),
      });
      const payload = (await response.json()) as {
        order?: PaymentsConsoleProps["initialOrders"][number];
        error?: string;
      };

      if (!response.ok || !payload.order) {
        throw new Error(payload.error ?? "订单查单失败");
      }

      replaceOrder(payload.order);
      setOrderMessage("订单状态已从支付宝同步。");
    } catch (error) {
      setOrderMessage(error instanceof Error ? error.message : "订单查单失败。");
    } finally {
      setOrderActionState((current) => ({
        ...current,
        [order.order_id]: undefined,
      }));
    }
  };

  const handleRefundOrder = async (
    order: PaymentsConsoleProps["initialOrders"][number],
  ) => {
    const reason =
      window.prompt(
        `确认给订单 ${order.order_id} 发起全额退款？请输入退款原因：`,
        "用户申请退款",
      ) ?? "";

    if (!reason.trim()) {
      return;
    }

    setOrderActionState((current) => ({
      ...current,
      [order.order_id]: "refunding",
    }));
    setOrderMessage("");

    try {
      const response = await fetch("/api/admin/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "refund_order",
          orderId: order.order_id,
          reason,
        }),
      });
      const payload = (await response.json()) as {
        order?: PaymentsConsoleProps["initialOrders"][number];
        error?: string;
      };

      if (!response.ok || !payload.order) {
        throw new Error(payload.error ?? "订单退款失败");
      }

      replaceOrder(payload.order);
      setOrderMessage("订单已退款，权益已同步回收。");
    } catch (error) {
      setOrderMessage(error instanceof Error ? error.message : "订单退款失败。");
    } finally {
      setOrderActionState((current) => ({
        ...current,
        [order.order_id]: undefined,
      }));
    }
  };

  return (
    <div className="space-y-5">
      <section className="grid gap-4 xl:grid-cols-4">
        <div className="rounded-[28px] border border-white/80 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
          <p className="text-xs font-bold tracking-[0.14em] text-slate-400">当前汇率</p>
          <p className="mt-3 text-4xl font-black text-slate-900">{coinPerYuan}</p>
          <p className="mt-2 text-sm text-slate-500">1 元对应魔法币</p>
        </div>
        <div className="rounded-[28px] border border-white/80 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
          <p className="text-xs font-bold tracking-[0.14em] text-slate-400">充值档位</p>
          <p className="mt-3 text-4xl font-black text-slate-900">
            {activeCoinPackagesCount}
          </p>
          <p className="mt-2 text-sm text-slate-500">当前上架充值包</p>
        </div>
        <div className="rounded-[28px] border border-white/80 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
          <p className="text-xs font-bold tracking-[0.14em] text-slate-400">激活码批次</p>
          <p className="mt-3 text-4xl font-black text-slate-900">{batches.length}</p>
          <p className="mt-2 text-sm text-slate-500">可分发批次总数</p>
        </div>
        <div className="rounded-[28px] border border-white/80 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
          <p className="text-xs font-bold tracking-[0.14em] text-slate-400">待支付订单</p>
          <p className="mt-3 text-4xl font-black text-slate-900">{pendingOrdersCount}</p>
          <p className="mt-2 text-sm text-slate-500">待完成或待排查的订单</p>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-[30px] border border-white/80 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
          <p className="text-lg font-black text-slate-800">
            {editingCoinPackageId ? "编辑充值档位" : "新建充值档位"}
          </p>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            前台充值只会使用这里配置的档位 ID，下单时服务器重新读取金额和魔法币数量。
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-bold text-slate-600">
              档位名称
              <input
                value={coinPackageDraft.name}
                onChange={(event) =>
                  setCoinPackageDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
              />
            </label>
            <label className="block text-sm font-bold text-slate-600">
              到账魔法币
              <input
                type="number"
                min={1}
                value={coinPackageDraft.coins}
                onChange={(event) =>
                  setCoinPackageDraft((current) => ({
                    ...current,
                    coins: Number(event.target.value),
                  }))
                }
                className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
              />
            </label>
            <label className="block text-sm font-bold text-slate-600">
              售价（分）
              <input
                type="number"
                min={1}
                value={coinPackageDraft.price}
                onChange={(event) =>
                  setCoinPackageDraft((current) => ({
                    ...current,
                    price: Number(event.target.value),
                  }))
                }
                className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
              />
            </label>
            <label className="block text-sm font-bold text-slate-600">
              排序
              <input
                type="number"
                min={0}
                value={coinPackageDraft.sortOrder}
                onChange={(event) =>
                  setCoinPackageDraft((current) => ({
                    ...current,
                    sortOrder: Number(event.target.value),
                  }))
                }
                className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
              />
            </label>
            <label className="block text-sm font-bold text-slate-600">
              上架状态
              <select
                value={coinPackageDraft.isActive ? "active" : "inactive"}
                onChange={(event) =>
                  setCoinPackageDraft((current) => ({
                    ...current,
                    isActive: event.target.value === "active",
                  }))
                }
                className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
              >
                <option value="active">上架</option>
                <option value="inactive">下架</option>
              </select>
            </label>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleSaveCoinPackage()}
              className="rounded-full bg-slate-900 px-5 py-3 text-sm font-black text-white"
            >
              {coinPackageSubmitLabel}
            </button>
            {editingCoinPackageId ? (
              <button
                type="button"
                onClick={resetCoinPackageEditor}
                className="rounded-full border border-slate-200 px-5 py-3 text-sm font-black text-slate-600"
              >
                取消编辑
              </button>
            ) : null}
          </div>
          {coinPackageMessage ? (
            <p
              className={`mt-4 text-sm ${
                coinPackageState === "error" ? "text-rose-500" : "text-slate-500"
              }`}
            >
              {coinPackageMessage}
            </p>
          ) : null}
        </article>

        <article className="rounded-[30px] border border-white/80 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
          <p className="text-lg font-black text-slate-800">充值档位列表</p>
          <div className="mt-5 space-y-3">
            {coinPackages.map((packageRecord) => (
              <div
                key={packageRecord.id}
                className="rounded-[22px] border border-slate-100 bg-slate-50 px-5 py-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-black text-slate-800">
                      {packageRecord.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      到账 {packageRecord.coins} 魔法币 / 排序 {packageRecord.sort_order}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-slate-900">
                      {formatPrice(packageRecord.price)}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {packageRecord.is_active ? "已上架" : "已下架"}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleEditCoinPackage(packageRecord)}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-black text-slate-600"
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteCoinPackage(packageRecord)}
                    disabled={deletingCoinPackageId === packageRecord.id}
                    className="rounded-full border border-rose-200 px-4 py-2 text-sm font-black text-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deletingCoinPackageId === packageRecord.id ? "删除中" : "删除"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-[30px] border border-white/80 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
          <p className="text-lg font-black text-slate-800">魔法币汇率</p>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            这里只保留一条全局汇率配置，前台充值页会实时按这里换算。
          </p>
          <div className="mt-6 flex flex-wrap items-end gap-4">
            <label className="block text-sm font-bold text-slate-600">
              1 元兑换多少魔法币
              <input
                type="number"
                min={1}
                value={coinPerYuan}
                onChange={(event) => setCoinPerYuan(Number(event.target.value))}
                className="mt-2 h-12 w-[220px] rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
              />
            </label>
            <button
              type="button"
              onClick={() => void handleSaveRate()}
              className="rounded-full bg-slate-900 px-5 py-3 text-sm font-black text-white"
            >
              {rateState === "saving"
                ? "保存中"
                : rateState === "success"
                  ? "已保存"
                  : rateState === "error"
                    ? "保存失败"
                    : "保存汇率"}
            </button>
          </div>
        </article>

        <article className="rounded-[30px] border border-white/80 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
          <p className="text-lg font-black text-slate-800">
            {editingPlanId ? "编辑订阅套餐" : "新建订阅套餐"}
          </p>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            当前先支持按日发币套餐，后面接真实支付时不用改这里的业务结构。
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-bold text-slate-600">
              套餐名称
              <input
                value={planDraft.name}
                onChange={(event) =>
                  setPlanDraft((current) => ({ ...current, name: event.target.value }))
                }
                className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
              />
            </label>
            <label className="block text-sm font-bold text-slate-600">
              每日发币
              <input
                type="number"
                min={1}
                value={planDraft.dailyCoins}
                onChange={(event) =>
                  setPlanDraft((current) => ({
                    ...current,
                    dailyCoins: Number(event.target.value),
                  }))
                }
                className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
              />
            </label>
            <label className="block text-sm font-bold text-slate-600">
              持续天数
              <input
                type="number"
                min={1}
                value={planDraft.durationDays}
                onChange={(event) =>
                  setPlanDraft((current) => ({
                    ...current,
                    durationDays: Number(event.target.value),
                  }))
                }
                className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
              />
            </label>
            <label className="block text-sm font-bold text-slate-600">
              售价（分）
              <input
                type="number"
                min={0}
                value={planDraft.price}
                onChange={(event) =>
                  setPlanDraft((current) => ({
                    ...current,
                    price: Number(event.target.value),
                  }))
                }
                className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
              />
            </label>
            <label className="block text-sm font-bold text-slate-600">
              上架状态
              <select
                value={planDraft.isActive ? "active" : "inactive"}
                onChange={(event) =>
                  setPlanDraft((current) => ({
                    ...current,
                    isActive: event.target.value === "active",
                  }))
                }
                className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
              >
                <option value="active">上架</option>
                <option value="inactive">下架</option>
              </select>
            </label>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleSavePlan()}
              className="rounded-full bg-slate-900 px-5 py-3 text-sm font-black text-white"
            >
              {planSubmitLabel}
            </button>
            {editingPlanId ? (
              <button
                type="button"
                onClick={resetPlanEditor}
                className="rounded-full border border-slate-200 px-5 py-3 text-sm font-black text-slate-600"
              >
                取消编辑
              </button>
            ) : null}
          </div>
          {planMessage ? (
            <p
              className={`mt-4 text-sm ${
                planState === "error" ? "text-rose-500" : "text-slate-500"
              }`}
            >
              {planMessage}
            </p>
          ) : null}
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="rounded-[30px] border border-white/80 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
          <p className="text-lg font-black text-slate-800">套餐列表</p>
          <div className="mt-5 space-y-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="rounded-[22px] border border-slate-100 bg-slate-50 px-5 py-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-black text-slate-800">{plan.name}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      每日 {plan.daily_coins} 币，持续 {plan.duration_days} 天
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-slate-900">
                      {formatPrice(plan.price)}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {plan.is_active ? "已上架" : "已下架"}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleEditPlan(plan)}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-black text-slate-600"
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeletePlan(plan)}
                    disabled={deletingPlanId === plan.id}
                    className="rounded-full border border-rose-200 px-4 py-2 text-sm font-black text-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deletingPlanId === plan.id ? "删除中" : "删除"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[30px] border border-white/80 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
          <p className="text-lg font-black text-slate-800">批量生成激活码</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-bold text-slate-600">
              批次名称
              <input
                value={batchDraft.name}
                onChange={(event) =>
                  setBatchDraft((current) => ({ ...current, name: event.target.value }))
                }
                className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
              />
            </label>
            <label className="block text-sm font-bold text-slate-600">
              类型
              <select
                value={batchDraft.type}
                onChange={(event) =>
                  setBatchDraft((current) => ({
                    ...current,
                    type: event.target.value as "coin" | "subscription",
                  }))
                }
                className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
              >
                <option value="coin">兑换魔法币</option>
                <option value="subscription">激活订阅</option>
              </select>
            </label>
            <label className="block text-sm font-bold text-slate-600">
              价值
              <input
                value={batchDraft.value}
                onChange={(event) =>
                  setBatchDraft((current) => ({ ...current, value: event.target.value }))
                }
                placeholder={batchDraft.type === "coin" ? "例如 100" : "填写套餐 ID"}
                className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
              />
            </label>
            <label className="block text-sm font-bold text-slate-600">
              数量
              <input
                type="number"
                min={1}
                max={500}
                value={batchDraft.quantity}
                onChange={(event) =>
                  setBatchDraft((current) => ({
                    ...current,
                    quantity: Number(event.target.value),
                  }))
                }
                className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => void handleCreateBatch()}
            className="mt-5 rounded-full bg-slate-900 px-5 py-3 text-sm font-black text-white"
          >
            {batchState === "saving"
              ? "生成中"
              : batchState === "success"
                ? "已生成"
                : batchState === "error"
                  ? "生成失败"
                  : "生成激活码"}
          </button>

          {plainCodes.length ? (
            <div className="mt-5 rounded-[22px] border border-dashed border-[#dce5ff] bg-[#f8faff] p-4">
              <p className="text-sm font-black text-slate-800">
                本次生成的明文激活码
              </p>
              <div className="mt-3 max-h-[220px] space-y-2 overflow-y-auto pr-1">
                {plainCodes.map((code) => (
                  <div key={code} className="rounded-[14px] bg-white px-3 py-2 font-mono text-sm text-slate-700">
                    {code}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-[30px] border border-white/80 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
          <p className="text-lg font-black text-slate-800">激活码批次</p>
          <div className="mt-5 space-y-3">
            {batches.map((batch) => {
              const isExpanded = expandedBatchId === batch.id;
              const codeState = batchCodeDetails[batch.id] ?? {
                status: "idle",
                codes: [],
              };
              const copyableCount = codeState.codes.filter(
                (code) => Boolean(code.plain_code),
              ).length;

              return (
                <div
                  key={batch.id}
                  className="rounded-[20px] border border-slate-100 bg-slate-50 px-4 py-4"
                >
                  <button
                    type="button"
                    onClick={() => void handleToggleBatchDetails(batch)}
                    className="w-full text-left"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-slate-800">{batch.name}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {batch.code_type === "coin" ? "魔法币" : "订阅"} / {batch.value}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          数量 {batch.quantity} / 创建于 {formatDateTime(batch.created_at)}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
                        {isExpanded ? "收起激活码" : "查看激活码"}
                      </span>
                    </div>
                  </button>

                  {isExpanded ? (
                    <div className="mt-4 rounded-[18px] border border-white bg-white p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-slate-800">激活码明细</p>
                          <p className="mt-1 text-xs text-slate-400">
                            已激活的码会显示激活用户，未激活的码可以直接复制。
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleCopyBatchCodes(batch.id)}
                          disabled={!copyableCount}
                          className="rounded-full bg-slate-900 px-4 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-slate-200"
                        >
                          {copiedCodeId === `${batch.id}:all`
                            ? "已复制"
                            : `复制全部 ${copyableCount}`}
                        </button>
                      </div>

                      {codeState.status === "loading" ? (
                        <div className="mt-4 rounded-[16px] bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
                          正在读取激活码...
                        </div>
                      ) : null}

                      {codeState.status === "error" ? (
                        <div className="mt-4 rounded-[16px] bg-rose-50 px-4 py-6 text-center text-sm text-rose-500">
                          {codeState.message ?? "激活码明细读取失败"}
                        </div>
                      ) : null}

                      {codeState.status === "ready" ? (
                        <div className="mt-4 max-h-[380px] space-y-2 overflow-y-auto pr-1">
                          {codeState.codes.length ? (
                            codeState.codes.map((code) => (
                              <div
                                key={code.id}
                                className="rounded-[16px] border border-slate-100 bg-slate-50 px-3 py-3"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="font-mono text-sm font-black text-slate-800">
                                        {code.plain_code ?? code.code_preview}
                                      </p>
                                      <span
                                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${getActivationCodeStatusTone(
                                          code.status,
                                        )}`}
                                      >
                                        {getActivationCodeStatusLabel(code.status)}
                                      </span>
                                    </div>
                                    {!code.plain_code ? (
                                      <p className="mt-2 text-xs text-amber-600">
                                        旧批次仅保存脱敏预览，无法恢复完整明文。
                                      </p>
                                    ) : null}
                                    {code.status === "used" ? (
                                      <p className="mt-2 text-xs text-slate-500">
                                        激活用户：
                                        {code.used_by_user
                                          ? `${code.used_by_user.phone}${
                                              code.used_by_user.nickname
                                                ? ` / ${code.used_by_user.nickname}`
                                                : ""
                                            }`
                                          : code.used_by_user_id?.slice(0, 8) ?? "未知用户"}
                                        {code.used_at
                                          ? ` / ${formatDateTime(code.used_at)}`
                                          : ""}
                                      </p>
                                    ) : null}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => void handleCopyActivationCode(code)}
                                    disabled={!code.plain_code}
                                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-600 disabled:cursor-not-allowed disabled:text-slate-300"
                                  >
                                    {copiedCodeId === code.id ? "已复制" : "复制"}
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="rounded-[16px] bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
                              这个批次暂时没有激活码记录。
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </article>

        <article className="rounded-[30px] border border-white/80 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-lg font-black text-slate-800">订单记录</p>
              {orderMessage ? (
                <p className="mt-2 text-sm text-slate-500">{orderMessage}</p>
              ) : null}
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {orders.map((order) => (
              <div
                key={order.order_id}
                className="rounded-[20px] border border-slate-100 bg-slate-50 px-4 py-4"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedOrderId((current) =>
                      current === order.order_id ? null : order.order_id,
                    )
                  }
                  className="w-full text-left"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-black text-slate-800">
                          {formatOrderType(order.order_type)}
                        </p>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${getOrderStatusTone(
                            order.status,
                          )}`}
                        >
                          {formatOrderStatus(order.status)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">
                        {order.user
                          ? `${order.user.phone}${order.user.nickname ? ` / ${order.user.nickname}` : ""}`
                          : `用户 ${order.user_id.slice(0, 8)}`}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {summarizeOrderDetail(order)}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {formatPaymentMethod(order.payment_method)}
                        {order.provider_name ? ` / ${order.provider_name}` : ""}
                        {order.trade_no ? ` / 流水 ${order.trade_no}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-black text-slate-900">
                        {formatPrice(order.amount)}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {expandedOrderId === order.order_id ? "收起详情" : "查看详情"}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-slate-400">
                    创建于 {formatDateTime(order.created_at)}
                    {order.paid_at ? ` / 支付于 ${formatDateTime(order.paid_at)}` : ""}
                    {order.refunded_at
                      ? ` / 退款于 ${formatDateTime(order.refunded_at)}`
                      : ""}
                  </p>
                </button>

                {expandedOrderId === order.order_id ? (
                  <div className="mt-4 rounded-[18px] border border-white bg-white p-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-[16px] bg-slate-50 px-4 py-3">
                        <p className="text-xs font-bold text-slate-400">用户信息</p>
                        <p className="mt-2 text-sm font-bold text-slate-800">
                          {order.user?.phone ?? "未知手机号"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          用户ID：{order.user_id}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          昵称：{order.user?.nickname ?? "暂无"}
                        </p>
                      </div>

                      <div className="rounded-[16px] bg-slate-50 px-4 py-3">
                        <p className="text-xs font-bold text-slate-400">订单信息</p>
                        <p className="mt-2 text-sm font-bold text-slate-800">
                          订单号：{order.order_id}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          商品：{summarizeOrderDetail(order)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          金额：{formatPrice(order.amount)}
                        </p>
                      </div>

                      <div className="rounded-[16px] bg-slate-50 px-4 py-3">
                        <p className="text-xs font-bold text-slate-400">支付与通道</p>
                        <p className="mt-2 text-sm text-slate-700">
                          支付方式：{formatPaymentMethod(order.payment_method)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          通道标识：{order.provider_name ?? "暂无"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          商户单号：{order.order_id}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          上游流水号：{order.trade_no ?? "暂无"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          回调状态：{order.notify_status ?? "暂无"}
                        </p>
                      </div>

                      <div className="rounded-[16px] bg-slate-50 px-4 py-3">
                        <p className="text-xs font-bold text-slate-400">付款人信息</p>
                        <p className="mt-2 text-sm text-slate-700">
                          买家账号：{order.buyer_account ?? "暂无"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          买家ID：{order.buyer_id ?? "暂无"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          失败原因：{order.failure_reason ?? "暂无"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          关闭时间：{formatDateTime(order.closed_at)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => void handleSyncOrder(order)}
                        disabled={Boolean(orderActionState[order.order_id])}
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {orderActionState[order.order_id] === "syncing"
                          ? "查单中"
                          : "向支付宝查单"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleRefundOrder(order)}
                        disabled={
                          order.status !== "paid" ||
                          Boolean(orderActionState[order.order_id])
                        }
                        className="rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-black text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {orderActionState[order.order_id] === "refunding"
                          ? "退款中"
                          : "全额退款"}
                      </button>
                    </div>

                    <div className="mt-4 grid gap-3">
                      <div className="rounded-[16px] bg-slate-950 px-4 py-3 text-slate-100">
                        <p className="text-xs font-bold text-slate-300">下单请求快照</p>
                        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all text-xs leading-6">
                          {formatJson(order.payment_request)}
                        </pre>
                      </div>

                      <div className="rounded-[16px] bg-slate-950 px-4 py-3 text-slate-100">
                        <p className="text-xs font-bold text-slate-300">支付创建返回</p>
                        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all text-xs leading-6">
                          {formatJson(order.payment_response)}
                        </pre>
                      </div>

                      <div className="rounded-[16px] bg-slate-950 px-4 py-3 text-slate-100">
                        <p className="text-xs font-bold text-slate-300">支付回调原文</p>
                        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all text-xs leading-6">
                          {formatJson(order.notify_payload)}
                        </pre>
                      </div>

                      {order.refund_payload ? (
                        <div className="rounded-[16px] bg-slate-950 px-4 py-3 text-slate-100">
                          <p className="text-xs font-bold text-slate-300">退款返回原文</p>
                          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all text-xs leading-6">
                            {formatJson(order.refund_payload)}
                          </pre>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
