import { listNotifications } from "@/lib/admin-data";
import { assertAdminPagePermission } from "@/lib/admin";
import { AdminPageHeader } from "../_components/admin-page-header";
import { NotificationsConsole } from "../_components/notifications-console";

export default async function AdminNotificationsPage() {
  await assertAdminPagePermission("notifications");
  const notifications = await listNotifications().catch(() => []);

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="通知中心"
        title="站内消息发布台"
        description="这里用于面向孩子、家长或管理员发送平台通知。支持先保存草稿，再决定什么时候正式发送。"
      />
      <NotificationsConsole initialNotifications={notifications} />
    </div>
  );
}
