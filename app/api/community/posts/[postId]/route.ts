import { NextResponse } from "next/server";
import {
  getApprovedCommunityPostDetail,
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
    const post = await getApprovedCommunityPostDetail(
      postId,
      currentUser?.user_id ?? null,
    );

    if (!post) {
      return NextResponse.json(
        { error: "没有找到这份社区作品。" },
        { status: 404 },
      );
    }

    await incrementCommunityMetric(postId, "view", currentUser?.user_id ?? null).catch(
      (error) => {
        console.error("【记录社区浏览失败】:", error);
      },
    );

    const latestPost = await getApprovedCommunityPostDetail(
      postId,
      currentUser?.user_id ?? null,
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
