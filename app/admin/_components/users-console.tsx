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

export function UsersConsole({ initialUsers }: UsersConsoleProps) {
  const [users, setUsers] = useState(initialUsers);
  const [keyword, setKeyword] = useState("");
  const [creditNoteDrafts, setCreditNoteDrafts] = useState<Record<string, string>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

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

    void loadFullUsers();

    return () => {
      mounted = false;
    };
  }, []);

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

  const handleStatusToggle = async (user: AdminUserRecord) => {
    const nextStatus = user.status === "active" ? "disabled" : "active";
    const updatedUser = await handleUserPatch(user.id, { status: nextStatus });

    if (!updatedUser) {
      return;
    }

    replaceUser(updatedUser);
  };

  const handleCreditsChange = async (user: AdminUserRecord, delta: number) => {
    const nextCredits = Math.max(0, user.credits + delta);
    const creditLogNote = creditNoteDrafts[user.id]?.trim() || undefined;
    const updatedUser = await handleUserPatch(user.id, {
      credits: nextCredits,
      creditLogNote,
    });

    if (!updatedUser) {
      return;
    }

    replaceUser(updatedUser);
    setCreditNoteDrafts((current) => ({ ...current, [user.id]: "" }));
  };

  const handleNotesSave = async (user: AdminUserRecord, notes: string) => {
    const updatedUser = await handleUserPatch(user.id, { notes });

    if (!updatedUser) {
      return;
    }

    replaceUser(updatedUser);
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
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="输入手机号、昵称、备注或流水关键词"
              className="h-12 w-full max-w-[360px] rounded-full border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 outline-none"
            />
          </div>
        </div>
      </section>

      <div className="space-y-4">
        {filteredUsers.map((user) => (
          <article
            key={user.id}
            className="rounded-[30px] border border-white/80 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]"
          >
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-xl font-black text-slate-900">{user.phone}</p>
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
                      {user.nickname || "未设置昵称"}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-500">
                    注册时间：{formatDateTime(user.created_at)} | 最近登录：
                    {formatDateTime(user.last_login_at)}
                  </p>
                </div>

                <div className="grid min-w-[260px] gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-[22px] bg-slate-50 px-4 py-4">
                    <p className="text-xs font-bold tracking-[0.14em] text-slate-400">当前余额</p>
                    <p className="mt-3 text-3xl font-black tracking-[-0.05em] text-slate-900">
                      {user.credits}
                    </p>
                  </div>
                  <div className="rounded-[22px] bg-slate-50 px-4 py-4">
                    <p className="text-xs font-bold tracking-[0.14em] text-slate-400">累计收入</p>
                    <p className="mt-3 text-3xl font-black tracking-[-0.05em] text-emerald-600">
                      {user.totalCreditsAdded}
                    </p>
                  </div>
                  <div className="rounded-[22px] bg-slate-50 px-4 py-4">
                    <p className="text-xs font-bold tracking-[0.14em] text-slate-400">累计消耗</p>
                    <p className="mt-3 text-3xl font-black tracking-[-0.05em] text-rose-600">
                      {user.totalCreditsSpent}
                    </p>
                  </div>
                  <div className="rounded-[22px] bg-slate-50 px-4 py-4">
                    <p className="text-xs font-bold tracking-[0.14em] text-slate-400">累计投稿</p>
                    <p className="mt-3 text-3xl font-black tracking-[-0.05em] text-slate-900">
                      {user.postsCount}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[1.15fr_1fr]">
                <section className="rounded-[26px] bg-[#eef6ff] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold tracking-[0.14em] text-[#5a7db6]">
                        魔法币管理
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        后台调币后，这里会同步看到最新余额和最近流水。
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleStatusToggle(user)}
                      className="rounded-full bg-slate-900 px-5 py-3 text-sm font-black text-white"
                    >
                      {user.status === "active" ? "停用账号" : "恢复账号"}
                    </button>
                  </div>

                  <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr_auto_auto]">
                    <input
                      value={creditNoteDrafts[user.id] ?? ""}
                      onChange={(event) =>
                        setCreditNoteDrafts((current) => ({
                          ...current,
                          [user.id]: event.target.value,
                        }))
                      }
                      placeholder="输入本次调币原因，会同步写入用户魔法币明细"
                      className="h-12 rounded-[16px] border border-[#d8e6ff] bg-white px-4 text-sm text-slate-700 outline-none"
                    />
                    <div className="rounded-[16px] border border-[#d8e6ff] bg-white px-4 py-3 text-sm text-slate-500">
                      最近变动：{formatShortDate(user.lastCreditChangeAt)}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCreditsChange(user, 10)}
                      className="rounded-[16px] bg-white px-5 py-3 text-sm font-black text-slate-700"
                    >
                      +10 币
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCreditsChange(user, -10)}
                      className="rounded-[16px] bg-white px-5 py-3 text-sm font-black text-slate-700"
                    >
                      -10 币
                    </button>
                  </div>
                </section>

                <section className="rounded-[26px] bg-slate-50 p-5">
                  <p className="text-xs font-bold tracking-[0.14em] text-slate-400">投稿状态</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[20px] bg-white px-4 py-4">
                      <p className="text-xs font-bold tracking-[0.14em] text-slate-400">通过</p>
                      <p className="mt-3 text-2xl font-black text-emerald-600">
                        {user.approvedPostsCount}
                      </p>
                    </div>
                    <div className="rounded-[20px] bg-white px-4 py-4">
                      <p className="text-xs font-bold tracking-[0.14em] text-slate-400">待审</p>
                      <p className="mt-3 text-2xl font-black text-amber-600">
                        {user.pendingPostsCount}
                      </p>
                    </div>
                    <div className="rounded-[20px] bg-white px-4 py-4">
                      <p className="text-xs font-bold tracking-[0.14em] text-slate-400">驳回</p>
                      <p className="mt-3 text-2xl font-black text-rose-600">
                        {user.rejectedPostsCount}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-slate-500">
                    最近投稿：{formatDateTime(user.latestPostAt)}
                  </p>
                </section>
              </div>

              <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                <section className="rounded-[26px] bg-slate-50 p-5">
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

                  <div className="mt-5 max-h-[360px] space-y-3 overflow-y-auto pr-1">
                    {user.creditLogs.length ? (
                      user.creditLogs.map((log) => (
                        <div
                          key={log.id}
                          className="grid gap-3 rounded-[22px] bg-white px-4 py-4 lg:grid-cols-[1fr_auto]"
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
                      <div className="rounded-[22px] border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-400">
                        这个用户暂时还没有魔法币流水记录。
                      </div>
                    )}
                  </div>
                </section>

                <section className="rounded-[26px] bg-slate-50 p-5">
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
          </article>
        ))}
      </div>
    </div>
  );
}
