import { NextResponse } from "next/server";
import {
  listAiModeConfigs,
  upsertAiModeConfigs,
} from "@/lib/admin-data";
import {
  requireAdminContext,
  requirePermission,
} from "@/lib/admin";

export async function GET() {
  const { error, adminContext } = await requireAdminContext();

  if (error || !adminContext) {
    return error;
  }

  const permissionError = requirePermission(adminContext, "ai_configs");

  if (permissionError) {
    return permissionError;
  }

  try {
    const configs = await listAiModeConfigs();
    return NextResponse.json({ configs });
  } catch (requestError) {
    console.error("【后台 AI 配置读取失败】:", requestError);

    return NextResponse.json(
      { error: "AI 配置读取失败，请稍后再试。" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const { error, adminContext } = await requireAdminContext();

  if (error || !adminContext) {
    return error;
  }

  const permissionError = requirePermission(adminContext, "ai_configs");

  if (permissionError) {
    return permissionError;
  }

  try {
    const body = (await request.json()) as {
      configs?: Array<{
        mode_key: string;
        mode_name: string;
        provider: string;
        endpoint_url: string;
        api_key_env: string;
        model: string;
        system_prompt: string;
        is_enabled: boolean;
        extra_payload?: Record<string, unknown>;
      }>;
    };

    if (!body.configs?.length) {
      return NextResponse.json(
        { error: "没有收到需要保存的 AI 配置内容。" },
        { status: 400 },
      );
    }

    const configs = await upsertAiModeConfigs(
      body.configs.map((item) => ({
        ...item,
        extra_payload: item.extra_payload ?? {},
        updated_by: adminContext.userId,
      })),
    );

    return NextResponse.json({ success: true, configs });
  } catch (requestError) {
    console.error("【后台 AI 配置保存失败】:", requestError);

    return NextResponse.json(
      { error: "AI 配置保存失败，请稍后再试。" },
      { status: 500 },
    );
  }
}
