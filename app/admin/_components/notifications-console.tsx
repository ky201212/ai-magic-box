"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type {
  NotificationRecord,
  NotificationTargetFilters,
  NotificationTargetUserRecord,
} from "./types";

type NotificationsConsoleProps = {
  initialNotifications: NotificationRecord[];
};

type SaveStatus = "idle" | "saving" | "success" | "error";
type Audience = "all" | "admins" | "selected" | "segment";

const genderOptions = [
  { value: "any", label: "不限性别" },
  { value: "male", label: "男" },
  { value: "female", label: "女" },
  { value: "unspecified", label: "未填写/不透露" },
] as const;

const groupOptions = [
  { value: "all", label: "不限人群" },
  { value: "active_subscription", label: "当前会员用户" },
  { value: "no_subscription", label: "非会员用户" },
  { value: "creators", label: "有作品用户" },
  { value: "creator_stars", label: "创作者之星" },
  { value: "pending_review", label: "有待审核作品" },
  { value: "rejected_posts", label: "有驳回作品" },
  { value: "no_posts", label: "暂无作品用户" },
] as const;

function getUserName(user: NotificationTargetUserRecord) {
  return user.profile_display_name || user.nickname || "未命名用户";
}

function getGenderLabel(gender: NotificationTargetUserRecord["gender"]) {
  if (gender === "male") {
    return "男";
  }

  if (gender === "female") {
    return "女";
  }

  return "未填写";
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "暂未发送";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function NotificationsConsole({
  initialNotifications,
}: NotificationsConsoleProps) {
  const [notifications, setNotifications] = useState(initialNotifications.slice(0, 20));
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [audience, setAudience] = useState<Audience>("all");
  const [selectedUsers, setSelectedUsers] = useState<NotificationTargetUserRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NotificationTargetUserRecord[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [filters, setFilters] = useState<NotificationTargetFilters>({
    gender: "any",
    status: "active",
    group: "all",
  });
  const [draft, setDraft] = useState({
    title: "",
    body: "",
  });

  useEffect(() => {
    if (audience !== "selected" || !searchQuery.trim()) {
      return;
    }

    let isMounted = true;
    const timer = window.setTimeout(async () => {
      setIsSearching(true);

      try {
        const params = new URLSearchParams({
          mode: "user-search",
          query: searchQuery.trim(),
          status: "any",
          group: "all",
          gender: "any",
        });
        const response = await fetch(`/api/admin/notifications?${params.toString()}`, {
          cache: "no-store",
        });
        const data = (await response.json()) as {
          users?: NotificationTargetUserRecord[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error ?? "用户搜索失败。");
        }

        if (isMounted) {
          setSearchResults(data.users ?? []);
        }
      } catch {
        if (isMounted) {
          setSearchResults([]);
        }
      } finally {
        if (isMounted) {
          setIsSearching(false);
        }
      }
    }, 260);

    return () => {
      isMounted = false;
      window.clearTimeout(timer);
    };
  }, [audience, searchQuery]);

  const handleCreate = async (action: "draft" | "send") => {
    if (!draft.title.trim() || !draft.body.trim()) {
      window.alert("通知标题和内容都需要填写。");
      return;
    }

    if (audience === "selected" && selectedUsers.length === 0) {
      window.alert("请先通过手机号或名称搜索并选择至少一位用户。");
      return;
    }

    setStatus("saving");

    const targetFilters: NotificationTargetFilters = {
      ...filters,
      audience,
    };

    try {
      const response = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...draft,
          action,
          target_type:
            audience === "all" ? "all" : audience === "admins" ? "admins" : "users",
          target_user_ids:
            audience === "selected" ? selectedUsers.map((user) => user.id) : [],
          target_filters: targetFilters,
        }),
      });

      const data = (await response.json()) as {
        notification?: NotificationRecord;
        error?: string;
        message?: string;
      };

      if (!response.ok || !data.notification) {
        throw new Error(data.error ?? "通知发送失败");
      }

      setNotifications((current) => [data.notification!, ...current].slice(0, 20));
      setDraft({ title: "", body: "" });
      setSelectedUsers([]);
      setSearchQuery("");
      setSearchResults([]);
      setStatus("success");
      setStatusMessage(
        action === "send"
          ? data.message ?? "通知已经发送到用户端。"
          : "草稿已经保存，并已锁定当前匹配到的收件人名单。",
      );
    } catch (error) {
      setStatus("error");
      setStatusMessage(
        error instanceof Error ? error.message : "通知操作失败，请稍后再试。",
      );
    } finally {
      window.setTimeout(() => {
        setStatus("idle");
        setStatusMessage("");
      }, 2600);
    }
  };

  const handleSendDraft = async (notification: NotificationRecord) => {
    setStatus("saving");

    try {
      const response = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "send",
          notification_id: notification.id,
        }),
      });
      const data = (await response.json()) as {
        notification?: NotificationRecord;
        error?: string;
        message?: string;
      };

      if (!response.ok || !data.notification) {
        throw new Error(data.error ?? "草稿发送失败。");
      }

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? data.notification! : item,
        ),
      );
      setStatus("success");
      setStatusMessage(data.message ?? "草稿已正式发送。");
    } catch (error) {
      setStatus("error");
      setStatusMessage(
        error instanceof Error ? error.message : "草稿发送失败，请稍后再试。",
      );
    } finally {
      window.setTimeout(() => {
        setStatus("idle");
        setStatusMessage("");
      }, 2600);
    }
  };

  const addSelectedUser = (user: NotificationTargetUserRecord) => {
    setSelectedUsers((current) =>
      current.some((item) => item.id === user.id) ? current : [...current, user],
    );
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_1.05fr]">
      <section className="rounded-[30px] border border-white/80 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
        <p className="text-lg font-black text-slate-800">发布新通知</p>
        <p className="mt-2 text-sm leading-7 text-slate-500">
          可以按手机号/名称指定用户，也可以按性别、会员、创作者、审核状态等人群发送。
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

          <div className="rounded-[24px] border border-[#e4ebff] bg-[#f8faff] p-4">
            <p className="text-sm font-black text-slate-700">发送对象</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {[
                { value: "all", label: "全部启用用户" },
                { value: "admins", label: "启用管理员" },
                { value: "selected", label: "搜索指定用户" },
                { value: "segment", label: "按条件筛选人群" },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setAudience(item.value as Audience)}
                  className={`rounded-[18px] border px-4 py-3 text-left text-sm font-black transition ${
                    audience === item.value
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {audience === "selected" ? (
              <div className="mt-4 space-y-3">
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="输入用户名称、主页名称或手机号搜索"
                  className="h-12 w-full rounded-[18px] border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none"
                />
                <div className="rounded-[18px] bg-white p-3">
                  <p className="text-xs font-black text-slate-400">
                    {isSearching ? "正在搜索..." : "搜索结果"}
                  </p>
                  <div className="mt-2 max-h-56 space-y-2 overflow-y-auto">
                    {searchQuery.trim() && searchResults.length ? (
                      searchResults.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => addSelectedUser(user)}
                          className="w-full rounded-[14px] bg-slate-50 px-3 py-2 text-left text-sm hover:bg-[#eef4ff]"
                        >
                          <span className="font-black text-slate-800">
                            {getUserName(user)}
                          </span>
                          <span className="ml-2 text-slate-500">{user.phone}</span>
                          <span className="ml-2 text-xs text-slate-400">
                            {getGenderLabel(user.gender)}
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="rounded-[14px] bg-slate-50 px-3 py-4 text-sm text-slate-400">
                        {searchQuery.trim() ? "没有搜到用户。" : "输入关键词后开始搜索。"}
                      </p>
                    )}
                  </div>
                </div>
                {selectedUsers.length ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() =>
                          setSelectedUsers((current) =>
                            current.filter((item) => item.id !== user.id),
                          )
                        }
                        className="rounded-full bg-slate-900 px-3 py-2 text-xs font-black text-white"
                      >
                        {getUserName(user)} · {user.phone} ×
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {audience === "segment" ? (
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <label className="block text-sm font-bold text-slate-600">
                  性别
                  <select
                    value={filters.gender ?? "any"}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        gender: event.target.value as NotificationTargetFilters["gender"],
                      }))
                    }
                    className="mt-2 h-12 w-full rounded-[16px] border border-slate-200 bg-white px-3 outline-none"
                  >
                    {genderOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-bold text-slate-600">
                  账号状态
                  <select
                    value={filters.status ?? "active"}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        status: event.target.value as NotificationTargetFilters["status"],
                      }))
                    }
                    className="mt-2 h-12 w-full rounded-[16px] border border-slate-200 bg-white px-3 outline-none"
                  >
                    <option value="active">启用用户</option>
                    <option value="disabled">已禁用用户</option>
                    <option value="any">不限状态</option>
                  </select>
                </label>
                <label className="block text-sm font-bold text-slate-600">
                  指定人群
                  <select
                    value={filters.group ?? "all"}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        group: event.target.value as NotificationTargetFilters["group"],
                      }))
                    }
                    className="mt-2 h-12 w-full rounded-[16px] border border-slate-200 bg-white px-3 outline-none"
                  >
                    {groupOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}
          </div>

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
              {status === "saving" ? "发送中" : "立即发送"}
            </button>
          </div>
          {statusMessage ? (
            <div
              className={`rounded-[18px] px-4 py-3 text-sm font-bold ${
                status === "error"
                  ? "bg-[#fff1f2] text-[#d4557c]"
                  : "bg-[#ecfdf3] text-[#1c8b5f]"
              }`}
            >
              {statusMessage}
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-[30px] border border-white/80 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-lg font-black text-slate-800">通知历史</p>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              这里只显示最近 20 条，完整记录去独立页面看表格。
            </p>
          </div>
          <Link
            href="/admin/notifications/history"
            className="rounded-full bg-[#eef4ff] px-4 py-2 text-sm font-black text-[#4b6fcc]"
          >
            查看更多
          </Link>
        </div>

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
                <div className="mt-3 rounded-[16px] bg-white px-3 py-3 text-xs leading-6 text-slate-500">
                  <p className="font-black text-slate-700">
                    {notification.target_label ?? "收件人"} ·{" "}
                    {notification.recipient_count ?? 0} 人 ·{" "}
                    {formatDateTime(notification.sent_at ?? notification.created_at)}
                  </p>
                  {notification.recipient_preview?.length ? (
                    <p className="mt-1">
                      收件人预览：
                      {notification.recipient_preview
                        .map((user) => `${getUserName(user)} ${user.phone}`)
                        .join("，")}
                    </p>
                  ) : (
                    <p className="mt-1">暂无收件人。</p>
                  )}
                  <Link
                    href={`/admin/notifications/${notification.id}`}
                    className="mt-2 inline-flex font-black text-[#4b6fcc]"
                  >
                    查看收件人明细
                  </Link>
                  {notification.status === "draft" ? (
                    <button
                      type="button"
                      onClick={() => handleSendDraft(notification)}
                      className="ml-4 mt-2 inline-flex font-black text-[#111827]"
                    >
                      发送草稿
                    </button>
                  ) : null}
                </div>
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
