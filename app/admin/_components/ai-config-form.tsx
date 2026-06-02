"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  AiModeConfigRecord,
  AiModelPickerState,
  AiModelPresetRecord,
  AiModelOptionsState,
  AiModelChainStatsRecord,
  AiSecretAuditRecord,
  AiSecretSecuritySummary,
  AiSecretStatusRecord,
} from "./types";

type SaveStatus = "idle" | "saving" | "success" | "error";

type AiConfigFormProps = {
  initialConfigs: AiModeConfigRecord[];
  initialPresets: AiModelPresetRecord[];
  initialModelChainStats: Record<string, AiModelChainStatsRecord>;
  initialSecretStatuses: AiSecretStatusRecord[];
  initialSecretSecurity: AiSecretSecuritySummary;
  initialSecretAuditLogs: AiSecretAuditRecord[];
};

type EditableAiConfig = AiModeConfigRecord & {
  extra_payload: Record<string, unknown>;
};

type CodingFallbackModelSlot = "B" | "C";

type CodingFallbackModelConfig = {
  slot: CodingFallbackModelSlot;
  label: string;
  provider: string;
  endpointUrl: string;
  apiKeyEnv: string;
  model: string;
  timeoutMs: number | "";
};

type CodingModelChainPolicyConfig = {
  switchOnTimeout: boolean;
  switchOnHttp5xx: boolean;
  switchOnHttp429: boolean;
  switchOnInvalidKey: boolean;
  switchOnEmptyContent: boolean;
  enableHealthOrdering: boolean;
  circuitBreakerThreshold: number;
  circuitBreakerCooldownMs: number;
};

type CodingModelHealthCheckResult = {
  slot: "A" | "B" | "C";
  label: string;
  model: string;
  ok: boolean;
  status?: number;
  message: string;
};

const CUSTOM_PRESET_ID = "custom";

const MODE_OPTIONS = [
  { key: "coding", label: "AI编程" },
  { key: "writing", label: "AI写作" },
  { key: "painting", label: "AI绘画" },
  { key: "video", label: "AI视频" },
  { key: "speech", label: "AI语音" },
  { key: "transcribe", label: "语音识别" },
  { key: "promptOptimize", label: "提示词优化" },
] as const;

const DEFAULT_MODEL_PRESETS: AiModelPresetRecord[] = [
  {
    id: "mimo-v25-pro",
    mode_key: "coding",
    label: "Mimo v2.5 Pro",
    provider: "小米 Mimo",
    endpoint_url: "https://token-plan-cn.xiaomimimo.com/v1/chat/completions",
    api_key_env: "AI_API_KEY",
    model: "mimo-v2.5-pro",
    description: "当前站点原生适配方案，适合少儿编程生成。",
    badge: "稳定常用",
  },
  {
    id: "qlcode-gpt-5.5",
    mode_key: "coding",
    label: "GPT-5.5",
    provider: "OpenAI",
    endpoint_url: "https://api.qlcodeapi.com/v1",
    api_key_env: "AI_API_KEY",
    model: "gpt-5.5",
    description: "OpenAI 兼容接口模板，保存后即可直接走编程生成。",
    badge: "高阶编程",
  },
  {
    id: "qlcode-gpt-5.4",
    mode_key: "coding",
    label: "GPT-5.4",
    provider: "OpenAI",
    endpoint_url: "https://api.qlcodeapi.com/v1",
    api_key_env: "AI_API_KEY",
    model: "gpt-5.4",
    description: "适合需要更稳妥代码输出的 OpenAI 兼容配置。",
    badge: "均衡稳定",
  },
  {
    id: "siliconflow-deepseek-v3",
    mode_key: "coding",
    label: "DeepSeek V3",
    provider: "SiliconFlow",
    endpoint_url: "https://api.siliconflow.cn/v1/chat/completions",
    api_key_env: "SILICONFLOW_API_KEY",
    model: "deepseek-ai/DeepSeek-V3",
    description: "使用 SiliconFlow 的聊天补全接口，适合做备选模型。",
    badge: "备选方案",
  },
  {
    id: "mimo-v25-pro",
    mode_key: "writing",
    label: "Mimo v2.5 Pro",
    provider: "小米 Mimo",
    endpoint_url: "https://token-plan-cn.xiaomimimo.com/v1/chat/completions",
    api_key_env: "AI_API_KEY",
    model: "mimo-v2.5-pro",
    description: "适合中文儿童写作场景，语气稳定，保存后可直接使用。",
    badge: "稳定常用",
  },
  {
    id: "qlcode-gpt-5.5",
    mode_key: "writing",
    label: "GPT-5.5",
    provider: "OpenAI",
    endpoint_url: "https://api.qlcodeapi.com/v1",
    api_key_env: "AI_API_KEY",
    model: "gpt-5.5",
    description: "适合作文、故事、演讲稿等内容生成的高阶模板。",
    badge: "表达丰富",
  },
  {
    id: "qlcode-gpt-5.4",
    mode_key: "writing",
    label: "GPT-5.4",
    provider: "OpenAI",
    endpoint_url: "https://api.qlcodeapi.com/v1",
    api_key_env: "AI_API_KEY",
    model: "gpt-5.4",
    description: "偏稳妥的文字生成选择，便于长期使用。",
    badge: "均衡稳定",
  },
  {
    id: "siliconflow-deepseek-v3",
    mode_key: "writing",
    label: "DeepSeek V3",
    provider: "SiliconFlow",
    endpoint_url: "https://api.siliconflow.cn/v1/chat/completions",
    api_key_env: "SILICONFLOW_API_KEY",
    model: "deepseek-ai/DeepSeek-V3",
    description: "适合作为写作模型的备用线路。",
    badge: "备选方案",
  },
  {
    id: "siliconflow-kolors",
    mode_key: "painting",
    label: "Kolors",
    provider: "SiliconFlow",
    endpoint_url: "https://api.siliconflow.cn/v1/images/generations",
    api_key_env: "SILICONFLOW_API_KEY",
    model: "Kwai-Kolors/Kolors",
    description: "当前站点已适配的 AI 绘画模板，返回图片地址可直接展示。",
    badge: "绘画专用",
    image_size: "1024x1024",
    supportsImageEditing: false,
  },
  {
    id: "qwen-image-edit",
    mode_key: "painting",
    label: "Qwen Image Edit",
    provider: "SiliconFlow",
    endpoint_url: "https://api.siliconflow.cn/v1/images/generations",
    api_key_env: "SILICONFLOW_API_KEY",
    model: "Qwen/Qwen-Image-Edit",
    description: "适合参考图编辑、图生图和细节改图的 Qwen 图像编辑模型。",
    badge: "图像编辑",
    image_size: "1024x1024",
    supportsImageEditing: true,
  },
  {
    id: "qwen-image-edit-2509",
    mode_key: "painting",
    label: "Qwen Image Edit 2509",
    provider: "SiliconFlow",
    endpoint_url: "https://api.siliconflow.cn/v1/images/generations",
    api_key_env: "SILICONFLOW_API_KEY",
    model: "Qwen/Qwen-Image-Edit-2509",
    description: "Qwen 图像编辑系列的新版本模板，适合上传参考图后做高质量改图。",
    badge: "图像编辑",
    image_size: "1024x1024",
    supportsImageEditing: true,
  },
  {
    id: "siliconflow-wan22-t2v",
    mode_key: "video",
    label: "Wan 2.2 T2V",
    provider: "SiliconFlow",
    endpoint_url: "https://api.siliconflow.cn/v1/video/submit",
    api_key_env: "SILICONFLOW_API_KEY",
    model: "Wan-AI/Wan2.2-T2V-A14B",
    description: "适合文生视频场景的基础模板，提交任务后会自动轮询结果并返回视频地址。",
    badge: "视频专用",
    image_size: "1280x720",
  },
  {
    id: "cosyvoice2-speech",
    mode_key: "speech",
    label: "CosyVoice2 语音合成",
    provider: "SiliconFlow",
    endpoint_url: "https://api.siliconflow.cn/v1/audio/speech",
    api_key_env: "SILICONFLOW_API_KEY",
    model: "FunAudioLLM/CosyVoice2-0.5B",
    description: "适合把作文、演讲稿、故事变成可播放语音的模板。",
    badge: "合成专用",
  },
  {
    id: "sensevoice-small",
    mode_key: "transcribe",
    label: "SenseVoice Small",
    provider: "SiliconFlow",
    endpoint_url: "https://api.siliconflow.cn/v1/audio/transcriptions",
    api_key_env: "SILICONFLOW_API_KEY",
    model: "FunAudioLLM/SenseVoiceSmall",
    description: "当前站点已适配的语音识别模板，适合语音转文字。",
    badge: "识别专用",
  },
  {
    id: "mimo-prompt-optimize",
    mode_key: "promptOptimize",
    label: "Mimo 提示词优化",
    provider: "小米 Mimo",
    endpoint_url: "https://token-plan-cn.xiaomimimo.com/v1/chat/completions",
    api_key_env: "AI_API_KEY",
    model: "mimo-v2.5-pro",
    description: "用于把用户原始描述优化成更适合 AI 理解的提示词。",
    badge: "优化专用",
  },
  {
    id: "qlcode-gpt-5.5-prompt-optimize",
    mode_key: "promptOptimize",
    label: "GPT-5.5 提示词优化",
    provider: "OpenAI",
    endpoint_url: "https://api.qlcodeapi.com/v1",
    api_key_env: "AI_API_KEY",
    model: "gpt-5.5",
    description: "适合提示词润色、结构化改写和表达增强。",
    badge: "高阶优化",
  },
];

function createEmptyModelChainStatsRecord(): AiModelChainStatsRecord {
  return {
    updatedAt: null,
    models: (["A", "B", "C"] as const).map((slot) => ({
      slot,
      label: `${slot} 模型`,
      provider: "",
      model: "",
      endpointUrl: "",
      successCount: 0,
      failureCount: 0,
      timeoutCount: 0,
      skipCount: 0,
      consecutiveFailures: 0,
      cooldownUntil: null,
      streamSupport: "unknown",
      lastStatus: null,
      lastError: null,
      lastUsedAt: null,
    })),
    recentEvents: [],
  };
}

function getStreamSupportLabel(
  streamSupport: "supported" | "unsupported" | "unknown" | undefined,
) {
  if (streamSupport === "supported") {
    return "支持";
  }

  if (streamSupport === "unsupported") {
    return "不支持";
  }

  return "待判断";
}

function normalizeConfigs(configs: AiModeConfigRecord[]): EditableAiConfig[] {
  return configs.map((config) => ({
    ...config,
    extra_payload: config.extra_payload ?? {},
  }));
}

function normalizeValue(value: string) {
  return value.trim().toLowerCase();
}

function createPresetKey(preset: Pick<AiModelPresetRecord, "mode_key" | "id">) {
  return `${preset.mode_key}:${preset.id}`;
}

function createEmptyPreset(modeKey: string): AiModelPresetRecord {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${modeKey}-${Date.now()}`,
    mode_key: modeKey,
    label: "",
    provider: "",
    endpoint_url: "",
    api_key_env: "AI_API_KEY",
    model: "",
    description: "",
    badge: "新模板",
    image_size:
      modeKey === "painting"
        ? "1024x1024"
        : modeKey === "video"
          ? "1280x720"
          : undefined,
  };
}

function normalizePresets(initialPresets: AiModelPresetRecord[]) {
  if (initialPresets.length > 0) {
    return initialPresets.map((preset) => ({
      ...preset,
      image_size: preset.image_size?.trim() || undefined,
      supportsImageEditing: preset.supportsImageEditing === true,
    }));
  }

  return DEFAULT_MODEL_PRESETS.map((preset) => ({ ...preset }));
}

function normalizePresetForSave(preset: AiModelPresetRecord): AiModelPresetRecord {
  return {
    ...preset,
    label: preset.label.trim(),
    provider: preset.provider.trim(),
    endpoint_url: preset.endpoint_url.trim(),
    api_key_env: preset.api_key_env.trim(),
    model: preset.model.trim(),
    description: preset.description.trim(),
    badge: preset.badge.trim() || "新模板",
    image_size: preset.image_size?.trim() || undefined,
    supportsImageEditing: preset.supportsImageEditing === true,
  };
}

function normalizeConfigForSave(config: EditableAiConfig): EditableAiConfig {
  return {
    ...config,
    mode_name: config.mode_name.trim(),
    provider: config.provider.trim(),
    endpoint_url: config.endpoint_url.trim(),
    api_key_env: config.api_key_env.trim(),
    model: config.model.trim(),
    system_prompt: config.system_prompt.trim(),
    extra_payload: config.extra_payload ?? {},
  };
}

function getModeLabel(modeKey: string) {
  return MODE_OPTIONS.find((item) => item.key === modeKey)?.label ?? modeKey;
}

function supportsModelChain(modeKey: string) {
  return MODE_OPTIONS.some((item) => item.key === modeKey);
}

function getPresetsForMode(presets: AiModelPresetRecord[], modeKey: string) {
  return presets.filter((preset) => preset.mode_key === modeKey);
}

function getPresetById(
  presets: AiModelPresetRecord[],
  modeKey: string,
  presetId: string,
) {
  return presets.find(
    (preset) => preset.mode_key === modeKey && preset.id === presetId,
  );
}

function findMatchingPresetId(
  config: EditableAiConfig,
  presets: AiModelPresetRecord[],
) {
  const savedPresetId =
    typeof config.extra_payload.aiPresetId === "string"
      ? config.extra_payload.aiPresetId
      : "";

  const modePresets = getPresetsForMode(presets, config.mode_key);

  if (
    savedPresetId &&
    modePresets.some((preset) => preset.id === savedPresetId)
  ) {
    return savedPresetId;
  }

  const matchedPreset = modePresets.find(
    (preset) =>
      normalizeValue(preset.provider) === normalizeValue(config.provider) &&
      normalizeValue(preset.endpoint_url) ===
        normalizeValue(config.endpoint_url) &&
      normalizeValue(preset.api_key_env) === normalizeValue(config.api_key_env) &&
      normalizeValue(preset.model) === normalizeValue(config.model),
  );

  return matchedPreset?.id ?? CUSTOM_PRESET_ID;
}

function getCodingFallbackModelChain(
  extraPayload: Record<string, unknown>,
): CodingFallbackModelConfig[] {
  const rawChain = extraPayload.modelChain;

  if (!Array.isArray(rawChain)) {
    return [
      {
        slot: "B",
        label: "B 备用模型",
        provider: "",
        endpointUrl: "",
        apiKeyEnv: "AI_API_KEY",
        model: "",
        timeoutMs: "",
      },
      {
        slot: "C",
        label: "C 备用模型",
        provider: "",
        endpointUrl: "",
        apiKeyEnv: "AI_API_KEY",
        model: "",
        timeoutMs: "",
      },
    ];
  }

  const normalizedMap = new Map<CodingFallbackModelSlot, CodingFallbackModelConfig>();

  for (const item of rawChain) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const rawItem = item as Record<string, unknown>;
    const slot = rawItem.slot;

    if (slot !== "B" && slot !== "C") {
      continue;
    }

    normalizedMap.set(slot, {
      slot,
      label:
        typeof rawItem.label === "string" && rawItem.label.trim()
          ? rawItem.label.trim()
          : `${slot} 备用模型`,
      provider:
        typeof rawItem.provider === "string" ? rawItem.provider : "",
      endpointUrl:
        typeof rawItem.endpointUrl === "string"
          ? rawItem.endpointUrl
          : typeof rawItem.endpoint_url === "string"
            ? rawItem.endpoint_url
            : "",
      apiKeyEnv:
        typeof rawItem.apiKeyEnv === "string"
          ? rawItem.apiKeyEnv
          : typeof rawItem.api_key_env === "string"
            ? rawItem.api_key_env
            : "AI_API_KEY",
      model: typeof rawItem.model === "string" ? rawItem.model : "",
      timeoutMs:
        typeof rawItem.timeoutMs === "number" && Number.isFinite(rawItem.timeoutMs)
          ? Math.max(10_000, Math.floor(rawItem.timeoutMs))
          : "",
    });
  }

  return (["B", "C"] as const).map(
    (slot) =>
      normalizedMap.get(slot) ?? {
        slot,
        label: `${slot} 备用模型`,
        provider: "",
        endpointUrl: "",
        apiKeyEnv: "AI_API_KEY",
        model: "",
        timeoutMs: "",
      },
  );
}

function buildCodingFallbackModelChain(
  currentExtraPayload: Record<string, unknown>,
  nextModels: CodingFallbackModelConfig[],
) {
  return {
    ...currentExtraPayload,
    modelChain: nextModels.map((item) => ({
        slot: item.slot,
        label: item.label.trim() || `${item.slot} 备用模型`,
        provider: item.provider.trim(),
        endpointUrl: item.endpointUrl.trim(),
        apiKeyEnv: item.apiKeyEnv.trim(),
        model: item.model.trim(),
        ...(typeof item.timeoutMs === "number" && Number.isFinite(item.timeoutMs)
          ? {
              timeoutMs: Math.max(10_000, Math.floor(item.timeoutMs)),
            }
          : {}),
      })),
  };
}

function getCodingModelChainPolicy(
  extraPayload: Record<string, unknown>,
): CodingModelChainPolicyConfig {
  const rawPolicy = extraPayload.modelChainPolicy;

  if (!rawPolicy || typeof rawPolicy !== "object") {
    return {
      switchOnTimeout: true,
      switchOnHttp5xx: true,
      switchOnHttp429: true,
      switchOnInvalidKey: true,
      switchOnEmptyContent: true,
      enableHealthOrdering: true,
      circuitBreakerThreshold: 3,
      circuitBreakerCooldownMs: 300000,
    };
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
        ? Math.max(60000, Math.floor(policy.circuitBreakerCooldownMs))
        : 300000,
  };
}

function formatDurationMs(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "暂无";
  }

  if (value < 1000) {
    return `${Math.round(value)}ms`;
  }

  return `${(value / 1000).toFixed(1)}s`;
}

function formatAdminDateTime(value?: string | null) {
  if (!value) {
    return "暂无";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function buildCodingModelObservability(stats: AiModelChainStatsRecord) {
  const since = Date.now() - 24 * 60 * 60 * 1000;

  return stats.models.map((item) => {
    const recentEvents = stats.recentEvents.filter(
      (event) =>
        event.slot === item.slot &&
        new Date(event.createdAt).getTime() >= since,
    );
    const healthEvents = recentEvents.filter(
      (event) =>
        event.event === "success" ||
        event.event === "failure" ||
        event.event === "timeout",
    );
    const successEvents = healthEvents.filter((event) => event.event === "success");
    const errorEvents = healthEvents.filter((event) => event.event !== "success");
    const successRate = healthEvents.length
      ? Math.round((successEvents.length / healthEvents.length) * 100)
      : null;
    const avgLatencyMs = successEvents.length
      ? Math.round(
          successEvents.reduce(
            (total, event) => total + (event.latencyMs ?? 0),
            0,
          ) / successEvents.length,
        )
      : null;
    const latestError = errorEvents[0];

    return {
      slot: item.slot,
      successRate,
      avgLatencyMs,
      latestErrorMessage: latestError?.message ?? null,
      latestErrorTime: latestError?.createdAt ?? null,
      sampleCount: healthEvents.length,
    };
  });
}

export function AiConfigForm({
  initialConfigs,
  initialPresets,
  initialModelChainStats,
  initialSecretStatuses,
  initialSecretSecurity,
  initialSecretAuditLogs,
}: AiConfigFormProps) {
  const [configs, setConfigs] = useState<EditableAiConfig[]>(
    normalizeConfigs(initialConfigs),
  );
  const [presets, setPresets] = useState<AiModelPresetRecord[]>(
    normalizePresets(initialPresets),
  );
  const [secretStatuses, setSecretStatuses] =
    useState<AiSecretStatusRecord[]>(initialSecretStatuses);
  const [secretSecurity, setSecretSecurity] =
    useState<AiSecretSecuritySummary>(initialSecretSecurity);
  const [secretAuditLogs, setSecretAuditLogs] =
    useState<AiSecretAuditRecord[]>(initialSecretAuditLogs);
  const [modelChainStats, setModelChainStats] = useState<
    Record<string, AiModelChainStatsRecord>
  >(
    initialModelChainStats,
  );
  const [codingModelStatsState, setCodingModelStatsState] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [secretInputs, setSecretInputs] = useState<Record<string, string>>({});
  const [newSecretEnvName, setNewSecretEnvName] = useState("");
  const [expandedConfigKeys, setExpandedConfigKeys] = useState<string[]>([
    initialConfigs[0]?.mode_key ?? "coding",
  ]);
  const [expandedPresetModeKeys, setExpandedPresetModeKeys] = useState<string[]>([
    "coding",
  ]);
  const [isPresetLibraryExpanded, setIsPresetLibraryExpanded] = useState(false);
  const [isSecretManagementExpanded, setIsSecretManagementExpanded] =
    useState(false);
  const [isSecretAuditExpanded, setIsSecretAuditExpanded] = useState(false);
  const [secretActionState, setSecretActionState] = useState<
    Record<string, SaveStatus>
  >({});
  const [configSaveStates, setConfigSaveStates] = useState<
    Record<string, SaveStatus>
  >({});
  const [presetLibrarySaveState, setPresetLibrarySaveState] =
    useState<SaveStatus>("idle");
  const [configModelOptions, setConfigModelOptions] = useState<
    Record<string, AiModelOptionsState>
  >({});
  const [codingFallbackModelOptions, setCodingFallbackModelOptions] = useState<
    Record<string, AiModelPickerState>
  >({});
  const [expandedCodingSections, setExpandedCodingSections] = useState<
    Record<string, string[]>
  >({
    coding: ["chain", "stats"],
  });
  const [codingModelHealthCheckState, setCodingModelHealthCheckState] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [codingModelHealthCheckResults, setCodingModelHealthCheckResults] = useState<
    CodingModelHealthCheckResult[]
  >([]);
  const [codingModelStatsRefreshedAt, setCodingModelStatsRefreshedAt] = useState<
    string | null
  >(null);

  const refreshCodingModelChainStats = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setCodingModelStatsState("loading");
      }

      try {
        const response = await fetch("/api/admin/ai-coding-model-chain", {
          method: "GET",
          cache: "no-store",
        });
        const data = (await response.json()) as {
          stats?: AiModelChainStatsRecord;
          error?: string;
          refreshedAt?: string;
        };

        if (!response.ok) {
          throw new Error(data.error || "接力统计刷新失败");
        }

        setModelChainStats((current) => ({
          ...current,
          coding: data.stats ?? createEmptyModelChainStatsRecord(),
        }));
        setCodingModelStatsRefreshedAt(
          typeof data.refreshedAt === "string" ? data.refreshedAt : new Date().toISOString(),
        );
        setCodingModelStatsState("success");
      } catch (error) {
        console.error("【AI 编程接力统计刷新失败】:", error);
        setCodingModelStatsState("error");
      }
    },
    [],
  );

  useEffect(() => {
    const codingExpandedSections = expandedCodingSections.coding ?? [];

    if (!codingExpandedSections.includes("stats")) {
      return;
    }

    const initialTimer = window.setTimeout(() => {
      void refreshCodingModelChainStats();
    }, 0);
    const intervalId = window.setInterval(() => {
      void refreshCodingModelChainStats({ silent: true });
    }, 8000);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(intervalId);
    };
  }, [expandedCodingSections, refreshCodingModelChainStats]);

  const allSecretEnvNames = useMemo(
    () =>
      Array.from(
        new Set([
          ...configs.map((item) => item.api_key_env),
          ...presets.map((item) => item.api_key_env),
          ...secretStatuses.map((item) => item.envName),
        ]),
      ).filter((item) => item.trim().length > 0),
    [configs, presets, secretStatuses],
  );

  const handleFieldChange = (
    modeKey: string,
    field: keyof AiModeConfigRecord,
    value: string | boolean,
  ) => {
    setConfigs((current) =>
      current.map((config) => {
        if (config.mode_key !== modeKey) {
          return config;
        }

        const shouldResetPreset =
          field === "provider" ||
          field === "endpoint_url" ||
          field === "api_key_env" ||
          field === "model";

        return {
          ...config,
          [field]: value,
          extra_payload: shouldResetPreset
            ? {
                ...config.extra_payload,
                aiPresetId: CUSTOM_PRESET_ID,
              }
            : config.extra_payload,
        };
      }),
    );
  };

  const handleExtraPayloadChange = (
    modeKey: string,
    field: string,
    value: string | boolean | number,
  ) => {
    setConfigs((current) =>
      current.map((config) =>
        config.mode_key === modeKey
          ? {
              ...config,
              extra_payload: {
                ...config.extra_payload,
                [field]: value,
              },
            }
          : config,
      ),
    );
  };

  const handleCodingFallbackModelChange = (
    modeKey: string,
    slot: CodingFallbackModelSlot,
    field: keyof CodingFallbackModelConfig,
    value: string | number | "",
  ) => {
    setConfigs((current) =>
      current.map((config) => {
        if (config.mode_key !== modeKey) {
          return config;
        }

        const nextModels = getCodingFallbackModelChain(config.extra_payload).map((item) =>
          item.slot === slot
            ? {
                ...item,
                [field]: value,
              }
            : item,
        );

        return {
          ...config,
          extra_payload: buildCodingFallbackModelChain(
            config.extra_payload,
            nextModels,
          ),
        };
      }),
    );
  };

  const handleCodingModelChainPolicyChange = (
    modeKey: string,
    field: keyof CodingModelChainPolicyConfig,
    value: boolean | number,
  ) => {
    setConfigs((current) =>
      current.map((config) => {
        if (config.mode_key !== modeKey) {
          return config;
        }

        const nextPolicy = {
          ...getCodingModelChainPolicy(config.extra_payload),
          [field]: value,
        };

        return {
          ...config,
          extra_payload: {
            ...config.extra_payload,
            modelChainPolicy: nextPolicy,
          },
        };
      }),
    );
  };

  const toggleCodingSection = (modeKey: string, sectionKey: string) => {
    setExpandedCodingSections((current) => {
      const activeSections = current[modeKey] ?? [];
      return {
        ...current,
        [modeKey]: activeSections.includes(sectionKey)
          ? activeSections.filter((item) => item !== sectionKey)
          : [...activeSections, sectionKey],
      };
    });
  };

  const handleFetchModelsForCodingFallback = async (input: {
    modeKey: string;
    slot: CodingFallbackModelSlot;
    endpointUrl: string;
    apiKeyEnv: string;
  }) => {
    const cacheKey = `${input.modeKey}:${input.slot}`;

    setCodingFallbackModelOptions((current) => ({
      ...current,
      [cacheKey]: {
        models: current[cacheKey]?.models ?? [],
        endpoint: current[cacheKey]?.endpoint ?? "",
        warning: "",
        status: "loading",
      },
    }));

    try {
      const response = await fetch("/api/admin/ai-models", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          endpointUrl: input.endpointUrl,
          apiKeyEnv: input.apiKeyEnv,
        }),
      });

      const data = (await response.json()) as {
        models?: string[];
        modelsEndpoint?: string;
        warning?: string;
        error?: string;
      };

      if (!response.ok) {
        setCodingFallbackModelOptions((current) => ({
          ...current,
          [cacheKey]: {
            models: current[cacheKey]?.models ?? [],
            endpoint: data.modelsEndpoint ?? current[cacheKey]?.endpoint ?? "",
            warning: data.error ?? "模型列表读取失败。",
            status: "error",
            lastFetchedAt: new Date().toISOString(),
          },
        }));
        return;
      }

      setCodingFallbackModelOptions((current) => ({
        ...current,
        [cacheKey]: {
          models: data.models ?? [],
          endpoint: data.modelsEndpoint ?? "",
          warning: data.warning ?? "",
          status: "success",
          lastFetchedAt: new Date().toISOString(),
        },
      }));
    } catch {
      setCodingFallbackModelOptions((current) => ({
        ...current,
        [cacheKey]: {
          models: current[cacheKey]?.models ?? [],
          endpoint: current[cacheKey]?.endpoint ?? "",
          warning: "模型列表读取失败，请稍后再试。",
          status: "error",
          lastFetchedAt: new Date().toISOString(),
        },
      }));
    }
  };

  const handleCodingModelHealthCheck = async (config: EditableAiConfig) => {
    const fallbackModels = getCodingFallbackModelChain(config.extra_payload);
    const candidates = [
      {
        slot: "A" as const,
        label: "A 主模型",
        provider: config.provider,
        endpointUrl: config.endpoint_url,
        apiKeyEnv: config.api_key_env,
        model: config.model,
      },
      ...fallbackModels.map((item) => ({
        slot: item.slot,
        label: item.label || `${item.slot} 备用模型`,
        provider: item.provider,
        endpointUrl: item.endpointUrl,
        apiKeyEnv: item.apiKeyEnv,
        model: item.model,
      })),
    ].filter((item) => item.endpointUrl.trim() && item.apiKeyEnv.trim() && item.model.trim());

    setCodingModelHealthCheckState("loading");
    setCodingModelHealthCheckResults([]);

    try {
      const response = await fetch("/api/admin/ai-coding-model-chain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          modeKey: config.mode_key,
          action: "healthCheck",
          candidates,
        }),
      });

      const data = (await response.json()) as {
        results?: CodingModelHealthCheckResult[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "模型体检失败");
      }

      setCodingModelHealthCheckResults(data.results ?? []);
      setCodingModelHealthCheckState("success");
    } catch (error) {
      setCodingModelHealthCheckResults([
        {
          slot: "A",
          label: "系统提示",
          model: "",
          ok: false,
          message: error instanceof Error ? error.message : "模型体检失败",
        },
      ]);
      setCodingModelHealthCheckState("error");
    }
  };

  const handleClearCodingModelCooldown = async (
    modeKey: string,
    slot: "A" | "B" | "C",
  ) => {
    try {
      const response = await fetch("/api/admin/ai-coding-model-chain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          modeKey,
          action: "clearCooldown",
          slot,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error || "解除熔断失败");
      }

      await refreshCodingModelChainStats();
    } catch {
      window.alert("解除熔断失败，请稍后再试。");
    }
  };

  const applyPreset = (modeKey: string, presetId: string) => {
    setConfigs((current) =>
      current.map((config) => {
        if (config.mode_key !== modeKey) {
          return config;
        }

        if (presetId === CUSTOM_PRESET_ID) {
          return {
            ...config,
            extra_payload: {
              ...config.extra_payload,
              aiPresetId: CUSTOM_PRESET_ID,
            },
          };
        }

        const preset = getPresetById(presets, modeKey, presetId);

        if (!preset) {
          return config;
        }

        return {
          ...config,
          provider: preset.provider,
          endpoint_url: preset.endpoint_url,
          api_key_env: preset.api_key_env,
          model: preset.model,
          extra_payload: {
            ...config.extra_payload,
            aiPresetId: preset.id,
            ...(preset.mode_key === "painting"
              ? {
                  supportsImageEditing: preset.supportsImageEditing === true,
                }
              : {}),
            ...(preset.image_size
              ? {
                  image_size:
                    typeof config.extra_payload.image_size === "string" &&
                    config.extra_payload.image_size.trim()
                      ? config.extra_payload.image_size
                      : preset.image_size,
                }
              : {}),
          },
        };
      }),
    );
  };

  const handlePresetFieldChange = (
    presetId: string,
    field: keyof AiModelPresetRecord,
    value: string,
  ) => {
    let targetPresetMode = "";

    setPresets((current) =>
      current.map((preset) => {
        if (preset.id !== presetId) {
          return preset;
        }

        targetPresetMode = preset.mode_key;
        return {
          ...preset,
          [field]: value,
        };
      }),
    );

    if (
      field === "provider" ||
      field === "endpoint_url" ||
      field === "api_key_env" ||
      field === "model"
    ) {
      setConfigs((current) =>
        current.map((config) =>
          config.mode_key === targetPresetMode &&
          config.extra_payload.aiPresetId === presetId
            ? {
                ...config,
                [field]: value,
              }
            : config,
        ),
      );
    }

    if (field === "image_size") {
      setConfigs((current) =>
        current.map((config) =>
          config.mode_key === targetPresetMode &&
          config.extra_payload.aiPresetId === presetId
            ? {
                ...config,
                extra_payload: {
                  ...config.extra_payload,
                  image_size: value,
                },
              }
            : config,
        ),
      );
    }

    if (field === "supportsImageEditing") {
      setConfigs((current) =>
        current.map((config) =>
          config.mode_key === targetPresetMode &&
          config.extra_payload.aiPresetId === presetId
            ? {
                ...config,
                extra_payload: {
                  ...config.extra_payload,
                  supportsImageEditing: value === "true",
                },
              }
            : config,
        ),
      );
    }
  };

  const handleAddPreset = (modeKey: string) => {
    setPresets((current) => [...current, createEmptyPreset(modeKey)]);
  };

  const handleDeletePreset = (preset: AiModelPresetRecord) => {
    setPresets((current) =>
      current.filter((item) => createPresetKey(item) !== createPresetKey(preset)),
    );

    setConfigs((current) =>
      current.map((config) =>
        config.mode_key === preset.mode_key &&
        config.extra_payload.aiPresetId === preset.id
          ? {
              ...config,
              extra_payload: {
                ...config.extra_payload,
                aiPresetId: CUSTOM_PRESET_ID,
              },
            }
          : config,
      ),
    );
  };

  const handleSaveConfig = async (modeKey: string) => {
    const targetConfig = configs.find((config) => config.mode_key === modeKey);

    if (!targetConfig) {
      return;
    }

    const normalizedConfig = normalizeConfigForSave(targetConfig);

    setConfigSaveStates((current) => ({
      ...current,
      [modeKey]: "saving",
    }));

    try {
      const response = await fetch("/api/admin/ai-configs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          configs: [normalizedConfig],
        }),
      });

      if (!response.ok) {
        throw new Error("保存失败");
      }

      setConfigs((current) =>
        current.map((config) =>
          config.mode_key === modeKey ? normalizedConfig : config,
        ),
      );
      setConfigSaveStates((current) => ({
        ...current,
        [modeKey]: "success",
      }));
    } catch {
      setConfigSaveStates((current) => ({
        ...current,
        [modeKey]: "error",
      }));
    } finally {
      window.setTimeout(() => {
        setConfigSaveStates((current) => ({
          ...current,
          [modeKey]: "idle",
        }));
      }, 2200);
    }
  };

  const handleSavePresetLibrary = async () => {
    setPresetLibrarySaveState("saving");

    try {
      const normalizedPresets = presets.map(normalizePresetForSave);

      const response = await fetch("/api/admin/ai-presets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          presets: normalizedPresets,
        }),
      });

      if (!response.ok) {
        throw new Error("保存失败");
      }

      setPresets(normalizedPresets);
      setPresetLibrarySaveState("success");
    } catch {
      setPresetLibrarySaveState("error");
    } finally {
      window.setTimeout(() => {
        setPresetLibrarySaveState("idle");
      }, 2200);
    }
  };

  const handleSecretInputChange = (envName: string, value: string) => {
    setSecretInputs((current) => ({
      ...current,
      [envName]: value,
    }));
  };

  const handleSaveSecret = async (envName: string) => {
    const value = secretInputs[envName]?.trim();

    if (!value) {
      setSecretActionState((current) => ({
        ...current,
        [envName]: "error",
      }));
      window.setTimeout(() => {
        setSecretActionState((current) => ({
          ...current,
          [envName]: "idle",
        }));
      }, 2000);
      return;
    }

    setSecretActionState((current) => ({
      ...current,
      [envName]: "saving",
    }));

    try {
      const response = await fetch("/api/admin/ai-secrets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          envName,
          value,
        }),
      });

      if (!response.ok) {
        throw new Error("保存失败");
      }

      const updatedAt = new Date().toISOString();
      setSecretStatuses((current) => {
        const next = current.filter((item) => item.envName !== envName);
        return [
          ...next,
          {
            envName,
            available: true,
            source: "database",
            updatedAt,
          },
        ];
      });
      setSecretAuditLogs((current) => [
        {
          id:
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `${envName}-${Date.now()}`,
          envName,
          action: "save",
          actorUserId: "current-admin",
          actorDisplayName: "当前管理员",
          actorPhone: "",
          createdAt: updatedAt,
        },
        ...current,
      ]);
      setSecretInputs((current) => ({
        ...current,
        [envName]: "",
      }));
      setSecretActionState((current) => ({
        ...current,
        [envName]: "success",
      }));
    } catch {
      setSecretActionState((current) => ({
        ...current,
        [envName]: "error",
      }));
    } finally {
      window.setTimeout(() => {
        setSecretActionState((current) => ({
          ...current,
          [envName]: "idle",
        }));
      }, 2200);
    }
  };

  const handleDeleteSecret = async (envName: string) => {
    setSecretActionState((current) => ({
      ...current,
      [envName]: "saving",
    }));

    try {
      const response = await fetch("/api/admin/ai-secrets", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          envName,
        }),
      });

      if (!response.ok) {
        throw new Error("删除失败");
      }

      const deletedAt = new Date().toISOString();
      setSecretStatuses((current) => [
        ...current.filter((item) => item.envName !== envName),
        {
          envName,
          available: false,
          source: "missing",
          updatedAt: null,
        },
      ]);
      setSecretAuditLogs((current) => [
        {
          id:
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `${envName}-${Date.now()}`,
          envName,
          action: "delete",
          actorUserId: "current-admin",
          actorDisplayName: "当前管理员",
          actorPhone: "",
          createdAt: deletedAt,
        },
        ...current,
      ]);
      setSecretActionState((current) => ({
        ...current,
        [envName]: "success",
      }));
    } catch {
      setSecretActionState((current) => ({
        ...current,
        [envName]: "error",
      }));
    } finally {
      window.setTimeout(() => {
        setSecretActionState((current) => ({
          ...current,
          [envName]: "idle",
        }));
      }, 2200);
    }
  };

  const handleCreateSecretSlot = () => {
    const normalizedEnvName = newSecretEnvName.trim().toUpperCase();

    if (!normalizedEnvName) {
      return;
    }

    if (allSecretEnvNames.includes(normalizedEnvName)) {
      setNewSecretEnvName(normalizedEnvName);
      return;
    }

    setSecretStatuses((current) => [
      ...current,
      {
        envName: normalizedEnvName,
        available: false,
        source: "missing",
        updatedAt: null,
      },
    ]);
    setNewSecretEnvName("");
  };

  const toggleConfigExpanded = (modeKey: string) => {
    setExpandedConfigKeys((current) =>
      current.includes(modeKey)
        ? current.filter((item) => item !== modeKey)
        : [...current, modeKey],
    );
  };

  const togglePresetModeExpanded = (modeKey: string) => {
    setExpandedPresetModeKeys((current) =>
      current.includes(modeKey)
        ? current.filter((item) => item !== modeKey)
        : [...current, modeKey],
    );
  };

  const handleFetchModelsForConfig = async (config: EditableAiConfig) => {
    setConfigModelOptions((current) => ({
      ...current,
      [config.mode_key]: {
        models: current[config.mode_key]?.models ?? [],
        endpoint: current[config.mode_key]?.endpoint ?? "",
        warning: "",
        status: "loading",
      },
    }));

    try {
      const response = await fetch("/api/admin/ai-models", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          endpointUrl: config.endpoint_url,
          apiKeyEnv: config.api_key_env,
        }),
      });

      const data = (await response.json()) as {
        models?: string[];
        modelsEndpoint?: string;
        warning?: string;
        error?: string;
      };

      if (!response.ok) {
        setConfigModelOptions((current) => ({
          ...current,
          [config.mode_key]: {
            models: current[config.mode_key]?.models ?? [],
            endpoint: data.modelsEndpoint ?? current[config.mode_key]?.endpoint ?? "",
            warning: data.error ?? "模型列表拉取失败。",
            status: "error",
          },
        }));
        return;
      }

      setConfigModelOptions((current) => ({
        ...current,
        [config.mode_key]: {
          models: data.models ?? [],
          endpoint: data.modelsEndpoint ?? "",
          warning: data.warning ?? "",
          status: "success",
        },
      }));
    } catch {
      setConfigModelOptions((current) => ({
        ...current,
        [config.mode_key]: {
          models: current[config.mode_key]?.models ?? [],
          endpoint: current[config.mode_key]?.endpoint ?? "",
          warning: "模型列表拉取失败，请稍后再试。",
          status: "error",
        },
      }));
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-[30px] border border-white/80 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-sm font-black tracking-[0.14em] text-[#7a67db]">
              AI 密钥管理
            </p>
            <h3 className="mt-2 text-[28px] font-black text-slate-800">
              直接在后台录入 key，不用再改环境文件
            </h3>
            <p className="mt-3 text-sm leading-7 text-slate-500">
              这里填写的是密钥的真实内容，不是变量名。系统会按变量名分别加密保存，运行时优先读取后台密钥，没有才会退回服务器环境变量。
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setIsSecretManagementExpanded((current) => !current)
            }
            className="rounded-full bg-[#eef4ff] px-4 py-3 text-sm font-black text-[#4b6fcc]"
          >
            {isSecretManagementExpanded ? "收起详情" : "打开详情"}
          </button>
        </div>

        {isSecretManagementExpanded ? (
          <>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-[22px] bg-white/80 px-4 py-4 text-sm leading-7 text-slate-600">
                当前加密主密钥来源：
                <span className="ml-2 font-black text-slate-800">
                  {secretSecurity.masterKeySource === "dedicated"
                    ? "独立 AI 主密钥"
                    : secretSecurity.masterKeySource === "fallback"
                      ? "暂时复用登录密钥"
                      : "缺失"}
                </span>
              </div>
              <div className="rounded-[22px] bg-white/80 px-4 py-4 text-sm leading-7 text-slate-600">
                后台密钥加密状态：
                <span className="ml-2 font-black text-slate-800">
                  {secretSecurity.storageEncryptionEnabled ? "已启用" : "不可用"}
                </span>
              </div>
              <div className="rounded-[22px] bg-white/80 px-4 py-4 text-sm leading-7 text-slate-600">
                密钥修改权限：
                <span className="ml-2 font-black text-slate-800">
                  仅更高权限管理员
                </span>
              </div>
            </div>

            {secretSecurity.warningMessage && (
              <div className="mt-4 rounded-[22px] bg-[#fff4e8] px-4 py-4 text-sm font-bold leading-7 text-[#b66a16]">
                {secretSecurity.warningMessage}
              </div>
            )}

            <div className="mt-6 rounded-[24px] border border-[#ebe8ff] bg-[linear-gradient(135deg,#faf9ff_0%,#f7fbff_100%)] p-5">
              <p className="text-sm font-black text-slate-700">先新增一个密钥变量名</p>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                比如你可以新增 <code>API_KEY_1</code>、<code>API_KEY_2</code>、
                <code> OPENAI_VENDOR_A_KEY</code>。新增后，它就会进入下面的密钥池，也能在模型配置和模板里直接选择。
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                <input
                  value={newSecretEnvName}
                  onChange={(event) => setNewSecretEnvName(event.target.value)}
                  placeholder="输入新的密钥变量名，例如 OPENAI_VENDOR_A_KEY"
                  className="h-12 min-w-[320px] flex-1 rounded-[16px] border border-slate-200 bg-white px-4 text-slate-800 outline-none"
                />
                <button
                  type="button"
                  onClick={handleCreateSecretSlot}
                  className="rounded-full bg-slate-900 px-5 py-3 text-sm font-black text-white"
                >
                  新增这个变量名
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-2">
              {allSecretEnvNames.map((envName) => {
                const status =
                  secretStatuses.find((item) => item.envName === envName) ?? {
                    envName,
                    available: false,
                    source: "missing" as const,
                    updatedAt: null,
                  };
                const actionState = secretActionState[envName] ?? "idle";

                return (
                  <article
                    key={envName}
                    className="rounded-[24px] border border-slate-100 bg-slate-50 p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-base font-black text-slate-800">{envName}</p>
                        <p className="mt-2 text-sm text-slate-500">
                          {status.available
                            ? status.source === "database"
                              ? "已在后台密钥保险箱中保存"
                              : "当前使用服务器环境变量"
                            : "当前还没有可用密钥"}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${
                          status.available
                            ? status.source === "database"
                              ? "bg-[#eaf9ef] text-[#20885a]"
                              : "bg-[#eef6ff] text-[#3f7dc7]"
                            : "bg-[#fff1f3] text-[#cf4d72]"
                        }`}
                      >
                        {status.available
                          ? status.source === "database"
                            ? "后台已保存"
                            : "环境变量可用"
                          : "未配置"}
                      </span>
                    </div>

                    <div className="mt-4">
                      <input
                        type="password"
                        value={secretInputs[envName] ?? ""}
                        onChange={(event) =>
                          handleSecretInputChange(envName, event.target.value)
                        }
                        placeholder={`为 ${envName} 输入新的 key`}
                        className="h-12 w-full rounded-[16px] border border-slate-200 bg-white px-4 text-slate-800 outline-none"
                      />
                      <p className="mt-2 text-xs leading-6 text-slate-400">
                        {status.updatedAt
                          ? `后台最后更新：${formatAdminDateTime(status.updatedAt)}`
                          : "如果这里保存了新 key，将优先覆盖环境变量读取。"}
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => handleSaveSecret(envName)}
                        className="rounded-full bg-slate-900 px-4 py-2 text-sm font-black text-white"
                      >
                        {actionState === "saving"
                          ? "保存中"
                          : actionState === "success"
                            ? "已保存"
                            : actionState === "error"
                              ? "保存失败"
                              : "保存这个 key"}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteSecret(envName)}
                        className="rounded-full bg-[#fff1f3] px-4 py-2 text-sm font-black text-[#cf4d72]"
                      >
                        删除后台 key
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-6 rounded-[24px] border border-slate-100 bg-slate-50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-black text-slate-700">最近密钥操作记录</p>
                <button
                  type="button"
                  onClick={() => setIsSecretAuditExpanded((current) => !current)}
                  className="rounded-full bg-[#eef4ff] px-4 py-2 text-sm font-black text-[#4b6fcc]"
                >
                  {isSecretAuditExpanded ? "收起记录" : "打开记录"}
                </button>
              </div>

              {isSecretAuditExpanded ? (
                <div className="mt-4 space-y-3">
                  {secretAuditLogs.length ? (
                    secretAuditLogs.slice(0, 8).map((log) => (
                      <div
                        key={log.id}
                        className="rounded-[18px] bg-white px-4 py-3 text-sm text-slate-600"
                      >
                        <span className="font-black text-slate-800">
                          {log.actorDisplayName || "管理员"}
                        </span>
                        <span className="mx-2">
                          {log.action === "save" ? "保存了" : "删除了"}
                        </span>
                        <span className="font-black text-[#7a67db]">{log.envName}</span>
                        <span className="ml-3 text-xs text-slate-400">{log.createdAt}</span>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[18px] bg-white px-4 py-6 text-sm text-slate-400">
                      目前还没有密钥操作记录。
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-4 rounded-[18px] bg-white px-4 py-5 text-sm text-slate-500">
                  密钥操作记录已收起，点右上角“打开记录”再查看。
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="mt-5 rounded-[22px] bg-slate-50 px-4 py-5 text-sm leading-7 text-slate-500">
            密钥管理已经收起来了。需要新增变量名、录入 key 或查看操作记录时，再点“打开详情”。
          </div>
        )}
      </section>

      <div className="space-y-5">
        {configs.map((config) => {
          const creditEnabled = config.extra_payload.creditEnabled === true;
          const creditCost = Number(config.extra_payload.creditCost ?? 0);
          const maxCompletionTokens = Number(
            config.extra_payload.maxCompletionTokens ?? 0,
          );
          const imageSize =
            typeof config.extra_payload.image_size === "string"
              ? config.extra_payload.image_size
              : "";
          const modePresets = getPresetsForMode(presets, config.mode_key);
          const selectedPresetId = findMatchingPresetId(config, presets);
          const selectedPreset = getPresetById(
            presets,
            config.mode_key,
            selectedPresetId,
          );
          const isExpanded = expandedConfigKeys.includes(config.mode_key);
          const configSaveState = configSaveStates[config.mode_key] ?? "idle";
          const modelOptionsState = configModelOptions[config.mode_key] ?? {
            models: [],
            endpoint: "",
            warning: "",
            status: "idle" as const,
          };
          const chainEnabled = supportsModelChain(config.mode_key);
          const codingFallbackModels = chainEnabled
            ? getCodingFallbackModelChain(config.extra_payload)
            : [];
          const codingModelChainPolicy = chainEnabled
            ? getCodingModelChainPolicy(config.extra_payload)
            : null;
          const expandedCodingSectionKeys =
            expandedCodingSections[config.mode_key] ?? ["chain", "stats"];
          const currentModelChainStats =
            modelChainStats[config.mode_key] ?? createEmptyModelChainStatsRecord();
          const codingObservability = buildCodingModelObservability(
            currentModelChainStats,
          );

          return (
            <article
              key={config.mode_key}
              className="rounded-[30px] border border-white/80 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-xl font-black text-slate-800">{config.mode_name}</p>
                    <span className="rounded-full bg-[#f3f1ff] px-3 py-1 text-xs font-black text-[#7a67db]">
                      {selectedPreset ? selectedPreset.badge : "自定义配置"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-slate-500">
                    这里可以控制这个功能的启用状态、模型地址、系统提示词和扣币策略。
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-3 rounded-full bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
                    <input
                      type="checkbox"
                      checked={config.is_enabled}
                      onChange={(event) =>
                        handleFieldChange(
                          config.mode_key,
                          "is_enabled",
                          event.target.checked,
                        )
                      }
                      className="h-4 w-4"
                    />
                    启用这个功能
                  </label>
                  <button
                    type="button"
                    onClick={() => toggleConfigExpanded(config.mode_key)}
                    className="rounded-full bg-[#eef4ff] px-4 py-3 text-sm font-black text-[#4b6fcc]"
                  >
                    {isExpanded ? "收起详情" : "打开详情"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveConfig(config.mode_key)}
                    className="rounded-full bg-slate-900 px-4 py-3 text-sm font-black text-white"
                  >
                    {configSaveState === "saving"
                      ? "保存中"
                      : configSaveState === "success"
                        ? "已保存"
                        : configSaveState === "error"
                          ? "保存失败"
                          : "保存这个模块"}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <>
                  <div className="mt-6 rounded-[26px] border border-[#ebe8ff] bg-[linear-gradient(135deg,#faf9ff_0%,#f7fbff_100%)] p-5">
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,320px)_1fr]">
                      <div>
                        <label className="block text-sm font-bold text-slate-600">
                          快速切换模型模板
                          <select
                            value={selectedPresetId}
                            onChange={(event) =>
                              applyPreset(config.mode_key, event.target.value)
                            }
                            className="mt-2 h-12 w-full rounded-[18px] border border-[#dfe7fb] bg-white px-4 text-slate-800 outline-none"
                          >
                            <option value={CUSTOM_PRESET_ID}>自定义配置</option>
                            {modePresets.map((preset) => (
                              <option key={preset.id} value={preset.id}>
                                {preset.label || "未命名模板"}
                              </option>
                            ))}
                          </select>
                        </label>
                        <p className="mt-3 text-sm leading-7 text-slate-500">
                          选中模板后会自动回填下面的模型参数。你在下方模板库新增的模板，也会直接出现在这里。
                        </p>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        {(selectedPreset ? [selectedPreset] : modePresets.slice(0, 2)).map(
                          (preset) => (
                            <div
                              key={`${preset.mode_key}-${preset.id}`}
                              className="rounded-[22px] bg-white px-4 py-4 shadow-[0_12px_28px_rgba(125,140,180,0.08)]"
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-black text-slate-700">
                                  {preset.label || "未命名模板"}
                                </p>
                                <span className="rounded-full bg-[#edf5ff] px-2.5 py-1 text-[11px] font-black text-[#4383d5]">
                                  {preset.badge || "模板"}
                                </span>
                              </div>
                              <p className="mt-2 text-sm leading-7 text-slate-500">
                                {preset.description || "这是一套待完善描述的模板。"}
                              </p>
                              <div className="mt-3 space-y-1 text-xs font-bold text-slate-400">
                                <p>服务商：{preset.provider || "未填写"}</p>
                                <p>模型：{preset.model || "未填写"}</p>
                                <p className="break-all">接口：{preset.endpoint_url || "未填写"}</p>
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 xl:grid-cols-2">
                    <label className="block text-sm font-bold text-slate-600">
                      功能名称
                      <input
                        value={config.mode_name}
                        onChange={(event) =>
                          handleFieldChange(config.mode_key, "mode_name", event.target.value)
                        }
                        className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
                      />
                    </label>
                    <label className="block text-sm font-bold text-slate-600">
                      服务提供方
                      <input
                        value={config.provider}
                        onChange={(event) =>
                          handleFieldChange(config.mode_key, "provider", event.target.value)
                        }
                        className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
                      />
                    </label>
                    <label className="block text-sm font-bold text-slate-600">
                      接口地址
                      <input
                        value={config.endpoint_url}
                        onChange={(event) =>
                          handleFieldChange(
                            config.mode_key,
                            "endpoint_url",
                            event.target.value,
                          )
                        }
                        className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
                      />
                    </label>
                    <label className="block text-sm font-bold text-slate-600">
                      模型名称
                      <div className="mt-2 space-y-3">
                        <div className="flex flex-wrap gap-3">
                          <select
                            value={
                              modelOptionsState.models.includes(config.model)
                                ? config.model
                                : ""
                            }
                            onChange={(event) => {
                              if (event.target.value) {
                                handleFieldChange(
                                  config.mode_key,
                                  "model",
                                  event.target.value,
                                );
                              }
                            }}
                            className="h-12 min-w-[220px] flex-1 rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
                          >
                            <option value="">先选择已拉取的模型</option>
                            {modelOptionsState.models.map((modelName) => (
                              <option key={modelName} value={modelName}>
                                {modelName}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => handleFetchModelsForConfig(config)}
                            className="rounded-full bg-[#eef4ff] px-4 py-3 text-sm font-black text-[#4b6fcc]"
                          >
                            {modelOptionsState.status === "loading"
                              ? "拉取中"
                              : "拉取可用模型"}
                          </button>
                        </div>
                        <input
                          value={config.model}
                          onChange={(event) =>
                            handleFieldChange(
                              config.mode_key,
                              "model",
                              event.target.value,
                            )
                          }
                          placeholder="也可以手动填写模型 ID"
                          className="h-12 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
                        />
                        <div className="space-y-1 text-xs leading-6 text-slate-500">
                          <p>
                            系统会用当前接口地址和已保存的密钥去拉取模型列表，拉到后你就可以直接选。
                          </p>
                          {modelOptionsState.endpoint ? (
                            <p className="break-all text-slate-400">
                              当前拉取地址：{modelOptionsState.endpoint}
                            </p>
                          ) : null}
                          {modelOptionsState.warning ? (
                            <p
                              className={
                                modelOptionsState.status === "error"
                                  ? "text-[#cf4d72]"
                                  : "text-[#b86a12]"
                              }
                            >
                              {modelOptionsState.warning}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </label>
                    <label className="block text-sm font-bold text-slate-600">
                      密钥环境变量名
                      <select
                        value={config.api_key_env}
                        onChange={(event) =>
                          handleFieldChange(config.mode_key, "api_key_env", event.target.value)
                        }
                        className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
                      >
                        {allSecretEnvNames.map((envName) => (
                          <option key={envName} value={envName}>
                            {envName}
                          </option>
                        ))}
                        {!allSecretEnvNames.includes(config.api_key_env) && (
                          <option value={config.api_key_env}>{config.api_key_env}</option>
                        )}
                      </select>
                    </label>

                    {config.mode_key === "painting" || config.mode_key === "video" ? (
                      <label className="block text-sm font-bold text-slate-600">
                        {config.mode_key === "video" ? "视频画面尺寸" : "生成图片尺寸"}
                        <input
                          value={imageSize}
                          onChange={(event) =>
                            handleExtraPayloadChange(
                              config.mode_key,
                              "image_size",
                              event.target.value,
                            )
                          }
                          className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
                        />
                      </label>
                    ) : (
                      <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-500">
                        这个功能没有额外的图片尺寸配置项。
                      </div>
                    )}
                  </div>

                  <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_220px_220px]">
                    <label className="flex items-center gap-3 rounded-[22px] bg-slate-50 px-4 py-4 text-sm font-bold text-slate-600">
                      <input
                        type="checkbox"
                        checked={creditEnabled}
                        onChange={(event) =>
                          handleExtraPayloadChange(
                            config.mode_key,
                            "creditEnabled",
                            event.target.checked,
                          )
                        }
                        className="h-4 w-4"
                      />
                      勾选后使用这个功能要扣魔法币
                    </label>

                    <label className="block text-sm font-bold text-slate-600">
                      每次扣多少币
                      <input
                        type="number"
                        min={0}
                        value={creditCost}
                        onChange={(event) =>
                          handleExtraPayloadChange(
                            config.mode_key,
                            "creditCost",
                            Number(event.target.value),
                          )
                        }
                        className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
                      />
                    </label>

                    <label className="block text-sm font-bold text-slate-600">
                      输出上限 tokens
                      <input
                        type="number"
                        min={0}
                        value={maxCompletionTokens}
                        onChange={(event) =>
                          handleExtraPayloadChange(
                            config.mode_key,
                            "maxCompletionTokens",
                            Number(event.target.value),
                          )
                        }
                        className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
                      />
                    </label>

                    <div className="rounded-[18px] bg-[#fff7ed] px-4 py-4 text-sm leading-7 text-[#b86a12]">
                      {creditEnabled
                        ? `当前已开启扣币，每次消耗 ${creditCost} 个魔法币。`
                        : "当前未开启扣币，用户可以免费使用这个功能。"}
                    </div>
                  </div>

                  {chainEnabled ? (
                    <div className="mt-5 rounded-[26px] border border-[#dbeafe] bg-[linear-gradient(135deg,#f8fbff_0%,#f4f7ff_100%)] p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="max-w-3xl">
                          <p className="text-sm font-black tracking-[0.14em] text-[#4b6fcc]">
                            接力模型队列
                          </p>
                          <h4 className="mt-2 text-xl font-black text-slate-800">
                            A 主模型失败后，自动切 B，再切 C
                          </h4>
                          <p className="mt-2 text-sm leading-7 text-slate-500">
                            A 模型就是上面这套主配置。这里再补两套备用线路后，{config.mode_name}会自动按 A、B、C 顺序尝试，尽量把超时和失败挡在后台。
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleCodingSection(config.mode_key, "chain")}
                          className="rounded-full bg-[#eef4ff] px-4 py-2 text-sm font-black text-[#4b6fcc]"
                        >
                          {expandedCodingSectionKeys.includes("chain")
                            ? "收起接力配置"
                            : "展开接力配置"}
                        </button>
                      </div>

                      {expandedCodingSectionKeys.includes("chain") ? (
                        <>
                      <div className="mt-5 rounded-[22px] border border-dashed border-[#d7e6ff] bg-white px-4 py-4">
                        <p className="text-sm font-black text-slate-700">
                          A 主模型独立超时
                        </p>
                        <p className="mt-1 text-sm leading-7 text-slate-500">
                          这里设置 A 主模型单独等待多久。填 `45000` 表示 45 秒。
                        </p>
                        <label className="mt-3 block text-sm font-bold text-slate-600">
                          A 主模型超时毫秒
                          <input
                            type="number"
                            min={10000}
                            step={1000}
                            value={
                              typeof config.extra_payload.singleModelTimeoutMs === "number"
                                ? config.extra_payload.singleModelTimeoutMs
                                : ""
                            }
                            onChange={(event) =>
                              handleExtraPayloadChange(
                                config.mode_key,
                                "singleModelTimeoutMs",
                                Number(event.target.value),
                              )
                            }
                            className="mt-2 h-12 w-full rounded-[16px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
                          />
                        </label>
                      </div>

                      <div className="mt-5 grid gap-4 xl:grid-cols-2">
                        {codingFallbackModels.map((fallbackModel) => (
                          <div
                            key={fallbackModel.slot}
                            className="rounded-[22px] border border-white/80 bg-white px-4 py-4 shadow-[0_12px_28px_rgba(125,140,180,0.08)]"
                          >
                            <div className="flex items-center gap-3">
                              <span className="rounded-full bg-[#eef4ff] px-3 py-1 text-xs font-black text-[#4b6fcc]">
                                {fallbackModel.slot} 备用模型
                              </span>
                              <span className="text-sm text-slate-400">
                                当前为空时会跳过这一档
                              </span>
                            </div>

                            <div className="mt-4 grid gap-4">
                              {(() => {
                                const fallbackModelOptions =
                                  codingFallbackModelOptions[
                                    `${config.mode_key}:${fallbackModel.slot}`
                                  ] ?? {
                                    models: [],
                                    endpoint: "",
                                    warning: "",
                                    status: "idle" as const,
                                  };

                                return (
                                  <>
                              <label className="block text-sm font-bold text-slate-600">
                                显示名称
                                <input
                                  value={fallbackModel.label}
                                  onChange={(event) =>
                                    handleCodingFallbackModelChange(
                                      config.mode_key,
                                      fallbackModel.slot,
                                      "label",
                                      event.target.value,
                                    )
                                  }
                                  className="mt-2 h-12 w-full rounded-[16px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
                                />
                              </label>

                              <label className="block text-sm font-bold text-slate-600">
                                服务提供方
                                <input
                                  value={fallbackModel.provider}
                                  onChange={(event) =>
                                    handleCodingFallbackModelChange(
                                      config.mode_key,
                                      fallbackModel.slot,
                                      "provider",
                                      event.target.value,
                                    )
                                  }
                                  className="mt-2 h-12 w-full rounded-[16px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
                                />
                              </label>

                              <label className="block text-sm font-bold text-slate-600">
                                接口地址
                                <input
                                  value={fallbackModel.endpointUrl}
                                  onChange={(event) =>
                                    handleCodingFallbackModelChange(
                                      config.mode_key,
                                      fallbackModel.slot,
                                      "endpointUrl",
                                      event.target.value,
                                    )
                                  }
                                  className="mt-2 h-12 w-full rounded-[16px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
                                />
                              </label>

                              <label className="block text-sm font-bold text-slate-600">
                                密钥环境变量名
                                <select
                                  value={fallbackModel.apiKeyEnv}
                                  onChange={(event) =>
                                    handleCodingFallbackModelChange(
                                      config.mode_key,
                                      fallbackModel.slot,
                                      "apiKeyEnv",
                                      event.target.value,
                                    )
                                  }
                                  className="mt-2 h-12 w-full rounded-[16px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
                                >
                                  {allSecretEnvNames.map((envName) => (
                                    <option key={envName} value={envName}>
                                      {envName}
                                    </option>
                                  ))}
                                  {!allSecretEnvNames.includes(fallbackModel.apiKeyEnv) && (
                                    <option value={fallbackModel.apiKeyEnv}>
                                      {fallbackModel.apiKeyEnv}
                                    </option>
                                  )}
                                </select>
                              </label>

                              <label className="block text-sm font-bold text-slate-600">
                                模型名称
                                <div className="mt-2 space-y-3">
                                  <div className="flex flex-wrap gap-3">
                                    <select
                                      value={
                                        fallbackModelOptions.models.includes(fallbackModel.model)
                                          ? fallbackModel.model
                                          : ""
                                      }
                                      onChange={(event) => {
                                        if (event.target.value) {
                                          handleCodingFallbackModelChange(
                                            config.mode_key,
                                            fallbackModel.slot,
                                            "model",
                                            event.target.value,
                                          );
                                        }
                                      }}
                                      className="h-12 min-w-[220px] flex-1 rounded-[16px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
                                    >
                                      <option value="">先选择已拉取的模型</option>
                                      {fallbackModelOptions.models.map((modelName) => (
                                        <option key={modelName} value={modelName}>
                                          {modelName}
                                        </option>
                                      ))}
                                    </select>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleFetchModelsForCodingFallback({
                                          modeKey: config.mode_key,
                                          slot: fallbackModel.slot,
                                          endpointUrl: fallbackModel.endpointUrl,
                                          apiKeyEnv: fallbackModel.apiKeyEnv,
                                        })
                                      }
                                      className="rounded-full bg-[#eef4ff] px-4 py-3 text-sm font-black text-[#4b6fcc]"
                                    >
                                      {fallbackModelOptions.status === "loading"
                                        ? "拉取中"
                                        : "拉取可用模型"}
                                    </button>
                                  </div>
                                  <input
                                    value={fallbackModel.model}
                                    onChange={(event) =>
                                      handleCodingFallbackModelChange(
                                        config.mode_key,
                                        fallbackModel.slot,
                                        "model",
                                        event.target.value,
                                      )
                                    }
                                    className="h-12 w-full rounded-[16px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
                                  />
                                  <div className="space-y-1 text-xs leading-6 text-slate-500">
                                    {fallbackModelOptions.endpoint ? (
                                      <p className="break-all text-slate-400">
                                        当前拉取地址：{fallbackModelOptions.endpoint}
                                      </p>
                                    ) : null}
                                    {fallbackModelOptions.warning ? (
                                      <p
                                        className={
                                          fallbackModelOptions.status === "error"
                                            ? "text-[#cf4d72]"
                                            : "text-[#b86a12]"
                                        }
                                      >
                                        {fallbackModelOptions.warning}
                                      </p>
                                    ) : null}
                                  </div>
                                </div>
                              </label>

                              <label className="block text-sm font-bold text-slate-600">
                                单独超时毫秒
                                <input
                                  type="number"
                                  min={10000}
                                  step={1000}
                                  value={fallbackModel.timeoutMs}
                                  onChange={(event) =>
                                    handleCodingFallbackModelChange(
                                      config.mode_key,
                                      fallbackModel.slot,
                                      "timeoutMs",
                                      event.target.value
                                        ? Number(event.target.value)
                                        : "",
                                    )
                                  }
                                  className="mt-2 h-12 w-full rounded-[16px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
                                />
                              </label>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-5 rounded-[22px] border border-dashed border-[#d7e6ff] bg-white px-4 py-4">
                        <p className="text-sm font-black text-slate-700">
                          自动切换规则
                        </p>
                        <p className="mt-1 text-sm leading-7 text-slate-500">
                          下面这些错误类型勾上以后，系统才会继续切到下一档模型。
                        </p>
                        <div className="mt-4 grid gap-3 xl:grid-cols-2">
                          {codingModelChainPolicy ? (
                            <>
                              <label className="flex items-center gap-3 rounded-[16px] bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
                                <input
                                  type="checkbox"
                                  checked={codingModelChainPolicy.switchOnTimeout}
                                  onChange={(event) =>
                                    handleCodingModelChainPolicyChange(
                                      config.mode_key,
                                      "switchOnTimeout",
                                      event.target.checked,
                                    )
                                  }
                                  className="h-4 w-4"
                                />
                                超时后切下一档
                              </label>
                              <label className="flex items-center gap-3 rounded-[16px] bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
                                <input
                                  type="checkbox"
                                  checked={codingModelChainPolicy.switchOnHttp5xx}
                                  onChange={(event) =>
                                    handleCodingModelChainPolicyChange(
                                      config.mode_key,
                                      "switchOnHttp5xx",
                                      event.target.checked,
                                    )
                                  }
                                  className="h-4 w-4"
                                />
                                服务器 5xx 后切下一档
                              </label>
                              <label className="flex items-center gap-3 rounded-[16px] bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
                                <input
                                  type="checkbox"
                                  checked={codingModelChainPolicy.switchOnHttp429}
                                  onChange={(event) =>
                                    handleCodingModelChainPolicyChange(
                                      config.mode_key,
                                      "switchOnHttp429",
                                      event.target.checked,
                                    )
                                  }
                                  className="h-4 w-4"
                                />
                                限流 429 后切下一档
                              </label>
                              <label className="flex items-center gap-3 rounded-[16px] bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
                                <input
                                  type="checkbox"
                                  checked={codingModelChainPolicy.switchOnInvalidKey}
                                  onChange={(event) =>
                                    handleCodingModelChainPolicyChange(
                                      config.mode_key,
                                      "switchOnInvalidKey",
                                      event.target.checked,
                                    )
                                  }
                                  className="h-4 w-4"
                                />
                                密钥异常后切下一档
                              </label>
                              <label className="flex items-center gap-3 rounded-[16px] bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600 xl:col-span-2">
                                <input
                                  type="checkbox"
                                  checked={codingModelChainPolicy.switchOnEmptyContent}
                                  onChange={(event) =>
                                    handleCodingModelChainPolicyChange(
                                      config.mode_key,
                                      "switchOnEmptyContent",
                                      event.target.checked,
                                    )
                                  }
                                  className="h-4 w-4"
                                />
                                模型返回空内容后切下一档
                              </label>
                              <label className="flex items-center gap-3 rounded-[16px] bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600 xl:col-span-2">
                                <input
                                  type="checkbox"
                                  checked={codingModelChainPolicy.enableHealthOrdering}
                                  onChange={(event) =>
                                    handleCodingModelChainPolicyChange(
                                      config.mode_key,
                                      "enableHealthOrdering",
                                      event.target.checked,
                                    )
                                  }
                                  className="h-4 w-4"
                                />
                                按最近健康度自动排序 A / B / C
                              </label>
                            </>
                          ) : null}
                        </div>
                        {codingModelChainPolicy ? (
                          <div className="mt-4 grid gap-4 xl:grid-cols-2">
                            <label className="block text-sm font-bold text-slate-600">
                              连续失败多少次后熔断
                              <input
                                type="number"
                                min={1}
                                value={codingModelChainPolicy.circuitBreakerThreshold}
                                onChange={(event) =>
                                  handleCodingModelChainPolicyChange(
                                    config.mode_key,
                                    "circuitBreakerThreshold",
                                    Number(event.target.value),
                                  )
                                }
                                className="mt-2 h-12 w-full rounded-[16px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
                              />
                            </label>
                            <label className="block text-sm font-bold text-slate-600">
                              熔断冷却毫秒
                              <input
                                type="number"
                                min={60000}
                                step={1000}
                                value={codingModelChainPolicy.circuitBreakerCooldownMs}
                                onChange={(event) =>
                                  handleCodingModelChainPolicyChange(
                                    config.mode_key,
                                    "circuitBreakerCooldownMs",
                                    Number(event.target.value),
                                  )
                                }
                                className="mt-2 h-12 w-full rounded-[16px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
                              />
                            </label>
                          </div>
                        ) : null}
                      </div>
                        </>
                      ) : (
                        <div className="mt-5 rounded-[22px] bg-white px-4 py-5 text-sm leading-7 text-slate-500">
                          接力模型队列与自动切换规则已收起，需要时再展开。
                        </div>
                      )}

                      {config.mode_key === "coding" ? (
                        <div className="mt-5 rounded-[22px] border border-white/80 bg-white px-4 py-4 shadow-[0_12px_28px_rgba(125,140,180,0.08)]">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-black text-slate-700">
                                最近接力统计
                              </p>
                              <p className="mt-1 text-sm text-slate-500">
                                最近一次点击刷新成功时间：
                                {formatAdminDateTime(codingModelStatsRefreshedAt)}
                              </p>
                              <p className="mt-1 text-sm text-slate-500">
                                统计内容最后事件时间：
                                {formatAdminDateTime(currentModelChainStats.updatedAt)}
                              </p>
                              <p className="mt-1 text-xs text-slate-400">
                                {codingModelStatsState === "loading"
                                  ? "正在刷新最新统计..."
                                  : codingModelStatsState === "error"
                                    ? "统计刷新失败，请稍后重试。"
                                    : "统计展开后会自动刷新。"}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-3">
                              <button
                                type="button"
                                onClick={() => toggleCodingSection(config.mode_key, "stats")}
                                className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700"
                              >
                                {expandedCodingSectionKeys.includes("stats")
                                  ? "收起统计"
                                  : "展开统计"}
                              </button>
                              <button
                                type="button"
                                onClick={() => void refreshCodingModelChainStats()}
                                disabled={codingModelStatsState === "loading"}
                                className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700"
                              >
                                {codingModelStatsState === "loading" ? "刷新中..." : "刷新统计"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCodingModelHealthCheck(config)}
                                className="rounded-full bg-[#eef4ff] px-4 py-2 text-sm font-black text-[#4b6fcc]"
                              >
                                {codingModelHealthCheckState === "loading"
                                  ? "体检中"
                                  : "一键体检 A/B/C"}
                              </button>
                            </div>
                          </div>

                          {expandedCodingSectionKeys.includes("stats") ? (
                            <>
                              <div className="mt-4 grid gap-4 xl:grid-cols-3">
                                {currentModelChainStats.models.map((item) => (
                                  <div
                                    key={item.slot}
                                    className="rounded-[18px] bg-slate-50 px-4 py-4 text-sm text-slate-600"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="rounded-full bg-[#eef4ff] px-3 py-1 text-xs font-black text-[#4b6fcc]">
                                        {item.slot}
                                      </span>
                                      <p className="font-black text-slate-800">
                                        {item.label || `${item.slot} 模型`}
                                      </p>
                                    </div>
                                    <div className="mt-3 space-y-1 leading-7">
                                      <p>成功：{item.successCount}</p>
                                      <p>失败：{item.failureCount}</p>
                                      <p>超时：{item.timeoutCount}</p>
                                      <p>跳过：{item.skipCount}</p>
                                      <p>连续失败：{item.consecutiveFailures}</p>
                                      <p>
                                        流式能力：
                                        {getStreamSupportLabel(item.streamSupport)}
                                      </p>
                                      <p>最近状态：{item.lastStatus ?? "暂无"}</p>
                                      <p>熔断到：{item.cooldownUntil ?? "未熔断"}</p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleClearCodingModelCooldown(
                                          config.mode_key,
                                          item.slot,
                                        )
                                      }
                                      className="mt-3 rounded-full bg-[#fff7ed] px-3 py-2 text-xs font-black text-[#b86a12]"
                                    >
                                      手动解除 {item.slot} 熔断
                                    </button>
                                  </div>
                                ))}
                              </div>

                              <div className="mt-4 rounded-[18px] bg-slate-50 px-4 py-4">
                                <p className="text-sm font-black text-slate-700">
                                  24 小时运维视图
                                </p>
                                <div className="mt-3 grid gap-4 xl:grid-cols-3">
                                  {codingObservability.map((item) => (
                                    <div
                                      key={`obs-${item.slot}`}
                                      className="rounded-[14px] bg-white px-4 py-4 text-sm text-slate-600"
                                    >
                                      <p className="font-black text-slate-800">
                                        {item.slot} 最近 24 小时
                                      </p>
                                      <div className="mt-2 space-y-1 leading-7">
                                        <p>
                                          成功率：
                                          {item.successRate === null ? "暂无" : `${item.successRate}%`}
                                        </p>
                                        <p>平均响应：{formatDurationMs(item.avgLatencyMs ?? undefined)}</p>
                                        <p>样本数：{item.sampleCount}</p>
                                        <p>
                                          最近错误时间：{formatAdminDateTime(item.latestErrorTime)}
                                        </p>
                                      </div>
                                      <p className="mt-2 text-slate-500">
                                        最近错误：
                                        {item.latestErrorMessage ?? "暂无"}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {codingModelHealthCheckResults.length ? (
                                <div className="mt-4 rounded-[18px] bg-slate-50 px-4 py-4">
                                  <p className="text-sm font-black text-slate-700">
                                    最近一次模型体检结果
                                  </p>
                                  <div className="mt-3 space-y-3">
                                    {codingModelHealthCheckResults.map((result, index) => (
                                      <div
                                        key={`${result.slot}-${index}`}
                                        className="rounded-[14px] bg-white px-4 py-3 text-sm text-slate-600"
                                      >
                                        <p className="font-bold text-slate-800">
                                          {result.slot} · {result.label} · {result.model || "未填写模型"}
                                        </p>
                                        <p className="mt-1">
                                          {result.ok ? "连通正常" : "连通异常"}
                                          {typeof result.status === "number"
                                            ? ` · HTTP ${result.status}`
                                            : ""}
                                        </p>
                                        <p className="mt-1 text-slate-500">{result.message}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : null}
                            </>
                          ) : (
                            <div className="mt-4 rounded-[18px] bg-slate-50 px-4 py-5 text-sm text-slate-500">
                              接力统计、体检结果和切换记录已收起，需要时再展开。
                            </div>
                          )}

                          <div className="mt-4 rounded-[18px] bg-slate-50 px-4 py-4">
                            <p className="text-sm font-black text-slate-700">
                              最近切换记录
                            </p>
                            <div className="mt-3 space-y-3">
                              {currentModelChainStats.recentEvents.length ? (
                                currentModelChainStats.recentEvents.slice(0, 8).map((event) => (
                                  <div
                                    key={event.id}
                                    className="rounded-[14px] bg-white px-4 py-3 text-sm text-slate-600"
                                  >
                                    <p className="font-bold text-slate-800">
                                      {formatAdminDateTime(event.createdAt)} · {event.slot} · {event.label}
                                    </p>
                                    <p className="mt-1">
                                      事件：{event.event}
                                      {typeof event.status === "number"
                                        ? ` · HTTP ${event.status}`
                                        : ""}
                                      {typeof event.latencyMs === "number"
                                        ? ` · ${event.latencyMs}ms`
                                        : ""}
                                      {event.streamSupport
                                        ? ` · 流式${getStreamSupportLabel(event.streamSupport)}`
                                        : ""}
                                    </p>
                                    {event.message ? (
                                      <p className="mt-1 text-slate-500">{event.message}</p>
                                    ) : null}
                                  </div>
                                ))
                              ) : (
                                <div className="rounded-[14px] bg-white px-4 py-4 text-sm text-slate-400">
                                  还没有接力统计数据。等线上真实跑几次 {config.mode_name} 后，这里就会开始累计。
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-5 rounded-[22px] border border-dashed border-[#d7e6ff] bg-white px-4 py-5 text-sm leading-7 text-slate-500">
                          这个模块也已经支持 A / B / C 接力配置。这里先保留配置能力，运维统计和模型体检目前仍集中在 AI 编程模块里查看。
                        </div>
                      )}
                    </div>
                  ) : null}

                  {config.mode_key === "painting" ? (
                    <div className="mt-5 grid gap-4 xl:grid-cols-2">
                      <label className="flex items-center gap-3 rounded-[22px] bg-slate-50 px-4 py-4 text-sm font-bold text-slate-600">
                        <input
                          type="checkbox"
                          checked={config.extra_payload.supportsImageEditing === true}
                          onChange={(event) =>
                            handleExtraPayloadChange(
                              config.mode_key,
                              "supportsImageEditing",
                              event.target.checked,
                            )
                          }
                          className="h-4 w-4"
                        />
                        这个绘画模型支持图像编辑
                      </label>

                      <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-500">
                        勾选后，用户端 AI 绘画会出现“上传参考图”入口，可以进行图生图或局部参考编辑；不勾选时，只允许文生图。
                      </div>
                    </div>
                  ) : null}

                  <label className="mt-5 block text-sm font-bold text-slate-600">
                    系统提示词
                    <textarea
                      value={config.system_prompt}
                      onChange={(event) =>
                        handleFieldChange(
                          config.mode_key,
                          "system_prompt",
                          event.target.value,
                        )
                      }
                      className="mt-2 h-44 w-full rounded-[18px] border border-slate-200 bg-slate-50 p-4 text-slate-800 outline-none"
                    />
                  </label>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[22px] bg-slate-50 px-4 py-4">
                    <p className="text-sm leading-7 text-slate-500">
                      这一块改完就直接保存，不用回到页面顶部。
                    </p>
                    <button
                      type="button"
                      onClick={() => handleSaveConfig(config.mode_key)}
                      className="rounded-full bg-slate-900 px-5 py-3 text-sm font-black text-white"
                    >
                      {configSaveState === "saving"
                        ? "保存中"
                        : configSaveState === "success"
                          ? "已保存"
                          : configSaveState === "error"
                            ? "保存失败"
                            : `保存${config.mode_name}`}
                    </button>
                  </div>
                </>
              )}
            </article>
          );
        })}
      </div>

      <section className="rounded-[30px] border border-white/80 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-sm font-black tracking-[0.14em] text-[#7a67db]">
              模型模板库
            </p>
            <h3 className="mt-2 text-[28px] font-black text-slate-800">
              在这里新增、编辑、删除模板
            </h3>
            <p className="mt-3 text-sm leading-7 text-slate-500">
              新增模板以后，只要点一次保存，上面的功能卡片就能直接切换到它。你可以按功能类型分别维护，不会混在一起。
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setIsPresetLibraryExpanded((current) => !current)}
              className="rounded-full bg-[#eef4ff] px-4 py-2 text-sm font-black text-[#4b6fcc]"
            >
              {isPresetLibraryExpanded ? "收起模板库" : "打开模板库"}
            </button>
            <button
              type="button"
              onClick={handleSavePresetLibrary}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-black text-white"
            >
              {presetLibrarySaveState === "saving"
                ? "保存中"
                : presetLibrarySaveState === "success"
                  ? "保存成功"
                  : presetLibrarySaveState === "error"
                    ? "保存失败"
                    : "保存模板库"}
            </button>
          </div>
        </div>

        {isPresetLibraryExpanded ? (
          <div className="mt-6 space-y-6">
            {MODE_OPTIONS.map((mode) => {
              const modePresets = getPresetsForMode(presets, mode.key);
              const isPresetModeExpanded = expandedPresetModeKeys.includes(mode.key);

              return (
                <section key={mode.key} className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-black text-slate-800">{mode.label}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        当前共 {modePresets.length} 套模板
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => togglePresetModeExpanded(mode.key)}
                        className="rounded-full bg-[#eef4ff] px-4 py-2 text-sm font-black text-[#4b6fcc]"
                      >
                        {isPresetModeExpanded ? "收起这一类" : "打开这一类"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddPreset(mode.key)}
                        className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700"
                      >
                        新增这一类模板
                      </button>
                    </div>
                  </div>

                  {isPresetModeExpanded ? (
                    modePresets.length ? (
                      <div className="grid gap-4 xl:grid-cols-2">
                        {modePresets.map((preset) => (
                          <article
                            key={`${preset.mode_key}-${preset.id}`}
                            className="rounded-[24px] border border-slate-100 bg-slate-50 p-5"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#7a67db]">
                                  {getModeLabel(preset.mode_key)}
                                </span>
                                <span className="rounded-full bg-[#edf5ff] px-3 py-1 text-xs font-black text-[#4383d5]">
                                  {preset.badge || "模板"}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeletePreset(preset)}
                                className="rounded-full bg-[#fff1f3] px-4 py-2 text-sm font-black text-[#cf4d72]"
                              >
                                删除模板
                              </button>
                            </div>

                            <div className="mt-4 grid gap-4 xl:grid-cols-2">
                              <label className="block text-sm font-bold text-slate-600">
                                模板名称
                                <input
                                  value={preset.label}
                                  onChange={(event) =>
                                    handlePresetFieldChange(
                                      preset.id,
                                      "label",
                                      event.target.value,
                                    )
                                  }
                                  className="mt-2 h-12 w-full rounded-[16px] border border-slate-200 bg-white px-4 text-slate-800 outline-none"
                                />
                              </label>
                              <label className="block text-sm font-bold text-slate-600">
                                标记短语
                                <input
                                  value={preset.badge}
                                  onChange={(event) =>
                                    handlePresetFieldChange(
                                      preset.id,
                                      "badge",
                                      event.target.value,
                                    )
                                  }
                                  className="mt-2 h-12 w-full rounded-[16px] border border-slate-200 bg-white px-4 text-slate-800 outline-none"
                                />
                              </label>
                              <label className="block text-sm font-bold text-slate-600">
                                服务提供方
                                <input
                                  value={preset.provider}
                                  onChange={(event) =>
                                    handlePresetFieldChange(
                                      preset.id,
                                      "provider",
                                      event.target.value,
                                    )
                                  }
                                  className="mt-2 h-12 w-full rounded-[16px] border border-slate-200 bg-white px-4 text-slate-800 outline-none"
                                />
                              </label>
                              <label className="block text-sm font-bold text-slate-600">
                                密钥环境变量名
                                <select
                                  value={preset.api_key_env}
                                  onChange={(event) =>
                                    handlePresetFieldChange(
                                      preset.id,
                                      "api_key_env",
                                      event.target.value,
                                    )
                                  }
                                  className="mt-2 h-12 w-full rounded-[16px] border border-slate-200 bg-white px-4 text-slate-800 outline-none"
                                >
                                  {allSecretEnvNames.map((envName) => (
                                    <option key={envName} value={envName}>
                                      {envName}
                                    </option>
                                  ))}
                                  {!allSecretEnvNames.includes(preset.api_key_env) && (
                                    <option value={preset.api_key_env}>
                                      {preset.api_key_env}
                                    </option>
                                  )}
                                </select>
                              </label>
                              <label className="block text-sm font-bold text-slate-600 xl:col-span-2">
                                接口地址
                                <input
                                  value={preset.endpoint_url}
                                  onChange={(event) =>
                                    handlePresetFieldChange(
                                      preset.id,
                                      "endpoint_url",
                                      event.target.value,
                                    )
                                  }
                                  className="mt-2 h-12 w-full rounded-[16px] border border-slate-200 bg-white px-4 text-slate-800 outline-none"
                                />
                              </label>
                              <label className="block text-sm font-bold text-slate-600 xl:col-span-2">
                                模型名称
                                <input
                                  value={preset.model}
                                  onChange={(event) =>
                                    handlePresetFieldChange(
                                      preset.id,
                                      "model",
                                      event.target.value,
                                    )
                                  }
                                  className="mt-2 h-12 w-full rounded-[16px] border border-slate-200 bg-white px-4 text-slate-800 outline-none"
                                />
                              </label>
                              {(preset.mode_key === "painting" || preset.mode_key === "video") && (
                                <label className="block text-sm font-bold text-slate-600 xl:col-span-2">
                                  {preset.mode_key === "video" ? "默认视频尺寸" : "默认图片尺寸"}
                                  <input
                                    value={preset.image_size ?? ""}
                                    onChange={(event) =>
                                      handlePresetFieldChange(
                                        preset.id,
                                        "image_size",
                                        event.target.value,
                                      )
                                    }
                                    className="mt-2 h-12 w-full rounded-[16px] border border-slate-200 bg-white px-4 text-slate-800 outline-none"
                                  />
                                </label>
                              )}
                              {preset.mode_key === "painting" && (
                                <label className="flex items-center gap-3 rounded-[16px] border border-slate-200 bg-white px-4 py-4 text-sm font-bold text-slate-600 xl:col-span-2">
                                  <input
                                    type="checkbox"
                                    checked={preset.supportsImageEditing === true}
                                    onChange={(event) =>
                                      handlePresetFieldChange(
                                        preset.id,
                                        "supportsImageEditing",
                                        String(event.target.checked),
                                      )
                                    }
                                    className="h-4 w-4"
                                  />
                                  这个模板支持图像编辑
                                </label>
                              )}
                              <label className="block text-sm font-bold text-slate-600 xl:col-span-2">
                                模板说明
                                <textarea
                                  value={preset.description}
                                  onChange={(event) =>
                                    handlePresetFieldChange(
                                      preset.id,
                                      "description",
                                      event.target.value,
                                    )
                                  }
                                  className="mt-2 h-28 w-full rounded-[16px] border border-slate-200 bg-white p-4 text-slate-800 outline-none"
                                />
                              </label>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
                        这一类还没有模板，点击上面的按钮就可以新增。
                      </div>
                    )
                  ) : (
                    <div className="rounded-[22px] bg-slate-50 px-4 py-5 text-sm text-slate-500">
                      这一类模板已收起，点右上角“打开这一类”再编辑。
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        ) : (
          <div className="mt-6 rounded-[24px] bg-slate-50 px-4 py-5 text-sm leading-7 text-slate-500">
            模板库已经收起来了。需要新增、编辑或删除模板时，再点上面的“打开模板库”。
          </div>
        )}
      </section>
    </div>
  );
}
