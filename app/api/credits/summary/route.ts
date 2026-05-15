import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ensureUserCredits, listUserCreditLogs } from "@/lib/credits";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.user_id) {
      return NextResponse.json({ error: "请先登录后再查看魔法币。" }, { status: 401 });
    }

    const [credits, creditLogs] = await Promise.all([
      ensureUserCredits(currentUser.user_id),
      listUserCreditLogs(currentUser.user_id, 12),
    ]);

    return NextResponse.json({
      credits,
      creditLogs,
    });
  } catch (error) {
    console.error("【读取魔法币摘要失败】:", error);
    return NextResponse.json(
      { error: "魔法币信息暂时读取失败，请稍后再试。" },
      { status: 500 },
    );
  }
}
