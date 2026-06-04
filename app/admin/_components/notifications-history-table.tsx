import Link from "next/link";
import type { NotificationRecord } from "./types";

function formatDateTime(value?: string | null) {
  if (!value) {
    return "暂未发送";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function NotificationsHistoryTable({
  notifications,
}: {
  notifications: NotificationRecord[];
}) {
  return (
    <section className="overflow-hidden rounded-[30px] border border-white/80 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
          <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
            <tr>
              <th className="px-5 py-4">标题</th>
              <th className="px-5 py-4">状态</th>
              <th className="px-5 py-4">发送对象</th>
              <th className="px-5 py-4">收件人预览</th>
              <th className="px-5 py-4">时间</th>
              <th className="px-5 py-4">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {notifications.map((notification) => (
              <tr key={notification.id} className="align-top">
                <td className="max-w-sm px-5 py-4">
                  <p className="font-black text-slate-800">{notification.title}</p>
                  <p className="mt-1 line-clamp-2 text-slate-500">{notification.body}</p>
                </td>
                <td className="px-5 py-4">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                    {notification.status === "sent" ? "已发送" : "草稿"}
                  </span>
                </td>
                <td className="px-5 py-4 text-slate-600">
                  <p className="font-bold">{notification.target_label ?? "未记录"}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    共 {notification.recipient_count ?? 0} 人
                  </p>
                </td>
                <td className="min-w-72 px-5 py-4 text-slate-500">
                  {notification.recipient_preview?.length ? (
                    notification.recipient_preview.map((user) => (
                      <p key={user.id} className="whitespace-nowrap">
                        {user.profile_display_name || user.nickname || "未命名用户"} · {user.phone}
                      </p>
                    ))
                  ) : (
                    <span className="text-slate-400">暂无收件人</span>
                  )}
                </td>
                <td className="px-5 py-4 text-slate-500">
                  {formatDateTime(notification.sent_at ?? notification.created_at)}
                </td>
                <td className="px-5 py-4">
                  <Link
                    href={`/admin/notifications/${notification.id}`}
                    className="rounded-full bg-slate-900 px-4 py-2 text-xs font-black text-white"
                  >
                    收件人明细
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!notifications.length ? (
        <div className="px-5 py-12 text-center text-sm text-slate-400">
          还没有通知历史。
        </div>
      ) : null}
    </section>
  );
}
