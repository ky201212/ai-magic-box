import { NextResponse } from "next/server";
import {
  requireAdminContext,
  requireAiSecretManagerPermission,
  requirePermission,
} from "@/lib/admin";
import { getAiSecret } from "@/lib/ai-secrets";

type OpenAiModelsResponse = {
  data?: Array<{
    id?: string;
    owned_by?: string;
  }>;
  error?: {
    message?: string;
    code?: string;
  };
};

function resolveModelsEndpoint(endpointUrl: string) {
  const trimmedEndpoint = endpointUrl.trim();
  const normalizedEndpoint = trimmedEndpoint.toLowerCase();

  if (!trimmedEndpoint) {
    return "";
  }

  if (normalizedEndpoint.endsWith("/models")) {
    return trimmedEndpoint;
  }

  if (normalizedEndpoint.endsWith("/chat/completions")) {
    return `${trimmedEndpoint.slice(0, -"/chat/completions".length)}/models`;
  }

  if (normalizedEndpoint.endsWith("/images/generations")) {
    return `${trimmedEndpoint.slice(0, -"/images/generations".length)}/models`;
  }

  if (normalizedEndpoint.endsWith("/audio/transcriptions")) {
    return `${trimmedEndpoint.slice(0, -"/audio/transcriptions".length)}/models`;
  }

  if (normalizedEndpoint.endsWith("/v1")) {
    return `${trimmedEndpoint}/models`;
  }

  if (normalizedEndpoint.endsWith("/v1/")) {
    return `${trimmedEndpoint}models`;
  }

  return trimmedEndpoint.startsWith("http://") || trimmedEndpoint.startsWith("https://")
    ? `${trimmedEndpoint.replace(/\/+$/, "")}/models`
    : "";
}

function toReadableError(message: string, modelsEndpoint: string) {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("api key") || normalizedMessage.includes("invalid_api_key")) {
    return "模型列表读取失败：当前密钥无效，或者这个密钥没有读取模型列表的权限。";
  }

  if (normalizedMessage.includes("404") || normalizedMessage.includes("not found")) {
    return `模型列表读取失败：这个渠道可能不支持标准 /models 接口。当前尝试地址是 ${modelsEndpoint}。`;
  }

  if (normalizedMessage.includes("forbidden") || normalizedMessage.includes("403")) {
    return "模型列表读取失败：当前密钥没有访问模型列表的权限。";
  }

  return message || "模型列表读取失败，请稍后再试。";
}

export async function POST(request: Request) {
  const { error, adminContext } = await requireAdminContext();

  if (error || !adminContext) {
    return error;
  }

  const permissionError = requirePermission(adminContext, "ai_configs");

  if (permissionError) {
    return permissionError;
  }

  const secretPermissionError = requireAiSecretManagerPermission(adminContext);

  if (secretPermissionError) {
    return secretPermissionError;
  }

  try {
    const body = (await request.json()) as {
      endpointUrl?: string;
      apiKeyEnv?: string;
    };

    if (!body.endpointUrl?.trim() || !body.apiKeyEnv?.trim()) {
      return NextResponse.json(
        { error: "缺少接口地址或密钥变量名。" },
        { status: 400 },
      );
    }

    const modelsEndpoint = resolveModelsEndpoint(body.endpointUrl);

    if (!modelsEndpoint) {
      return NextResponse.json(
        { error: "当前接口地址不是有效的绝对地址，暂时没法拉取模型列表。" },
        { status: 400 },
      );
    }

    const apiKey = await getAiSecret(body.apiKeyEnv.trim());

    if (!apiKey) {
      return NextResponse.json(
        { error: `当前没有找到 ${body.apiKeyEnv.trim()} 对应的可用密钥。` },
        { status: 400 },
      );
    }

    const upstreamResponse = await fetch(modelsEndpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const rawText = await upstreamResponse.text();

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        {
          error: toReadableError(rawText, modelsEndpoint),
        },
        { status: upstreamResponse.status === 401 || upstreamResponse.status === 403 ? 502 : upstreamResponse.status },
      );
    }

    let parsed: OpenAiModelsResponse | null = null;

    try {
      parsed = JSON.parse(rawText) as OpenAiModelsResponse;
    } catch {
      parsed = null;
    }

    const models = (parsed?.data ?? [])
      .map((item) => item.id?.trim())
      .filter((item): item is string => Boolean(item))
      .sort((left, right) => left.localeCompare(right));

    if (!models.length) {
      return NextResponse.json({
        models: [],
        modelsEndpoint,
        warning: "接口是通的，但没有返回可选模型列表。这个渠道可能不开放 /models，或者返回格式不是标准 OpenAI 兼容格式。",
      });
    }

    return NextResponse.json({
      models,
      modelsEndpoint,
    });
  } catch (requestError) {
    console.error("【后台模型列表拉取失败】:", requestError);

    return NextResponse.json(
      { error: "模型列表拉取失败，请稍后再试。" },
      { status: 500 },
    );
  }
}
