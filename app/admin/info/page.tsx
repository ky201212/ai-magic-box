import Link from "next/link";
import { listInfoContentPosts } from "@/lib/admin-data";
import { assertAdminPagePermission } from "@/lib/admin";
import { AdminPageHeader } from "../_components/admin-page-header";
import { InfoContentConsole } from "../_components/info-content-console";

export default async function AdminInfoContentPage() {
  await assertAdminPagePermission("site_settings");
  const posts = await listInfoContentPosts({ includeDrafts: true }).catch(
    () => [],
  );

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="资讯管理"
        title="科普资讯发布台"
        description="发布科普知识、科普视频、获奖喜讯和活动资讯。后台可以直接填写详细内容并上传图片或视频，保存为已发布后会出现在官网科普资讯页面。"
        actions={
          <Link
            href="/world"
            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(15,23,42,0.16)] transition hover:bg-slate-800"
          >
            查看前台页面
          </Link>
        }
      />
      <InfoContentConsole initialPosts={posts} />
    </div>
  );
}
