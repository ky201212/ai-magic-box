import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { appendAdminAuditLog } from "@/lib/admin-audit";
import {
  requireAdminContext,
  requirePermission,
} from "@/lib/admin";

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov"]);

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
    const mediaType = String(formData.get("mediaType") ?? "image");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "没有收到需要上传的文件。" },
        { status: 400 },
      );
    }

    const extension = getExtension(file.name);
    const isImage = mediaType === "image";
    const allowedTypes = isImage ? IMAGE_TYPES : VIDEO_TYPES;
    const allowedExtensions = isImage ? IMAGE_EXTENSIONS : VIDEO_EXTENSIONS;

    if (!allowedTypes.has(file.type) || !allowedExtensions.has(extension)) {
      return NextResponse.json(
        {
          error: isImage
            ? "图片仅支持 PNG、JPG、JPEG、WEBP 格式。"
            : "视频仅支持 MP4、WEBM、MOV 格式。",
        },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "info-media");
    const fileName = `info-${mediaType}-${randomUUID()}${extension}`;
    const filePath = path.join(uploadsDir, fileName);

    await mkdir(uploadsDir, { recursive: true });
    await writeFile(filePath, fileBuffer);

    await appendAdminAuditLog({
      actorUserId: adminContext.userId,
      actorDisplayName: adminContext.displayName,
      actorPhone: adminContext.phone,
      action: "info_media_upload",
      targetType: "site_asset",
      targetId: fileName,
      detail: {
        mediaType,
        mimeType: file.type,
        size: file.size,
      },
    });

    return NextResponse.json({
      success: true,
      url: `/uploads/info-media/${fileName}`,
      fileName,
      mediaType,
    });
  } catch (requestError) {
    console.error("【后台资讯素材上传失败】:", requestError);

    return NextResponse.json(
      { error: "资讯素材上传失败，请稍后再试。" },
      { status: 500 },
    );
  }
}
