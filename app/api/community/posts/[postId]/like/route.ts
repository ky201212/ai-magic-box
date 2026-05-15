import { NextResponse } from "next/server";
import { toggleCommunityPostLike } from "@/lib/community";
import { getCurrentUser } from "@/lib/auth";

type RouteContext = {
  params: Promise<{
    postId: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.user_id) {
      return NextResponse.json({ error: "请先登录后再点赞作品。" }, { status: 401 });
    }

    const { postId } = await context.params;
    const result = await toggleCommunityPostLike(postId, currentUser.user_id);

    return NextResponse.json({
      success: true,
      liked: result.liked,
      likeCount: result.likeCount,
    });
  } catch (error) {
    console.error("【社区点赞失败】:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "点赞失败，请稍后再试。",
      },
      { status: 500 },
    );
  }
}
