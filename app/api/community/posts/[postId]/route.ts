import { NextResponse } from "next/server";
import {
  deleteCommunityPostByAuthor,
  getCommunityPostDetailForViewer,
  incrementCommunityMetric,
} from "@/lib/community";
import { getCurrentUser } from "@/lib/auth";

type RouteContext = {
  params: Promise<{
    postId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { postId } = await context.params;
    const currentUser = await getCurrentUser().catch(() => null);
    const post = await getCommunityPostDetailForViewer(
      postId,
      currentUser?.user_id ?? null,
      { includeOwnerDrafts: true },
    );

    if (!post) {
      return NextResponse.json(
        { error: "没有找到这份社区作品。" },
        { status: 404 },
      );
    }

    if (post.moderation_status === "approved") {
      await incrementCommunityMetric(
        postId,
        "view",
        currentUser?.user_id ?? null,
      ).catch((error) => {
        console.error("【记录社区浏览失败】:", error);
      });
    }

    const latestPost = await getCommunityPostDetailForViewer(
      postId,
      currentUser?.user_id ?? null,
      { includeOwnerDrafts: true },
    );

    return NextResponse.json({ post: latestPost ?? post });
  } catch (error) {
    console.error("【读取社区作品详情失败】:", error);
    return NextResponse.json(
      { error: "社区作品详情暂时打开失败，请稍后再试。" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.user_id) {
      return NextResponse.json({ error: "请先登录后再删除作品。" }, { status: 401 });
    }

    const { postId } = await context.params;
    const deletedPost = await deleteCommunityPostByAuthor(postId, currentUser.user_id);

    return NextResponse.json({ success: true, deletedPost });
  } catch (error) {
    console.error("【作者删除社区作品失败】:", error);

    const message =
      error instanceof Error ? error.message : "删除作品失败，请稍后再试。";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
