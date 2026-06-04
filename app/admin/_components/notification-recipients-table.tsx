import type { NotificationRecipientRecord } from "./types";

function getUserName(user: NotificationRecipientRecord) {
  return user.profile_display_name || user.nickname || "未命名用户";
}

function getGenderLabel(gender: NotificationRecipientRecord["gender"]) {
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
    return "暂无";
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

export function NotificationRecipientsTable({
  recipients,
  total,
}: {
  recipients: NotificationRecipientRecord[];
  total: number;
}) {
  return (
    <section className="overflow-hidden rounded-[30px] border border-white/80 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
      <div className="border-b border-slate-100 px-5 py-4">
        <p className="text-sm font-black text-slate-800">收件人明细</p>
        <p className="mt-1 text-sm text-slate-500">
          当前展示 {recipients.length} 条，共 {total} 位收件人。
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
          <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
            <tr>
              <th className="px-5 py-4">用户名称</th>
              <th className="px-5 py-4">手机号</th>
              <th className="px-5 py-4">性别</th>
              <th className="px-5 py-4">人群标签</th>
              <th className="px-5 py-4">已读状态</th>
              <th className="px-5 py-4">送达时间</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {recipients.map((recipient) => (
              <tr key={recipient.notification_user_id ?? recipient.id}>
                <td className="px-5 py-4">
                  <p className="font-black text-slate-800">{getUserName(recipient)}</p>
                  <p className="mt-1 text-xs text-slate-400">ID：{recipient.id}</p>
                </td>
                <td className="px-5 py-4 font-bold text-slate-700">{recipient.phone}</td>
                <td className="px-5 py-4 text-slate-500">
                  {getGenderLabel(recipient.gender)}
                </td>
                <td className="px-5 py-4 text-slate-500">
                  <div className="flex flex-wrap gap-2">
                    {recipient.is_admin ? (
                      <span className="rounded-full bg-[#eef4ff] px-2 py-1 text-xs font-black text-[#4b6fcc]">
                        管理员
                      </span>
                    ) : null}
                    {recipient.has_active_subscription ? (
                      <span className="rounded-full bg-[#fff7ed] px-2 py-1 text-xs font-black text-[#c76b2a]">
                        会员
                      </span>
                    ) : null}
                    {recipient.posts_count > 0 ? (
                      <span className="rounded-full bg-[#ecfdf3] px-2 py-1 text-xs font-black text-[#1c8b5f]">
                        有作品 {recipient.posts_count}
                      </span>
                    ) : null}
                    {recipient.is_creator_star ? (
                      <span className="rounded-full bg-[#f3f1ff] px-2 py-1 text-xs font-black text-[#7a67db]">
                        创作者之星
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                    {recipient.is_read ? "已读" : "未读"}
                  </span>
                </td>
                <td className="px-5 py-4 text-slate-500">
                  {formatDateTime(recipient.delivered_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!recipients.length ? (
        <div className="px-5 py-12 text-center text-sm text-slate-400">
          这条通知还没有收件人记录。
        </div>
      ) : null}
    </section>
  );
}
