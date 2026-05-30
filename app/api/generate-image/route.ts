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

type SiliconFlowImageResponse = {
  images?: Array<{
    url?: string;
  }>;
  data?: Array<{
    url?: string;
    b64_json?: string;
  }>;
  error?: {
    message?: string;
    code?: string;
    type?: string;
    param?: string;
  };
};

type GenerateImageRequestBody = {
  prompt?: string;
  referenceImages?: string[];
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

function resolveImageRequestEndpoint(endpointUrl: string) {
  const trimmedEndpoint = endpointUrl.trim();
  const normalizedEndpoint = trimmedEndpoint.toLowerCase();

  if (normalizedEndpoint.endsWith("/images/generations")) {
    return trimmedEndpoint;
  }

  if (normalizedEndpoint.endsWith("/v1")) {
    return `${trimmedEndpoint}/images/generations`;
  }

  if (normalizedEndpoint.endsWith("/v1/")) {
    return `${trimmedEndpoint}images/generations`;
  }

  return trimmedEndpoint;
}

function shouldUseOpenAiImagePayload(endpointUrl: string, model: string) {
  const normalizedEndpoint = endpointUrl.toLowerCase();
  const normalizedModel = model.trim().toLowerCase();

  return (
    !normalizedEndpoint.includes("siliconflow") ||
    normalizedModel.startsWith("gpt-image")
  );
}

function buildImageRequestBody(
  endpointUrl: string,
  model: string,
  prompt: string,
  imageSize: string,
  referenceImages: string[],
) {
  if (shouldUseOpenAiImagePayload(endpointUrl, model)) {
    return {
      model,
      prompt,
      size: imageSize,
      n: 1,
      ...(referenceImages[0] ? { image: referenceImages[0] } : {}),
      ...(referenceImages[1] ? { image2: referenceImages[1] } : {}),
      ...(referenceImages[2] ? { image3: referenceImages[2] } : {}),
    };
  }

  return {
    model,
    prompt,
    image_size: imageSize,
    ...(referenceImages[0] ? { image: referenceImages[0] } : {}),
    ...(referenceImages[1] ? { image2: referenceImages[1] } : {}),
    ...(referenceImages[2] ? { image3: referenceImages[2] } : {}),
  };
}

function parsePossibleJson(rawText: string) {
  try {
    return JSON.parse(rawText) as SiliconFlowImageResponse;
  } catch {
    return null;
  }
}

function extractImageUrl(data: SiliconFlowImageResponse) {
  const directUrl = data.images?.[0]?.url ?? data.data?.[0]?.url;

  if (
    directUrl &&
    /^(https?:\/\/|data:image\/|blob:)/i.test(directUrl.trim())
  ) {
    return directUrl;
  }

  const base64Image = data.data?.[0]?.b64_json?.trim();

  if (base64Image) {
    return `data:image/png;base64,${base64Image}`;
  }

  return "";
}

function buildImageErrorMessage(rawText: string, model: string, endpointUrl: string) {
  const parsed = parsePossibleJson(rawText);
  const message = parsed?.error?.message?.trim() || rawText.trim();
  const errorCode = parsed?.error?.code?.trim().toLowerCase();
  const normalizedMessage = message.toLowerCase();

  if (
    errorCode === "model_not_found" ||
    normalizedMessage.includes("model_not_found") ||
    normalizedMessage.includes("available channel for model")
  ) {
    return `绘画接口已经连通，但当前模型名称“${model}”在这个渠道里不可用。请去后台把 AI 绘画的模型名称改成这个渠道真实支持的模型 ID。你现在填写的接口地址是 ${endpointUrl}。如果这是 OpenAI 兼容图片接口，常见模型名通常是 \`gpt-image-1\`，但最终要以你的渠道后台支持列表为准。`;
  }

  if (normalizedMessage.includes("invalid_api_key") || normalizedMessage.includes("api key")) {
    return "绘画接口的密钥无效，或者这个密钥没有开通图片生成权限，请检查后台填写的 key。";
  }

  if (
    normalizedMessage.includes("invalid token") ||
    normalizedMessage.includes("invalid_token") ||
    normalizedMessage.includes("token")
  ) {
    return "绘画接口返回 Invalid token，请检查后台 AI 绘画配置里的接口密钥是否正确、是否过期，或者是否填到了正确的密钥环境变量。";
  }

  if (normalizedMessage.includes("invalid url")) {
    return `绘画接口地址无效。当前填写的是 ${endpointUrl}，请检查后台 AI 绘画配置。`;
  }

  return message || "图像生成接口请求失败，请稍后再试。";
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
    const { prompt, referenceImages } =
      (await request.json()) as GenerateImageRequestBody;

    if (!prompt?.trim()) {
      return NextResponse.json(
        { error: "缺少有效的 prompt 参数。" },
        { status: 400 },
      );
    }

    const aiConfig = await resolveAiModeConfig("painting");
    const supportsImageEditing =
      aiConfig.extraPayload.supportsImageEditing === true;
    const normalizedReferenceImages = Array.isArray(referenceImages)
      ? referenceImages
          .filter(
            (item): item is string =>
              typeof item === "string" &&
              item.trim().length > 0 &&
              /^data:image\/|^https?:\/\//i.test(item.trim()),
          )
          .slice(0, 3)
      : [];
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

    if (normalizedReferenceImages.length > 0 && !supportsImageEditing) {
      return NextResponse.json(
        { error: "当前绘画模型未开启图像编辑能力，请只使用文生图，或去后台勾选支持图像编辑。" },
        { status: 400 },
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

    const candidates = resolveAiModelChainCandidates({
      endpointUrl: aiConfig.endpointUrl,
      apiKeyEnv: aiConfig.apiKeyEnv,
      model: aiConfig.model,
      extraPayload: aiConfig.extraPayload,
      baseLabel: "A 主模型",
      provider: aiConfig.extraPayload.providerLabel as string | undefined,
    });
    const chainPolicy = resolveAiModelChainPolicy(aiConfig.extraPayload);
    let lastError = "图像生成接口请求失败，请稍后再试。";
    let lastStatus = 502;

    for (const candidate of candidates) {
      const startedAt = Date.now();
      const candidateApiKey = await getAiSecret(candidate.apiKeyEnv);

      if (!candidateApiKey) {
        lastError = `服务端缺少 ${candidate.apiKeyEnv} 环境变量。`;
        lastStatus = 500;

        await recordAiModelChainEvent({
          modeKey: "painting",
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
            modeKey: "painting",
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

      const requestEndpoint = resolveImageRequestEndpoint(candidate.endpointUrl);

      try {
        const upstreamResponse = await fetchWithTimeout(
          requestEndpoint,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${candidateApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(
              buildImageRequestBody(
                requestEndpoint,
                candidate.model,
                prompt,
                imageSize,
                normalizedReferenceImages,
              ),
            ),
          },
          candidate.timeoutMs,
        );

        if (!upstreamResponse.ok) {
          const errorData = await upstreamResponse.text();
          console.error("【SiliconFlow 图像接口报错详情】:", errorData);
          lastError =
            buildImageErrorMessage(errorData, candidate.model, requestEndpoint) ||
            "图像生成接口请求失败，请稍后再试。";
          lastStatus = mapUpstreamStatusToGatewayStatus(upstreamResponse.status);

          await recordAiModelChainEvent({
            modeKey: "painting",
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
              modeKey: "painting",
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

        const data = (await upstreamResponse.json()) as SiliconFlowImageResponse;
        const imageUrl = extractImageUrl(data);

        if (imageUrl) {
          await recordAiModelChainEvent({
            modeKey: "painting",
            slot: candidate.slot,
            label: candidate.label,
            provider: candidate.provider,
            model: candidate.model,
            endpointUrl: candidate.endpointUrl,
            event: "success",
            latencyMs: Date.now() - startedAt,
          });
          return NextResponse.json({
            imageUrl,
            remainingCredits,
          });
        }

        const upstreamMessage =
          data.error?.message ??
          data.images?.[0]?.url ??
          data.data?.[0]?.url ??
          data.data?.[0]?.b64_json ??
          "";

        lastError =
          buildImageErrorMessage(
            upstreamMessage,
            candidate.model,
            requestEndpoint,
          ) ||
          "图像模型已经返回结果了，但没有带回可直接展示的图片地址或图片数据。";
        lastStatus = 502;

        await recordAiModelChainEvent({
          modeKey: "painting",
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
            modeKey: "painting",
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
          ? "服务器等待图像模型返回超时了。"
          : error instanceof Error
            ? error.message
            : "图像生成接口暂时不可用，请稍后再试。";
        lastStatus = isAbortTimeoutError(error) ? 504 : 502;

        await recordAiModelChainEvent({
          modeKey: "painting",
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
            modeKey: "painting",
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
        reasonCode: "painting_refund",
        reasonLabel: "AI绘画失败退回",
        note: `AI 绘画生成失败，退回 ${creditCost} 个魔法币。`,
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
    console.error("【图像生成接口异常】:", error);

    return NextResponse.json(
      { error: "图像生成接口暂时出了点小状况，请稍后再试。" },
      { status: 500 },
    );
  }
}
