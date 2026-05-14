import "server-only";
import { createCommunityPost, getCommunityPostById, updateCommunityPostModeration } from "@/lib/community";
import { moderateCommunityPost, moderateCommunityPostByRules } from "@/lib/moderation";
import { sendUserNotification } from "@/lib/user-notifications";

type QueueShareInput = {
  userId: string;
  title: string;
  prompt: string;
  previewImageUrl: string;
  previewCode: string;
};

type CommunityPostRow = {
  id: string;
  user_id: string;
  title: string;
  prompt: string;
  preview_image_url: string;
  preview_code: string;
  moderation_status: "pending" | "approved" | "rejected";
  moderation_reason: string | null;
  moderation_detail: Record<string, unknown>;
  moderation_stage?: "rule" | "ai" | "fallback" | "manual";
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
    prompt: input.prompt,
    previewCode: input.previewCode,
  });

  if (!ruleResult.approved) {
    const post = await createCommunityPost({
      userId: input.userId,
      title: input.title,
      prompt: input.prompt,
      previewImageUrl: input.previewImageUrl,
      previewCode: input.previewCode,
      mode: "coding",
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
    prompt: input.prompt,
    previewImageUrl: input.previewImageUrl,
    previewCode: input.previewCode,
    mode: "coding",
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

  if (!post) {
    return null;
  }

  if (post.moderation_status !== "pending") {
    return post;
  }

  const moderation = await moderateCommunityPost({
    title: post.title,
    prompt: post.prompt,
    previewCode: post.preview_code,
  });

  const updatedPost = await updateCommunityPostModeration(postId, {
    moderationStatus: moderation.suggestedStatus,
    moderationReason:
      moderation.suggestedStatus === "approved"
        ? "作品已通过审核，现已展示到成长社区。"
        : moderation.reason,
    moderationDetail: moderation.detail,
    moderationStage: moderation.stage,
  });

  await sendUserNotification({
    userId: post.user_id,
    title:
      moderation.suggestedStatus === "approved"
        ? "作品审核通过啦"
        : moderation.suggestedStatus === "rejected"
          ? "作品暂时没有通过审核"
          : "作品正在继续复审",
    body:
      moderation.suggestedStatus === "approved"
        ? "你分享的作品已经通过审核，现在已经出现在成长社区里。"
        : moderation.suggestedStatus === "rejected"
          ? moderation.reason || "这次分享暂时没有通过，请调整内容后再试。"
          : "审核服务暂时繁忙，作品还在复审队列里，稍后会继续通知你结果。",
  }).catch((error) => {
    console.error("【发送社区审核通知失败】:", error);
  });

  return updatedPost;
}
