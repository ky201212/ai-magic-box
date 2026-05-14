import { listSiteSettings } from "@/lib/admin-data";
import { assertAdminPagePermission } from "@/lib/admin";
import { AdminPageHeader } from "../_components/admin-page-header";
import { SiteSettingsForm } from "../_components/site-settings-form";

export default async function AdminSitePage() {
  await assertAdminPagePermission("site_settings");
  const settings = await listSiteSettings().catch(() => []);

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="站点内容"
        title="中文化站点编辑台"
        description="这里已经把原始配置对象整理成中文输入表单。管理员只需要像填写普通后台一样改文字、改链接、改 Logo，不需要碰任何 JSON。"
      />
      <SiteSettingsForm initialSettings={settings} />
    </div>
  );
}
