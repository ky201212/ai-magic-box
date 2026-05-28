import http from "node:http";
import https from "node:https";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAiSecret } from "@/lib/ai-secrets";
import { resolveAiModeConfig, resolveModeCreditPolicy } from "@/lib/ai-config";
import { addCredits, consumeCredits } from "@/lib/credits";

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

function parsePossibleJson(rawText: string) {
  try {
    return JSON.parse(rawText) as ChatCompletionResponse;
  } catch {
    return null;
  }
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

export async function POST(request: Request) {
  let shouldCharge = false;
  let creditCost = 0;
  let remainingCredits: number | undefined;
  let chargedUserId: string | null = null;

  const refundCredits = async (message: string) => {
    if (!shouldCharge || !chargedUserId || creditCost <= 0) {
      return remainingCredits;
    }

    remainingCredits = await addCredits(chargedUserId, creditCost, {
      reasonCode: "prompt_optimize_refund",
      reasonLabel: "提示词优化失败退回",
      note: message,
    });

    chargedUserId = null;
    return remainingCredits;
  };

  try {
    const { text } = (await request.json()) as { text?: string };

    if (!text?.trim()) {
      return NextResponse.json(
        { error: "缺少需要优化的文本内容。" },
        { status: 400 },
      );
    }

    const aiConfig = await resolveAiModeConfig("promptOptimize");
    const apiKey = await getAiSecret(aiConfig.apiKeyEnv);
    const creditPolicy = resolveModeCreditPolicy(aiConfig.extraPayload);
    shouldCharge = creditPolicy.creditEnabled && creditPolicy.creditCost > 0;
    creditCost = creditPolicy.creditCost;

    if (!aiConfig.isEnabled) {
      return NextResponse.json(
        { error: "提示词优化功能正在维护中，请稍后再试。" },
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
          { error: "请先登录后再使用提示词优化功能。" },
          { status: 401 },
        );
      }

      const creditResult = await consumeCredits(currentUser.user_id, creditCost, {
        reasonCode: "prompt_optimize",
        reasonLabel: "提示词优化",
        note: `使用提示词优化功能，消耗 ${creditCost} 个魔法币。`,
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
                content: text,
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
                content: text,
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
      await refundCredits(`提示词优化失败，退回 ${creditCost} 个魔法币。`);

      return NextResponse.json(
        {
          error:
            upstreamData?.error?.message?.trim() ||
            upstreamText.trim() ||
            "提示词优化失败，请稍后再试。",
          remainingCredits,
        },
        { status: mapUpstreamStatusToGatewayStatus(upstreamResponse.status) },
      );
    }

    if (!upstreamData) {
      await refundCredits(`提示词优化失败，退回 ${creditCost} 个魔法币。`);

      return NextResponse.json(
        {
          error: "提示词优化接口返回了无效数据。",
          remainingCredits,
        },
        { status: 502 },
      );
    }

    const optimizedPrompt = extractGeneratedContent(upstreamData).trim();

    if (!optimizedPrompt) {
      await refundCredits(`提示词优化失败，退回 ${creditCost} 个魔法币。`);

      return NextResponse.json(
        {
          error: "优化模型没有返回可用内容。",
          remainingCredits,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      optimizedPrompt,
      remainingCredits,
    });
  } catch (error) {
    await refundCredits(`提示词优化失败，退回 ${creditCost} 个魔法币。`);
    console.error("【提示词优化失败】:", error);

    return NextResponse.json(
      { error: "提示词优化服务暂时不可用，请稍后再试。" },
      { status: 500 },
    );
  }
}
