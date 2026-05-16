import "server-only";
import {
  createCommunityPost,
  getCommunityPostById,
  updateCommunityPostModeration,
  type CommunityPostRow,
  type CommunityPostMode,
} from "@/lib/community";
import { getCommunityReviewSetting } from "@/lib/admin-data";
import { moderateCommunityPost, moderateCommunityPostByRules } from "@/lib/moderation";
import { sendUserNotification } from "@/lib/user-notifications";

type QueueShareInput = {
  userId: string;
  title: string;
  description?: string | null;
  prompt: string;
  previewImageUrl: string;
  previewCode: string;
  mode: CommunityPostMode;
};

type QueueCommunityShareResult =
  | {
      post: CommunityPostRow;
      immediateStatus: "rejected";
      message: string;
    }
  | {
      post: CommunityPostRow;
      immediateStatus: "pending";
      message: string;
    };

export async function queueCommunityShare(
  input: QueueShareInput,
): Promise<QueueCommunityShareResult> {
  const ruleResult = moderateCommunityPostByRules({
    title: input.title,
    prompt: [input.prompt, input.description].filter(Boolean).join("\n"),
    previewCode: input.previewCode,
  });

  if (!ruleResult.approved) {
    const post = await createCommunityPost({
      userId: input.userId,
      title: input.title,
      description: input.description,
      prompt: input.prompt,
      previewImageUrl: input.previewImageUrl,
      previewCode: input.previewCode,
      mode: input.mode,
      moderationStatus: "rejected",
      moderationReason: ruleResult.reason,
      moderationDetail: ruleResult.detail,
    });

    await sendUserNotification({
      userId: input.userId,
      title: "作品未通过社区审核",
      body: ruleResult.reason || "这次分享暂时没有通过，请调整内容后再试一次。",
    }).catch((error) => {
      console.error("【发送社区驳回通知失败】:", error);
    });

    return {
      post,
      immediateStatus: "rejected" as const,
      message: ruleResult.reason || "作品暂时不能公开展示，请调整后再试。",
    };
  }

  const post = await createCommunityPost({
    userId: input.userId,
    title: input.title,
    description: input.description,
    prompt: input.prompt,
    previewImageUrl: input.previewImageUrl,
    previewCode: input.previewCode,
    mode: input.mode,
    moderationStatus: "pending",
    moderationReason: "作品已提交，正在进入智能复审。",
    moderationDetail: {
      ...ruleResult.detail,
      queuedAt: new Date().toISOString(),
    },
  });

  return {
    post,
    immediateStatus: "pending" as const,
    message: "作品已提交成功，正在审核中。审核结果会通过右上角通知告诉你。",
  };
}

export async function finalizeCommunityShareReview(postId: string) {
  const post = (await getCommunityPostById(postId)) as CommunityPostRow | null;
  const reviewSetting = await getCommunityReviewSetting().catch(() => null);

  if (!post) {
    return null;
  }

  if (post.moderation_status !== "pending") {
    return post;
  }

  const moderation = await moderateCommunityPost({
    title: post.title,
    prompt: [
      post.prompt,
      typeof post.moderation_detail?.community_meta === "object" &&
      post.moderation_detail.community_meta &&
      "description" in post.moderation_detail.community_meta
        ? post.moderation_detail.community_meta.description
        : null,
    ]
      .filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
      .join("\n"),
    previewCode: post.preview_code,
  });

  const finalStatus =
    moderation.suggestedStatus === "approved" &&
    reviewSetting?.aiApprovalMode === "manual_review"
      ? "pending"
      : moderation.suggestedStatus;
  const finalStage =
    moderation.suggestedStatus === "approved" &&
    reviewSetting?.aiApprovalMode === "manual_review"
      ? "ai"
      : moderation.stage;
  const finalReason =
    moderation.suggestedStatus === "approved" &&
    reviewSetting?.aiApprovalMode === "manual_review"
      ? "AI审核已通过，正在等待人工复核发布。"
      : moderation.suggestedStatus === "approved"
        ? "作品已通过审核，现已展示到成长社区。"
        : moderation.reason;
  const currentCommunityMeta =
    post.moderation_detail && typeof post.moderation_detail.community_meta === "object"
      ? post.moderation_detail.community_meta
      : undefined;

  const updatedPost = await updateCommunityPostModeration(postId, {
    moderationStatus: finalStatus,
    moderationReason: finalReason,
    moderationDetail: {
      ...post.moderation_detail,
      ...moderation.detail,
      ...(currentCommunityMeta ? { community_meta: currentCommunityMeta } : {}),
      policy: {
        aiApprovalMode: reviewSetting?.aiApprovalMode ?? "manual_review",
        lockManualApproveAfterAiReject:
          reviewSetting?.lockManualApproveAfterAiReject ?? true,
      },
    },
    moderationStage: finalStage,
  });

  await sendUserNotification({
    userId: post.user_id,
    title:
      finalStatus === "approved"
        ? "作品审核通过啦"
        : finalStatus === "rejected"
          ? "作品暂时没有通过审核"
          : moderation.suggestedStatus === "approved"
            ? "作品等待人工复核"
            : "作品正在继续复审",
    body:
      finalStatus === "approved"
        ? "你分享的作品已经通过审核，现在已经出现在成长社区里。"
        : finalStatus === "rejected"
          ? moderation.reason || "这次分享暂时没有通过，请调整内容后再试。"
          : moderation.suggestedStatus === "approved"
            ? "AI审核已经通过，作品正在等待管理员人工复核后发布。"
            : "审核服务暂时繁忙，作品还在复审队列里，稍后会继续通知你结果。",
  }).catch((error) => {
    console.error("【发送社区审核通知失败】:", error);
  });

  return updatedPost;
}
