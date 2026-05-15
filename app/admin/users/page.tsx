import { listAdminUsers } from "@/lib/admin-data";
import { assertAdminPagePermission } from "@/lib/admin";
import { AdminPageHeader } from "../_components/admin-page-header";
import { UsersConsole } from "../_components/users-console";

export default async function AdminUsersPage() {
  await assertAdminPagePermission("user_management");
  const users = await listAdminUsers({
    includeCreditLogs: false,
    limit: 24,
  }).catch(() => []);

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="用户管理"
        title="用户与魔法币管理台"
        description="新用户默认会领取 50 个魔法币。这里可以直接查看用户状态、补充或扣减魔法币，并留下管理员备注。"
      />
      <UsersConsole initialUsers={users} />
    </div>
  );
}
