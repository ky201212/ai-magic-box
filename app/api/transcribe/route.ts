import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { resolveAiModeConfig, resolveModeCreditPolicy } from "@/lib/ai-config";
import { consumeCredits } from "@/lib/credits";

type SiliconFlowTranscribeResponse = {
  text?: string;
  error?: {
    message?: string;
  };
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "缺少有效的音频文件 file。" },
        { status: 400 },
      );
    }

    const aiConfig = await resolveAiModeConfig("transcribe");
    const apiKey = process.env[aiConfig.apiKeyEnv];
    const { creditEnabled, creditCost } = resolveModeCreditPolicy(
      aiConfig.extraPayload,
    );
    const shouldCharge = creditEnabled && creditCost > 0;
    let remainingCredits: number | undefined;

    if (!aiConfig.isEnabled) {
      return NextResponse.json(
        { error: "语音识别功能正在维护中，请稍后再试。" },
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
          { error: "请先登录后再使用语音识别功能。" },
          { status: 401 },
        );
      }

      const creditResult = await consumeCredits(currentUser.user_id, creditCost);

      if (!creditResult?.success) {
        return NextResponse.json(
          {
            error: `魔法币不足，当前剩余 ${creditResult?.remaining ?? 0} 个。`,
          },
          { status: 403 },
        );
      }

      remainingCredits = creditResult.remaining;
    }

    const upstreamFormData = new FormData();
    upstreamFormData.append("file", file, file.name || "audio.webm");
    upstreamFormData.append("model", aiConfig.model);

    const upstreamResponse = await fetch(aiConfig.endpointUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: upstreamFormData,
    });

    if (!upstreamResponse.ok) {
      const errorData = await upstreamResponse.text();
      console.error("【SiliconFlow 语音转写接口报错详情】:", errorData);

      return NextResponse.json(
        {
          error: errorData || "语音识别接口请求失败，请稍后再试。",
        },
        { status: upstreamResponse.status },
      );
    }

    const data =
      (await upstreamResponse.json()) as SiliconFlowTranscribeResponse;
    const text = data.text?.trim();

    if (!text) {
      return NextResponse.json(
        { error: "语音模型没有返回可用的识别文本。" },
        { status: 502 },
      );
    }

    return NextResponse.json({ text, remainingCredits });
  } catch {
    return NextResponse.json(
      { error: "语音识别接口暂时出了点小状况，请稍后再试。" },
      { status: 500 },
    );
  }
}
