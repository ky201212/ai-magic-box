import { NextResponse } from "next/server";
import { addCredits, consumeCredits } from "@/lib/credits";
import { getCurrentUser } from "@/lib/auth";
import { resolveAiModeConfig, resolveModeCreditPolicy } from "@/lib/ai-config";
import { getAiSecret } from "@/lib/ai-secrets";
import { recordAiModelChainEvent } from "@/lib/admin-data";
import {
  resolveAiModelChainCandidates,
  resolveAiModelChainPolicy,
  shouldContinueAiModelChain,
} from "@/lib/ai-model-chain";
import { rejectWhenRateLimited } from "@/lib/request-security";
import { recordRateLimitSignal } from "@/lib/security-monitoring";

type VideoSubmitResponse = {
  requestId?: string;
  request_id?: string;
  taskId?: string;
  task_id?: string;
  id?: string;
  error?: {
    message?: string;
    code?: string;
  };
};

type VideoStatusResponse = {
  requestId?: string;
  request_id?: string;
  taskId?: string;
  task_id?: string;
  status?: string;
  state?: string;
  phase?: string;
  error?: {
    message?: string;
    code?: string;
  };
  result?: {
    videos?: Array<{
      url?: string;
    }>;
    video?: {
      url?: string;
    };
    url?: string;
  };
  results?: {
    videos?: Array<{
      url?: string;
    }>;
    video?: {
      url?: string;
    };
    videoUrl?: string;
    url?: string;
  };
  videos?: Array<{
    url?: string;
  }>;
  video?: {
    url?: string;
  };
  videoUrl?: string;
  url?: string;
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

function parsePossibleJson<T>(rawText: string) {
  try {
    return JSON.parse(rawText) as T;
  } catch {
    return null;
  }
}

function resolveVideoStatusEndpoint(endpointUrl: string) {
  const trimmedEndpoint = endpointUrl.trim();
  const normalizedEndpoint = trimmedEndpoint.toLowerCase();

  if (normalizedEndpoint.endsWith("/video/submit")) {
    return trimmedEndpoint.replace(/\/video\/submit$/i, "/video/status");
  }

  if (normalizedEndpoint.endsWith("/v1")) {
    return `${trimmedEndpoint}/video/status`;
  }

  if (normalizedEndpoint.endsWith("/v1/")) {
    return `${trimmedEndpoint}video/status`;
  }

  if (normalizedEndpoint.includes("/video/status")) {
    return trimmedEndpoint;
  }

  return trimmedEndpoint;
}

function buildVideoSubmitRequestBody(input: {
  model: string;
  prompt: string;
  imageSize: string;
}) {
  return {
    model: input.model,
    prompt: input.prompt,
    image_size: input.imageSize,
  };
}

function resolveVideoSubmitModel(input: {
  requestedMode: string | undefined;
  configuredModel: string;
  extraPayload: Record<string, unknown>;
}) {
  const qualityModel =
    typeof input.extraPayload.qualityModel === "string" &&
    input.extraPayload.qualityModel.trim()
      ? input.extraPayload.qualityModel.trim()
      : input.configuredModel;
  const fastModel =
    typeof input.extraPayload.fastModel === "string" &&
    input.extraPayload.fastModel.trim()
      ? input.extraPayload.fastModel.trim()
      : input.configuredModel;

  return input.requestedMode === "quality" ? qualityModel : fastModel;
}

function extractRequestId(data: VideoSubmitResponse) {
  return (
    data.requestId?.trim() ||
    data.request_id?.trim() ||
    data.taskId?.trim() ||
    data.task_id?.trim() ||
    data.id?.trim() ||
    ""
  );
}

function extractVideoUrl(data: VideoStatusResponse) {
  const directUrl =
    data.result?.videos?.[0]?.url ||
    data.result?.video?.url ||
    data.result?.url ||
    data.results?.videos?.[0]?.url ||
    data.results?.video?.url ||
    data.results?.videoUrl ||
    data.results?.url ||
    data.videos?.[0]?.url ||
    data.video?.url ||
    data.videoUrl ||
    data.url ||
    "";

  return /^(https?:\/\/|blob:)/i.test(directUrl.trim()) ? directUrl : "";
}

function resolveVideoStatusValue(data: VideoStatusResponse) {
  return (
    data.status?.trim().toLowerCase() ||
    data.state?.trim().toLowerCase() ||
    data.phase?.trim().toLowerCase() ||
    ""
  );
}

function isVideoTaskSucceeded(status: string, hasVideoUrl: boolean) {
  return (
    hasVideoUrl ||
    status === "succeed" ||
    status === "succeeded" ||
    status === "success" ||
    status === "completed" ||
    status === "done"
  );
}

function isVideoTaskFailed(status: string) {
  return (
    status === "failed" ||
    status === "error" ||
    status === "cancelled" ||
    status === "canceled"
  );
}

function buildVideoErrorMessage(
  rawText: string,
  model: string,
  endpointUrl: string,
  stageLabel = "视频接口",
) {
  const parsed = parsePossibleJson<{ error?: { message?: string; code?: string } }>(
    rawText,
  );
  const message = parsed?.error?.message?.trim() || rawText.trim();
  const errorCode = parsed?.error?.code?.trim().toLowerCase();
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("404") ||
    normalizedMessage.includes("not found")
  ) {
    return `${stageLabel}返回 Not Found。当前请求地址是 ${endpointUrl}，请确认后台 AI 视频接口地址填写为 https://api.siliconflow.cn/v1/video/submit。`;
  }

  if (
    errorCode === "model_not_found" ||
    normalizedMessage.includes("model_not_found") ||
    normalizedMessage.includes("available channel for model")
  ) {
    return `视频接口已经连通，但当前模型名称“${model}”在这个渠道里不可用。请去后台把 AI 视频的模型名称改成这个渠道真实支持的模型 ID。你现在填写的接口地址是 ${endpointUrl}。`;
  }

  if (normalizedMessage.includes("invalid_api_key") || normalizedMessage.includes("api key")) {
    return "视频接口的密钥无效，或者这个密钥没有开通视频生成权限，请检查后台填写的 key。";
  }

  if (normalizedMessage.includes("invalid token") || normalizedMessage.includes("token")) {
    return "视频接口返回 Invalid token，请检查后台 AI 视频配置里的接口密钥是否正确、是否过期。";
  }

  return message || `${stageLabel}请求失败，请稍后再试。`;
}

function waitFor(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
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

async function fetchVideoTaskStatus(input: {
  apiKey: string;
  endpointUrl: string;
  model: string;
  requestId: string;
}) {
  const statusEndpoint = resolveVideoStatusEndpoint(input.endpointUrl);
  const statusResponse = await fetch(statusEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ requestId: input.requestId }),
    cache: "no-store",
  });
  const statusText = await statusResponse.text();
  const statusData = parsePossibleJson<VideoStatusResponse>(statusText);

  if (!statusResponse.ok) {
    return NextResponse.json(
      {
        error: buildVideoErrorMessage(
          statusText,
          input.model,
          statusEndpoint,
          "视频状态接口",
        ),
      },
      { status: mapUpstreamStatusToGatewayStatus(statusResponse.status) },
    );
  }

  const resolvedStatus = resolveVideoStatusValue(statusData ?? {});
  const videoUrl = statusData ? extractVideoUrl(statusData) : "";

  if (isVideoTaskSucceeded(resolvedStatus, Boolean(videoUrl)) && videoUrl) {
    return NextResponse.json({
      videoUrl,
      requestId: input.requestId,
      endpointUrl: input.endpointUrl,
      model: input.model,
      status: "succeeded",
    });
  }

  if (isVideoTaskFailed(resolvedStatus)) {
    return NextResponse.json(
      {
        error:
          statusData?.error?.message?.trim() ||
          "视频生成失败了，请检查模型配置或稍后重试。",
        requestId: input.requestId,
        endpointUrl: input.endpointUrl,
        model: input.model,
        status: resolvedStatus || "failed",
      },
      { status: 502 },
    );
  }

  return NextResponse.json(
    {
      requestId: input.requestId,
      endpointUrl: input.endpointUrl,
      model: input.model,
      status: resolvedStatus || "processing",
      message: "视频任务还在生成中，请继续等待。",
    },
    { status: 202 },
  );
}

export async function POST(request: Request) {
  try {
    const {
      prompt,
      requestId: existingRequestId,
      speedMode,
      endpointUrl: existingEndpointUrl,
      model: existingModel,
    } = (await request.json()) as {
      prompt?: string;
      requestId?: string;
      speedMode?: string;
      endpointUrl?: string;
      model?: string;
    };

    const rateLimitError = await rejectWhenRateLimited({
      request,
      scope: existingRequestId?.trim() ? "ai-generate-video-poll" : "ai-generate-video",
      limit: existingRequestId?.trim() ? 20 : 4,
      windowMs: 60 * 1000,
      message: existingRequestId?.trim()
        ? "视频结果查询太频繁了，请稍后再试。"
        : "AI 视频请求太频繁了，请稍后再试。",
    });

    if (rateLimitError) {
      await recordRateLimitSignal({
        request,
        scope: existingRequestId?.trim()
          ? "ai-generate-video-poll"
          : "ai-generate-video",
        message: existingRequestId?.trim()
          ? "视频结果查询太频繁了，请稍后再试。"
          : "AI 视频请求太频繁了，请稍后再试。",
        detail: {
          phase: existingRequestId?.trim() ? "poll" : "submit",
        },
      });
      return rateLimitError;
    }

    const aiConfig = await resolveAiModeConfig("video");
    const submitModel = resolveVideoSubmitModel({
      requestedMode: speedMode,
      configuredModel: aiConfig.model,
      extraPayload: aiConfig.extraPayload,
    });
    const imageSize =
      typeof aiConfig.extraPayload.image_size === "string"
        ? aiConfig.extraPayload.image_size
        : "1280x720";
    const pollIntervalMs =
      typeof aiConfig.extraPayload.pollIntervalMs === "number"
        ? Math.max(1500, aiConfig.extraPayload.pollIntervalMs)
        : 5000;
    const pollTimeoutMs =
      typeof aiConfig.extraPayload.pollTimeoutMs === "number"
        ? Math.max(20000, aiConfig.extraPayload.pollTimeoutMs)
        : 180000;
    const { creditEnabled, creditCost } = resolveModeCreditPolicy(
      aiConfig.extraPayload,
    );
    const shouldCharge = creditEnabled && creditCost > 0;
    let remainingCredits: number | undefined;
    let chargedUserId: string | null = null;

    if (!aiConfig.isEnabled) {
      return NextResponse.json(
        { error: "AI 视频功能正在维护中，请稍后再试。" },
        { status: 503 },
      );
    }

    if (existingRequestId?.trim()) {
      const pollingEndpointUrl =
        typeof existingEndpointUrl === "string" && existingEndpointUrl.trim()
          ? existingEndpointUrl.trim()
          : aiConfig.endpointUrl;
      const pollingModel =
        typeof existingModel === "string" && existingModel.trim()
          ? existingModel.trim()
          : submitModel;
      const pollingCandidates = resolveAiModelChainCandidates({
        endpointUrl: aiConfig.endpointUrl,
        apiKeyEnv: aiConfig.apiKeyEnv,
        model: submitModel,
        extraPayload: aiConfig.extraPayload,
        baseLabel: "A 主模型",
        provider: aiConfig.extraPayload.providerLabel as string | undefined,
      });
      const matchedCandidate =
        pollingCandidates.find(
          (candidate) =>
            candidate.endpointUrl.trim() === pollingEndpointUrl &&
            candidate.model.trim() === pollingModel,
        ) ?? pollingCandidates[0];
      const apiKey = matchedCandidate
        ? await getAiSecret(matchedCandidate.apiKeyEnv)
        : await getAiSecret(aiConfig.apiKeyEnv);

      if (!apiKey) {
        return NextResponse.json(
          {
            error: `服务端缺少 ${
              matchedCandidate?.apiKeyEnv ?? aiConfig.apiKeyEnv
            } 环境变量。`,
          },
          { status: 500 },
        );
      }

      return fetchVideoTaskStatus({
        apiKey,
        endpointUrl: matchedCandidate?.endpointUrl ?? pollingEndpointUrl,
        model: matchedCandidate?.model ?? pollingModel,
        requestId: existingRequestId.trim(),
      });
    }

    if (!prompt?.trim()) {
      return NextResponse.json(
        { error: "缺少有效的 prompt 参数。" },
        { status: 400 },
      );
    }

    if (shouldCharge) {
      const currentUser = await getCurrentUser();

      if (!currentUser?.user_id) {
        return NextResponse.json(
          { error: "请先登录后再使用 AI 视频功能。" },
          { status: 401 },
        );
      }

      const creditResult = await consumeCredits(currentUser.user_id, creditCost, {
        reasonCode: "video_generate",
        reasonLabel: "AI视频生成",
        note: `使用 AI 视频功能，消耗 ${creditCost} 个魔法币。`,
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

    const candidates = resolveAiModelChainCandidates({
      endpointUrl: aiConfig.endpointUrl,
      apiKeyEnv: aiConfig.apiKeyEnv,
      model: submitModel,
      extraPayload: aiConfig.extraPayload,
      baseLabel: "A 主模型",
      provider: aiConfig.extraPayload.providerLabel as string | undefined,
    });
    const chainPolicy = resolveAiModelChainPolicy(aiConfig.extraPayload);
    let lastError = "视频生成服务暂时不可用，请稍后再试。";
    let lastStatus = 502;

    for (const candidate of candidates) {
      const startedAt = Date.now();
      const candidateApiKey = await getAiSecret(candidate.apiKeyEnv);

      if (!candidateApiKey) {
        lastError = `服务端缺少 ${candidate.apiKeyEnv} 环境变量。`;
        lastStatus = 500;

        await recordAiModelChainEvent({
          modeKey: "video",
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
            modeKey: "video",
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
        const submitResponse = await fetchWithTimeout(
          candidate.endpointUrl,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${candidateApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(
              buildVideoSubmitRequestBody({
                model: candidate.model,
                prompt,
                imageSize,
              }),
            ),
          },
          candidate.timeoutMs,
        );

        if (!submitResponse.ok) {
          const errorText = await submitResponse.text();
          lastError = buildVideoErrorMessage(
            errorText,
            candidate.model,
            candidate.endpointUrl,
            "视频提交接口",
          );
          lastStatus = mapUpstreamStatusToGatewayStatus(submitResponse.status);

          await recordAiModelChainEvent({
            modeKey: "video",
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
              modeKey: "video",
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

        const submitData = (await submitResponse.json()) as VideoSubmitResponse;
        const requestId = extractRequestId(submitData);

        if (!requestId) {
          lastError = "视频任务已提交，但接口没有返回可追踪的任务编号，请检查后台 AI 视频配置。";
          lastStatus = 502;

          await recordAiModelChainEvent({
            modeKey: "video",
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
              modeKey: "video",
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

        const quickPollDeadline = Date.now() + Math.min(pollTimeoutMs, 12000);

        while (Date.now() < quickPollDeadline) {
          await waitFor(pollIntervalMs);

          const taskResponse = await fetchVideoTaskStatus({
            apiKey: candidateApiKey,
            endpointUrl: candidate.endpointUrl,
            model: candidate.model,
            requestId,
          });
          const taskData = (await taskResponse.clone().json().catch(() => null)) as {
            videoUrl?: string;
            error?: string;
            status?: string;
          } | null;

          if (taskResponse.status !== 202) {
            if (taskResponse.ok && taskData?.videoUrl) {
              await recordAiModelChainEvent({
                modeKey: "video",
                slot: candidate.slot,
                label: candidate.label,
                provider: candidate.provider,
                model: candidate.model,
                endpointUrl: candidate.endpointUrl,
                event: "success",
                latencyMs: Date.now() - startedAt,
              });
              const successPayload = {
                videoUrl: taskData.videoUrl,
                requestId,
                endpointUrl: candidate.endpointUrl,
                model: candidate.model,
                status: taskData.status ?? "succeeded",
                remainingCredits,
              };

              return NextResponse.json(successPayload);
            }

            lastError = taskData?.error || "视频生成失败了，请检查模型配置或稍后重试。";
            lastStatus = taskResponse.status;
            await recordAiModelChainEvent({
              modeKey: "video",
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
            break;
          }
        }

        return NextResponse.json(
          {
            requestId,
            endpointUrl: candidate.endpointUrl,
            model: candidate.model,
            status: "processing",
            message: "视频任务已经提交，正在继续生成中。",
            remainingCredits,
          },
          { status: 202 },
        );
      } catch (error) {
        lastError = isAbortTimeoutError(error)
          ? "服务器等待视频模型返回超时了。"
          : error instanceof Error
            ? error.message
            : "视频生成服务暂时不可用，请稍后再试。";
        lastStatus = isAbortTimeoutError(error) ? 504 : 502;

        await recordAiModelChainEvent({
          modeKey: "video",
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
            modeKey: "video",
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
        reasonCode: "video_refund",
        reasonLabel: "AI视频失败退回",
        note: `AI 视频生成失败，退回 ${creditCost} 个魔法币。`,
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
    console.error("【AI 视频生成失败】:", error);

    return NextResponse.json(
      { error: "视频生成服务暂时不可用，请稍后再试。" },
      { status: 500 },
    );
  }
}
