import { NextResponse } from "next/server";
import { addCredits, consumeCredits } from "@/lib/credits";
import { getCurrentUser } from "@/lib/auth";
import { resolveAiModeConfig, resolveModeCreditPolicy } from "@/lib/ai-config";

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

    const aiConfig = await resolveAiModeConfig("painting");
    const apiKey = process.env[aiConfig.apiKeyEnv];
    const imageSize =
      typeof aiConfig.extraPayload.image_size === "string"
        ? aiConfig.extraPayload.image_size
        : "1024x1024";
    const { creditEnabled, creditCost } = resolveModeCreditPolicy(
      aiConfig.extraPayload,
    );
    const shouldCharge = creditEnabled && creditCost > 0;
    let remainingCredits: number | undefined;
    let chargedUserId: string | null = null;

    if (!aiConfig.isEnabled) {
      return NextResponse.json(
        { error: "AI 绘画功能正在维护中，请稍后再试。" },
        { status: 503 },
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: `服务端缺少 ${aiConfig.apiKeyEnv} 环境变量。` },
        { status: 500 },
      );
    }

    if (shouldCharge) {
      const currentUser = await getCurrentUser();

      if (!currentUser?.user_id) {
        return NextResponse.json(
          { error: "请先登录后再使用 AI 绘画功能。" },
          { status: 401 },
        );
      }

      const creditResult = await consumeCredits(currentUser.user_id, creditCost, {
        reasonCode: "painting_generate",
        reasonLabel: "AI绘画作画",
        note: `使用 AI 绘画功能，消耗 ${creditCost} 个魔法币。`,
      });

      if (!creditResult?.success) {
        return NextResponse.json(
          {
            error: `魔法币不足，当前剩余 ${creditResult?.remaining ?? 0} 个。`,
          },
          { status: 403 },
        );
      }

      remainingCredits = creditResult.remaining;
      chargedUserId = currentUser.user_id;
    }

    const upstreamResponse = await fetch(aiConfig.endpointUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiConfig.model,
        prompt,
        image_size: imageSize,
      }),
    });

    if (!upstreamResponse.ok) {
      const errorData = await upstreamResponse.text();
      console.error("【SiliconFlow 图像接口报错详情】:", errorData);

      if (shouldCharge && chargedUserId) {
        remainingCredits = await addCredits(chargedUserId, creditCost, {
          reasonCode: "painting_refund",
          reasonLabel: "AI绘画失败退回",
          note: `AI 绘画生成失败，退回 ${creditCost} 个魔法币。`,
        });
      }

      return NextResponse.json(
        {
          error: errorData || "图像生成接口请求失败，请稍后再试。",
          remainingCredits,
        },
        { status: upstreamResponse.status },
      );
    }

    const data = (await upstreamResponse.json()) as SiliconFlowImageResponse;
    const imageUrl = data.images?.[0]?.url;

    if (!imageUrl) {
      if (shouldCharge && chargedUserId) {
        remainingCredits = await addCredits(chargedUserId, creditCost, {
          reasonCode: "painting_refund",
          reasonLabel: "AI绘画失败退回",
          note: `AI 绘画未返回有效图片，退回 ${creditCost} 个魔法币。`,
        });
      }

      return NextResponse.json(
        { error: "图像模型没有返回可用的图片地址。", remainingCredits },
        { status: 502 },
      );
    }

    return NextResponse.json({
      imageUrl,
      remainingCredits,
    });
  } catch (error) {
    console.error("【图像生成接口异常】:", error);

    return NextResponse.json(
      { error: "图像生成接口暂时出了点小状况，请稍后再试。" },
      { status: 500 },
    );
  }
}
