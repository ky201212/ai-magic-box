"use client";

import { useMemo, useState } from "react";
import type {
  AiModeConfigRecord,
  AiModelPresetRecord,
  AiModelOptionsState,
  AiSecretAuditRecord,
  AiSecretSecuritySummary,
  AiSecretStatusRecord,
} from "./types";

type SaveStatus = "idle" | "saving" | "success" | "error";

type AiConfigFormProps = {
  initialConfigs: AiModeConfigRecord[];
  initialPresets: AiModelPresetRecord[];
  initialSecretStatuses: AiSecretStatusRecord[];
  initialSecretSecurity: AiSecretSecuritySummary;
  initialSecretAuditLogs: AiSecretAuditRecord[];
};

type EditableAiConfig = AiModeConfigRecord & {
  extra_payload: Record<string, unknown>;
};

const CUSTOM_PRESET_ID = "custom";

const MODE_OPTIONS = [
  { key: "coding", label: "AI编程" },
  { key: "writing", label: "AI写作" },
  { key: "painting", label: "AI绘画" },
  { key: "transcribe", label: "语音识别" },
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
];

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
    image_size: modeKey === "painting" ? "1024x1024" : undefined,
  };
}

function normalizePresets(initialPresets: AiModelPresetRecord[]) {
  if (initialPresets.length > 0) {
    return initialPresets.map((preset) => ({
      ...preset,
      image_size: preset.image_size?.trim() || undefined,
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

export function AiConfigForm({
  initialConfigs,
  initialPresets,
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
                          ? `后台最后更新：${status.updatedAt}`
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

                    {config.mode_key === "painting" ? (
                      <label className="block text-sm font-bold text-slate-600">
                        生成图片尺寸
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

                    <div className="rounded-[18px] bg-[#fff7ed] px-4 py-4 text-sm leading-7 text-[#b86a12]">
                      {creditEnabled
                        ? `当前已开启扣币，每次消耗 ${creditCost} 个魔法币。`
                        : "当前未开启扣币，用户可以免费使用这个功能。"}
                    </div>
                  </div>

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
                              {preset.mode_key === "painting" && (
                                <label className="block text-sm font-bold text-slate-600 xl:col-span-2">
                                  默认图片尺寸
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
