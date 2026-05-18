import http from "node:http";
import https from "node:https";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { resolveAiModeConfig, resolveModeCreditPolicy } from "@/lib/ai-config";
import { addCredits, consumeCredits } from "@/lib/credits";
import { getAiSecret } from "@/lib/ai-secrets";

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?:
        | string
        | Array<{
            type?: string;
            text?: string;
          }>;
    };
    text?: string;
  }>;
  output_text?: string;
  output?: Array<{
    type?: string;
    role?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  error?: {
    message?: string;
  };
};

function requestUpstreamJson(input: {
  endpoint: string;
  apiKey: string;
  body: string;
  timeoutMs: number | null;
}) {
  const targetUrl = new URL(input.endpoint);
  const transport = targetUrl.protocol === "http:" ? http : https;

  return new Promise<{
    status: number;
    text: string;
  }>((resolve, reject) => {
    const request = transport.request(
      {
        protocol: targetUrl.protocol,
        hostname: targetUrl.hostname,
        port: targetUrl.port
          ? Number(targetUrl.port)
          : targetUrl.protocol === "http:"
            ? 80
            : 443,
        path: `${targetUrl.pathname}${targetUrl.search}`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(input.body),
          Authorization: `Bearer ${input.apiKey}`,
          Connection: "close",
        },
      },
      (response) => {
        const chunks: Buffer[] = [];

        response.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        response.on("end", () => {
          resolve({
            status: response.statusCode ?? 500,
            text: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );

    if (input.timeoutMs) {
      request.setTimeout(input.timeoutMs, () => {
        request.destroy(new Error("Upstream request timed out"));
      });
    }

    request.on("error", (error) => {
      reject(error);
    });

    request.write(input.body);
    request.end();
  });
}

function shouldUseResponsesApi(endpointUrl: string, model: string) {
  const normalizedEndpoint = endpointUrl.trim().toLowerCase();
  const normalizedModel = model.trim().toLowerCase();

  return (
    normalizedEndpoint.includes("qlcodeapi.com") ||
    normalizedModel.startsWith("gpt-5")
  );
}

function resolveGenerationEndpoint(endpointUrl: string, useResponsesApi: boolean) {
  const trimmedEndpoint = endpointUrl.trim();
  const normalizedEndpoint = trimmedEndpoint.toLowerCase();

  if (useResponsesApi && normalizedEndpoint.endsWith("/responses")) {
    return trimmedEndpoint;
  }

  if (!useResponsesApi && normalizedEndpoint.endsWith("/chat/completions")) {
    return trimmedEndpoint;
  }

  if (normalizedEndpoint.endsWith("/v1")) {
    return useResponsesApi
      ? `${trimmedEndpoint}/responses`
      : `${trimmedEndpoint}/chat/completions`;
  }

  if (normalizedEndpoint.endsWith("/v1/")) {
    return useResponsesApi
      ? `${trimmedEndpoint}responses`
      : `${trimmedEndpoint}chat/completions`;
  }

  return trimmedEndpoint;
}

function extractMessageContent(
  content:
    | string
    | Array<{
        type?: string;
        text?: string;
      }>
    | undefined,
) {
  if (typeof content === "string") {
    return content.trim();
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .join("")
    .trim();
}

function extractGeneratedContent(data: ChatCompletionResponse) {
  const choice = data.choices?.[0];
  const responseOutputText =
    data.output
      ?.flatMap((item) => item.content ?? [])
      .map((part) => (typeof part?.text === "string" ? part.text : ""))
      .join("")
      .trim() ?? "";

  return (
    responseOutputText ||
    extractMessageContent(choice?.message?.content) ||
    choice?.text?.trim() ||
    data.output_text?.trim() ||
    ""
  );
}

function sanitizeGeneratedContent(rawText: string) {
  const trimmedText = rawText.trim();
  const fencedMatch = trimmedText.match(
    /^```(?:html|htm|xml)?\s*([\s\S]*?)\s*```$/i,
  );

  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  return trimmedText;
}

function parsePossibleJson(rawText: string) {
  try {
    return JSON.parse(rawText) as ChatCompletionResponse;
  } catch {
    return null;
  }
}

function looksLikeHtml(rawText: string) {
  const trimmedText = rawText.trim().toLowerCase();

  return trimmedText.startsWith("<!doctype html") || trimmedText.startsWith("<html");
}

function buildNonJsonResponseMessage(configuredEndpoint: string) {
  return `模型接口返回的不是 JSON，而像是网页内容。请检查后台 AI 配置里的接口地址。当前填写的是 ${configuredEndpoint}。如果你填的是 OpenAI 兼容基地址 /v1，系统现在会自动补到 /v1/chat/completions；如果对方平台不是这个协议，就需要改成它真正的接口地址。`;
}

function mapUpstreamStatusToGatewayStatus(status: number) {
  if (status === 401 || status === 403) {
    return 502;
  }

  if (status >= 500) {
    return 502;
  }

  return status;
}

function resolveAiRequestTimeoutMs() {
  const rawValue = process.env.AI_REQUEST_TIMEOUT_MS;
  const parsedValue = Number(rawValue);

  if (!Number.isFinite(parsedValue) || parsedValue < 10_000) {
    return null;
  }

  return Math.floor(parsedValue);
}

function isAiUpstreamTimeoutError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const normalizedName = error.name.toLowerCase();
  const normalizedMessage = error.message.toLowerCase();

  return (
    normalizedName.includes("timeout") ||
    normalizedName.includes("abort") ||
    normalizedMessage.includes("timeout") ||
    normalizedMessage.includes("timed out") ||
    normalizedMessage.includes("aborted")
  );
}

export async function POST(request: Request) {
  let shouldCharge = false;
  let creditCost = 0;
  let resolvedMode: "coding" | "writing" = "coding";
  let remainingCredits: number | undefined;
  let chargedUserId: string | null = null;

  const refundCredits = async (message: string) => {
    if (!shouldCharge || !chargedUserId || creditCost <= 0) {
      return remainingCredits;
    }

    remainingCredits = await addCredits(chargedUserId, creditCost, {
      reasonCode: resolvedMode === "writing" ? "writing_refund" : "coding_refund",
      reasonLabel: resolvedMode === "writing" ? "AI写作失败退回" : "AI编程失败退回",
      note: message,
    });

    chargedUserId = null;
    return remainingCredits;
  };

  try {
    const { prompt, mode } = (await request.json()) as {
      prompt?: string;
      mode?: "coding" | "writing";
    };

    if (!prompt?.trim()) {
      return NextResponse.json(
        { error: "缺少有效的 prompt 参数。" },
        { status: 400 },
      );
    }

    resolvedMode = mode === "writing" ? "writing" : "coding";
    const aiConfig = await resolveAiModeConfig(resolvedMode);
    const apiKey = await getAiSecret(aiConfig.apiKeyEnv);
    const creditPolicy = resolveModeCreditPolicy(aiConfig.extraPayload);
    shouldCharge = creditPolicy.creditEnabled && creditPolicy.creditCost > 0;
    creditCost = creditPolicy.creditCost;

    if (!aiConfig.isEnabled) {
      return NextResponse.json(
        { error: "这一项 AI 能力正在维护中，请稍后再试。" },
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
          { error: "请先登录后再使用这一项创作能力。" },
          { status: 401 },
        );
      }

      const creditResult = await consumeCredits(currentUser.user_id, creditCost, {
        reasonCode: resolvedMode === "writing" ? "writing_generate" : "coding_generate",
        reasonLabel: resolvedMode === "writing" ? "AI写作创作" : "AI编程生成",
        note:
          resolvedMode === "writing"
            ? `使用 AI 写作功能，消耗 ${creditCost} 个魔法币。`
            : `使用 AI 编程功能，消耗 ${creditCost} 个魔法币。`,
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

    const useResponsesApi = shouldUseResponsesApi(
      aiConfig.endpointUrl,
      aiConfig.model,
    );
    const requestEndpoint = resolveGenerationEndpoint(
      aiConfig.endpointUrl,
      useResponsesApi,
    );
    const requestTimeoutMs = resolveAiRequestTimeoutMs();
    const upstreamPayload = JSON.stringify(
      useResponsesApi
        ? {
            model: aiConfig.model,
            ...(typeof aiConfig.extraPayload.reasoningEffort === "string"
              ? {
                  reasoning: {
                    effort: aiConfig.extraPayload.reasoningEffort,
                  },
                }
              : {}),
            ...(typeof aiConfig.extraPayload.maxCompletionTokens === "number"
              ? {
                  max_output_tokens: aiConfig.extraPayload.maxCompletionTokens,
                }
              : {}),
            input: [
              {
                role: "system",
                content: aiConfig.systemPrompt,
              },
              {
                role: "user",
                content: prompt,
              },
            ],
          }
        : {
            model: aiConfig.model,
            ...(typeof aiConfig.extraPayload.maxCompletionTokens === "number"
              ? {
                  max_tokens: aiConfig.extraPayload.maxCompletionTokens,
                }
              : {}),
            messages: [
              {
                role: "system",
                content: aiConfig.systemPrompt,
              },
              {
                role: "user",
                content: prompt,
              },
            ],
          },
    );
    const upstreamResponse = await requestUpstreamJson({
      endpoint: requestEndpoint,
      apiKey,
      body: upstreamPayload,
      timeoutMs: requestTimeoutMs,
    });

    const upstreamText = upstreamResponse.text;
    const upstreamData = parsePossibleJson(upstreamText);

    if (upstreamResponse.status < 200 || upstreamResponse.status >= 300) {
      console.error("【AI 上游接口报错】:", {
        status: upstreamResponse.status,
        endpoint: requestEndpoint,
        body: upstreamText,
      });

      await refundCredits(
        resolvedMode === "writing"
          ? `AI 写作生成失败，退回 ${creditCost} 个魔法币。`
          : `AI 编程生成失败，退回 ${creditCost} 个魔法币。`,
      );

      const upstreamErrorMessage =
        upstreamData?.error?.message ||
        (looksLikeHtml(upstreamText)
          ? buildNonJsonResponseMessage(aiConfig.endpointUrl)
          : upstreamText.trim()) ||
        "上游大模型接口请求失败，请稍后再试。";

      return NextResponse.json(
        {
          error: upstreamErrorMessage,
          remainingCredits,
        },
        { status: mapUpstreamStatusToGatewayStatus(upstreamResponse.status) },
      );
    }

    if (!upstreamData) {
      console.error("【AI 上游接口返回非 JSON】:", {
        endpoint: requestEndpoint,
        body: upstreamText,
      });

      await refundCredits(
        resolvedMode === "writing"
          ? `AI 写作未返回有效数据，退回 ${creditCost} 个魔法币。`
          : `AI 编程未返回有效数据，退回 ${creditCost} 个魔法币。`,
      );

      return NextResponse.json(
        {
          error: buildNonJsonResponseMessage(aiConfig.endpointUrl),
          remainingCredits,
        },
        { status: 502 },
      );
    }

    const generatedContent = sanitizeGeneratedContent(
      extractGeneratedContent(upstreamData),
    );

    if (!generatedContent) {
      await refundCredits(
        resolvedMode === "writing"
          ? `AI 写作未返回有效内容，退回 ${creditCost} 个魔法币。`
          : `AI 编程未返回有效内容，退回 ${creditCost} 个魔法币。`,
      );

      return NextResponse.json(
        { error: "模型没有返回可用的内容。", remainingCredits },
        { status: 502 },
      );
    }

    return NextResponse.json({
      code: generatedContent,
      remainingCredits,
    });
  } catch (error) {
    await refundCredits(
      resolvedMode === "writing"
        ? `AI 写作生成过程中发生异常，退回 ${creditCost} 个魔法币。`
        : `AI 编程生成过程中发生异常，退回 ${creditCost} 个魔法币。`,
    );

    console.error("【生成接口异常】:", error);
    const isTimeoutError = isAiUpstreamTimeoutError(error);

    return NextResponse.json(
      {
        error:
          isTimeoutError
            ? "服务器等待 AI 接口返回超时了。若本地能生成、线上部署后总是失败，通常是服务器到模型渠道的网络不通，或者 Nginx / CDN 在 AI 返回前先超时断开了。请优先检查服务器出网连通性，并把 /api/generate 的反向代理超时调大到 300 秒左右。"
            : "生成接口暂时出了点小状况。已经自动检查并退回本次失败消耗的魔法币，请稍后再试，或检查后台 AI 接口地址是否填写正确。",
        remainingCredits,
      },
      { status: isTimeoutError ? 504 : 500 },
    );
  }
}
