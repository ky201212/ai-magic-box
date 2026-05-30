import {
  type AiSecretAuditRecord,
  type AiModelChainStatsRecord,
  type AiSecretSecuritySummary,
  getAiModelChainStats,
  listAiModeConfigs,
  listAiModelPresets,
  type AiSecretStatusRecord,
} from "@/lib/admin-data";
import { assertAdminPagePermission } from "@/lib/admin";
import { AdminPageHeader } from "../_components/admin-page-header";
import { AiConfigForm } from "../_components/ai-config-form";
import {
  getAiSecretSecuritySummary,
  listAiSecretAuditLogs,
  listAiSecretStatuses,
  getStoredAiSecrets,
} from "@/lib/ai-secrets";

export default async function AdminAiPage() {
  await assertAdminPagePermission("ai_configs");
  const [configs, presets] = await Promise.all([
    listAiModeConfigs().catch(() => []),
    listAiModelPresets().catch(() => []),
  ]);
  const modelChainStatsEntries = await Promise.all(
    configs.map(async (config) => [
      config.mode_key,
      await getAiModelChainStats(config.mode_key).catch(() => ({
        updatedAt: null,
        models: [],
        recentEvents: [],
      })),
    ]),
  );
  const initialModelChainStats = Object.fromEntries(
    modelChainStatsEntries,
  ) as Record<string, AiModelChainStatsRecord>;
  const storedSecrets = await getStoredAiSecrets().catch(() => []);
  const envNames = Array.from(
    new Set([
      ...configs.map((item) => item.api_key_env),
      ...presets.map((item) => item.api_key_env),
      ...storedSecrets.map((item) => item.envName),
    ]),
  ).filter((item) => item.trim().length > 0);
  const secretStatuses: AiSecretStatusRecord[] = await listAiSecretStatuses(
    envNames,
  ).catch(() => []);
  const secretSecurity: AiSecretSecuritySummary = getAiSecretSecuritySummary();
  const secretAuditLogs: AiSecretAuditRecord[] = await listAiSecretAuditLogs().catch(
    () => [],
  );

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="AI 能力配置"
        title="模型与扣币控制台"
        description="每个 AI 功能现在都可以单独控制是否启用、是否扣币、每次扣多少币、使用哪个模型、走哪个接口地址。管理员只需要勾选和填写中文表单，不需要碰程序代码。"
      />
      <AiConfigForm
        initialConfigs={configs}
        initialPresets={presets}
        initialModelChainStats={initialModelChainStats}
        initialSecretStatuses={secretStatuses}
        initialSecretSecurity={secretSecurity}
        initialSecretAuditLogs={secretAuditLogs}
      />
    </div>
  );
}
