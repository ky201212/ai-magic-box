import http from "node:http";
import { randomUUID } from "node:crypto";
import https from "node:https";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getCodingModelChainStats,
  recordAiModelChainEvent,
  recordCodingModelChainEvent,
} from "@/lib/admin-data";
import { resolveAiModeConfig, resolveModeCreditPolicy } from "@/lib/ai-config";
import { addCredits, consumeCredits } from "@/lib/credits";
import { getAiSecret } from "@/lib/ai-secrets";
import {
  resolveAiModelChainCandidates,
  resolveAiModelChainPolicy,
  shouldContinueAiModelChain,
} from "@/lib/ai-model-chain";
import {
  readCodingGenerationTask,
  updateCodingGenerationTask,
  writeCodingGenerationTask,
  type CodingGenerationTaskRecord,
} from "@/lib/coding-generation-tasks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function createCodingTaskSuccessPayload(task: CodingGenerationTaskRecord) {
  return {
    taskId: task.id,
    status: "succeeded" as const,
    message: task.progressMessage ?? "作品已经生成完成。",
    partialCode: task.partialCode ?? "",
    code: task.code ?? buildCodingFallbackHtml(task.promptPreview),
    remainingCredits: task.remainingCredits,
    degraded: task.degraded ?? false,
    degradedReason: task.degradedReason,
    modelAttempts: task.modelAttempts ?? [],
  };
}

function createCodingTaskFailurePayload(task: CodingGenerationTaskRecord) {
  return {
    taskId: task.id,
    status: "succeeded" as const,
    message:
      task.progressMessage ?? "后台生成没有拿到完整结果，已自动切换到站内兜底生成。",
    partialCode: task.partialCode ?? "",
    code: buildCodingFallbackHtml(task.promptPreview),
    remainingCredits: task.remainingCredits,
    degraded: true,
    degradedReason:
      task.error ?? "后台生成没有拿到完整结果，已自动切换到站内兜底生成。",
    modelAttempts: task.modelAttempts ?? [],
  };
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const taskId = requestUrl.searchParams.get("taskId")?.trim();

  if (!taskId) {
    return NextResponse.json({ error: "缺少 taskId 参数。" }, { status: 400 });
  }

  const task = await readCodingGenerationTask(taskId);

  if (!task) {
    return NextResponse.json({ error: "没有找到对应的生成任务。" }, { status: 404 });
  }

  if (task.status === "succeeded" && task.code) {
    return NextResponse.json(createCodingTaskSuccessPayload(task));
  }

  if (task.status === "failed") {
    return NextResponse.json(createCodingTaskFailurePayload(task));
  }

  return NextResponse.json(
    {
      taskId,
      status: task.status,
      message: task.progressMessage ?? "作品还在生成中，请继续等待。",
      partialCode: task.partialCode ?? "",
      modelAttempts: task.modelAttempts ?? [],
    },
    { status: 202 },
  );
}

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

type GenerateTraceContext = {
  requestId: string;
  mode: "coding" | "writing";
  endpoint?: string;
  model?: string;
  timeoutMs?: number;
  useResponsesApi?: boolean;
  maxCompletionTokens?: number | null;
  promptPreview?: string;
};

type PartialCodePersistence = {
  taskId: string;
  latestPersistedAt: number;
};

type PreparedCodingPrompt = {
  prompt: string;
  shortened: boolean;
  originalLength: number;
  finalLength: number;
};

type GenerateRunResult =
  | {
      ok: true;
      code: string;
      partialCode?: string;
      streamSupport?: "supported" | "unsupported";
      remainingCredits?: number;
      degraded?: boolean;
      degradedReason?: string;
      modelAttempts?: ModelAttemptRecord[];
    }
  | {
      ok: false;
      status: number;
      error: string;
      partialCode?: string;
      streamSupport?: "supported" | "unsupported";
      remainingCredits?: number;
      modelAttempts?: ModelAttemptRecord[];
    };

type ModelAttemptRecord = {
  slot: "A" | "B" | "C";
  label: string;
  model: string;
  endpointUrl: string;
  result:
    | "success"
    | "failure"
    | "timeout"
    | "skipped_missing_key"
    | "stopped"
    | "cooldown_skipped";
  status?: number;
  message?: string;
};

type GenerateRunSuccess = Extract<GenerateRunResult, { ok: true }>;
type GenerateRunFailure = Extract<GenerateRunResult, { ok: false }>;

type CodingModelCandidate = {
  slot: "A" | "B" | "C";
  label: string;
  provider?: string;
  endpointUrl: string;
  apiKeyEnv: string;
  model: string;
  timeoutMs?: number;
};

type CodingModelChainPolicy = {
  switchOnTimeout: boolean;
  switchOnHttp5xx: boolean;
  switchOnHttp429: boolean;
  switchOnInvalidKey: boolean;
  switchOnEmptyContent: boolean;
  enableHealthOrdering: boolean;
  circuitBreakerThreshold: number;
  circuitBreakerCooldownMs: number;
};

function buildPromptPreview(input: string) {
  const normalized = input.replace(/\s+/g, " ").trim();
  return normalized.length > 120
    ? `${normalized.slice(0, 120)}...`
    : normalized;
}

function extractContentDeltaFromStreamChunk(rawLine: string) {
  const trimmed = rawLine.trim();

  if (!trimmed.startsWith("data:")) {
    return "";
  }

  const payload = trimmed.slice(5).trim();

  if (!payload || payload === "[DONE]") {
    return "";
  }

  try {
    const parsed = JSON.parse(payload) as {
      choices?: Array<{
        delta?: {
          content?:
            | string
            | Array<{
                type?: string;
                text?: string;
              }>;
        };
      }>;
      output?: Array<{
        content?: Array<{
          text?: string;
        }>;
      }>;
    };

    const deltaContent = parsed.choices?.[0]?.delta?.content;

    if (typeof deltaContent === "string") {
      return deltaContent;
    }

    if (Array.isArray(deltaContent)) {
      return deltaContent
        .map((item) => (typeof item?.text === "string" ? item.text : ""))
        .join("");
    }

    return (
      parsed.output
        ?.flatMap((item) => item.content ?? [])
        .map((item) => (typeof item?.text === "string" ? item.text : ""))
        .join("") ?? ""
    );
  } catch {
    return "";
  }
}

function resolveCodingModelCandidates(
  aiConfig: Awaited<ReturnType<typeof resolveAiModeConfig>>,
) {
  const baseCandidate: CodingModelCandidate = {
    slot: "A",
    label: "A 主模型",
    provider: aiConfig.extraPayload.providerLabel as string | undefined,
    endpointUrl: aiConfig.endpointUrl,
    apiKeyEnv: aiConfig.apiKeyEnv,
    model: aiConfig.model,
    timeoutMs:
      typeof aiConfig.extraPayload.singleModelTimeoutMs === "number"
        ? Math.max(10_000, Math.floor(aiConfig.extraPayload.singleModelTimeoutMs))
        : undefined,
  };
  const rawModelChain = aiConfig.extraPayload.modelChain;
  const extraCandidates: CodingModelCandidate[] = Array.isArray(rawModelChain)
    ? rawModelChain
        .map((item) => {
          if (!item || typeof item !== "object") {
            return null;
          }

          const rawEntry = item as Record<string, unknown>;
          const slot = rawEntry.slot;
          const endpointUrl =
            typeof rawEntry.endpointUrl === "string"
              ? rawEntry.endpointUrl.trim()
              : typeof rawEntry.endpoint_url === "string"
                ? rawEntry.endpoint_url.trim()
                : "";
          const apiKeyEnv =
            typeof rawEntry.apiKeyEnv === "string"
              ? rawEntry.apiKeyEnv.trim()
              : typeof rawEntry.api_key_env === "string"
                ? rawEntry.api_key_env.trim()
                : "";
          const model =
            typeof rawEntry.model === "string" ? rawEntry.model.trim() : "";
          const timeoutMs =
            typeof rawEntry.timeoutMs === "number" && Number.isFinite(rawEntry.timeoutMs)
              ? Math.max(10_000, Math.floor(rawEntry.timeoutMs))
              : undefined;

          if (
            (slot !== "B" && slot !== "C") ||
            !endpointUrl ||
            !apiKeyEnv ||
            !model
          ) {
            return null;
          }

          return {
            slot,
            label:
              typeof rawEntry.label === "string" && rawEntry.label.trim()
                ? rawEntry.label.trim()
                : `${slot} 备用模型`,
            provider:
              typeof rawEntry.provider === "string" && rawEntry.provider.trim()
                ? rawEntry.provider.trim()
                : undefined,
            endpointUrl,
            apiKeyEnv,
            model,
            timeoutMs,
          } satisfies CodingModelCandidate;
        })
        .filter((item) => item !== null)
    : [];
  const dedupedCandidates: CodingModelCandidate[] = [];
  const seenKeys = new Set<string>();

  for (const candidate of [baseCandidate, ...extraCandidates]) {
    const dedupeKey = [
      candidate.endpointUrl.trim().toLowerCase(),
      candidate.apiKeyEnv.trim().toLowerCase(),
      candidate.model.trim().toLowerCase(),
    ].join("::");

    if (seenKeys.has(dedupeKey)) {
      continue;
    }

    seenKeys.add(dedupeKey);
    dedupedCandidates.push(candidate);
  }

  return dedupedCandidates;
}

function resolveCodingModelChainPolicy(
  aiConfig: Awaited<ReturnType<typeof resolveAiModeConfig>>,
) {
  const rawPolicy = aiConfig.extraPayload.modelChainPolicy;

  if (!rawPolicy || typeof rawPolicy !== "object") {
    return {
      switchOnTimeout: true,
      switchOnHttp5xx: true,
      switchOnHttp429: true,
      switchOnInvalidKey: true,
      switchOnEmptyContent: true,
      enableHealthOrdering: true,
      circuitBreakerThreshold: 3,
      circuitBreakerCooldownMs: 5 * 60 * 1000,
    } satisfies CodingModelChainPolicy;
  }

  const policy = rawPolicy as Record<string, unknown>;

  return {
    switchOnTimeout: policy.switchOnTimeout !== false,
    switchOnHttp5xx: policy.switchOnHttp5xx !== false,
    switchOnHttp429: policy.switchOnHttp429 !== false,
    switchOnInvalidKey: policy.switchOnInvalidKey !== false,
    switchOnEmptyContent: policy.switchOnEmptyContent !== false,
    enableHealthOrdering: policy.enableHealthOrdering !== false,
    circuitBreakerThreshold:
      typeof policy.circuitBreakerThreshold === "number" &&
      Number.isFinite(policy.circuitBreakerThreshold)
        ? Math.max(1, Math.floor(policy.circuitBreakerThreshold))
        : 3,
    circuitBreakerCooldownMs:
      typeof policy.circuitBreakerCooldownMs === "number" &&
      Number.isFinite(policy.circuitBreakerCooldownMs)
        ? Math.max(60_000, Math.floor(policy.circuitBreakerCooldownMs))
        : 5 * 60 * 1000,
  } satisfies CodingModelChainPolicy;
}

function scoreCodingModelHealth(input: {
  successCount: number;
  failureCount: number;
  timeoutCount: number;
  consecutiveFailures: number;
  streamSupport?: "supported" | "unsupported" | "unknown";
  lastStatus?: string | null;
  lastError?: string | null;
  cooldownUntil?: string | null;
}) {
  const normalizedLastError = (input.lastError ?? "").toLowerCase();
  const normalizedLastStatus = (input.lastStatus ?? "").toLowerCase();
  const hasRecentConfigError = isLikelyConfigErrorMessage(normalizedLastError);
  const hasRecentHtmlError = isLikelyHtmlGatewayErrorMessage(normalizedLastError);
  const isCoolingDown =
    typeof input.cooldownUntil === "string" &&
    Number.isFinite(new Date(input.cooldownUntil).getTime()) &&
    new Date(input.cooldownUntil).getTime() > Date.now();

  return (
    (normalizedLastStatus === "success" ? 10 : 0) +
    (input.streamSupport === "supported"
      ? 6
      : input.streamSupport === "unsupported"
        ? -2
        : 0) +
    (hasRecentHtmlError ? -28 : 0) +
    (hasRecentConfigError ? -20 : 0) +
    (isCoolingDown ? -40 : 0) +
    input.successCount * 3 -
    input.failureCount * 2 -
    input.timeoutCount * 3 -
    input.consecutiveFailures * 4
  );
}

function isLikelyHtmlGatewayErrorMessage(errorMessage: string) {
  const normalizedError = errorMessage.toLowerCase();

  return (
    normalizedError.includes("不是 json") ||
    normalizedError.includes("网页内容") ||
    normalizedError.includes("html") ||
    normalizedError.includes("cloudflare") ||
    normalizedError.includes("access denied") ||
    normalizedError.includes("nginx") ||
    normalizedError.includes("接口地址")
  );
}

function isLikelyConfigErrorMessage(errorMessage: string) {
  const normalizedError = errorMessage.toLowerCase();

  return (
    isLikelyHtmlGatewayErrorMessage(normalizedError) ||
    normalizedError.includes("invalid api key") ||
    normalizedError.includes("invalid key") ||
    normalizedError.includes("密钥") ||
    normalizedError.includes("model not found") ||
    normalizedError.includes("does not exist") ||
    normalizedError.includes("invalid model") ||
    normalizedError.includes("unsupported") ||
    normalizedError.includes("not supported") ||
    normalizedError.includes("param incorrect")
  );
}

function resolveCodingAttemptCooldownUntil(input: {
  attemptResult: GenerateRunFailure;
  policy: CodingModelChainPolicy;
  existingConsecutiveFailures: number;
}) {
  if (isLikelyHtmlGatewayErrorMessage(input.attemptResult.error)) {
    return new Date(Date.now() + 30 * 60 * 1000).toISOString();
  }

  if (
    isLikelyConfigErrorMessage(input.attemptResult.error) ||
    input.attemptResult.status === 401 ||
    input.attemptResult.status === 403
  ) {
    return new Date(Date.now() + 20 * 60 * 1000).toISOString();
  }

  if (
    (input.attemptResult.status === 504 || input.attemptResult.status >= 500) &&
    input.existingConsecutiveFailures + 1 >= input.policy.circuitBreakerThreshold
  ) {
    return new Date(Date.now() + input.policy.circuitBreakerCooldownMs).toISOString();
  }

  return undefined;
}

function shouldContinueCodingModelChain(
  result: GenerateRunResult,
  policy: CodingModelChainPolicy,
) {
  if (result.ok) {
    return false;
  }

  const normalizedError = result.error.toLowerCase();

  if (result.status === 504) {
    return policy.switchOnTimeout;
  }

  if (result.status === 429) {
    return policy.switchOnHttp429;
  }

  if (result.status >= 500) {
    return policy.switchOnHttp5xx;
  }

  if (
    normalizedError.includes("invalid api key") ||
    normalizedError.includes("invalid key") ||
    normalizedError.includes("密钥")
  ) {
    return policy.switchOnInvalidKey;
  }

  if (
    normalizedError.includes("没有返回可用内容") ||
    normalizedError.includes("没有返回可用的内容") ||
    normalizedError.includes("模型没有返回可用内容")
  ) {
    return policy.switchOnEmptyContent;
  }

  if (
    normalizedError.includes("param incorrect") ||
    normalizedError.includes("max_tokens") ||
    normalizedError.includes("max_completion_tokens") ||
    normalizedError.includes("max_seq_len") ||
    normalizedError.includes("context length") ||
    normalizedError.includes("unsupported") ||
    normalizedError.includes("not supported") ||
    normalizedError.includes("model not found") ||
    normalizedError.includes("does not exist") ||
    normalizedError.includes("invalid model") ||
    normalizedError.includes("接口地址") ||
    normalizedError.includes("不是 json")
  ) {
    return true;
  }

  return false;
}

function buildCodingPromptForModel(rawPrompt: string): PreparedCodingPrompt {
  const trimmedPrompt = rawPrompt.trim();
  const normalizedPrompt = trimmedPrompt.replace(/\r/g, "");
  const originalLength = normalizedPrompt.length;
  const rawLines = normalizedPrompt
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (originalLength <= 1600 && rawLines.length <= 12) {
    return {
      prompt: trimmedPrompt,
      shortened: false,
      originalLength,
      finalLength: originalLength,
    };
  }

  const normalizedLines = rawLines
    .map((line) =>
      line
        .replace(/^[\d一二三四五六七八九十]+[、.)．]\s*/u, "")
        .replace(/^[-*•]\s*/u, "")
        .trim(),
    )
    .filter(Boolean);

  const dedupedLines: string[] = [];

  for (const line of normalizedLines) {
    const comparableLine = line.replace(/\s+/g, "");

    if (
      dedupedLines.some(
        (existingLine) =>
          existingLine.replace(/\s+/g, "") === comparableLine ||
          existingLine.includes(line) ||
          line.includes(existingLine),
      )
    ) {
      continue;
    }

    dedupedLines.push(line);

    if (dedupedLines.length >= 10) {
      break;
    }
  }

  const title = (dedupedLines[0] || rawLines[0] || "儿童互动科普小程序").slice(0, 80);
  const requirementLines = dedupedLines
    .slice(0, 8)
    .map((line, index) => `${index + 1}. ${line.slice(0, 120)}`)
    .join("\n");

  const shortenedPrompt = [
    `主题：${title}`,
    "请根据下面整理后的需求生成一个可直接运行的单文件 HTML 儿童互动作品：",
    requirementLines || "1. 内容要适合儿童，界面清晰，交互明确。",
    "输出要求：只返回完整 HTML；必须内含 CSS、JavaScript，并通过 CDN 引入 Tailwind CSS；不要解释，不要 Markdown。",
  ].join("\n");

  return {
    prompt: shortenedPrompt,
    shortened: true,
    originalLength,
    finalLength: shortenedPrompt.length,
  };
}

function traceGenerate(
  level: "log" | "warn" | "error",
  event: string,
  context: GenerateTraceContext,
  extra?: Record<string, unknown>,
) {
  console[level](
    JSON.stringify({
      ts: new Date().toISOString(),
      scope: "ai-generate",
      event,
      requestId: context.requestId,
      mode: context.mode,
      model: context.model ?? null,
      endpoint: context.endpoint ?? null,
      timeoutMs: context.timeoutMs ?? null,
      useResponsesApi: context.useResponsesApi ?? null,
      maxCompletionTokens: context.maxCompletionTokens ?? null,
      promptPreview: context.promptPreview ?? null,
      ...(extra ?? {}),
    }),
  );
}

async function startDeferredCodingGenerationTask(input: {
  taskId: string;
  requestPrompt: string;
  traceContext: GenerateTraceContext;
  run: () => Promise<GenerateRunResult>;
  refundCredits?: () => Promise<number | undefined>;
}) {
  try {
    await updateCodingGenerationTask(input.taskId, {
      status: "processing",
      startedAt: new Date().toISOString(),
      progressMessage: "任务已进入后台，正在连接模型。",
    });

    const result = await input.run();

    if (result.ok) {
      await updateCodingGenerationTask(input.taskId, {
        status: "succeeded",
        completedAt: new Date().toISOString(),
        partialCode: result.partialCode ?? result.code,
        code: result.code,
        remainingCredits: result.remainingCredits,
        degraded: result.degraded,
        degradedReason: result.degradedReason,
        modelAttempts: result.modelAttempts,
        progressMessage: result.degraded
          ? result.degradedReason ?? "后台已完成兜底生成。"
          : "作品已经生成完成。",
        httpStatus: 200,
      });

      traceGenerate("log", "deferred_task_succeeded", input.traceContext, {
        taskId: input.taskId,
        degraded: result.degraded ?? false,
      });

      return;
    }

    await updateCodingGenerationTask(input.taskId, {
      status: "succeeded",
      completedAt: new Date().toISOString(),
      partialCode: result.partialCode ?? "",
      code: buildCodingFallbackHtml(input.requestPrompt),
      error: result.error,
      remainingCredits: result.remainingCredits,
      degraded: true,
      degradedReason: result.error,
      modelAttempts: result.modelAttempts,
      progressMessage: result.error,
      httpStatus: 200,
    });

    traceGenerate("warn", "deferred_task_degraded_result", input.traceContext, {
      taskId: input.taskId,
      errorMessage: result.error,
      status: result.status,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    let refundedCredits: number | undefined;

    if (input.refundCredits) {
      refundedCredits = await input.refundCredits();
    }

    await updateCodingGenerationTask(input.taskId, {
      status: "succeeded",
      completedAt: new Date().toISOString(),
      partialCode:
        "partialCode" in (error as Record<string, unknown>)
          ? ((error as { partialCode?: string }).partialCode ?? "")
          : "",
      code: buildCodingFallbackHtml(input.requestPrompt),
      error: errorMessage,
      remainingCredits: refundedCredits,
      degraded: true,
      degradedReason: isAiUpstreamTimeoutError(error)
        ? "后台生成等待模型返回超时，已自动切换到站内兜底生成。"
        : "后台生成链路出现波动，已自动切换到站内兜底生成。",
      progressMessage: isAiUpstreamTimeoutError(error)
        ? "后台生成等待模型超时，已切到站内兜底。"
        : "后台生成链路出现波动，已切到站内兜底。",
      modelAttempts:
        "modelAttempts" in (error as Record<string, unknown>)
          ? ((error as { modelAttempts?: CodingGenerationTaskRecord["modelAttempts"] })
              .modelAttempts ?? [])
          : [],
      httpStatus: 200,
    });

    traceGenerate("error", "deferred_task_degraded_exception", input.traceContext, {
      taskId: input.taskId,
      errorMessage,
    });
  }
}

async function runCodingGenerateRequestWithModelChain(input: {
  requestPrompt: string;
  upstreamPrompt: string;
  aiConfig: Awaited<ReturnType<typeof resolveAiModeConfig>>;
  remainingCredits?: number;
  traceContext: GenerateTraceContext;
  requestTimeoutMsOverride?: number;
  onPartialCode?: (partialCode: string) => Promise<void> | void;
  onTaskUpdate?: (
    patch: Partial<
      Pick<CodingGenerationTaskRecord, "progressMessage" | "modelAttempts" | "partialCode">
    >,
  ) => Promise<void> | void;
}) {
  const policy = resolveCodingModelChainPolicy(input.aiConfig);
  const modelStats = await getCodingModelChainStats().catch(() => null);
  let candidates = resolveCodingModelCandidates(input.aiConfig);
  let lastFailure: GenerateRunFailure | null = null;
  const modelAttempts: ModelAttemptRecord[] = [];

  if (policy.enableHealthOrdering && modelStats?.models?.length) {
    const statsBySlot = new Map(modelStats.models.map((item) => [item.slot, item]));
    candidates = [...candidates].sort((left, right) => {
      const leftStats = statsBySlot.get(left.slot);
      const rightStats = statsBySlot.get(right.slot);
      const leftScore = leftStats
        ? scoreCodingModelHealth(leftStats)
        : left.slot === "A"
          ? 1
          : 0;
      const rightScore = rightStats
        ? scoreCodingModelHealth(rightStats)
        : right.slot === "A"
          ? 1
          : 0;

      if (leftScore === rightScore) {
        return left.slot.localeCompare(right.slot);
      }

      return rightScore - leftScore;
    });
  }

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    const startedAt = Date.now();
    const stats = modelStats?.models.find((item) => item.slot === candidate.slot);
    const cooldownUntilTime =
      stats?.cooldownUntil ? new Date(stats.cooldownUntil).getTime() : null;

    if (cooldownUntilTime && cooldownUntilTime > Date.now()) {
      modelAttempts.push({
        slot: candidate.slot,
        label: candidate.label,
        model: candidate.model,
        endpointUrl: candidate.endpointUrl,
        result: "cooldown_skipped",
        status: 503,
        message: `熔断中，冷却截止到 ${stats?.cooldownUntil ?? ""}`,
      });
      lastFailure = {
        ok: false,
        status: 503,
        error: `${candidate.label} 正在熔断冷却中，已自动跳过。`,
        remainingCredits: input.remainingCredits,
        modelAttempts: [...modelAttempts],
      } satisfies GenerateRunFailure;

      await recordCodingModelChainEvent({
        slot: candidate.slot,
        label: candidate.label,
        provider: candidate.provider,
        model: candidate.model,
        endpointUrl: candidate.endpointUrl,
        event: "stopped",
        status: 503,
        message: `熔断中，冷却截止到 ${stats?.cooldownUntil ?? ""}`,
        cooldownUntil: stats?.cooldownUntil ?? null,
      });
      await input.onTaskUpdate?.({
        progressMessage: `${candidate.label} 正在冷却中，准备尝试下一条模型线路。`,
        modelAttempts: [...modelAttempts],
      });
      continue;
    }

    const candidateTraceContext: GenerateTraceContext = {
      ...input.traceContext,
      endpoint: candidate.endpointUrl,
      model: candidate.model,
      timeoutMs:
        candidate.timeoutMs ??
        input.requestTimeoutMsOverride ??
        input.traceContext.timeoutMs,
    };

    traceGenerate("log", "model_chain_attempt_started", candidateTraceContext, {
      slot: candidate.slot,
      candidateLabel: candidate.label,
      candidateProvider: candidate.provider ?? null,
      attempt: index + 1,
      totalAttempts: candidates.length,
      apiKeyEnv: candidate.apiKeyEnv,
    });
    await input.onTaskUpdate?.({
      progressMessage: `正在尝试 ${candidate.slot} 路模型：${candidate.label}。`,
      modelAttempts: [...modelAttempts],
    });

    const candidateApiKey = await getAiSecret(candidate.apiKeyEnv);

    if (!candidateApiKey) {
      modelAttempts.push({
        slot: candidate.slot,
        label: candidate.label,
        model: candidate.model,
        endpointUrl: candidate.endpointUrl,
        result: "skipped_missing_key",
        message: `缺少 ${candidate.apiKeyEnv} 密钥`,
      });
      lastFailure = {
        ok: false,
        status: 500,
        error: `${candidate.label} 缺少 ${candidate.apiKeyEnv} 密钥，已自动尝试下一条模型线路。`,
        remainingCredits: input.remainingCredits,
        modelAttempts: [...modelAttempts],
      } satisfies GenerateRunFailure;

      traceGenerate(
        "warn",
        "model_chain_attempt_skipped_missing_key",
        candidateTraceContext,
        {
          slot: candidate.slot,
          candidateLabel: candidate.label,
          apiKeyEnv: candidate.apiKeyEnv,
        },
      );
      await recordCodingModelChainEvent({
        slot: candidate.slot,
        label: candidate.label,
        provider: candidate.provider,
        model: candidate.model,
        endpointUrl: candidate.endpointUrl,
        event: "skipped_missing_key",
        message: `缺少 ${candidate.apiKeyEnv} 密钥`,
      });
      await input.onTaskUpdate?.({
        progressMessage: `${candidate.label} 缺少密钥，正在切换下一条模型线路。`,
        modelAttempts: [...modelAttempts],
      });
      continue;
    }

    const attemptResult = await runGenerateRequest({
      resolvedMode: "coding",
      requestPrompt: input.requestPrompt,
      upstreamPrompt: input.upstreamPrompt,
      aiConfig: {
        ...input.aiConfig,
        endpointUrl: candidate.endpointUrl,
        apiKeyEnv: candidate.apiKeyEnv,
        model: candidate.model,
      },
      apiKey: candidateApiKey,
      remainingCredits: input.remainingCredits,
      traceContext: candidateTraceContext,
      requestTimeoutMsOverride:
        candidate.timeoutMs ?? input.requestTimeoutMsOverride,
      allowCodingDegradedFallback: false,
      onPartialCode: input.onPartialCode,
    });

    if (attemptResult.ok) {
      modelAttempts.push({
        slot: candidate.slot,
        label: candidate.label,
        model: candidate.model,
        endpointUrl: candidate.endpointUrl,
        result: "success",
      });
      traceGenerate("log", "model_chain_attempt_succeeded", candidateTraceContext, {
        slot: candidate.slot,
        candidateLabel: candidate.label,
        attempt: index + 1,
        totalAttempts: candidates.length,
      });
      await recordCodingModelChainEvent({
        slot: candidate.slot,
        label: candidate.label,
        provider: candidate.provider,
        model: candidate.model,
        endpointUrl: candidate.endpointUrl,
        event: "success",
        streamSupport: attemptResult.streamSupport,
        latencyMs: Date.now() - startedAt,
      });
      await input.onTaskUpdate?.({
        progressMessage: `${candidate.label} 已返回结果，正在整理代码预览。`,
        modelAttempts: [...modelAttempts],
        partialCode: attemptResult.partialCode,
      });

      return {
        ...attemptResult,
        modelAttempts: [...modelAttempts],
      } satisfies GenerateRunSuccess;
    }

    modelAttempts.push({
      slot: candidate.slot,
      label: candidate.label,
      model: candidate.model,
      endpointUrl: candidate.endpointUrl,
      result: attemptResult.status === 504 ? "timeout" : "failure",
      status: attemptResult.status,
      message: attemptResult.error,
    });
    lastFailure = attemptResult;
    traceGenerate("warn", "model_chain_attempt_failed", candidateTraceContext, {
      slot: candidate.slot,
      candidateLabel: candidate.label,
      attempt: index + 1,
      totalAttempts: candidates.length,
      status: attemptResult.status,
      errorMessage: attemptResult.error,
    });

    await recordCodingModelChainEvent({
      slot: candidate.slot,
      label: candidate.label,
      provider: candidate.provider,
      model: candidate.model,
      endpointUrl: candidate.endpointUrl,
      event: attemptResult.status === 504 ? "timeout" : "failure",
      streamSupport: attemptResult.streamSupport,
      status: attemptResult.status,
      latencyMs: Date.now() - startedAt,
      message: attemptResult.error,
      cooldownUntil: resolveCodingAttemptCooldownUntil({
        attemptResult,
        policy,
        existingConsecutiveFailures: stats?.consecutiveFailures ?? 0,
      }),
    });
    await input.onTaskUpdate?.({
      progressMessage:
        index < candidates.length - 1
          ? `${candidate.label} 暂时没有成功返回，正在切换下一条模型线路。`
          : `${candidate.label} 返回失败，正在准备兜底结果。`,
      modelAttempts: [...modelAttempts],
      partialCode: attemptResult.partialCode,
    });

    if (!shouldContinueCodingModelChain(attemptResult, policy)) {
      modelAttempts.push({
        slot: candidate.slot,
        label: candidate.label,
        model: candidate.model,
        endpointUrl: candidate.endpointUrl,
        result: "stopped",
        status: attemptResult.status,
        message: "当前错误类型不在自动切换规则里，已停止继续切换。",
      });
      await recordCodingModelChainEvent({
        slot: candidate.slot,
        label: candidate.label,
        provider: candidate.provider,
        model: candidate.model,
        endpointUrl: candidate.endpointUrl,
        event: "stopped",
        streamSupport: attemptResult.streamSupport,
        status: attemptResult.status,
        message: "当前错误类型不在自动切换规则里，已停止继续切换。",
      });
      await input.onTaskUpdate?.({
        progressMessage: "当前错误类型不适合继续切换模型，正在准备兜底结果。",
        modelAttempts: [...modelAttempts],
        partialCode: attemptResult.partialCode,
      });
      break;
    }
  }

  return (
    lastFailure ?? {
      ok: false,
      status: 502,
      error: "A、B、C 三条模型线路都没有成功返回结果。",
      remainingCredits: input.remainingCredits,
      modelAttempts: [...modelAttempts],
    }
  );
}

async function runTextGenerateRequestWithModelChain(input: {
  resolvedMode: "writing";
  requestPrompt: string;
  upstreamPrompt: string;
  aiConfig: Awaited<ReturnType<typeof resolveAiModeConfig>>;
  remainingCredits?: number;
  traceContext: GenerateTraceContext;
}) {
  const candidates = resolveAiModelChainCandidates({
    endpointUrl: input.aiConfig.endpointUrl,
    apiKeyEnv: input.aiConfig.apiKeyEnv,
    model: input.aiConfig.model,
    extraPayload: input.aiConfig.extraPayload,
    baseLabel: "A 主模型",
    provider: input.aiConfig.extraPayload.providerLabel as string | undefined,
  });
  const policy = resolveAiModelChainPolicy(input.aiConfig.extraPayload);
  let lastFailure: GenerateRunResult | null = null;

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    const startedAt = Date.now();
    const candidateTraceContext: GenerateTraceContext = {
      ...input.traceContext,
      endpoint: candidate.endpointUrl,
      model: candidate.model,
      timeoutMs: candidate.timeoutMs ?? input.traceContext.timeoutMs,
    };

    traceGenerate("log", "text_model_chain_attempt_started", candidateTraceContext, {
      slot: candidate.slot,
      candidateLabel: candidate.label,
      candidateProvider: candidate.provider ?? null,
      attempt: index + 1,
      totalAttempts: candidates.length,
      apiKeyEnv: candidate.apiKeyEnv,
    });

    const candidateApiKey = await getAiSecret(candidate.apiKeyEnv);

    if (!candidateApiKey) {
      lastFailure = {
        ok: false,
        status: 500,
        error: `${candidate.label} 缺少 ${candidate.apiKeyEnv} 密钥，已自动尝试下一条模型线路。`,
        remainingCredits: input.remainingCredits,
      } satisfies GenerateRunResult;

      await recordAiModelChainEvent({
        modeKey: input.resolvedMode,
        slot: candidate.slot,
        label: candidate.label,
        provider: candidate.provider,
        model: candidate.model,
        endpointUrl: candidate.endpointUrl,
        event: "skipped_missing_key",
        message: `缺少 ${candidate.apiKeyEnv} 密钥`,
      });

      if (!shouldContinueAiModelChain({ status: lastFailure.status, error: lastFailure.error }, policy)) {
        break;
      }

      continue;
    }

    const attemptResult = await runGenerateRequest({
      resolvedMode: input.resolvedMode,
      requestPrompt: input.requestPrompt,
      upstreamPrompt: input.upstreamPrompt,
      aiConfig: {
        ...input.aiConfig,
        endpointUrl: candidate.endpointUrl,
        apiKeyEnv: candidate.apiKeyEnv,
        model: candidate.model,
      },
      apiKey: candidateApiKey,
      remainingCredits: input.remainingCredits,
      traceContext: candidateTraceContext,
      requestTimeoutMsOverride: candidate.timeoutMs,
    });

    if (attemptResult.ok) {
      traceGenerate("log", "text_model_chain_attempt_succeeded", candidateTraceContext, {
        slot: candidate.slot,
        candidateLabel: candidate.label,
        attempt: index + 1,
        totalAttempts: candidates.length,
      });

      await recordAiModelChainEvent({
        modeKey: input.resolvedMode,
        slot: candidate.slot,
        label: candidate.label,
        provider: candidate.provider,
        model: candidate.model,
        endpointUrl: candidate.endpointUrl,
        event: "success",
        latencyMs: Date.now() - startedAt,
      });

      return attemptResult;
    }

    lastFailure = attemptResult;
    traceGenerate("warn", "text_model_chain_attempt_failed", candidateTraceContext, {
      slot: candidate.slot,
      candidateLabel: candidate.label,
      attempt: index + 1,
      totalAttempts: candidates.length,
      status: attemptResult.status,
      errorMessage: attemptResult.error,
    });

    await recordAiModelChainEvent({
      modeKey: input.resolvedMode,
      slot: candidate.slot,
      label: candidate.label,
      provider: candidate.provider,
      model: candidate.model,
      endpointUrl: candidate.endpointUrl,
      event: attemptResult.status === 504 ? "timeout" : "failure",
      status: attemptResult.status,
      latencyMs: Date.now() - startedAt,
      message: attemptResult.error,
    });

    if (!shouldContinueAiModelChain({ status: attemptResult.status, error: attemptResult.error }, policy)) {
      await recordAiModelChainEvent({
        modeKey: input.resolvedMode,
        slot: candidate.slot,
        label: candidate.label,
        provider: candidate.provider,
        model: candidate.model,
        endpointUrl: candidate.endpointUrl,
        event: "stopped",
        status: attemptResult.status,
        message: "当前错误类型不在自动切换规则里，已停止继续切换。",
      });
      break;
    }
  }

  return (
    lastFailure ?? {
      ok: false,
      status: 502,
      error: "A、B、C 三条模型线路都没有成功返回结果。",
      remainingCredits: input.remainingCredits,
    }
  );
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildCodingFallbackHtml(prompt: string) {
  const normalizedPrompt = prompt.trim();
  const safePrompt = escapeHtml(normalizedPrompt || "儿童互动科普小程序");
  const loweredPrompt = normalizedPrompt.toLowerCase();

  const theme = loweredPrompt.includes("恐龙")
    ? {
        badge: "恐龙探险模式",
        title: "恐龙探险队",
        subtitle: "穿越到远古世界，边玩边学恐龙百科",
        primary: "#4f46e5",
        accent: "#22c55e",
        glow: "rgba(79,70,229,0.22)",
        gradient: "linear-gradient(135deg,#eef2ff 0%,#ecfeff 45%,#f0fdf4 100%)",
        facts: [
          "霸王龙虽然很厉害，但前肢其实很短。",
          "三角龙头上的角可能用来保护自己。",
          "许多恐龙名字都和它们的外形特点有关。",
        ],
        missions: [
          "找到食草恐龙和食肉恐龙的不同。",
          "点击按钮查看恐龙生活的时代。",
          "完成问答，拿到探险徽章。",
        ],
        quiz: {
          question: "下面哪一种更可能是食草恐龙？",
          options: ["三角龙", "霸王龙", "迅猛龙"],
          answer: 0,
        },
      }
    : loweredPrompt.includes("汽车")
      ? {
          badge: "汽车动力模式",
          title: "汽车动力站",
          subtitle: "把汽车知识变成孩子看得懂、玩得动的小课堂",
          primary: "#2563eb",
          accent: "#f59e0b",
          glow: "rgba(37,99,235,0.2)",
          gradient: "linear-gradient(135deg,#eff6ff 0%,#fff7ed 44%,#fefce8 100%)",
          facts: [
            "发动机像汽车的心脏，给汽车提供动力。",
            "轮胎和地面的摩擦力能帮助汽车前进。",
            "系好安全带是上车后非常重要的一步。",
          ],
          missions: [
            "启动发动机，看看动力值变化。",
            "学习车轮为什么会转动。",
            "完成安全出行小问答。",
          ],
          quiz: {
            question: "坐车时最先要做的安全动作是什么？",
            options: ["打开车窗", "系好安全带", "按喇叭"],
            answer: 1,
          },
        }
      : loweredPrompt.includes("太空") || loweredPrompt.includes("火箭")
        ? {
            badge: "太空任务模式",
            title: "太空任务局",
            subtitle: "和小宇航员一起倒计时发射，探索星球秘密",
            primary: "#7c3aed",
            accent: "#06b6d4",
            glow: "rgba(124,58,237,0.22)",
            gradient: "linear-gradient(135deg,#f5f3ff 0%,#eff6ff 45%,#ecfeff 100%)",
            facts: [
              "火箭升空时需要很大的推力来克服地球引力。",
              "月球表面有很多陨石坑。",
              "宇航员在太空中会感受到失重。",
            ],
            missions: [
              "启动发射倒计时，感受任务节奏。",
              "阅读星球档案，认识不同天体。",
              "完成问答，领取宇航勋章。",
            ],
            quiz: {
              question: "宇航员在太空里最特别的感受是什么？",
              options: ["更重", "失重", "不能呼吸颜色"],
              answer: 1,
            },
          }
        : {
            badge: "环保闯关模式",
            title: "环保小卫士",
            subtitle: "用小游戏和知识卡片，学习守护地球的小办法",
            primary: "#16a34a",
            accent: "#3b82f6",
            glow: "rgba(22,163,74,0.2)",
            gradient: "linear-gradient(135deg,#f0fdf4 0%,#eff6ff 45%,#fefce8 100%)",
            facts: [
              "垃圾分类能让很多资源再次被利用。",
              "随手关灯和节约用水，都是环保小行动。",
              "少用一次性用品，可以减少垃圾产生。",
            ],
            missions: [
              "认识可回收物、厨余垃圾和其他垃圾。",
              "点击学习节约用水小妙招。",
              "完成问答，点亮环保徽章。",
            ],
            quiz: {
              question: "喝完的塑料饮料瓶更适合放进哪一类？",
              options: ["可回收物", "厨余垃圾", "有害垃圾"],
              answer: 0,
            },
          };

  const factsHtml = theme.facts
    .map(
      (fact, index) => `
        <button class="fact-card" data-fact-index="${index}">
          <span class="fact-index">0${index + 1}</span>
          <span>${escapeHtml(fact)}</span>
        </button>`,
    )
    .join("");
  const missionsHtml = theme.missions
    .map(
      (mission, index) => `
        <li class="mission-item">
          <span class="mission-dot">${index + 1}</span>
          <span>${escapeHtml(mission)}</span>
        </li>`,
    )
    .join("");
  const quizOptionsHtml = theme.quiz.options
    .map(
      (option, index) => `
        <button class="quiz-option" data-answer="${index}">
          ${escapeHtml(option)}
        </button>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      * { box-sizing: border-box; }
      html, body { margin: 0; width: 100%; min-height: 100vh; }
      body {
        font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
        background: ${theme.gradient};
        color: #1f2937;
      }
      .app-shell {
        min-height: 100vh;
        padding: 20px;
      }
      .glass-card {
        background: rgba(255,255,255,0.88);
        border: 1px solid rgba(255,255,255,0.7);
        box-shadow: 0 18px 50px ${theme.glow};
        backdrop-filter: blur(16px);
      }
      .fact-card, .quiz-option {
        width: 100%;
        border: none;
        text-align: left;
        cursor: pointer;
        transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
      }
      .fact-card:hover, .quiz-option:hover {
        transform: translateY(-2px);
      }
      .fact-card.active {
        outline: 2px solid ${theme.primary};
      }
      .fact-index {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 34px;
        height: 34px;
        border-radius: 999px;
        background: ${theme.primary};
        color: white;
        font-weight: 700;
        margin-right: 12px;
      }
      .mission-item {
        display: flex;
        gap: 12px;
        align-items: flex-start;
      }
      .mission-dot {
        width: 28px;
        height: 28px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: rgba(255,255,255,0.95);
        color: ${theme.primary};
        font-weight: 700;
        flex: 0 0 auto;
      }
      .meter-bar {
        height: 14px;
        border-radius: 999px;
        background: rgba(255,255,255,0.72);
        overflow: hidden;
      }
      .meter-fill {
        height: 100%;
        width: 18%;
        border-radius: inherit;
        background: linear-gradient(90deg, ${theme.primary}, ${theme.accent});
        transition: width .35s ease;
      }
      .launch-btn {
        background: linear-gradient(90deg, ${theme.primary}, ${theme.accent});
      }
      .quiz-option.correct {
        background: #dcfce7;
        color: #166534;
      }
      .quiz-option.wrong {
        background: #fee2e2;
        color: #b91c1c;
      }
    </style>
  </head>
  <body>
    <main class="app-shell">
      <section class="mx-auto flex min-h-[calc(100vh-40px)] w-full max-w-6xl flex-col gap-6 rounded-[32px] glass-card p-5 md:p-8">
        <header class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div class="min-w-0">
            <div class="inline-flex rounded-full bg-white/90 px-4 py-2 text-xs font-black tracking-[0.18em]" style="color:${theme.primary}">
              ${escapeHtml(theme.badge)}
            </div>
            <h1 class="mt-4 text-4xl font-black tracking-[-0.05em] text-slate-800 md:text-6xl">
              ${escapeHtml(theme.title)}
            </h1>
            <p class="mt-3 max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
              ${escapeHtml(theme.subtitle)}
            </p>
          </div>
          <div class="rounded-[28px] bg-white/92 px-5 py-4 shadow-[0_14px_34px_rgba(148,163,184,0.16)]">
            <p class="text-xs font-black tracking-[0.18em] text-slate-400">本次创作主题</p>
            <p class="mt-3 max-w-md text-sm leading-7 text-slate-600">${safePrompt}</p>
          </div>
        </header>

        <section class="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div class="space-y-6">
            <article class="rounded-[28px] bg-white/90 p-5 shadow-[0_16px_38px_rgba(148,163,184,0.12)]">
              <div class="flex items-center justify-between gap-4">
                <div>
                  <p class="text-sm font-black tracking-[0.16em] text-slate-400">知识能量条</p>
                  <h2 class="mt-2 text-2xl font-black text-slate-800">点击按钮，看看学习进度吧</h2>
                </div>
                <span id="meterLabel" class="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">18%</span>
              </div>
              <div class="mt-5 meter-bar">
                <div id="meterFill" class="meter-fill"></div>
              </div>
              <div class="mt-5 flex flex-wrap gap-3">
                <button id="launchButton" class="launch-btn rounded-full px-5 py-3 text-sm font-black text-white shadow-[0_12px_24px_rgba(59,130,246,0.22)]">
                  启动互动演示
                </button>
                <button id="resetButton" class="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600">
                  重新开始
                </button>
              </div>
            </article>

            <article class="rounded-[28px] bg-white/90 p-5 shadow-[0_16px_38px_rgba(148,163,184,0.12)]">
              <p class="text-sm font-black tracking-[0.16em] text-slate-400">知识卡片</p>
              <div class="mt-4 grid gap-3">
                ${factsHtml}
              </div>
              <div id="factDetail" class="mt-4 rounded-[22px] bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
                选择一张卡片，这里会出现更详细的小提示。
              </div>
            </article>
          </div>

          <div class="space-y-6">
            <article class="rounded-[28px] bg-white/90 p-5 shadow-[0_16px_38px_rgba(148,163,184,0.12)]">
              <p class="text-sm font-black tracking-[0.16em] text-slate-400">任务清单</p>
              <ul class="mt-4 space-y-4 text-sm leading-7 text-slate-600">
                ${missionsHtml}
              </ul>
            </article>

            <article class="rounded-[28px] bg-white/90 p-5 shadow-[0_16px_38px_rgba(148,163,184,0.12)]">
              <p class="text-sm font-black tracking-[0.16em] text-slate-400">互动问答</p>
              <h2 class="mt-2 text-2xl font-black text-slate-800">${escapeHtml(theme.quiz.question)}</h2>
              <div class="mt-4 grid gap-3">
                ${quizOptionsHtml}
              </div>
              <div id="quizFeedback" class="mt-4 rounded-[22px] bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
                选择一个答案，看看你是不是今天的知识小达人。
              </div>
            </article>
          </div>
        </section>
      </section>
    </main>
    <script>
      const factDetails = ${JSON.stringify(theme.facts)};
      const quizAnswer = ${theme.quiz.answer};
      const factButtons = Array.from(document.querySelectorAll(".fact-card"));
      const factDetail = document.getElementById("factDetail");
      const meterFill = document.getElementById("meterFill");
      const meterLabel = document.getElementById("meterLabel");
      const launchButton = document.getElementById("launchButton");
      const resetButton = document.getElementById("resetButton");
      const quizButtons = Array.from(document.querySelectorAll(".quiz-option"));
      const quizFeedback = document.getElementById("quizFeedback");

      let currentMeter = 18;

      const syncMeter = () => {
        meterFill.style.width = currentMeter + "%";
        meterLabel.textContent = currentMeter + "%";
      };

      factButtons.forEach((button, index) => {
        button.classList.add("rounded-[22px]", "bg-slate-50", "px-4", "py-4", "text-sm", "font-semibold", "text-slate-700");
        button.addEventListener("click", () => {
          factButtons.forEach((item) => item.classList.remove("active"));
          button.classList.add("active");
          factDetail.textContent = factDetails[index] + " 点亮这张卡片后，可以继续探索更多知识。";
        });
      });

      launchButton.addEventListener("click", () => {
        currentMeter = Math.min(100, currentMeter + 22);
        syncMeter();
        if (currentMeter >= 100) {
          quizFeedback.textContent = "太棒了，知识能量已经充满，你已经完成今天的小小科学挑战。";
        }
      });

      resetButton.addEventListener("click", () => {
        currentMeter = 18;
        syncMeter();
        quizButtons.forEach((button) => button.classList.remove("correct", "wrong"));
        quizFeedback.textContent = "选择一个答案，看看你是不是今天的知识小达人。";
        factButtons.forEach((button) => button.classList.remove("active"));
        factDetail.textContent = "选择一张卡片，这里会出现更详细的小提示。";
      });

      quizButtons.forEach((button, index) => {
        button.classList.add("rounded-[20px]", "border", "border-slate-200", "bg-white", "px-4", "py-4", "text-sm", "font-bold", "text-slate-700", "shadow-[0_8px_22px_rgba(148,163,184,0.08)]");
        button.addEventListener("click", () => {
          quizButtons.forEach((item) => item.classList.remove("correct", "wrong"));
          if (index === quizAnswer) {
            button.classList.add("correct");
            quizFeedback.textContent = "回答正确，恭喜你解锁了今天的知识勋章。";
            currentMeter = Math.min(100, currentMeter + 18);
            syncMeter();
          } else {
            button.classList.add("wrong");
            quizFeedback.textContent = "这次差一点点，再想想提示卡片里的内容。";
          }
        });
      });

      syncMeter();
    </script>
  </body>
</html>`;
}

function requestUpstreamJson(input: {
  endpoint: string;
  apiKey: string;
  body: string;
  timeoutMs: number | null;
  onDelta?: (delta: string) => void;
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
          ...(input.onDelta ? { Accept: "text/event-stream" } : {}),
        },
      },
      (response) => {
        const chunks: Buffer[] = [];
        let streamBuffer = "";

        response.on("data", (chunk) => {
          const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          chunks.push(bufferChunk);

          if (!input.onDelta) {
            return;
          }

          streamBuffer += bufferChunk.toString("utf8");
          const lines = streamBuffer.split(/\r?\n/);
          streamBuffer = lines.pop() ?? "";

          for (const line of lines) {
            const delta = extractContentDeltaFromStreamChunk(line);

            if (delta) {
              input.onDelta(delta);
            }
          }
        });

        response.on("end", () => {
          if (input.onDelta && streamBuffer.trim()) {
            const delta = extractContentDeltaFromStreamChunk(streamBuffer);

            if (delta) {
              input.onDelta(delta);
            }
          }

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

  let normalizedText = fencedMatch?.[1]?.trim() ?? trimmedText;

  normalizedText = normalizedText
    .replace(/^\uFEFF/, "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<\|[^>]+?\|>/g, "")
    .trim();

  const wrappedByQuotes =
    (normalizedText.startsWith('"') && normalizedText.endsWith('"')) ||
    (normalizedText.startsWith("'") && normalizedText.endsWith("'"));
  const serializedEscapeCount =
    normalizedText.match(/\\(?:r|n|t|"|'|\\|u[0-9a-fA-F]{4})/g)?.length ?? 0;

  if (wrappedByQuotes || serializedEscapeCount >= 3) {
    normalizedText = normalizedText
      .replace(/^['"]|['"]$/g, "")
      .replace(/\\r\\n/g, "\n")
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\u003[cC]/g, "<")
      .replace(/\\u003[eE]/g, ">")
      .replace(/\\u0026/gi, "&")
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'")
      .replace(/\\\\/g, "\\")
      .trim();
  }

  const htmlStartIndex = normalizedText.search(/<!doctype html|<html\b/i);

  if (htmlStartIndex > 0) {
    normalizedText = normalizedText.slice(htmlStartIndex).trim();
  }

  return normalizedText;
}

function buildRecoveredStreamingCode(rawText: string) {
  const normalizedText = sanitizeGeneratedContent(rawText);

  if (!normalizedText || normalizedText.length < 200) {
    return null;
  }

  const loweredText = normalizedText.toLowerCase();
  const looksLikeStructuredHtml =
    loweredText.includes("<!doctype html") ||
    loweredText.includes("<html") ||
    loweredText.includes("<body") ||
    loweredText.includes("<main") ||
    loweredText.includes("<script") ||
    loweredText.includes("<style");

  if (!looksLikeStructuredHtml) {
    return null;
  }

  if (loweredText.includes("<!doctype html") || loweredText.includes("<html")) {
    return normalizedText;
  }

  return `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body>
${normalizedText}
  </body>
</html>`;
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

function buildNonJsonResponseMessage(
  configuredEndpoint: string,
  requestEndpoint?: string,
) {
  const normalizedConfiguredEndpoint = configuredEndpoint.trim().toLowerCase();
  const normalizedRequestEndpoint = requestEndpoint?.trim().toLowerCase() ?? "";
  const endpointAlreadyLooksComplete =
    normalizedConfiguredEndpoint.endsWith("/chat/completions") ||
    normalizedConfiguredEndpoint.endsWith("/responses") ||
    normalizedRequestEndpoint.endsWith("/chat/completions") ||
    normalizedRequestEndpoint.endsWith("/responses");

  if (endpointAlreadyLooksComplete) {
    return `模型接口返回的不是 JSON，而像是网页内容。当前请求地址是 ${requestEndpoint ?? configuredEndpoint}。这通常不是普通的生成失败，而是上游网关、风控页、CDN 拦截页或错误网页返回。请优先检查这条模型线路在服务器环境里是否真的能直连，并确认提供方要求的真实协议、鉴权和域名没有被中间层改写。`;
  }

  return `模型接口返回的不是 JSON，而像是网页内容。请检查后台 AI 配置里的接口地址。当前填写的是 ${configuredEndpoint}，实际请求地址是 ${requestEndpoint ?? configuredEndpoint}。如果你填的是 OpenAI 兼容基地址 /v1，系统现在会自动补到 /v1/chat/completions；如果对方平台不是这个协议，就需要改成它真正的接口地址。`;
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

function resolveAiRequestTimeoutMs(mode: "coding" | "writing") {
  const rawValue = process.env.AI_REQUEST_TIMEOUT_MS;
  const parsedValue = Number(rawValue);
  const defaultTimeoutMs = mode === "coding" ? 45_000 : 240_000;
  const maxTimeoutMs = mode === "coding" ? 55_000 : 240_000;

  if (!Number.isFinite(parsedValue) || parsedValue < 10_000) {
    return defaultTimeoutMs;
  }

  return Math.min(maxTimeoutMs, Math.max(10_000, Math.floor(parsedValue)));
}

function resolveDeferredAiRequestTimeoutMs(mode: "coding" | "writing") {
  const rawValue = process.env.AI_DEFERRED_REQUEST_TIMEOUT_MS;
  const parsedValue = Number(rawValue);
  const defaultTimeoutMs = mode === "coding" ? 180_000 : 240_000;
  const maxTimeoutMs = mode === "coding" ? 240_000 : 300_000;

  if (!Number.isFinite(parsedValue) || parsedValue < 10_000) {
    return defaultTimeoutMs;
  }

  return Math.min(maxTimeoutMs, Math.max(10_000, Math.floor(parsedValue)));
}

function resolveSafeMaxCompletionTokens(
  mode: "coding" | "writing",
  rawValue: unknown,
) {
  const fallbackValue = mode === "coding" ? 1400 : 800;
  const hardCap = mode === "coding" ? 12000 : 4000;

  if (typeof rawValue !== "number" || !Number.isFinite(rawValue)) {
    return fallbackValue;
  }

  const normalizedValue = Math.max(1, Math.floor(rawValue));
  return Math.min(normalizedValue, hardCap);
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

function shouldRetryUpstreamAttempt(status: number, text: string) {
  if (status === 408 || status === 425 || status === 429) {
    return true;
  }

  if (status >= 500) {
    return true;
  }

  const normalizedText = text.trim().toLowerCase();
  return (
    normalizedText.includes("timeout") ||
    normalizedText.includes("timed out") ||
    normalizedText.includes("gateway") ||
    normalizedText.includes("upstream")
  );
}

async function waitBeforeRetry(delayMs: number) {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

async function requestUpstreamJsonWithRetry(input: {
  endpoint: string;
  apiKey: string;
  body: string;
  timeoutMs: number;
  retries: number;
  onDelta?: (delta: string) => void;
}) {
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= input.retries; attempt += 1) {
    try {
      const response = await requestUpstreamJson({
        endpoint: input.endpoint,
        apiKey: input.apiKey,
        body: input.body,
        timeoutMs: input.timeoutMs,
        onDelta: input.onDelta,
      });

      if (
        attempt < input.retries &&
        shouldRetryUpstreamAttempt(response.status, response.text)
      ) {
        await waitBeforeRetry(1200 * (attempt + 1));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;

      if (attempt >= input.retries || !isAiUpstreamTimeoutError(error)) {
        throw error;
      }

      await waitBeforeRetry(1200 * (attempt + 1));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Upstream request failed");
}

async function runGenerateRequest(input: {
  resolvedMode: "coding" | "writing";
  requestPrompt: string;
  upstreamPrompt: string;
  aiConfig: Awaited<ReturnType<typeof resolveAiModeConfig>>;
  apiKey: string;
  remainingCredits?: number;
  traceContext: GenerateTraceContext;
  requestTimeoutMsOverride?: number;
  allowCodingDegradedFallback?: boolean;
  onPartialCode?: (partialCode: string) => Promise<void> | void;
}): Promise<GenerateRunResult> {
  const useResponsesApi = shouldUseResponsesApi(
    input.aiConfig.endpointUrl,
    input.aiConfig.model,
  );
  const requestEndpoint = resolveGenerationEndpoint(
    input.aiConfig.endpointUrl,
    useResponsesApi,
  );
  const requestTimeoutMs =
    input.requestTimeoutMsOverride ??
    resolveAiRequestTimeoutMs(input.resolvedMode);
  const effectiveMaxCompletionTokens = resolveSafeMaxCompletionTokens(
    input.resolvedMode,
    input.aiConfig.extraPayload.maxCompletionTokens,
  );
  const upstreamPayload = JSON.stringify(
    useResponsesApi
      ? {
          model: input.aiConfig.model,
          ...(typeof input.aiConfig.extraPayload.reasoningEffort === "string"
            ? {
                reasoning: {
                  effort: input.aiConfig.extraPayload.reasoningEffort,
                },
              }
            : {}),
          ...(input.resolvedMode === "coding" && input.onPartialCode
            ? { stream: true }
            : {}),
          max_output_tokens: effectiveMaxCompletionTokens,
          input: [
            {
              role: "system",
              content: input.aiConfig.systemPrompt,
            },
            {
              role: "user",
              content: input.upstreamPrompt,
            },
          ],
        }
      : {
          model: input.aiConfig.model,
          ...(input.resolvedMode === "coding" && input.onPartialCode
            ? { stream: true }
            : {}),
          max_tokens: effectiveMaxCompletionTokens,
          messages: [
            {
              role: "system",
              content: input.aiConfig.systemPrompt,
            },
            {
              role: "user",
              content: input.upstreamPrompt,
            },
          ],
        },
  );
  let upstreamResponse: Awaited<ReturnType<typeof requestUpstreamJsonWithRetry>>;
  let accumulatedPartialCode = "";
  let streamChunkCount = 0;
  let streamStartedAt = 0;
  let streamFirstDeltaAt = 0;

  try {
    upstreamResponse = await requestUpstreamJsonWithRetry({
      endpoint: requestEndpoint,
      apiKey: input.apiKey,
      body: upstreamPayload,
      timeoutMs: requestTimeoutMs,
      retries: input.resolvedMode === "coding" ? 2 : 1,
      onDelta:
        input.resolvedMode === "coding" && input.onPartialCode
          ? (delta) => {
              if (streamStartedAt === 0) {
                streamStartedAt = Date.now();
              }

              streamChunkCount += 1;
              accumulatedPartialCode += delta;

              if (streamFirstDeltaAt === 0) {
                streamFirstDeltaAt = Date.now();
                traceGenerate("log", "upstream_stream_first_delta", input.traceContext, {
                  chunkCount: streamChunkCount,
                  accumulatedChars: accumulatedPartialCode.length,
                  firstDeltaLatencyMs: streamFirstDeltaAt - streamStartedAt,
                });
              }

              void input.onPartialCode?.(accumulatedPartialCode);
            }
          : undefined,
    });
  } catch (error) {
    const isTimeoutError = isAiUpstreamTimeoutError(error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    traceGenerate("error", "upstream_request_exception", input.traceContext, {
      isTimeoutError,
      errorMessage,
    });

    return {
      ok: false,
      status: isTimeoutError ? 504 : 502,
      error: isTimeoutError
        ? "服务器等待 AI 接口返回超时了。"
        : "连接 AI 生成接口时发生异常，请稍后再试。",
      ...(input.resolvedMode === "coding" && input.onPartialCode
        ? {
            streamSupport: accumulatedPartialCode
              ? ("supported" as const)
              : ("unsupported" as const),
          }
        : {}),
      remainingCredits: input.remainingCredits,
      ...(accumulatedPartialCode
        ? { partialCode: accumulatedPartialCode }
        : {}),
    } satisfies GenerateRunResult;
  }

  traceGenerate("log", "upstream_response", input.traceContext, {
    upstreamStatus: upstreamResponse.status,
    responseBytes: upstreamResponse.text.length,
    streamEnabled: input.resolvedMode === "coding" && Boolean(input.onPartialCode),
    streamChunkCount,
    streamedChars: accumulatedPartialCode.length,
    firstDeltaLatencyMs:
      streamStartedAt !== 0 && streamFirstDeltaAt !== 0
        ? streamFirstDeltaAt - streamStartedAt
        : null,
  });

  const upstreamText = upstreamResponse.text;
  const upstreamData = parsePossibleJson(upstreamText);

  if (upstreamResponse.status < 200 || upstreamResponse.status >= 300) {
    traceGenerate("error", "upstream_error_status", input.traceContext, {
      upstreamStatus: upstreamResponse.status,
      upstreamBodyPreview:
        upstreamText.length > 500
          ? `${upstreamText.slice(0, 500)}...`
          : upstreamText,
    });

    const upstreamErrorMessage =
      upstreamData?.error?.message ||
      (looksLikeHtml(upstreamText)
        ? buildNonJsonResponseMessage(
            input.aiConfig.endpointUrl,
            requestEndpoint,
          )
        : upstreamText.trim()) ||
      "上游大模型接口请求失败，请稍后再试。";

    if (
      input.resolvedMode === "coding" &&
      input.allowCodingDegradedFallback === true
    ) {
      const recoveredCode = accumulatedPartialCode
        ? buildRecoveredStreamingCode(accumulatedPartialCode)
        : null;

      traceGenerate("warn", "coding_degraded_upstream_status", input.traceContext, {
        upstreamStatus: upstreamResponse.status,
        degradedReason: upstreamErrorMessage,
        recoveredFromPartialCode: Boolean(recoveredCode),
      });

      return {
        ok: true,
        code: recoveredCode ?? buildCodingFallbackHtml(input.requestPrompt),
        partialCode: accumulatedPartialCode,
        ...(input.resolvedMode === "coding" && input.onPartialCode
          ? {
              streamSupport: accumulatedPartialCode
                ? ("supported" as const)
                : ("unsupported" as const),
            }
          : {}),
        remainingCredits: input.remainingCredits,
        degraded: recoveredCode ? false : true,
        degradedReason: recoveredCode
          ? undefined
          : upstreamErrorMessage,
      } satisfies GenerateRunResult;
    }

    return {
      ok: false,
      status: mapUpstreamStatusToGatewayStatus(upstreamResponse.status),
      error: upstreamErrorMessage,
      ...(input.resolvedMode === "coding" && input.onPartialCode
        ? {
            streamSupport: accumulatedPartialCode
              ? ("supported" as const)
              : ("unsupported" as const),
          }
        : {}),
      remainingCredits: input.remainingCredits,
      ...(accumulatedPartialCode
        ? { partialCode: accumulatedPartialCode }
        : {}),
    } satisfies GenerateRunResult;
  }

  if (!upstreamData) {
    traceGenerate("error", "upstream_non_json", input.traceContext, {
      upstreamBodyPreview:
        upstreamText.length > 500
          ? `${upstreamText.slice(0, 500)}...`
          : upstreamText,
    });

    const nonJsonMessage = buildNonJsonResponseMessage(
      input.aiConfig.endpointUrl,
      requestEndpoint,
    );

    if (
      input.resolvedMode === "coding" &&
      input.allowCodingDegradedFallback === true
    ) {
      const recoveredCode = accumulatedPartialCode
        ? buildRecoveredStreamingCode(accumulatedPartialCode)
        : null;

      traceGenerate("warn", "coding_degraded_non_json", input.traceContext, {
        degradedReason: nonJsonMessage,
        recoveredFromPartialCode: Boolean(recoveredCode),
      });

      return {
        ok: true,
        code: recoveredCode ?? buildCodingFallbackHtml(input.requestPrompt),
        partialCode: accumulatedPartialCode,
        ...(input.resolvedMode === "coding" && input.onPartialCode
          ? {
              streamSupport: accumulatedPartialCode
                ? ("supported" as const)
                : ("unsupported" as const),
            }
          : {}),
        remainingCredits: input.remainingCredits,
        degraded: recoveredCode ? false : true,
        degradedReason: recoveredCode
          ? undefined
          : nonJsonMessage,
      } satisfies GenerateRunResult;
    }

    return {
      ok: false,
      status: 502,
      error: nonJsonMessage,
      ...(input.resolvedMode === "coding" && input.onPartialCode
        ? {
            streamSupport: accumulatedPartialCode
              ? ("supported" as const)
              : ("unsupported" as const),
          }
        : {}),
      remainingCredits: input.remainingCredits,
      ...(accumulatedPartialCode
        ? { partialCode: accumulatedPartialCode }
        : {}),
    } satisfies GenerateRunResult;
  }

  const generatedContent = sanitizeGeneratedContent(
    extractGeneratedContent(upstreamData),
  );

  if (!generatedContent) {
    if (
      input.resolvedMode === "coding" &&
      input.allowCodingDegradedFallback === true
    ) {
      const recoveredCode = accumulatedPartialCode
        ? buildRecoveredStreamingCode(accumulatedPartialCode)
        : null;

      traceGenerate("warn", "coding_degraded_empty_content", input.traceContext, {
        degradedReason: "模型没有返回可用内容。",
        recoveredFromPartialCode: Boolean(recoveredCode),
      });

      return {
        ok: true,
        code: recoveredCode ?? buildCodingFallbackHtml(input.requestPrompt),
        partialCode: accumulatedPartialCode,
        ...(input.resolvedMode === "coding" && input.onPartialCode
          ? {
              streamSupport: accumulatedPartialCode
                ? ("supported" as const)
                : ("unsupported" as const),
            }
          : {}),
        remainingCredits: input.remainingCredits,
        degraded: recoveredCode ? false : true,
        degradedReason: recoveredCode
          ? undefined
          : "模型没有返回可用内容。",
      } satisfies GenerateRunResult;
    }

    return {
      ok: false,
      status: 502,
      error: "模型没有返回可用的内容。",
      ...(input.resolvedMode === "coding" && input.onPartialCode
        ? {
            streamSupport: accumulatedPartialCode
              ? ("supported" as const)
              : ("unsupported" as const),
          }
        : {}),
      remainingCredits: input.remainingCredits,
      ...(accumulatedPartialCode
        ? { partialCode: accumulatedPartialCode }
        : {}),
    } satisfies GenerateRunResult;
  }

  traceGenerate("log", "request_succeeded", input.traceContext, {
    generatedBytes: generatedContent.length,
  });

  return {
    ok: true,
    code: generatedContent,
    partialCode: accumulatedPartialCode || generatedContent,
    ...(input.resolvedMode === "coding" && input.onPartialCode
      ? {
          streamSupport: accumulatedPartialCode
            ? ("supported" as const)
            : ("unsupported" as const),
        }
      : {}),
    remainingCredits: input.remainingCredits,
  } satisfies GenerateRunResult;
}

export async function POST(request: Request) {
  const requestId =
    request.headers.get("x-request-id")?.trim() || randomUUID();
  let shouldCharge = false;
  let creditCost = 0;
  let resolvedMode: "coding" | "writing" = "coding";
  let remainingCredits: number | undefined;
  let chargedUserId: string | null = null;
  let requestPrompt = "";
  let upstreamPrompt = "";
  let traceContext: GenerateTraceContext = {
    requestId,
    mode: "coding",
  };

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
    const { prompt, mode, taskId: existingTaskId } = (await request.json()) as {
      prompt?: string;
      mode?: "coding" | "writing";
      taskId?: string;
    };

    if (existingTaskId?.trim()) {
      const existingTask = await readCodingGenerationTask(existingTaskId.trim());

      if (!existingTask) {
        return NextResponse.json(
          { error: "没有找到对应的生成任务。", requestId },
          { status: 404 },
        );
      }

      if (existingTask.status === "succeeded" && existingTask.code) {
        const response = NextResponse.json({
          code: existingTask.code,
          partialCode: existingTask.partialCode ?? "",
          message: existingTask.progressMessage ?? "作品已经生成完成。",
          remainingCredits: existingTask.remainingCredits,
          degraded: existingTask.degraded ?? false,
          degradedReason: existingTask.degradedReason,
          modelAttempts: existingTask.modelAttempts ?? [],
          requestId,
          taskId: existingTask.id,
        });
        response.headers.set("x-ai-request-id", requestId);
        return response;
      }

      if (existingTask.status === "failed") {
        const response = NextResponse.json(
          {
            error: existingTask.error ?? "生成任务失败了，请稍后再试。",
            partialCode: existingTask.partialCode ?? "",
            message:
              existingTask.progressMessage ?? existingTask.error ?? "生成任务失败了，请稍后再试。",
            remainingCredits: existingTask.remainingCredits,
            requestId,
            taskId: existingTask.id,
          },
          {
            status:
              existingTask.httpStatus && existingTask.httpStatus >= 400
                ? existingTask.httpStatus
                : 500,
          },
        );
        response.headers.set("x-ai-request-id", requestId);
        return response;
      }

      const response = NextResponse.json(
        {
          message: existingTask.progressMessage ?? "作品还在生成中，请继续等待。",
          requestId,
          taskId: existingTask.id,
          status: existingTask.status,
          partialCode: existingTask.partialCode ?? "",
          modelAttempts: existingTask.modelAttempts ?? [],
        },
        { status: 202 },
      );
      response.headers.set("x-ai-request-id", requestId);
      return response;
    }

    if (!prompt?.trim()) {
      return NextResponse.json(
        { error: "缺少有效的 prompt 参数。" },
        { status: 400 },
      );
    }

    requestPrompt = prompt.trim();
    resolvedMode = mode === "writing" ? "writing" : "coding";
    upstreamPrompt =
      resolvedMode === "coding"
        ? buildCodingPromptForModel(requestPrompt).prompt
        : requestPrompt;
    const aiConfig = await resolveAiModeConfig(resolvedMode);
    const creditPolicy = resolveModeCreditPolicy(aiConfig.extraPayload);
    shouldCharge = creditPolicy.creditEnabled && creditPolicy.creditCost > 0;
    creditCost = creditPolicy.creditCost;

    if (!aiConfig.isEnabled) {
      return NextResponse.json(
        { error: "这一项 AI 能力正在维护中，请稍后再试。" },
        { status: 503 },
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

    const useResponsesApi = shouldUseResponsesApi(aiConfig.endpointUrl, aiConfig.model);
    const requestEndpoint = resolveGenerationEndpoint(aiConfig.endpointUrl, useResponsesApi);
    const preparedCodingPrompt =
      resolvedMode === "coding"
        ? buildCodingPromptForModel(requestPrompt)
        : null;

    if (preparedCodingPrompt) {
      upstreamPrompt = preparedCodingPrompt.prompt;
    }

    const requestTimeoutMs = resolveAiRequestTimeoutMs(resolvedMode);
    const configuredMaxCompletionTokens =
      typeof aiConfig.extraPayload.maxCompletionTokens === "number"
        ? aiConfig.extraPayload.maxCompletionTokens
        : null;
    const effectiveMaxCompletionTokens = resolveSafeMaxCompletionTokens(
      resolvedMode,
      aiConfig.extraPayload.maxCompletionTokens,
    );
    traceContext = {
      requestId,
      mode: resolvedMode,
      endpoint: requestEndpoint,
      model: aiConfig.model,
      timeoutMs: requestTimeoutMs,
      useResponsesApi,
      maxCompletionTokens: effectiveMaxCompletionTokens,
      promptPreview: buildPromptPreview(requestPrompt),
    };

    traceGenerate("log", "request_started", traceContext, {
      creditCost,
      creditEnabled: shouldCharge,
      configuredMaxCompletionTokens,
      effectiveMaxCompletionTokens,
      promptLength: requestPrompt.length,
      upstreamPromptLength: upstreamPrompt.length,
      promptShortened: preparedCodingPrompt?.shortened ?? false,
      originalPromptLength: preparedCodingPrompt?.originalLength ?? requestPrompt.length,
      finalPromptLength: preparedCodingPrompt?.finalLength ?? upstreamPrompt.length,
      tokenClampApplied:
        configuredMaxCompletionTokens !== null &&
        configuredMaxCompletionTokens !== effectiveMaxCompletionTokens,
    });
    if (resolvedMode === "coding") {
      const taskId = randomUUID();
      const queuedTask: CodingGenerationTaskRecord = {
        id: taskId,
        status: "queued",
        promptPreview: buildPromptPreview(requestPrompt),
        progressMessage: "任务已经排队，马上开始连接模型。",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await writeCodingGenerationTask(queuedTask);

      const partialCodePersistence: PartialCodePersistence = {
        taskId,
        latestPersistedAt: 0,
      };

      void startDeferredCodingGenerationTask({
        taskId,
        requestPrompt,
        traceContext,
        run: () =>
          runCodingGenerateRequestWithModelChain({
            requestPrompt,
            upstreamPrompt,
            aiConfig,
            remainingCredits,
            traceContext,
            requestTimeoutMsOverride: resolveDeferredAiRequestTimeoutMs(resolvedMode),
            onPartialCode: async (partialCode) => {
              const now = Date.now();

              if (
                partialCodePersistence.latestPersistedAt !== 0 &&
                now - partialCodePersistence.latestPersistedAt < 700 &&
                partialCode.length < 1200
              ) {
                return;
              }

              partialCodePersistence.latestPersistedAt = now;
              await updateCodingGenerationTask(partialCodePersistence.taskId, {
                status: "processing",
                progressMessage: "模型正在持续输出代码，预览区会逐步更新。",
                partialCode,
              });
            },
            onTaskUpdate: async (patch) => {
              await updateCodingGenerationTask(partialCodePersistence.taskId, {
                status: "processing",
                ...patch,
              });
            },
          }),
        refundCredits: () =>
          refundCredits(
            resolvedMode === "writing"
              ? `AI 写作后台生成失败，退回 ${creditCost} 个魔法币。`
              : `AI 编程后台生成失败，退回 ${creditCost} 个魔法币。`,
          ),
      });

      const response = NextResponse.json(
        {
          requestId,
          taskId,
          status: "queued",
          message: "创作任务已经提交，系统正在后台稳定生成，请稍等几秒自动返回结果。",
          remainingCredits,
        },
        { status: 202 },
      );
      response.headers.set("x-ai-request-id", requestId);
      return response;
    }

    const runResult =
      resolvedMode === "writing"
        ? await runTextGenerateRequestWithModelChain({
            resolvedMode,
            requestPrompt,
            upstreamPrompt,
            aiConfig,
            remainingCredits,
            traceContext,
          })
        : await runGenerateRequest({
            resolvedMode,
            requestPrompt,
            upstreamPrompt,
            aiConfig,
            apiKey: "",
            remainingCredits,
            traceContext,
          });

    if (runResult.ok) {
      const response = NextResponse.json({
        code: runResult.code,
        remainingCredits: runResult.remainingCredits,
        degraded: runResult.degraded,
        degradedReason: runResult.degradedReason,
        modelAttempts: runResult.modelAttempts ?? [],
        requestId,
      });
      response.headers.set("x-ai-request-id", requestId);
      return response;
    }

    const response = NextResponse.json(
      {
        error: runResult.error,
        remainingCredits: runResult.remainingCredits,
        requestId,
      },
      { status: runResult.status },
    );
    response.headers.set("x-ai-request-id", requestId);
    return response;
  } catch (error) {
    await refundCredits(
      resolvedMode === "writing"
        ? `AI 写作生成过程中发生异常，退回 ${creditCost} 个魔法币。`
        : `AI 编程生成过程中发生异常，退回 ${creditCost} 个魔法币。`,
    );

    traceGenerate("error", "request_exception", traceContext, {
      isTimeoutError: isAiUpstreamTimeoutError(error),
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    const isTimeoutError = isAiUpstreamTimeoutError(error);

    if (resolvedMode === "coding") {
      traceGenerate("warn", "coding_degraded_exception", traceContext, {
        isTimeoutError,
        degradedReason: isTimeoutError
          ? "服务器与上游模型连接超时，已自动切换到站内兜底生成。"
          : "生成链路发生异常，已自动切换到站内兜底生成。",
      });

      const response = NextResponse.json({
        code: buildCodingFallbackHtml(requestPrompt),
        remainingCredits,
        degraded: true,
        degradedReason: isTimeoutError
          ? "任务提交时网络有点波动，已自动切换到站内兜底生成。"
          : "任务提交时发生异常，已自动切换到站内兜底生成。",
        requestId,
      });
      response.headers.set("x-ai-request-id", requestId);
      return response;
    }

    const response = NextResponse.json(
      {
        error:
          isTimeoutError
            ? "服务器等待 AI 接口返回超时了。若本地能生成、线上部署后总是失败，通常是服务器到模型渠道的网络不通，或者 Nginx / CDN 在 AI 返回前先超时断开了。请优先检查服务器出网连通性，并把 /api/generate 的反向代理超时调大到 300 秒左右。"
            : "生成接口暂时出了点小状况。已经自动检查并退回本次失败消耗的魔法币，请稍后再试，或检查后台 AI 接口地址是否填写正确。",
        remainingCredits,
        requestId,
      },
      { status: isTimeoutError ? 504 : 500 },
    );
    response.headers.set("x-ai-request-id", requestId);
    return response;
  }
}
