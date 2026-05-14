"use client";

import { useState } from "react";
import type { NotificationRecord } from "./types";

type NotificationsConsoleProps = {
  initialNotifications: NotificationRecord[];
};

type SaveStatus = "idle" | "saving" | "success" | "error";

export function NotificationsConsole({
  initialNotifications,
}: NotificationsConsoleProps) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [draft, setDraft] = useState({
    title: "",
    body: "",
    target_type: "all" as "all" | "users" | "admins",
  });

  const handleCreate = async (action: "draft" | "send") => {
    if (!draft.title.trim() || !draft.body.trim()) {
      window.alert("通知标题和内容都需要填写。");
      return;
    }

    setStatus("saving");

    try {
      const response = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...draft,
          action,
        }),
      });

      const data = (await response.json()) as {
        notification?: NotificationRecord;
        error?: string;
      };

      if (!response.ok || !data.notification) {
        throw new Error(data.error ?? "通知发送失败");
      }

      setNotifications((current) => [data.notification!, ...current]);
      setDraft({
        title: "",
        body: "",
        target_type: "all",
      });
      setStatus("success");
    } catch {
      setStatus("error");
    } finally {
      window.setTimeout(() => {
        setStatus("idle");
      }, 2200);
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-[30px] border border-white/80 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
        <p className="text-lg font-black text-slate-800">发布新通知</p>
        <p className="mt-2 text-sm leading-7 text-slate-500">
          可以先存草稿，也可以直接发送给全部用户、管理员或指定对象。
        </p>

        <div className="mt-6 space-y-4">
          <label className="block text-sm font-bold text-slate-600">
            通知标题
            <input
              value={draft.title}
              onChange={(event) =>
                setDraft((current) => ({ ...current, title: event.target.value }))
              }
              className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
            />
          </label>
          <label className="block text-sm font-bold text-slate-600">
            通知内容
            <textarea
              value={draft.body}
              onChange={(event) =>
                setDraft((current) => ({ ...current, body: event.target.value }))
              }
              className="mt-2 h-40 w-full rounded-[18px] border border-slate-200 bg-slate-50 p-4 text-slate-800 outline-none"
            />
          </label>
          <label className="block text-sm font-bold text-slate-600">
            发送对象
            <select
              value={draft.target_type}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  target_type: event.target.value as "all" | "users" | "admins",
                }))
              }
              className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
            >
              <option value="all">发给全部用户</option>
              <option value="users">发给指定用户</option>
              <option value="admins">只发给管理员</option>
            </select>
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => handleCreate("draft")}
              className="rounded-full bg-slate-100 px-5 py-3 text-sm font-black text-slate-700"
            >
              保存草稿
            </button>
            <button
              type="button"
              onClick={() => handleCreate("send")}
              className="rounded-full bg-slate-900 px-5 py-3 text-sm font-black text-white"
            >
              {status === "saving"
                ? "发送中"
                : status === "success"
                  ? "发送成功"
                  : status === "error"
                    ? "发送失败"
                    : "立即发送"}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-[30px] border border-white/80 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
        <p className="text-lg font-black text-slate-800">通知历史</p>
        <p className="mt-2 text-sm leading-7 text-slate-500">
          最近发送过的消息会显示在这里。
        </p>

        <div className="mt-6 space-y-3">
          {notifications.length ? (
            notifications.map((notification) => (
              <article key={notification.id} className="rounded-[22px] bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-base font-black text-slate-800">
                    {notification.title}
                  </p>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500">
                    {notification.status === "sent" ? "已发送" : "草稿"}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-7 text-slate-500">
                  {notification.body}
                </p>
              </article>
            ))
          ) : (
            <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
              还没有任何通知记录。
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
