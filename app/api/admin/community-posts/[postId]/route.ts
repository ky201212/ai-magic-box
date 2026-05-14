import { NextResponse } from "next/server";
import { updateCommunityPostReview } from "@/lib/admin-data";
import {
  requireAdminContext,
  requirePermission,
} from "@/lib/admin";

type RouteContext = {
  params: Promise<{
    postId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { error, adminContext } = await requireAdminContext();

  if (error || !adminContext) {
    return error;
  }

  const permissionError = requirePermission(adminContext, "community_review");

  if (permissionError) {
    return permissionError;
  }

  try {
    const { postId } = await context.params;
    const body = (await request.json()) as {
      moderation_status?: "approved" | "pending" | "rejected";
      moderation_reason?: string | null;
      is_featured?: boolean;
    };

    if (!body.moderation_status) {
      return NextResponse.json(
        { error: "请提供审核后的状态。" },
        { status: 400 },
      );
    }

    const post = await updateCommunityPostReview(postId, {
      moderation_status: body.moderation_status,
      moderation_reason: body.moderation_reason ?? null,
      is_featured: body.is_featured ?? false,
      reviewed_by: adminContext.userId,
    });

    return NextResponse.json({ success: true, post });
  } catch (requestError) {
    console.error("【后台审核作品失败】:", requestError);

    return NextResponse.json(
      { error: "审核作品失败，请稍后再试。" },
      { status: 500 },
    );
  }
}
