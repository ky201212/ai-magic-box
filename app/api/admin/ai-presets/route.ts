import { NextResponse } from "next/server";
import {
  getAiModelPresetsSetting,
  saveAiModelPresets,
  type AiModelPresetRecord,
} from "@/lib/admin-data";
import {
  requireAdminContext,
  requireAiSecretManagerPermission,
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

  const secretPermissionError = requireAiSecretManagerPermission(adminContext);

  if (secretPermissionError) {
    return secretPermissionError;
  }

  try {
    const presets = await getAiModelPresetsSetting();
    return NextResponse.json({ presets });
  } catch (requestError) {
    console.error("【后台 AI 模板读取失败】:", requestError);

    return NextResponse.json(
      { error: "AI 模板读取失败，请稍后再试。" },
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

  const secretPermissionError = requireAiSecretManagerPermission(adminContext);

  if (secretPermissionError) {
    return secretPermissionError;
  }

  try {
    const body = (await request.json()) as {
      presets?: AiModelPresetRecord[];
    };

    if (!Array.isArray(body.presets)) {
      return NextResponse.json(
        { error: "没有收到需要保存的 AI 模板内容。" },
        { status: 400 },
      );
    }

    const presets = await saveAiModelPresets({
      presets: body.presets,
      updatedBy: adminContext.userId,
    });

    return NextResponse.json({ success: true, presets });
  } catch (requestError) {
    console.error("【后台 AI 模板保存失败】:", requestError);

    return NextResponse.json(
      { error: "AI 模板保存失败，请稍后再试。" },
      { status: 500 },
    );
  }
}
