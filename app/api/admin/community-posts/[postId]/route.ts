import { NextResponse } from "next/server";
import {
  deleteAdminCommunityPost,
  updateAdminCommunityOperations,
  updateCommunityPostReview,
} from "@/lib/admin-data";
import { appendAdminAuditLog } from "@/lib/admin-audit";
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

    await appendAdminAuditLog({
      actorUserId: adminContext.userId,
      actorDisplayName: adminContext.displayName,
      actorPhone: adminContext.phone,
      action: "community_review_update",
      targetType: "community_post",
      targetId: postId,
      detail: {
        moderationStatus: body.moderation_status,
        isFeatured: body.is_featured ?? false,
      },
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

export async function POST(request: Request, context: RouteContext) {
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
      title?: string;
      prompt?: string;
      category?: string;
      like_count?: number;
      view_count?: number;
      share_count?: number;
      manual_sort_order?: number;
      is_featured?: boolean;
      creator_score?: number;
      manual_creator_rank?: number | null;
      is_creator_star?: boolean;
      display_total_likes?: number;
      note?: string | null;
    };

    const post = await updateAdminCommunityOperations(postId, {
      ...body,
      reviewed_by: adminContext.userId,
    });

    await appendAdminAuditLog({
      actorUserId: adminContext.userId,
      actorDisplayName: adminContext.displayName,
      actorPhone: adminContext.phone,
      action: "community_operations_update",
      targetType: "community_post",
      targetId: postId,
      detail: {
        title: body.title ?? null,
        category: body.category ?? null,
        isFeatured: body.is_featured ?? null,
      },
    });

    return NextResponse.json({ success: true, post });
  } catch (requestError) {
    console.error("【后台更新社区运营数据失败】:", requestError);

    return NextResponse.json(
      { error: "社区运营数据更新失败，请稍后再试。" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
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
    const deletedPost = await deleteAdminCommunityPost(postId);

    await appendAdminAuditLog({
      actorUserId: adminContext.userId,
      actorDisplayName: adminContext.displayName,
      actorPhone: adminContext.phone,
      action: "community_post_delete",
      targetType: "community_post",
      targetId: postId,
      detail: {
        deleted: true,
      },
    });

    return NextResponse.json({ success: true, deletedPost });
  } catch (requestError) {
    console.error("【后台删除社区作品失败】:", requestError);

    return NextResponse.json(
      { error: "删除作品失败，请稍后再试。" },
      { status: 500 },
    );
  }
}
