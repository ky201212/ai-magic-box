import { NextResponse } from "next/server";
import { getDashboardStats } from "@/lib/admin-data";
import { requireAdminContext } from "@/lib/admin";

export async function GET() {
  const { error, adminContext } = await requireAdminContext();

  if (error || !adminContext) {
    return error;
  }

  try {
    const stats = await getDashboardStats();

    return NextResponse.json({
      admin: adminContext,
      stats,
    });
  } catch (requestError) {
    console.error("【后台概览加载失败】:", requestError);

    return NextResponse.json(
      { error: "后台概览暂时加载失败，请稍后再试。" },
      { status: 500 },
    );
  }
}
