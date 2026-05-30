import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAiSecret } from "@/lib/ai-secrets";
import { resolveAiModeConfig, resolveModeCreditPolicy } from "@/lib/ai-config";
import { addCredits, consumeCredits } from "@/lib/credits";
import { recordAiModelChainEvent } from "@/lib/admin-data";
import {
  resolveAiModelChainCandidates,
  resolveAiModelChainPolicy,
  shouldContinueAiModelChain,
} from "@/lib/ai-model-chain";

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

function isAbortTimeoutError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === "AbortError" ||
      error.message.toLowerCase().includes("timed out"))
  );
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs?: number,
) {
  if (!timeoutMs || !Number.isFinite(timeoutMs) || timeoutMs < 10_000) {
    return fetch(input, init);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new Error("Upstream request timed out"));
  }, timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
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

    const candidates = resolveAiModelChainCandidates({
      endpointUrl: aiConfig.endpointUrl,
      apiKeyEnv: aiConfig.apiKeyEnv,
      model: aiConfig.model,
      extraPayload: aiConfig.extraPayload,
      baseLabel: "A 主模型",
      provider: aiConfig.extraPayload.providerLabel as string | undefined,
    });
    const chainPolicy = resolveAiModelChainPolicy(aiConfig.extraPayload);
    let lastError = "AI 语音接口请求失败，请稍后再试。";
    let lastStatus = 502;

    for (const candidate of candidates) {
      const startedAt = Date.now();
      const candidateApiKey = await getAiSecret(candidate.apiKeyEnv);

      if (!candidateApiKey) {
        lastError = `服务端缺少 ${candidate.apiKeyEnv} 环境变量。`;
        lastStatus = 500;

        await recordAiModelChainEvent({
          modeKey: "speech",
          slot: candidate.slot,
          label: candidate.label,
          provider: candidate.provider,
          model: candidate.model,
          endpointUrl: candidate.endpointUrl,
          event: "skipped_missing_key",
          message: `缺少 ${candidate.apiKeyEnv} 密钥`,
        });

        if (!shouldContinueAiModelChain({ status: lastStatus, error: lastError }, chainPolicy)) {
          await recordAiModelChainEvent({
            modeKey: "speech",
            slot: candidate.slot,
            label: candidate.label,
            provider: candidate.provider,
            model: candidate.model,
            endpointUrl: candidate.endpointUrl,
            event: "stopped",
            status: lastStatus,
            message: "当前错误类型不在自动切换规则里，已停止继续切换。",
          });
          break;
        }

        continue;
      }

      try {
        const upstreamResponse = await fetchWithTimeout(
          candidate.endpointUrl,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${candidateApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: candidate.model,
              input: text,
              voice: `${candidate.model}:${voiceName}`,
              response_format: responseFormat,
              speed,
              gain,
            }),
          },
          candidate.timeoutMs,
        );

        if (!upstreamResponse.ok) {
          lastError = (await upstreamResponse.text()) || "AI 语音接口请求失败，请稍后再试。";
          lastStatus = mapUpstreamStatusToGatewayStatus(upstreamResponse.status);

          await recordAiModelChainEvent({
            modeKey: "speech",
            slot: candidate.slot,
            label: candidate.label,
            provider: candidate.provider,
            model: candidate.model,
            endpointUrl: candidate.endpointUrl,
            event: lastStatus === 504 ? "timeout" : "failure",
            status: lastStatus,
            latencyMs: Date.now() - startedAt,
            message: lastError,
          });

          if (!shouldContinueAiModelChain({ status: lastStatus, error: lastError }, chainPolicy)) {
            await recordAiModelChainEvent({
              modeKey: "speech",
              slot: candidate.slot,
              label: candidate.label,
              provider: candidate.provider,
              model: candidate.model,
              endpointUrl: candidate.endpointUrl,
              event: "stopped",
              status: lastStatus,
              message: "当前错误类型不在自动切换规则里，已停止继续切换。",
            });
            break;
          }

          continue;
        }

        const audioBuffer = await upstreamResponse.arrayBuffer();

        if (audioBuffer.byteLength) {
          await recordAiModelChainEvent({
            modeKey: "speech",
            slot: candidate.slot,
            label: candidate.label,
            provider: candidate.provider,
            model: candidate.model,
            endpointUrl: candidate.endpointUrl,
            event: "success",
            latencyMs: Date.now() - startedAt,
          });
          return new NextResponse(audioBuffer, {
            headers: {
              "Content-Type": responseFormat === "wav" ? "audio/wav" : "audio/mpeg",
              "Cache-Control": "no-store",
              ...(typeof remainingCredits === "number"
                ? { "X-Remaining-Credits": String(remainingCredits) }
                : {}),
            },
          });
        }

        lastError = "AI 语音模型没有返回可播放的音频。";
        lastStatus = 502;

        await recordAiModelChainEvent({
          modeKey: "speech",
          slot: candidate.slot,
          label: candidate.label,
          provider: candidate.provider,
          model: candidate.model,
          endpointUrl: candidate.endpointUrl,
          event: "failure",
          status: lastStatus,
          latencyMs: Date.now() - startedAt,
          message: lastError,
        });

        if (!shouldContinueAiModelChain({ status: lastStatus, error: lastError }, chainPolicy)) {
          await recordAiModelChainEvent({
            modeKey: "speech",
            slot: candidate.slot,
            label: candidate.label,
            provider: candidate.provider,
            model: candidate.model,
            endpointUrl: candidate.endpointUrl,
            event: "stopped",
            status: lastStatus,
            message: "当前错误类型不在自动切换规则里，已停止继续切换。",
          });
          break;
        }
      } catch (error) {
        lastError = isAbortTimeoutError(error)
          ? "服务器等待语音模型返回超时了。"
          : error instanceof Error
            ? error.message
            : "AI 语音接口暂时不可用，请稍后再试。";
        lastStatus = isAbortTimeoutError(error) ? 504 : 502;

        await recordAiModelChainEvent({
          modeKey: "speech",
          slot: candidate.slot,
          label: candidate.label,
          provider: candidate.provider,
          model: candidate.model,
          endpointUrl: candidate.endpointUrl,
          event: isAbortTimeoutError(error) ? "timeout" : "failure",
          status: lastStatus,
          latencyMs: Date.now() - startedAt,
          message: lastError,
        });

        if (!shouldContinueAiModelChain({ status: lastStatus, error: lastError }, chainPolicy)) {
          await recordAiModelChainEvent({
            modeKey: "speech",
            slot: candidate.slot,
            label: candidate.label,
            provider: candidate.provider,
            model: candidate.model,
            endpointUrl: candidate.endpointUrl,
            event: "stopped",
            status: lastStatus,
            message: "当前错误类型不在自动切换规则里，已停止继续切换。",
          });
          break;
        }
      }
    }

    if (shouldCharge && chargedUserId) {
      remainingCredits = await addCredits(chargedUserId, creditCost, {
        reasonCode: "speech_refund",
        reasonLabel: "AI语音失败退回",
        note: `AI 语音合成失败，退回 ${creditCost} 个魔法币。`,
      });
    }

    return NextResponse.json(
      {
        error: lastError,
        remainingCredits,
      },
      { status: lastStatus },
    );
  } catch (error) {
    console.error("【AI 语音合成失败】:", error);

    return NextResponse.json(
      { error: "AI 语音接口暂时出了点小状况，请稍后再试。" },
      { status: 500 },
    );
  }
}
