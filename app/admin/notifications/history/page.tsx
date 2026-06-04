import Link from "next/link";
import { listNotifications } from "@/lib/admin-data";
import { assertAdminPagePermission } from "@/lib/admin";
import { AdminPageHeader } from "../../_components/admin-page-header";
import { NotificationsHistoryTable } from "../../_components/notifications-history-table";

export default async function AdminNotificationsHistoryPage() {
  await assertAdminPagePermission("notifications");
  const notifications = await listNotifications(200).catch(() => []);

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="通知历史"
        title="站内通知历史表"
        description="这里用表格展示更完整的通知发送记录，可以查看每条通知的收件人、手机号和已读状态。"
        actions={
          <Link
            href="/admin/notifications"
            className="rounded-full bg-slate-900 px-5 py-3 text-sm font-black text-white"
          >
            返回发布台
          </Link>
        }
      />
      <NotificationsHistoryTable notifications={notifications} />
    </div>
  );
}
