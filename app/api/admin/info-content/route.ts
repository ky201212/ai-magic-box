import { NextResponse } from "next/server";
import {
  listInfoContentPosts,
  saveInfoContentPosts,
} from "@/lib/admin-data";
import { appendAdminAuditLog } from "@/lib/admin-audit";
import {
  requireAdminContext,
  requirePermission,
} from "@/lib/admin";
import {
  normalizeInfoContentPosts,
  type InfoContentPost,
} from "@/lib/info-content";

export async function GET() {
  const { error, adminContext } = await requireAdminContext();

  if (error || !adminContext) {
    return error;
  }

  const permissionError = requirePermission(adminContext, "site_settings");

  if (permissionError) {
    return permissionError;
  }

  try {
    const posts = await listInfoContentPosts({ includeDrafts: true });
    return NextResponse.json({ posts });
  } catch (requestError) {
    console.error("【后台科普资讯读取失败】:", requestError);

    return NextResponse.json(
      { error: "科普资讯读取失败，请稍后再试。" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const { error, adminContext } = await requireAdminContext();

  if (error || !adminContext) {
    return error;
  }

  const permissionError = requirePermission(adminContext, "site_settings");

  if (permissionError) {
    return permissionError;
  }

  try {
    const body = (await request.json()) as {
      posts?: InfoContentPost[];
    };
    const posts = normalizeInfoContentPosts(body.posts);

    const savedPosts = await saveInfoContentPosts({
      posts,
      updatedBy: adminContext.userId,
    });

    await appendAdminAuditLog({
      actorUserId: adminContext.userId,
      actorDisplayName: adminContext.displayName,
      actorPhone: adminContext.phone,
      action: "info_content_update",
      targetType: "site_settings",
      targetId: "content.info-posts",
      detail: {
        count: savedPosts.length,
        publishedCount: savedPosts.filter((post) => post.status === "published")
          .length,
      },
    });

    return NextResponse.json({ success: true, posts: savedPosts });
  } catch (requestError) {
    console.error("【后台科普资讯保存失败】:", requestError);

    return NextResponse.json(
      { error: "科普资讯保存失败，请稍后再试。" },
      { status: 500 },
    );
  }
}
