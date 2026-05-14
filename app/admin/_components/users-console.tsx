"use client";

import { useMemo, useState } from "react";
import type { AdminUserRecord } from "./types";

type UsersConsoleProps = {
  initialUsers: AdminUserRecord[];
};

export function UsersConsole({ initialUsers }: UsersConsoleProps) {
  const [users, setUsers] = useState(initialUsers);
  const [keyword, setKeyword] = useState("");

  const filteredUsers = useMemo(() => {
    const normalizedKeyword = keyword.trim();

    if (!normalizedKeyword) {
      return users;
    }

    return users.filter((user) =>
      [user.phone, user.nickname ?? "", user.notes ?? ""].some((value) =>
        value.includes(normalizedKeyword),
      ),
    );
  }, [keyword, users]);

  const handleUserPatch = async (
    userId: string,
    payload: {
      nickname?: string | null;
      status?: "active" | "disabled";
      notes?: string | null;
      credits?: number;
    },
  ) => {
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      window.alert(data.error ?? "用户更新失败，请稍后再试。");
      return false;
    }

    return true;
  };

  const handleStatusToggle = async (user: AdminUserRecord) => {
    const nextStatus = user.status === "active" ? "disabled" : "active";
    const ok = await handleUserPatch(user.id, { status: nextStatus });

    if (!ok) {
      return;
    }

    setUsers((current) =>
      current.map((item) =>
        item.id === user.id ? { ...item, status: nextStatus } : item,
      ),
    );
  };

  const handleCreditsChange = async (user: AdminUserRecord, delta: number) => {
    const nextCredits = Math.max(0, user.credits + delta);
    const ok = await handleUserPatch(user.id, { credits: nextCredits });

    if (!ok) {
      return;
    }

    setUsers((current) =>
      current.map((item) =>
        item.id === user.id ? { ...item, credits: nextCredits } : item,
      ),
    );
  };

  const handleNotesSave = async (user: AdminUserRecord, notes: string) => {
    const ok = await handleUserPatch(user.id, { notes });

    if (!ok) {
      return;
    }

    setUsers((current) =>
      current.map((item) =>
        item.id === user.id ? { ...item, notes } : item,
      ),
    );
  };

  return (
    <div className="space-y-5">
      <section className="rounded-[30px] border border-white/80 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-lg font-black text-slate-800">用户查询</p>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              可以按手机号、昵称或备注搜索用户。
            </p>
          </div>
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="输入手机号、昵称或备注"
            className="h-12 w-full max-w-[320px] rounded-full border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 outline-none"
          />
        </div>
      </section>

      <div className="space-y-4">
        {filteredUsers.map((user) => (
          <article
            key={user.id}
            className="rounded-[30px] border border-white/80 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]"
          >
            <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-xl font-black text-slate-900">{user.phone}</p>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                    {user.status === "active" ? "正常使用中" : "已停用"}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-7 text-slate-500">
                  昵称：{user.nickname || "未设置"} | 最近登录：
                  {user.last_login_at
                    ? new Date(user.last_login_at).toLocaleString("zh-CN")
                    : "还没有记录"}
                </p>

                <div className="mt-5 rounded-[24px] bg-slate-50 p-4">
                  <p className="text-xs font-bold tracking-[0.14em] text-slate-400">管理员备注</p>
                  <textarea
                    defaultValue={user.notes ?? ""}
                    onBlur={(event) => {
                      if ((user.notes ?? "") !== event.target.value) {
                        void handleNotesSave(user, event.target.value);
                      }
                    }}
                    className="mt-3 h-28 w-full rounded-[18px] border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-700 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[24px] bg-[#eef6ff] p-5">
                  <p className="text-xs font-bold tracking-[0.14em] text-[#5a7db6]">魔法币余额</p>
                  <p className="mt-3 text-4xl font-black tracking-[-0.05em] text-slate-900">
                    {user.credits}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleCreditsChange(user, 10)}
                      className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-700"
                    >
                      +10 币
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCreditsChange(user, -10)}
                      className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-700"
                    >
                      -10 币
                    </button>
                  </div>
                </div>

                <div className="rounded-[24px] bg-slate-50 p-5">
                  <p className="text-xs font-bold tracking-[0.14em] text-slate-400">账号操作</p>
                  <button
                    type="button"
                    onClick={() => handleStatusToggle(user)}
                    className="mt-4 inline-flex rounded-full bg-slate-900 px-5 py-3 text-sm font-black text-white"
                  >
                    {user.status === "active" ? "停用账号" : "恢复账号"}
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
