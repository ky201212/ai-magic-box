import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { resolveAiModeConfig, resolveModeCreditPolicy } from "@/lib/ai-config";
import { addCredits, consumeCredits } from "@/lib/credits";
import { getAiSecret } from "@/lib/ai-secrets";

type SiliconFlowTranscribeResponse = {
  text?: string;
  error?: {
    message?: string;
  };
};

function mapUpstreamStatusToGatewayStatus(status: number) {
  if (status === 401 || status === 403) {
    return 502;
  }

  if (status >= 500) {
    return 502;
  }

  return status;
}

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
    const apiKey = await getAiSecret(aiConfig.apiKeyEnv);
    const { creditEnabled, creditCost } = resolveModeCreditPolicy(
      aiConfig.extraPayload,
    );
    const shouldCharge = creditEnabled && creditCost > 0;
    let remainingCredits: number | undefined;
    let chargedUserId: string | null = null;

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

      const creditResult = await consumeCredits(currentUser.user_id, creditCost, {
        reasonCode: "voice_transcribe",
        reasonLabel: "语音施法识别",
        note: `使用语音施法识别功能，消耗 ${creditCost} 个魔法币。`,
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

      if (shouldCharge && chargedUserId) {
        remainingCredits = await addCredits(chargedUserId, creditCost, {
          reasonCode: "voice_refund",
          reasonLabel: "语音识别失败退回",
          note: `语音识别失败，退回 ${creditCost} 个魔法币。`,
        });
      }

      return NextResponse.json(
        {
          error: errorData || "语音识别接口请求失败，请稍后再试。",
          remainingCredits,
        },
        { status: mapUpstreamStatusToGatewayStatus(upstreamResponse.status) },
      );
    }

    const data =
      (await upstreamResponse.json()) as SiliconFlowTranscribeResponse;
    const text = data.text?.trim();

    if (!text) {
      if (shouldCharge && chargedUserId) {
        remainingCredits = await addCredits(chargedUserId, creditCost, {
          reasonCode: "voice_refund",
          reasonLabel: "语音识别失败退回",
          note: `语音识别未返回有效文本，退回 ${creditCost} 个魔法币。`,
        });
      }

      return NextResponse.json(
        { error: "语音模型没有返回可用的识别文本。", remainingCredits },
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
