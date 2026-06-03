import { NextResponse } from "next/server";
import { getRequestIp } from "@/lib/rate-limit";
import {
  getSmsAuthRiskControlSetting,
  getSmsHumanVerificationBootstrap,
} from "@/lib/sms-auth-security";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const settings = await getSmsAuthRiskControlSetting();
    const bootstrap = await getSmsHumanVerificationBootstrap(
      getRequestIp(request),
      settings,
    );

    return NextResponse.json(
      bootstrap,
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("【图形验证码生成失败】:", error);
    const message =
      error instanceof Error ? error.message : "图形验证码加载失败，请稍后再试。";

    return NextResponse.json(
      { error: message },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
