import { NextResponse } from "next/server";
import { addCredits, consumeCredits } from "@/lib/credits";
import { getCurrentUser } from "@/lib/auth";
import { resolveAiModeConfig, resolveModeCreditPolicy } from "@/lib/ai-config";
import { getAiSecret } from "@/lib/ai-secrets";

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
) {
  if (shouldUseOpenAiImagePayload(endpointUrl, model)) {
    return {
      model,
      prompt,
      size: imageSize,
      n: 1,
    };
  }

  return {
    model,
    prompt,
    image_size: imageSize,
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

  if (directUrl) {
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

  if (normalizedMessage.includes("invalid url")) {
    return `绘画接口地址无效。当前填写的是 ${endpointUrl}，请检查后台 AI 绘画配置。`;
  }

  return message || "图像生成接口请求失败，请稍后再试。";
}

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
    const apiKey = await getAiSecret(aiConfig.apiKeyEnv);
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

    const requestEndpoint = resolveImageRequestEndpoint(aiConfig.endpointUrl);
    const upstreamResponse = await fetch(requestEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        buildImageRequestBody(
          requestEndpoint,
          aiConfig.model,
          prompt,
          imageSize,
        ),
      ),
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
          error:
            buildImageErrorMessage(
              errorData,
              aiConfig.model,
              requestEndpoint,
            ) || "图像生成接口请求失败，请稍后再试。",
          remainingCredits,
        },
        { status: mapUpstreamStatusToGatewayStatus(upstreamResponse.status) },
      );
    }

    const data = (await upstreamResponse.json()) as SiliconFlowImageResponse;
    const imageUrl = extractImageUrl(data);

    if (!imageUrl) {
      if (shouldCharge && chargedUserId) {
        remainingCredits = await addCredits(chargedUserId, creditCost, {
          reasonCode: "painting_refund",
          reasonLabel: "AI绘画失败退回",
          note: `AI 绘画未返回有效图片，退回 ${creditCost} 个魔法币。`,
        });
      }

      return NextResponse.json(
        {
          error:
            "图像模型已经返回结果了，但没有带回可直接展示的图片地址或图片数据。",
          remainingCredits,
        },
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
