import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  USER_CREDIT_LOG_VISIBLE_DAYS,
  ensureUserCredits,
  listUserCreditLogsByWindow,
} from "@/lib/credits";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.user_id) {
      return NextResponse.json({ error: "请先登录后再查看魔法币。" }, { status: 401 });
    }

    const [credits, creditLogs] = await Promise.all([
      ensureUserCredits(currentUser.user_id),
      listUserCreditLogsByWindow(currentUser.user_id, {
        limit: 120,
        sinceDays: USER_CREDIT_LOG_VISIBLE_DAYS,
      }).catch((error) => {
        console.error("【读取魔法币摘要账本失败，已回退为空】:", error);
        return [];
      }),
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
