import { NextResponse } from "next/server";
import { listAdminCommunityPosts } from "@/lib/admin-data";
import {
  requireAdminContext,
  requirePermission,
} from "@/lib/admin";

export async function GET() {
  const { error, adminContext } = await requireAdminContext();

  if (error || !adminContext) {
    return error;
  }

  const permissionError = requirePermission(adminContext, "community_review");

  if (permissionError) {
    return permissionError;
  }

  try {
    const posts = await listAdminCommunityPosts();
    return NextResponse.json({ posts });
  } catch (requestError) {
    console.error("【后台社区审核列表读取失败】:", requestError);

    return NextResponse.json(
      { error: "社区审核列表读取失败，请稍后再试。" },
      { status: 500 },
    );
  }
}
