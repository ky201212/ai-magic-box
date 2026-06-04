import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getNotificationDetail,
  listNotificationRecipients,
} from "@/lib/admin-data";
import { assertAdminPagePermission } from "@/lib/admin";
import { AdminPageHeader } from "../../_components/admin-page-header";
import { NotificationRecipientsTable } from "../../_components/notification-recipients-table";

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

export default async function AdminNotificationDetailPage({
  params,
}: {
  params: Promise<{ notificationId: string }>;
}) {
  await assertAdminPagePermission("notifications");
  const { notificationId } = await params;
  const [notification, recipientResult] = await Promise.all([
    getNotificationDetail(notificationId),
    listNotificationRecipients(notificationId, { limit: 500 }).catch(() => ({
      recipients: [],
      total: 0,
    })),
  ]);

  if (!notification) {
    notFound();
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="通知明细"
        title={notification.title}
        description={`发送对象：${notification.target_label ?? "未记录"}。发送时间：${formatDateTime(notification.sent_at)}。`}
        actions={
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/notifications/history"
              className="rounded-full bg-[#eef4ff] px-5 py-3 text-sm font-black text-[#4b6fcc]"
            >
              返回历史表
            </Link>
            <Link
              href="/admin/notifications"
              className="rounded-full bg-slate-900 px-5 py-3 text-sm font-black text-white"
            >
              返回发布台
            </Link>
          </div>
        }
      />

      <section className="rounded-[26px] border border-white/80 bg-white p-5 text-sm leading-8 text-slate-600 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
        {notification.body}
      </section>

      <NotificationRecipientsTable
        recipients={recipientResult.recipients}
        total={recipientResult.total}
      />
    </div>
  );
}
