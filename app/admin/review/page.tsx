import {
  getCommunityReviewSetting,
  listAdminCommunityPosts,
} from "@/lib/admin-data";
import { assertAdminPagePermission } from "@/lib/admin";
import { AdminPageHeader } from "../_components/admin-page-header";
import { ReviewConsole } from "../_components/review-console";

export default async function AdminReviewPage() {
  await assertAdminPagePermission("community_review");
  const [posts, reviewSetting] = await Promise.all([
    listAdminCommunityPosts({ limit: 48 }).catch(() => []),
    getCommunityReviewSetting().catch(() => ({
      aiApprovalMode: "manual_review" as const,
      aiModerationInstruction:
        "请优先保护未成年人社区安全，重点关注是否含有违法违规、血腥暴力、色情低俗、危险模仿、诱导沉迷、辱骂攻击或明显不适合儿童公开展示的内容。",
      blockedKeywords: [
        "赌博",
        "诈骗",
        "色情",
        "暴力",
        "毒品",
        "枪支",
        "自杀",
        "反动",
        "恐怖",
        "违法",
      ],
      lockManualApproveAfterAiReject: true,
      dailyPostLimit: 0,
    })),
  ]);

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="社区审核"
        title="规则 + 智能 + 人工 三段审核台"
        description="这里会同时看到待审核、已发布、已驳回的全部社区作品，不再只是一条待审列表。规则拦截、智能审核、人工最终处理和用户当前发布状态都会完整展开。"
      />
      <ReviewConsole initialPosts={posts} initialReviewSetting={reviewSetting} />
    </div>
  );
}
