import { after } from "next/server";
import { NextResponse } from "next/server";
import { ensureUserProfile, listApprovedCommunityPosts } from "@/lib/community";
import { getCurrentUser } from "@/lib/auth";
import { finalizeCommunityShareReview, queueCommunityShare } from "@/lib/community-share";

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

    const result = await queueCommunityShare({
      userId: currentUser.user_id,
      title: body.title.trim(),
      prompt: body.prompt.trim(),
      previewImageUrl: body.previewImageUrl.trim(),
      previewCode: body.previewCode.trim(),
    });

    if (result.immediateStatus === "pending") {
      after(async () => {
        await finalizeCommunityShareReview(result.post.id);
      });
    }

    return NextResponse.json({
      success: true,
      post: result.post,
      moderation: {
        suggestedStatus: result.immediateStatus,
      },
      message: result.message,
    });
  } catch (error) {
    console.error("【分享作品失败】:", error);

    const message =
      error instanceof Error ? error.message : "分享作品失败，请稍后再试。";

    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
