import { NextResponse } from "next/server";
import { listAiModeConfigs } from "@/lib/admin-data";

export async function GET() {
  try {
    const configs = await listAiModeConfigs();
    const capabilities = Object.fromEntries(
      configs.map((config) => [
        config.mode_key,
        {
          isEnabled: config.is_enabled,
          modeName: config.mode_name,
          extraPayload: config.extra_payload ?? {},
        },
      ]),
    );

    return NextResponse.json({ capabilities });
  } catch (error) {
    console.error("【AI 能力配置读取失败】:", error);

    return NextResponse.json(
      { error: "AI 能力配置读取失败，请稍后再试。" },
      { status: 500 },
    );
  }
}
