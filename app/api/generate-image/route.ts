import { NextResponse } from "next/server";

const SILICONFLOW_IMAGE_API_URL =
  "https://api.siliconflow.cn/v1/images/generations";

type SiliconFlowImageResponse = {
  images?: Array<{
    url?: string;
  }>;
  error?: {
    message?: string;
  };
};

export async function POST(request: Request) {
  try {
    const { prompt } = (await request.json()) as { prompt?: string };

    if (!prompt?.trim()) {
      return NextResponse.json(
        { error: "缺少有效的 prompt 参数。" },
        { status: 400 },
      );
    }

    if (!process.env.SILICONFLOW_API_KEY) {
      return NextResponse.json(
        { error: "服务端缺少 SILICONFLOW_API_KEY 环境变量。" },
        { status: 500 },
      );
    }

    const upstreamResponse = await fetch(SILICONFLOW_IMAGE_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SILICONFLOW_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "Kwai-Kolors/Kolors",
        prompt,
        image_size: "1024x1024",
      }),
    });

    if (!upstreamResponse.ok) {
      const errorData = await upstreamResponse.text();
      console.error("【SiliconFlow 图像接口报错详情】:", errorData);

      return NextResponse.json(
        {
          error: errorData || "图像生成接口请求失败，请稍后再试。",
        },
        { status: upstreamResponse.status },
      );
    }

    const data = (await upstreamResponse.json()) as SiliconFlowImageResponse;
    const imageUrl = data.images?.[0]?.url;

    if (!imageUrl) {
      return NextResponse.json(
        { error: "图像模型没有返回可用的图片地址。" },
        { status: 502 },
      );
    }

    return NextResponse.json({ imageUrl });
  } catch {
    return NextResponse.json(
      { error: "图像生成接口暂时出了点小状况，请稍后再试。" },
      { status: 500 },
    );
  }
}
