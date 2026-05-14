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
        description="这里不再只是简单显示待审状态，而是把规则拦截结果、智能审核理由、智能审核报错信息和人工最终处理全部展开给管理员看。"
      />
      <ReviewConsole initialPosts={posts} />
    </div>
  );
}
