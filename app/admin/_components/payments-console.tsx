"use client";

import { useMemo, useState } from "react";

type PaymentsConsoleProps = {
  initialRate: {
    coin_per_yuan: number;
  };
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
    created_at: string;
    paid_at: string | null;
    detail: Record<string, unknown>;
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
  initialPlans,
  initialOrders,
  initialBatches,
}: PaymentsConsoleProps) {
  const [coinPerYuan, setCoinPerYuan] = useState(initialRate.coin_per_yuan);
  const [plans, setPlans] = useState(initialPlans);
  const [orders] = useState(initialOrders);
  const [batches, setBatches] = useState(initialBatches);
  const [rateState, setRateState] = useState<SaveState>("idle");
  const [planState, setPlanState] = useState<SaveState>("idle");
  const [batchState, setBatchState] = useState<SaveState>("idle");
  const [plainCodes, setPlainCodes] = useState<string[]>([]);
  const [planDraft, setPlanDraft] = useState<PlanFormState>(createDefaultPlanDraft);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planMessage, setPlanMessage] = useState("");
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
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

  const activePlansCount = useMemo(
    () => plans.filter((plan) => plan.is_active).length,
    [plans],
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

  const resetPlanEditor = () => {
    setPlanDraft(createDefaultPlanDraft());
    setEditingPlanId(null);
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

  return (
    <div className="space-y-5">
      <section className="grid gap-4 xl:grid-cols-4">
        <div className="rounded-[28px] border border-white/80 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
          <p className="text-xs font-bold tracking-[0.14em] text-slate-400">当前汇率</p>
          <p className="mt-3 text-4xl font-black text-slate-900">{coinPerYuan}</p>
          <p className="mt-2 text-sm text-slate-500">1 元对应魔法币</p>
        </div>
        <div className="rounded-[28px] border border-white/80 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
          <p className="text-xs font-bold tracking-[0.14em] text-slate-400">生效套餐</p>
          <p className="mt-3 text-4xl font-black text-slate-900">{activePlansCount}</p>
          <p className="mt-2 text-sm text-slate-500">当前上架订阅数</p>
        </div>
        <div className="rounded-[28px] border border-white/80 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
          <p className="text-xs font-bold tracking-[0.14em] text-slate-400">激活码批次</p>
          <p className="mt-3 text-4xl font-black text-slate-900">{batches.length}</p>
          <p className="mt-2 text-sm text-slate-500">可分发批次总数</p>
        </div>
        <div className="rounded-[28px] border border-white/80 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
          <p className="text-xs font-bold tracking-[0.14em] text-slate-400">待支付订单</p>
          <p className="mt-3 text-4xl font-black text-slate-900">{pendingOrdersCount}</p>
          <p className="mt-2 text-sm text-slate-500">Mock 支付未完成</p>
        </div>
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
          <p className="text-lg font-black text-slate-800">订单记录</p>
          <div className="mt-5 space-y-3">
            {orders.map((order) => (
              <div
                key={order.order_id}
                className="rounded-[20px] border border-slate-100 bg-slate-50 px-4 py-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-slate-800">
                      {order.order_type === "coin_purchase" ? "魔法币充值" : "订阅购买"}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      用户 {order.user_id.slice(0, 8)} / {order.payment_method}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-black text-slate-900">
                      {formatPrice(order.amount)}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">{order.status}</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  创建于 {formatDateTime(order.created_at)}
                  {order.paid_at ? ` / 支付于 ${formatDateTime(order.paid_at)}` : ""}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
