import { NextResponse } from "next/server";
import { createCommunityPost, ensureUserProfile, listApprovedCommunityPosts } from "@/lib/community";
import { getCurrentUser } from "@/lib/auth";
import { moderateCommunityPost } from "@/lib/moderation";

export async function GET() {
  try {
    const posts = await listApprovedCommunityPosts();
    return NextResponse.json({ posts });
  } catch (error) {
    console.error("【读取社区动态失败】:", error);
    return NextResponse.json(
      { error: "社区内容暂时读取失败，请稍后再试。" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.user_id || !currentUser.users?.phone) {
      return NextResponse.json({ error: "请先登录后再分享作品。" }, { status: 401 });
    }

    const body = (await request.json()) as {
      title?: string;
      prompt?: string;
      previewImageUrl?: string;
      previewCode?: string;
      mode?: "coding";
    };

    if (
      !body.title?.trim() ||
      !body.prompt?.trim() ||
      !body.previewImageUrl?.trim() ||
      !body.previewCode?.trim() ||
      body.mode !== "coding"
    ) {
      return NextResponse.json(
        { error: "分享内容不完整，请重新生成后再试。" },
        { status: 400 },
      );
    }

    await ensureUserProfile(currentUser.user_id, currentUser.users.phone);

    const moderation = moderateCommunityPost({
      title: body.title.trim(),
      prompt: body.prompt.trim(),
      previewCode: body.previewCode.trim(),
    });

    const post = await createCommunityPost({
      userId: currentUser.user_id,
      title: body.title.trim(),
      prompt: body.prompt.trim(),
      previewImageUrl: body.previewImageUrl.trim(),
      previewCode: body.previewCode.trim(),
      mode: "coding",
      moderationStatus: moderation.approved ? "approved" : "rejected",
      moderationReason: moderation.reason,
    });

    return NextResponse.json({
      success: true,
      post,
      moderation,
      message: moderation.approved
        ? "作品已经分享进社区。"
        : `作品未通过审核：${moderation.reason ?? "请调整后重试。"}`,
    });
  } catch (error) {
    console.error("【分享作品失败】:", error);
    return NextResponse.json(
      { error: "分享作品失败，请稍后再试。" },
      { status: 500 },
    );
  }
}
