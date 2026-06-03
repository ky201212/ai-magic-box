import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { resolveAiModeConfig, resolveModeCreditPolicy } from "@/lib/ai-config";
import { addCredits, consumeCredits } from "@/lib/credits";
import { getAiSecret } from "@/lib/ai-secrets";
import { recordAiModelChainEvent } from "@/lib/admin-data";
import {
  resolveAiModelChainCandidates,
  resolveAiModelChainPolicy,
  shouldContinueAiModelChain,
} from "@/lib/ai-model-chain";
import { rejectWhenRateLimited } from "@/lib/request-security";
import { recordRateLimitSignal } from "@/lib/security-monitoring";

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
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "缺少有效的音频文件 file。" },
        { status: 400 },
      );
    }

    const rateLimitError = rejectWhenRateLimited({
      request,
      scope: "ai-transcribe",
      limit: 8,
      windowMs: 60 * 1000,
      message: "语音识别请求太频繁了，请稍后再试。",
    });

    if (rateLimitError) {
      await recordRateLimitSignal({
        request,
        scope: "ai-transcribe",
        message: "语音识别请求太频繁了，请稍后再试。",
      });
      return rateLimitError;
    }

    const aiConfig = await resolveAiModeConfig("transcribe");
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

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const candidates = resolveAiModelChainCandidates({
      endpointUrl: aiConfig.endpointUrl,
      apiKeyEnv: aiConfig.apiKeyEnv,
      model: aiConfig.model,
      extraPayload: aiConfig.extraPayload,
      baseLabel: "A 主模型",
      provider: aiConfig.extraPayload.providerLabel as string | undefined,
    });
    const chainPolicy = resolveAiModelChainPolicy(aiConfig.extraPayload);
    let lastError = "语音识别接口请求失败，请稍后再试。";
    let lastStatus = 502;

    for (const candidate of candidates) {
      const startedAt = Date.now();
      const candidateApiKey = await getAiSecret(candidate.apiKeyEnv);

      if (!candidateApiKey) {
        lastError = `服务端缺少 ${candidate.apiKeyEnv} 环境变量。`;
        lastStatus = 500;

        await recordAiModelChainEvent({
          modeKey: "transcribe",
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
            modeKey: "transcribe",
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

      const upstreamFormData = new FormData();
      upstreamFormData.append(
        "file",
        new Blob([fileBuffer], { type: file.type || "audio/webm" }),
        file.name || "audio.webm",
      );
      upstreamFormData.append("model", candidate.model);

      try {
        const upstreamResponse = await fetchWithTimeout(
          candidate.endpointUrl,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${candidateApiKey}`,
            },
            body: upstreamFormData,
          },
          candidate.timeoutMs,
        );

        if (!upstreamResponse.ok) {
          const errorData = await upstreamResponse.text();
          console.error("【SiliconFlow 语音转写接口报错详情】:", errorData);
          lastError = errorData || "语音识别接口请求失败，请稍后再试。";
          lastStatus = mapUpstreamStatusToGatewayStatus(upstreamResponse.status);

          await recordAiModelChainEvent({
            modeKey: "transcribe",
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
              modeKey: "transcribe",
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

        const data =
          (await upstreamResponse.json()) as SiliconFlowTranscribeResponse;
        const text = data.text?.trim();

        if (text) {
          await recordAiModelChainEvent({
            modeKey: "transcribe",
            slot: candidate.slot,
            label: candidate.label,
            provider: candidate.provider,
            model: candidate.model,
            endpointUrl: candidate.endpointUrl,
            event: "success",
            latencyMs: Date.now() - startedAt,
          });
          return NextResponse.json({ text, remainingCredits });
        }

        lastError = "语音模型没有返回可用的识别文本。";
        lastStatus = 502;

        await recordAiModelChainEvent({
          modeKey: "transcribe",
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
            modeKey: "transcribe",
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
          ? "服务器等待语音识别模型返回超时了。"
          : error instanceof Error
            ? error.message
            : "语音识别接口暂时不可用，请稍后再试。";
        lastStatus = isAbortTimeoutError(error) ? 504 : 502;

        await recordAiModelChainEvent({
          modeKey: "transcribe",
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
            modeKey: "transcribe",
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
        reasonCode: "voice_refund",
        reasonLabel: "语音识别失败退回",
        note: `语音识别失败，退回 ${creditCost} 个魔法币。`,
      });
    }

    return NextResponse.json(
      { error: lastError, remainingCredits },
      { status: lastStatus },
    );
  } catch {
    return NextResponse.json(
      { error: "语音识别接口暂时出了点小状况，请稍后再试。" },
      { status: 500 },
    );
  }
}
