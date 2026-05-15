import { NextResponse } from "next/server";
import {
  requireAdminContext,
  requireAiSecretManagerPermission,
  requirePermission,
} from "@/lib/admin";
import {
  deleteAiSecret,
  getAiSecretSecuritySummary,
  listAiSecretStatuses,
  listAiSecretAuditLogs,
  upsertAiSecret,
} from "@/lib/ai-secrets";

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
      envName?: string;
      value?: string;
    };

    if (!body.envName?.trim() || !body.value?.trim()) {
      return NextResponse.json(
        { error: "缺少密钥变量名或密钥内容。" },
        { status: 400 },
      );
    }

    const updatedAt = await upsertAiSecret({
      envName: body.envName.trim(),
      plainTextValue: body.value.trim(),
      updatedBy: adminContext.userId,
      actorDisplayName: adminContext.displayName,
      actorPhone: adminContext.phone,
    });

    return NextResponse.json({
      success: true,
      updatedAt,
    });
  } catch (requestError) {
    console.error("【后台 AI 密钥保存失败】:", requestError);

    return NextResponse.json(
      { error: "AI 密钥保存失败，请稍后再试。" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  const { error, adminContext } = await requireAdminContext();

  if (error || !adminContext) {
    return error;
  }

  const permissionError = requirePermission(adminContext, "ai_configs");

  if (permissionError) {
    return permissionError;
  }

  try {
    const { searchParams } = new URL(request.url);
    const envNames = searchParams.getAll("envName");
    const statuses = await listAiSecretStatuses(envNames);
    const security = getAiSecretSecuritySummary();
    const auditLogs = await listAiSecretAuditLogs();

    return NextResponse.json({ statuses, security, auditLogs });
  } catch (requestError) {
    console.error("【后台 AI 密钥状态读取失败】:", requestError);

    return NextResponse.json(
      { error: "AI 密钥状态读取失败，请稍后再试。" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
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
      envName?: string;
    };

    if (!body.envName?.trim()) {
      return NextResponse.json(
        { error: "缺少需要删除的密钥变量名。" },
        { status: 400 },
      );
    }

    await deleteAiSecret({
      envName: body.envName.trim(),
      updatedBy: adminContext.userId,
      actorDisplayName: adminContext.displayName,
      actorPhone: adminContext.phone,
    });

    return NextResponse.json({ success: true });
  } catch (requestError) {
    console.error("【后台 AI 密钥删除失败】:", requestError);

    return NextResponse.json(
      { error: "AI 密钥删除失败，请稍后再试。" },
      { status: 500 },
    );
  }
}
