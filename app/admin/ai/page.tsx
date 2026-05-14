import { listAiModeConfigs } from "@/lib/admin-data";
import { assertAdminPagePermission } from "@/lib/admin";
import { AdminPageHeader } from "../_components/admin-page-header";
import { AiConfigForm } from "../_components/ai-config-form";

export default async function AdminAiPage() {
  await assertAdminPagePermission("ai_configs");
  const configs = await listAiModeConfigs().catch(() => []);

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="AI 能力配置"
        title="模型与扣币控制台"
        description="每个 AI 功能现在都可以单独控制是否启用、是否扣币、每次扣多少币、使用哪个模型、走哪个接口地址。管理员只需要勾选和填写中文表单，不需要碰程序代码。"
      />
      <AiConfigForm initialConfigs={configs} />
    </div>
  );
}
