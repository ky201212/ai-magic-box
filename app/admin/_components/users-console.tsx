"use client";

import { useEffect, useMemo, useState } from "react";
import type { AdminUserRecord } from "./types";

type UsersConsoleProps = {
  initialUsers: AdminUserRecord[];
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "暂无记录";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatShortDate(value: string | null) {
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

function getCreditChangeTone(changeAmount: number) {
  return changeAmount > 0
    ? "text-emerald-600 bg-emerald-50"
    : "text-rose-600 bg-rose-50";
}

function formatDateOnly(value: string | null) {
  if (!value) {
    return "暂无";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).format(new Date(value));
}

function formatPrice(price: number) {
  return `¥${(price / 100).toFixed(2)}`;
}

function getSubscriptionStatusLabel(status: "active" | "expired" | "cancelled") {
  if (status === "active") {
    return "订阅中";
  }

  if (status === "expired") {
    return "已到期";
  }

  return "已取消";
}

function getSubscriptionStatusTone(status: "active" | "expired" | "cancelled") {
  if (status === "active") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "expired") {
    return "bg-slate-100 text-slate-500";
  }

  return "bg-rose-50 text-rose-700";
}

function getSubscriptionPlanName(
  subscription: AdminUserRecord["subscriptions"][number] | undefined,
) {
  return subscription?.subscription_plans?.name ?? "未知套餐";
}

export function UsersConsole({ initialUsers }: UsersConsoleProps) {
  const [users, setUsers] = useState(initialUsers);
  const [keyword, setKeyword] = useState("");
  const [creditAdjustDrafts, setCreditAdjustDrafts] = useState<
    Record<
      string,
      {
        grantAmount: string;
        grantReason: string;
        revokeAmount: string;
        revokeReason: string;
      }
    >
  >({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [creditActionState, setCreditActionState] = useState<
    Record<
      string,
      {
        grant: "idle" | "saving" | "success";
        revoke: "idle" | "saving" | "success";
      }
    >
  >({});
  const [subscriptionActionState, setSubscriptionActionState] = useState<
    Record<string, "idle" | "saving" | "success">
  >({});
  const [hasLoadedFullUsers, setHasLoadedFullUsers] = useState(
    initialUsers.some((user) => user.creditLogs.length > 0),
  );
  const [loadingUserDetailId, setLoadingUserDetailId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadFullUsers = async () => {
      setIsRefreshing(true);

      try {
        const response = await fetch("/api/admin/users", {
          cache: "no-store",
        });
        const data = (await response.json()) as {
          users?: AdminUserRecord[];
        };

        if (!response.ok || !mounted || !data.users) {
          return;
        }

        setUsers(data.users);
        setHasLoadedFullUsers(true);
      } catch {
        if (mounted) {
          window.console.error("后台用户详情刷新失败");
        }
      } finally {
        if (mounted) {
          setIsRefreshing(false);
        }
      }
    };

    if (!hasLoadedFullUsers) {
      void loadFullUsers();
    }

    return () => {
      mounted = false;
    };
  }, [hasLoadedFullUsers, initialUsers]);

  const filteredUsers = useMemo(() => {
    const normalizedKeyword = keyword.trim();

    if (!normalizedKeyword) {
      return users;
    }

    return users.filter((user) =>
      [
        user.phone,
        user.nickname ?? "",
        user.notes ?? "",
        ...user.creditLogs.map((log) => `${log.reason_label} ${log.note ?? ""}`),
      ].some((value) => value.includes(normalizedKeyword)),
    );
  }, [keyword, users]);

  const handleUserPatch = async (
    userId: string,
    payload: {
      nickname?: string | null;
      status?: "active" | "disabled";
      notes?: string | null;
      credits?: number;
      creditLogNote?: string | null;
    },
  ) => {
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as {
      error?: string;
      user?: AdminUserRecord;
    };

    if (!response.ok || !data.user) {
      window.alert(data.error ?? "用户更新失败，请稍后再试。");
      return null;
    }

    return data.user;
  };

  const replaceUser = (nextUser: AdminUserRecord) => {
    setUsers((current) =>
      current.map((item) => (item.id === nextUser.id ? nextUser : item)),
    );
  };

  const ensureUserDetailLoaded = async (userId: string) => {
    const existingUser = users.find((item) => item.id === userId);

    if (!existingUser) {
      return;
    }

    if (existingUser.creditLogs.length > 0 || loadingUserDetailId === userId) {
      return;
    }

    setLoadingUserDetailId(userId);

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as {
        user?: AdminUserRecord;
        error?: string;
      };

      if (!response.ok || !data.user) {
        throw new Error(data.error ?? "用户详情读取失败。");
      }

      replaceUser(data.user);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "用户详情读取失败。");
    } finally {
      setLoadingUserDetailId((current) => (current === userId ? null : current));
    }
  };

  const handleStatusToggle = async (user: AdminUserRecord) => {
    const nextStatus = user.status === "active" ? "disabled" : "active";
    const updatedUser = await handleUserPatch(user.id, { status: nextStatus });

    if (!updatedUser) {
      return;
    }

    replaceUser(updatedUser);
  };

  const updateGrantOrRevokeDraft = (
    userId: string,
    key: "grantAmount" | "grantReason" | "revokeAmount" | "revokeReason",
    value: string,
  ) => {
    setCreditAdjustDrafts((current) => ({
      ...current,
      [userId]: {
        grantAmount: current[userId]?.grantAmount ?? "",
        grantReason: current[userId]?.grantReason ?? "",
        revokeAmount: current[userId]?.revokeAmount ?? "",
        revokeReason: current[userId]?.revokeReason ?? "",
        [key]: value,
      },
    }));
  };

  const handleGrantCredits = async (user: AdminUserRecord) => {
    const draft = creditAdjustDrafts[user.id];
    const grantAmount = Number(draft?.grantAmount ?? 0);
    const grantReason = draft?.grantReason?.trim() || undefined;

    if (!Number.isFinite(grantAmount) || grantAmount <= 0) {
      window.alert("请输入要发放的魔法币数量。");
      return;
    }

    setCreditActionState((current) => ({
      ...current,
      [user.id]: {
        grant: "saving",
        revoke: current[user.id]?.revoke ?? "idle",
      },
    }));

    const nextCredits = user.credits + Math.floor(grantAmount);
    const updatedUser = await handleUserPatch(user.id, {
      credits: nextCredits,
      creditLogNote: grantReason ?? null,
    });

    if (!updatedUser) {
      setCreditActionState((current) => ({
        ...current,
        [user.id]: {
          grant: "idle",
          revoke: current[user.id]?.revoke ?? "idle",
        },
      }));
      return;
    }

    replaceUser(updatedUser);
    setCreditAdjustDrafts((current) => ({
      ...current,
      [user.id]: {
        grantAmount: "",
        grantReason: "",
        revokeAmount: current[user.id]?.revokeAmount ?? "",
        revokeReason: current[user.id]?.revokeReason ?? "",
      },
    }));
    setCreditActionState((current) => ({
      ...current,
      [user.id]: {
        grant: "success",
        revoke: current[user.id]?.revoke ?? "idle",
      },
    }));
    window.setTimeout(() => {
      setCreditActionState((current) => ({
        ...current,
        [user.id]: {
          grant: "idle",
          revoke: current[user.id]?.revoke ?? "idle",
        },
      }));
    }, 1200);
  };

  const handleRevokeCredits = async (user: AdminUserRecord) => {
    const draft = creditAdjustDrafts[user.id];
    const revokeAmount = Number(draft?.revokeAmount ?? 0);
    const revokeReason = draft?.revokeReason?.trim() ?? "";

    if (!Number.isFinite(revokeAmount) || revokeAmount <= 0) {
      window.alert("请输入要撤回的魔法币数量。");
      return;
    }

    if (!revokeReason) {
      window.alert("撤回魔法币时必须填写原因。");
      return;
    }

    setCreditActionState((current) => ({
      ...current,
      [user.id]: {
        grant: current[user.id]?.grant ?? "idle",
        revoke: "saving",
      },
    }));

    const nextCredits = Math.max(0, user.credits - Math.floor(revokeAmount));
    const updatedUser = await handleUserPatch(user.id, {
      credits: nextCredits,
      creditLogNote: revokeReason,
    });

    if (!updatedUser) {
      setCreditActionState((current) => ({
        ...current,
        [user.id]: {
          grant: current[user.id]?.grant ?? "idle",
          revoke: "idle",
        },
      }));
      return;
    }

    replaceUser(updatedUser);
    setCreditAdjustDrafts((current) => ({
      ...current,
      [user.id]: {
        grantAmount: current[user.id]?.grantAmount ?? "",
        grantReason: current[user.id]?.grantReason ?? "",
        revokeAmount: "",
        revokeReason: "",
      },
    }));
    setCreditActionState((current) => ({
      ...current,
      [user.id]: {
        grant: current[user.id]?.grant ?? "idle",
        revoke: "success",
      },
    }));
    window.setTimeout(() => {
      setCreditActionState((current) => ({
        ...current,
        [user.id]: {
          grant: current[user.id]?.grant ?? "idle",
          revoke: "idle",
        },
      }));
    }, 1200);
  };

  const handleNotesSave = async (user: AdminUserRecord, notes: string) => {
    const updatedUser = await handleUserPatch(user.id, { notes });

    if (!updatedUser) {
      return;
    }

    replaceUser(updatedUser);
  };

  const handleCancelSubscription = async (
    user: AdminUserRecord,
    subscriptionId: string,
  ) => {
    const subscription = user.subscriptions.find((item) => item.id === subscriptionId);
    const planName = getSubscriptionPlanName(subscription);

    if (!window.confirm(`确定要取消 ${user.phone} 的「${planName}」订阅吗？`)) {
      return;
    }

    setSubscriptionActionState((current) => ({
      ...current,
      [subscriptionId]: "saving",
    }));

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "cancel_subscription",
          subscriptionId,
        }),
      });
      const data = (await response.json()) as {
        user?: AdminUserRecord;
        error?: string;
      };

      if (!response.ok || !data.user) {
        throw new Error(data.error ?? "订阅取消失败，请稍后再试。");
      }

      replaceUser(data.user);
      setSubscriptionActionState((current) => ({
        ...current,
        [subscriptionId]: "success",
      }));
      window.setTimeout(() => {
        setSubscriptionActionState((current) => ({
          ...current,
          [subscriptionId]: "idle",
        }));
      }, 1200);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "订阅取消失败，请稍后再试。");
      setSubscriptionActionState((current) => ({
        ...current,
        [subscriptionId]: "idle",
      }));
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-[30px] border border-white/80 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-lg font-black text-slate-800">用户查询</p>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              现在可以同时按手机号、昵称、备注和魔法币流水原因搜索。
            </p>
          </div>
          <div className="flex w-full max-w-[520px] items-center justify-end gap-3">
            {isRefreshing && (
              <span className="text-xs font-bold text-slate-400">正在补全用户详情...</span>
            )}
            {!isRefreshing && !hasLoadedFullUsers && (
              <span className="text-xs font-bold text-slate-400">正在准备更完整的用户数据...</span>
            )}
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="输入手机号、昵称、备注或流水关键词"
              className="h-12 w-full max-w-[360px] rounded-full border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 outline-none"
            />
          </div>
        </div>
      </section>

      <div className="space-y-3">
        {filteredUsers.map((user) => {
          const isExpanded = expandedUserId === user.id;
          const creditDraft = creditAdjustDrafts[user.id] ?? {
            grantAmount: "",
            grantReason: "",
            revokeAmount: "",
            revokeReason: "",
          };
          const actionState = creditActionState[user.id] ?? {
            grant: "idle",
            revoke: "idle",
          };
          const activeSubscription = user.subscriptions.find(
            (item) => item.status === "active",
          );

          return (
            <article
              key={user.id}
              className="rounded-[28px] border border-white/80 bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.05)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-lg font-black text-slate-900">{user.phone}</p>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        user.status === "active"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {user.status === "active" ? "正常使用中" : "已停用"}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                      {user.nickname ? `昵称：${user.nickname}` : "未设置昵称"}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-500">
                    <span className="rounded-full bg-slate-50 px-3 py-1">
                      注册时间：{formatDateTime(user.created_at)}
                    </span>
                    <span className="rounded-full bg-slate-50 px-3 py-1">
                      最近登录：{formatDateTime(user.last_login_at)}
                    </span>
                    <span className="rounded-full bg-slate-50 px-3 py-1">
                      当前余额：{user.credits} 币
                    </span>
                    <span className="rounded-full bg-slate-50 px-3 py-1">
                      投稿：{user.postsCount}
                    </span>
                    <span className="rounded-full bg-slate-50 px-3 py-1">
                      订阅：{activeSubscription ? getSubscriptionPlanName(activeSubscription) : "暂无"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void handleStatusToggle(user)}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700"
                  >
                    {user.status === "active" ? "停用账号" : "恢复账号"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const willExpand = expandedUserId !== user.id;
                      setExpandedUserId((current) => (current === user.id ? null : user.id));

                      if (willExpand) {
                        void ensureUserDetailLoaded(user.id);
                      }
                    }}
                    className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-black text-white"
                  >
                    {isExpanded ? "收起详情" : "查看详情"}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="mt-5 space-y-4 border-t border-slate-100 pt-5">
                  {loadingUserDetailId === user.id && (
                    <div className="rounded-[18px] bg-[#eef6ff] px-4 py-3 text-sm font-bold text-[#5a7db6]">
                      正在读取这个用户的完整明细...
                    </div>
                  )}
                  <div className="grid gap-4 xl:grid-cols-[1.15fr_1fr]">
                    <section className="rounded-[24px] bg-[#eef6ff] p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold tracking-[0.14em] text-[#5a7db6]">
                            魔法币管理
                          </p>
                          <p className="mt-2 text-sm leading-7 text-slate-600">
                            后台调币后，这里会同步看到最新余额和最近流水。
                          </p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="rounded-[18px] bg-white px-4 py-3">
                            <p className="text-xs font-bold tracking-[0.14em] text-slate-400">当前余额</p>
                            <p className="mt-2 text-2xl font-black text-slate-900">{user.credits}</p>
                          </div>
                          <div className="rounded-[18px] bg-white px-4 py-3">
                            <p className="text-xs font-bold tracking-[0.14em] text-slate-400">累计收入</p>
                            <p className="mt-2 text-2xl font-black text-emerald-600">{user.totalCreditsAdded}</p>
                          </div>
                          <div className="rounded-[18px] bg-white px-4 py-3">
                            <p className="text-xs font-bold tracking-[0.14em] text-slate-400">累计消耗</p>
                            <p className="mt-2 text-2xl font-black text-rose-600">{user.totalCreditsSpent}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 xl:grid-cols-[1.05fr_0.95fr]">
                        <div className="rounded-[20px] border border-[#d8e6ff] bg-white p-4">
                          <p className="text-sm font-black text-slate-800">发放魔法币</p>
                          <p className="mt-2 text-sm leading-7 text-slate-500">
                            直接输入这次要发多少，发放原因可以不写，但这里保留填写入口。
                          </p>
                          <div className="mt-4 grid gap-3">
                            <input
                              type="number"
                              min={1}
                              value={creditDraft.grantAmount}
                              onChange={(event) =>
                                updateGrantOrRevokeDraft(
                                  user.id,
                                  "grantAmount",
                                  event.target.value,
                                )
                              }
                              placeholder="输入发放数量"
                              className="h-12 rounded-[16px] border border-[#d8e6ff] bg-slate-50 px-4 text-sm text-slate-700 outline-none"
                            />
                            <input
                              value={creditDraft.grantReason}
                              onChange={(event) =>
                                updateGrantOrRevokeDraft(
                                  user.id,
                                  "grantReason",
                                  event.target.value,
                                )
                              }
                              placeholder="发放原因可不填"
                              className="h-12 rounded-[16px] border border-[#d8e6ff] bg-slate-50 px-4 text-sm text-slate-700 outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => void handleGrantCredits(user)}
                              disabled={actionState.grant === "saving"}
                              className="rounded-[16px] bg-slate-900 px-5 py-3 text-sm font-black text-white"
                            >
                              {actionState.grant === "saving"
                                ? "发放中"
                                : actionState.grant === "success"
                                  ? "已发放"
                                  : "确认发放"}
                            </button>
                          </div>
                        </div>

                        <div className="rounded-[20px] border border-[#ffd7df] bg-white p-4">
                          <p className="text-sm font-black text-slate-800">撤回魔法币</p>
                          <p className="mt-2 text-sm leading-7 text-slate-500">
                            撤回时必须填写数量和原因，原因会同步到用户明细。
                          </p>
                          <div className="mt-4 grid gap-3">
                            <input
                              type="number"
                              min={1}
                              value={creditDraft.revokeAmount}
                              onChange={(event) =>
                                updateGrantOrRevokeDraft(
                                  user.id,
                                  "revokeAmount",
                                  event.target.value,
                                )
                              }
                              placeholder="输入撤回数量"
                              className="h-12 rounded-[16px] border border-[#ffd7df] bg-slate-50 px-4 text-sm text-slate-700 outline-none"
                            />
                            <input
                              value={creditDraft.revokeReason}
                              onChange={(event) =>
                                updateGrantOrRevokeDraft(
                                  user.id,
                                  "revokeReason",
                                  event.target.value,
                                )
                              }
                              placeholder="撤回原因必填"
                              className="h-12 rounded-[16px] border border-[#ffd7df] bg-slate-50 px-4 text-sm text-slate-700 outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => void handleRevokeCredits(user)}
                              disabled={actionState.revoke === "saving"}
                              className="rounded-[16px] bg-[#fff1f3] px-5 py-3 text-sm font-black text-[#d4557c]"
                            >
                              {actionState.revoke === "saving"
                                ? "撤回中"
                                : actionState.revoke === "success"
                                  ? "已撤回"
                                  : "确认撤回"}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 rounded-[16px] border border-[#d8e6ff] bg-white px-4 py-3 text-sm text-slate-500">
                          最近变动：{formatShortDate(user.lastCreditChangeAt)}
                      </div>
                    </section>

                    <section className="rounded-[24px] bg-slate-50 p-5">
                      <p className="text-xs font-bold tracking-[0.14em] text-slate-400">投稿情况</p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-4">
                        <div className="rounded-[18px] bg-white px-4 py-3">
                          <p className="text-xs font-bold tracking-[0.14em] text-slate-400">总投稿</p>
                          <p className="mt-2 text-2xl font-black text-slate-900">{user.postsCount}</p>
                        </div>
                        <div className="rounded-[18px] bg-white px-4 py-3">
                          <p className="text-xs font-bold tracking-[0.14em] text-slate-400">通过</p>
                          <p className="mt-2 text-2xl font-black text-emerald-600">{user.approvedPostsCount}</p>
                        </div>
                        <div className="rounded-[18px] bg-white px-4 py-3">
                          <p className="text-xs font-bold tracking-[0.14em] text-slate-400">待审</p>
                          <p className="mt-2 text-2xl font-black text-amber-600">{user.pendingPostsCount}</p>
                        </div>
                        <div className="rounded-[18px] bg-white px-4 py-3">
                          <p className="text-xs font-bold tracking-[0.14em] text-slate-400">驳回</p>
                          <p className="mt-2 text-2xl font-black text-rose-600">{user.rejectedPostsCount}</p>
                        </div>
                      </div>
                      <p className="mt-4 text-sm leading-7 text-slate-500">
                        最近投稿：{formatDateTime(user.latestPostAt)}
                      </p>
                    </section>

                    <section className="rounded-[24px] bg-slate-50 p-5 xl:col-span-2">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-slate-800">订阅套餐</p>
                          <p className="mt-2 text-sm leading-7 text-slate-500">
                            这里显示用户开通过的套餐，生效中的订阅可以直接取消。
                          </p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500">
                          共 {user.subscriptions.length} 条
                        </span>
                      </div>

                      <div className="mt-5 space-y-3">
                        {user.subscriptions.length ? (
                          user.subscriptions.map((subscription) => {
                            const subscriptionState =
                              subscriptionActionState[subscription.id] ?? "idle";

                            return (
                              <div
                                key={subscription.id}
                                className="grid gap-3 rounded-[20px] bg-white px-4 py-4 lg:grid-cols-[1fr_auto]"
                              >
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-black text-slate-800">
                                      {getSubscriptionPlanName(subscription)}
                                    </p>
                                    <span
                                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${getSubscriptionStatusTone(
                                        subscription.status,
                                      )}`}
                                    >
                                      {getSubscriptionStatusLabel(subscription.status)}
                                    </span>
                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
                                      {subscription.source === "payment"
                                        ? "支付开通"
                                        : "激活码开通"}
                                    </span>
                                  </div>
                                  <p className="mt-2 text-sm leading-7 text-slate-500">
                                    每日 {subscription.subscription_plans?.daily_coins ?? 0} 币，
                                    周期 {subscription.subscription_plans?.duration_days ?? 0} 天，
                                    价格 {formatPrice(subscription.subscription_plans?.price ?? 0)}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-400">
                                    {formatDateOnly(subscription.start_date)} 至{" "}
                                    {formatDateOnly(subscription.end_date)}
                                  </p>
                                </div>
                                {subscription.status === "active" ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void handleCancelSubscription(user, subscription.id)
                                    }
                                    disabled={subscriptionState === "saving"}
                                    className="self-start rounded-full bg-[#fff1f3] px-4 py-2.5 text-sm font-black text-[#d4557c]"
                                  >
                                    {subscriptionState === "saving"
                                      ? "取消中"
                                      : subscriptionState === "success"
                                        ? "已取消"
                                        : "取消订阅"}
                                  </button>
                                ) : null}
                              </div>
                            );
                          })
                        ) : (
                          <div className="rounded-[20px] border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
                            这个用户暂时没有订阅套餐。
                          </div>
                        )}
                      </div>
                    </section>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                    <section className="rounded-[24px] bg-slate-50 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-slate-800">魔法币流水</p>
                          <p className="mt-2 text-sm leading-7 text-slate-500">
                            用户端看到的增加、扣减记录，这里后台同步保留一份。
                          </p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500">
                          共 {user.creditLogs.length} 条
                        </span>
                      </div>

                      <div className="mt-5 max-h-[320px] space-y-3 overflow-y-auto pr-1">
                        {user.creditLogs.length ? (
                          user.creditLogs.map((log) => (
                            <div
                              key={log.id}
                              className="grid gap-3 rounded-[20px] bg-white px-4 py-4 lg:grid-cols-[1fr_auto]"
                            >
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-black text-slate-800">
                                    {log.reason_label}
                                  </p>
                                  <span
                                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${getCreditChangeTone(
                                      log.change_amount,
                                    )}`}
                                  >
                                    {log.change_amount > 0
                                      ? `+${log.change_amount}`
                                      : log.change_amount}
                                  </span>
                                </div>
                                <p className="mt-2 text-sm leading-7 text-slate-500">
                                  {log.note || "系统记录了一次魔法币变化。"}
                                </p>
                                <p className="mt-2 text-xs text-slate-400">
                                  {formatDateTime(log.created_at)}
                                </p>
                              </div>
                              <div className="text-left lg:text-right">
                                <p className="text-xs font-bold tracking-[0.14em] text-slate-400">
                                  变化后余额
                                </p>
                                <p className="mt-2 text-xl font-black text-slate-800">
                                  {log.balance_after}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-[20px] border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-400">
                            这个用户暂时还没有魔法币流水记录。
                          </div>
                        )}
                      </div>
                    </section>

                    <section className="rounded-[24px] bg-slate-50 p-5">
                      <p className="text-sm font-black text-slate-800">管理员备注</p>
                      <p className="mt-2 text-sm leading-7 text-slate-500">
                        这里保留必要信息就够了，不再单独占一大块空白区域。
                      </p>
                      <textarea
                        defaultValue={user.notes ?? ""}
                        onBlur={(event) => {
                          if ((user.notes ?? "") !== event.target.value) {
                            void handleNotesSave(user, event.target.value);
                          }
                        }}
                        className="mt-4 h-[220px] w-full rounded-[20px] border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-700 outline-none"
                      />
                    </section>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
