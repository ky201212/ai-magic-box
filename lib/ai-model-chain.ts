import "server-only";

export type AiModelChainCandidate = {
  slot: "A" | "B" | "C";
  label: string;
  provider?: string;
  endpointUrl: string;
  apiKeyEnv: string;
  model: string;
  timeoutMs?: number;
};

type AiFallbackModelChainCandidate = Omit<AiModelChainCandidate, "slot"> & {
  slot: "B" | "C";
};

export type AiModelChainPolicy = {
  switchOnTimeout: boolean;
  switchOnHttp5xx: boolean;
  switchOnHttp429: boolean;
  switchOnInvalidKey: boolean;
  switchOnEmptyContent: boolean;
};

export function resolveAiModelChainCandidates(input: {
  endpointUrl: string;
  apiKeyEnv: string;
  model: string;
  extraPayload: Record<string, unknown>;
  baseLabel?: string;
  provider?: string;
}) {
  const baseCandidate: AiModelChainCandidate = {
    slot: "A",
    label: input.baseLabel ?? "A 主模型",
    provider: input.provider,
    endpointUrl: input.endpointUrl,
    apiKeyEnv: input.apiKeyEnv,
    model: input.model,
    timeoutMs:
      typeof input.extraPayload.singleModelTimeoutMs === "number" &&
      Number.isFinite(input.extraPayload.singleModelTimeoutMs)
        ? Math.max(10_000, Math.floor(input.extraPayload.singleModelTimeoutMs))
        : undefined,
  };

  const rawModelChain = input.extraPayload.modelChain;
  const extraCandidates = Array.isArray(rawModelChain)
    ? rawModelChain
        .map((item): AiFallbackModelChainCandidate | null => {
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
          } satisfies AiFallbackModelChainCandidate;
        })
        .filter(
          (item): item is AiFallbackModelChainCandidate => item !== null,
        )
    : [];

  const dedupedCandidates: AiModelChainCandidate[] = [];
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

export function resolveAiModelChainPolicy(extraPayload: Record<string, unknown>) {
  const rawPolicy = extraPayload.modelChainPolicy;

  if (!rawPolicy || typeof rawPolicy !== "object") {
    return {
      switchOnTimeout: true,
      switchOnHttp5xx: true,
      switchOnHttp429: true,
      switchOnInvalidKey: true,
      switchOnEmptyContent: true,
    } satisfies AiModelChainPolicy;
  }

  const policy = rawPolicy as Record<string, unknown>;

  return {
    switchOnTimeout: policy.switchOnTimeout !== false,
    switchOnHttp5xx: policy.switchOnHttp5xx !== false,
    switchOnHttp429: policy.switchOnHttp429 !== false,
    switchOnInvalidKey: policy.switchOnInvalidKey !== false,
    switchOnEmptyContent: policy.switchOnEmptyContent !== false,
  } satisfies AiModelChainPolicy;
}

export function shouldContinueAiModelChain(
  input: {
    status: number;
    error: string;
  },
  policy: AiModelChainPolicy,
) {
  const normalizedError = input.error.toLowerCase();

  if (input.status === 504) {
    return policy.switchOnTimeout;
  }

  if (input.status === 429) {
    return policy.switchOnHttp429;
  }

  if (input.status >= 500) {
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

  return false;
}
