import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { appendAdminAuditLog } from "@/lib/admin-audit";
import {
  requireAdminContext,
  requirePermission,
} from "@/lib/admin";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg"]);
const ALLOWED_EXTENSIONS = new Set([".png", ".jpg", ".jpeg"]);

function getExtension(fileName: string) {
  return path.extname(fileName).toLowerCase();
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
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "没有收到需要上传的 Logo 文件。" },
        { status: 400 },
      );
    }

    const extension = getExtension(file.name);

    if (!ALLOWED_TYPES.has(file.type) || !ALLOWED_EXTENSIONS.has(extension)) {
      return NextResponse.json(
        { error: "Logo 仅支持 PNG、JPG、JPEG 格式。" },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    const fileName = `site-logo-${randomUUID()}${extension}`;
    const filePath = path.join(uploadsDir, fileName);

    await mkdir(uploadsDir, { recursive: true });
    await writeFile(filePath, fileBuffer);

    await appendAdminAuditLog({
      actorUserId: adminContext.userId,
      actorDisplayName: adminContext.displayName,
      actorPhone: adminContext.phone,
      action: "site_logo_upload",
      targetType: "site_asset",
      targetId: fileName,
      detail: {
        mimeType: file.type,
        size: file.size,
      },
    });

    return NextResponse.json({
      success: true,
      url: `/uploads/${fileName}`,
      fileName,
    });
  } catch (requestError) {
    console.error("【后台 Logo 上传失败】:", requestError);

    return NextResponse.json(
      { error: "Logo 上传失败，请稍后再试。" },
      { status: 500 },
    );
  }
}
