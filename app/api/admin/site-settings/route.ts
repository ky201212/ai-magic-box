import { NextResponse } from "next/server";
import {
  listSiteSettings,
  upsertSiteSettings,
} from "@/lib/admin-data";
import { appendAdminAuditLog } from "@/lib/admin-audit";
import {
  requireAdminContext,
  requirePermission,
} from "@/lib/admin";

export async function GET() {
  const { error, adminContext } = await requireAdminContext();

  if (error || !adminContext) {
    return error;
  }

  const permissionError = requirePermission(adminContext, "site_settings");

  if (permissionError) {
    return permissionError;
  }

  try {
    const settings = await listSiteSettings();
    return NextResponse.json({ settings });
  } catch (requestError) {
    console.error("【后台站点设置读取失败】:", requestError);

    return NextResponse.json(
      { error: "站点设置读取失败，请稍后再试。" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const { error, adminContext } = await requireAdminContext();

  if (error || !adminContext) {
    return error;
  }

  const permissionError = requirePermission(adminContext, "site_settings");

  if (permissionError) {
    return permissionError;
  }

  try {
    const body = (await request.json()) as {
      settings?: Array<{
        setting_key: string;
        setting_group: string;
        label: string;
        value: Record<string, unknown>;
        description?: string;
      }>;
    };

    if (!body.settings?.length) {
      return NextResponse.json(
        { error: "没有收到需要保存的站点设置内容。" },
        { status: 400 },
      );
    }

    const settings = await upsertSiteSettings(
      body.settings.map((item) => ({
        ...item,
        updated_by: adminContext.userId,
      })),
    );

    await appendAdminAuditLog({
      actorUserId: adminContext.userId,
      actorDisplayName: adminContext.displayName,
      actorPhone: adminContext.phone,
      action: "site_settings_update",
      targetType: "site_settings",
      targetId: body.settings.map((item) => item.setting_key).join(","),
      detail: {
        settingKeys: body.settings.map((item) => item.setting_key),
      },
    });

    return NextResponse.json({ success: true, settings });
  } catch (requestError) {
    console.error("【后台站点设置保存失败】:", requestError);

    return NextResponse.json(
      { error: "站点设置保存失败，请稍后再试。" },
      { status: 500 },
    );
  }
}
