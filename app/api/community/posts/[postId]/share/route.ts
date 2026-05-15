import { NextResponse } from "next/server";
import { incrementCommunityMetric } from "@/lib/community";
import { getCurrentUser } from "@/lib/auth";

type RouteContext = {
  params: Promise<{
    postId: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { postId } = await context.params;
    const currentUser = await getCurrentUser().catch(() => null);
    const shareCount = await incrementCommunityMetric(
      postId,
      "share",
      currentUser?.user_id ?? null,
    );

    return NextResponse.json({
      success: true,
      shareCount,
    });
  } catch (error) {
    console.error("【记录社区分享失败】:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "分享记录失败，请稍后再试。",
      },
      { status: 500 },
    );
  }
}
