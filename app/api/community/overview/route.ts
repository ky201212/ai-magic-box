import { NextResponse } from "next/server";
import { getCommunityOverview } from "@/lib/community";

export async function GET() {
  try {
    const overview = await getCommunityOverview();
    return NextResponse.json({ overview });
  } catch (error) {
    console.error("【读取社区概览失败】:", error);
    return NextResponse.json(
      { error: "社区概览暂时读取失败，请稍后再试。" },
      { status: 500 },
    );
  }
}
