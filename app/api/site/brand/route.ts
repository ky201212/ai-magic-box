import { NextResponse } from "next/server";
import { getBrandIdentitySetting } from "@/lib/site-config";

export async function GET() {
  try {
    const brand = await getBrandIdentitySetting();
    return NextResponse.json({ brand });
  } catch (requestError) {
    console.error("【品牌信息读取失败】:", requestError);
    return NextResponse.json(
      {
        brand: {
          siteName: "小红车魔法工坊",
          tagline: "下一代儿童AI创造力平台",
          logoUrl: "/logo.png",
        },
      },
      { status: 200 },
    );
  }
}
