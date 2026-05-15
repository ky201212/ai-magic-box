import { NextResponse } from "next/server";
import { listCommunityActivityLogs } from "@/lib/community";

type RouteContext = {
  params: Promise<{
    postId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { postId } = await context.params;
    const logs = await listCommunityActivityLogs(postId, 30);
    return NextResponse.json({ logs });
  } catch (error) {
    console.error("【读取社区互动记录失败】:", error);
    return NextResponse.json(
      { error: "社区互动记录暂时读取失败，请稍后再试。" },
      { status: 500 },
    );
  }
}
