import { listAdminCommunityPosts } from "@/lib/admin-data";
import { assertAdminPagePermission } from "@/lib/admin";
import { AdminPageHeader } from "../_components/admin-page-header";
import { ReviewConsole } from "../_components/review-console";

export default async function AdminReviewPage() {
  await assertAdminPagePermission("community_review");
  const posts = await listAdminCommunityPosts().catch(() => []);

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="社区审核"
        title="规则 + 智能 + 人工 三段审核台"
        description="这里会同时看到待审核、已发布、已驳回的全部社区作品，不再只是一条待审列表。规则拦截、智能审核、人工最终处理和用户当前发布状态都会完整展开。"
      />
      <ReviewConsole initialPosts={posts} />
    </div>
  );
}
