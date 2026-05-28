import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAiSecret } from "@/lib/ai-secrets";
import { resolveAiModeConfig, resolveModeCreditPolicy } from "@/lib/ai-config";
import { addCredits, consumeCredits } from "@/lib/credits";

const ALLOWED_VOICES = new Set([
  "alex",
  "anna",
  "bella",
  "benjamin",
  "charles",
  "claire",
  "david",
  "diana",
]);

function clampNumber(value: unknown, fallback: number, min: number, max: number) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, numericValue));
}

function mapUpstreamStatusToGatewayStatus(status: number) {
  if (status === 401 || status === 403 || status >= 500) {
    return 502;
  }

  return status;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      text?: string;
      voice?: string;
      speed?: number;
      gain?: number;
    };
    const text = body.text?.trim() ?? "";

    if (!text) {
      return NextResponse.json(
        { error: "请先输入要合成语音的文字。" },
        { status: 400 },
      );
    }

    if (text.length > 1200) {
      return NextResponse.json(
        { error: "文字太长了，请先控制在 1200 字以内。" },
        { status: 400 },
      );
    }

    const aiConfig = await resolveAiModeConfig("speech");
    const apiKey = await getAiSecret(aiConfig.apiKeyEnv);
    const voiceName = ALLOWED_VOICES.has(body.voice ?? "")
      ? body.voice
      : String(aiConfig.extraPayload.voice ?? "alex");
    const speed = clampNumber(body.speed, Number(aiConfig.extraPayload.speed ?? 1), 0.25, 4);
    const gain = clampNumber(body.gain, Number(aiConfig.extraPayload.gain ?? 0), -10, 10);
    const responseFormat =
      typeof aiConfig.extraPayload.responseFormat === "string"
        ? aiConfig.extraPayload.responseFormat
        : "mp3";
    const { creditEnabled, creditCost } = resolveModeCreditPolicy(
      aiConfig.extraPayload,
    );
    const shouldCharge = creditEnabled && creditCost > 0;
    let remainingCredits: number | undefined;
    let chargedUserId: string | null = null;

    if (!aiConfig.isEnabled) {
      return NextResponse.json(
        { error: "AI 语音功能正在维护中，请稍后再试。" },
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
          { error: "请先登录后再使用 AI 语音功能。" },
          { status: 401 },
        );
      }

      const creditResult = await consumeCredits(currentUser.user_id, creditCost, {
        reasonCode: "speech_generate",
        reasonLabel: "AI语音合成",
        note: `使用 AI 语音功能，消耗 ${creditCost} 个魔法币。`,
      });

      if (!creditResult?.success) {
        return NextResponse.json(
          { error: `魔法币不足，当前剩余 ${creditResult?.remaining ?? 0} 个。` },
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
        input: text,
        voice: `${aiConfig.model}:${voiceName}`,
        response_format: responseFormat,
        speed,
        gain,
      }),
    });

    if (!upstreamResponse.ok) {
      const errorText = await upstreamResponse.text();

      if (shouldCharge && chargedUserId) {
        remainingCredits = await addCredits(chargedUserId, creditCost, {
          reasonCode: "speech_refund",
          reasonLabel: "AI语音失败退回",
          note: `AI 语音合成失败，退回 ${creditCost} 个魔法币。`,
        });
      }

      return NextResponse.json(
        {
          error: errorText || "AI 语音接口请求失败，请稍后再试。",
          remainingCredits,
        },
        { status: mapUpstreamStatusToGatewayStatus(upstreamResponse.status) },
      );
    }

    const audioBuffer = await upstreamResponse.arrayBuffer();

    if (!audioBuffer.byteLength) {
      if (shouldCharge && chargedUserId) {
        remainingCredits = await addCredits(chargedUserId, creditCost, {
          reasonCode: "speech_refund",
          reasonLabel: "AI语音失败退回",
          note: `AI 语音合成未返回有效音频，退回 ${creditCost} 个魔法币。`,
        });
      }

      return NextResponse.json(
        { error: "AI 语音模型没有返回可播放的音频。", remainingCredits },
        { status: 502 },
      );
    }

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": responseFormat === "wav" ? "audio/wav" : "audio/mpeg",
        "Cache-Control": "no-store",
        ...(typeof remainingCredits === "number"
          ? { "X-Remaining-Credits": String(remainingCredits) }
          : {}),
      },
    });
  } catch (error) {
    console.error("【AI 语音合成失败】:", error);

    return NextResponse.json(
      { error: "AI 语音接口暂时出了点小状况，请稍后再试。" },
      { status: 500 },
    );
  }
}
