import "server-only";
import { getSiteSettingValue, upsertSiteSettings } from "@/lib/admin-data";

export type AdminAuditLogRecord = {
  id: string;
  actorUserId: string;
  actorDisplayName: string;
  actorPhone: string;
  action: string;
  targetType: string;
  targetId: string;
  detail: Record<string, unknown>;
  createdAt: string;
};

type AdminAuditSetting = {
  logs: AdminAuditLogRecord[];
};

export async function appendAdminAuditLog(input: {
  actorUserId: string;
  actorDisplayName: string;
  actorPhone: string;
  action: string;
  targetType: string;
  targetId: string;
  detail?: Record<string, unknown>;
}) {
  const current = await getSiteSettingValue<AdminAuditSetting>("admin.audit-log", {
    logs: [],
  });

  const nextLog: AdminAuditLogRecord = {
    id: crypto.randomUUID(),
    actorUserId: input.actorUserId,
    actorDisplayName: input.actorDisplayName,
    actorPhone: input.actorPhone,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    detail: input.detail ?? {},
    createdAt: new Date().toISOString(),
  };

  await upsertSiteSettings([
    {
      setting_key: "admin.audit-log",
      setting_group: "admin",
      label: "后台操作审计日志",
      value: {
        logs: [nextLog, ...(current.logs ?? [])].slice(0, 200),
      },
      description: "记录后台关键管理动作，便于上线后追溯。",
      updated_by: input.actorUserId,
    },
  ]);
}
