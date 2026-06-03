import "server-only";
import { getAiModeConfig } from "@/lib/admin-data";
import {
  PROFILE_BIO_MODERATION_DEFAULT_BLOCKED_KEYWORDS,
  PROFILE_BIO_MODERATION_DEFAULT_PROMPT,
  PROFILE_BIO_MODERATION_MODE_KEY,
} from "@/lib/profile-moderation-defaults";

type ResolvedAiModeConfig = {
  modeKey: string;
  endpointUrl: string;
  apiKeyEnv: string;
  model: string;
  systemPrompt: string;
  isEnabled: boolean;
  extraPayload: Record<string, unknown>;
};

const modeFallbacks: Record<
  string,
  Omit<ResolvedAiModeConfig, "modeKey">
> = {
  coding: {
    endpointUrl:
      process.env.AI_API_URL ??
      "https://token-plan-cn.xiaomimimo.com/v1/chat/completions",
    apiKeyEnv: "AI_API_KEY",
    model: "mimo-v2.5-pro",
    systemPrompt:
        "你是少儿编程导师。请根据用户要求生成一个可直接运行的单文件 HTML。必须内含 CSS、JavaScript，并通过 CDN 引入 Tailwind CSS。界面要童趣、清晰、适配手机。页面必须铺满整个预览视口：html、body、主容器都使用 width:100% 与 min-height:100vh；禁止额外绘制居中的手机外框、设备边框、小屏幕容器或限制整页 max-width。若内容较长，必须允许纵向滚动；禁止用 overflow:hidden 或固定 100vh 阻断滚动。只返回最终 HTML，不要 Markdown，不要解释。",
    isEnabled: true,
    extraPayload: {
      reasoningEffort: "none",
      maxCompletionTokens: 1400,
      streamPreviewEnabled: true,
      showModelRelayStatus: false,
      modelChain: [],
    },
  },
  writing: {
    endpointUrl:
      process.env.AI_API_URL ??
      "https://token-plan-cn.xiaomimimo.com/v1/chat/completions",
    apiKeyEnv: "AI_API_KEY",
    model: "mimo-v2.5-pro",
    systemPrompt:
        "你是一位充满童心、温柔又专业的少儿写作导师。请根据用户输入的写作需求，生成适合中小学生阅读和使用的中文写作内容。要求语言优美、生动、有画面感，同时保持自然、真诚、易懂。如果用户要童话，就写得温暖有想象力；如果用户要诗歌，就写得有节奏和意境；如果用户要演讲稿，就写得自信、清晰、有感染力。重要要求：只返回最终的纯文本内容，绝对不要包含 Markdown 代码块、标题符号、解释说明、创作分析或多余前后缀。",
    isEnabled: true,
    extraPayload: {
      reasoningEffort: "low",
      maxCompletionTokens: 800,
      modelChain: [],
    },
  },
  painting: {
    endpointUrl: "https://api.siliconflow.cn/v1/images/generations",
    apiKeyEnv: "SILICONFLOW_API_KEY",
    model: "Kwai-Kolors/Kolors",
    systemPrompt: "请根据用户输入的中文绘画描述，生成适合儿童教育展示的图像。",
    isEnabled: true,
    extraPayload: {
      image_size: "1024x1024",
      creditEnabled: true,
      creditCost: 5,
      supportsImageEditing: false,
      modelChain: [],
    },
  },
  video: {
    endpointUrl: "https://api.siliconflow.cn/v1/video/submit",
    apiKeyEnv: "SILICONFLOW_API_KEY",
    model: "Wan-AI/Wan2.2-T2V-A14B",
    systemPrompt:
      "请根据用户输入的中文故事提示，生成适合儿童教育展示的短视频镜头描述与动画结果。",
    isEnabled: true,
    extraPayload: {
      image_size: "1280x720",
      qualityModel: "Wan-AI/Wan2.2-T2V-A14B",
      creditEnabled: false,
      creditCost: 0,
      pollIntervalMs: 5000,
      pollTimeoutMs: 180000,
      modelChain: [],
    },
  },
  speech: {
    endpointUrl: "https://api.siliconflow.cn/v1/audio/speech",
    apiKeyEnv: "SILICONFLOW_API_KEY",
    model: "FunAudioLLM/CosyVoice2-0.5B",
    systemPrompt: "请将用户输入的中文内容合成为适合儿童收听的自然语音。",
    isEnabled: true,
    extraPayload: {
      responseFormat: "mp3",
      voice: "alex",
      speed: 1,
      gain: 0,
      creditEnabled: false,
      creditCost: 0,
      modelChain: [],
    },
  },
  transcribe: {
    endpointUrl: "https://api.siliconflow.cn/v1/audio/transcriptions",
    apiKeyEnv: "SILICONFLOW_API_KEY",
    model: "FunAudioLLM/SenseVoiceSmall",
    systemPrompt: "请将儿童语音内容准确识别为简体中文文本。",
    isEnabled: true,
    extraPayload: {
      modelChain: [],
    },
  },
  promptOptimize: {
    endpointUrl:
      process.env.AI_API_URL ??
      "https://token-plan-cn.xiaomimimo.com/v1/chat/completions",
    apiKeyEnv: "AI_API_KEY",
    model: "mimo-v2.5-pro",
    systemPrompt:
      "你是一位提示词润色助手。请把用户输入改写成更清晰、具体、结构化、更容易被 AI 正确理解的中文提示词。保留原本意图，不要编造不存在的需求，不要输出解释，只返回优化后的最终提示词正文。",
    isEnabled: true,
    extraPayload: {
      reasoningEffort: "low",
      maxCompletionTokens: 600,
      modelChain: [],
    },
  },
  [PROFILE_BIO_MODERATION_MODE_KEY]: {
    endpointUrl:
      process.env.AI_API_URL ??
      "https://token-plan-cn.xiaomimimo.com/v1/chat/completions",
    apiKeyEnv: "AI_API_KEY",
    model: "mimo-v2.5-pro",
    systemPrompt: PROFILE_BIO_MODERATION_DEFAULT_PROMPT,
    isEnabled: true,
    extraPayload: {
      reasoningEffort: "low",
      maxCompletionTokens: 300,
      customBlockedKeywords: PROFILE_BIO_MODERATION_DEFAULT_BLOCKED_KEYWORDS.join("\n"),
      modelChain: [],
    },
  },
};

function ensureAbsoluteEndpoint(endpointUrl: string, fallbackEndpoint: string) {
  const trimmedEndpoint = endpointUrl.trim();

  if (!trimmedEndpoint) {
    return fallbackEndpoint;
  }

  if (
    trimmedEndpoint.startsWith("http://") ||
    trimmedEndpoint.startsWith("https://")
  ) {
    return trimmedEndpoint;
  }

  return fallbackEndpoint;
}

function resolvePaintingEndpoint(endpointUrl: string) {
  const fallbackEndpoint = modeFallbacks.painting.endpointUrl;
  const absoluteEndpoint = ensureAbsoluteEndpoint(endpointUrl, fallbackEndpoint);
  const normalizedEndpoint = absoluteEndpoint.toLowerCase();

  if (normalizedEndpoint.endsWith("/images/generations")) {
    return absoluteEndpoint;
  }

  if (normalizedEndpoint.endsWith("/v1")) {
    return `${absoluteEndpoint}/images/generations`;
  }

  if (normalizedEndpoint.endsWith("/v1/")) {
    return `${absoluteEndpoint}images/generations`;
  }

  return absoluteEndpoint;
}

function resolveVideoSubmitEndpoint(endpointUrl: string) {
  const fallbackEndpoint = modeFallbacks.video.endpointUrl;
  const absoluteEndpoint = ensureAbsoluteEndpoint(endpointUrl, fallbackEndpoint);
  const normalizedEndpoint = absoluteEndpoint.toLowerCase();

  if (normalizedEndpoint.endsWith("/video/submit")) {
    return absoluteEndpoint;
  }

  if (normalizedEndpoint.endsWith("/v1")) {
    return `${absoluteEndpoint}/video/submit`;
  }

  if (normalizedEndpoint.endsWith("/v1/")) {
    return `${absoluteEndpoint}video/submit`;
  }

  return absoluteEndpoint;
}

function resolveTranscribeEndpoint(endpointUrl: string) {
  const fallbackEndpoint = modeFallbacks.transcribe.endpointUrl;
  const absoluteEndpoint = ensureAbsoluteEndpoint(endpointUrl, fallbackEndpoint);
  const normalizedEndpoint = absoluteEndpoint.toLowerCase();

  if (normalizedEndpoint.endsWith("/audio/transcriptions")) {
    return absoluteEndpoint;
  }

  if (normalizedEndpoint.endsWith("/v1")) {
    return `${absoluteEndpoint}/audio/transcriptions`;
  }

  if (normalizedEndpoint.endsWith("/v1/")) {
    return `${absoluteEndpoint}audio/transcriptions`;
  }

  return absoluteEndpoint;
}

function resolveSpeechEndpoint(endpointUrl: string) {
  const fallbackEndpoint = modeFallbacks.speech.endpointUrl;
  const absoluteEndpoint = ensureAbsoluteEndpoint(endpointUrl, fallbackEndpoint);
  const normalizedEndpoint = absoluteEndpoint.toLowerCase();

  if (normalizedEndpoint.endsWith("/audio/speech")) {
    return absoluteEndpoint;
  }

  if (normalizedEndpoint.endsWith("/v1")) {
    return `${absoluteEndpoint}/audio/speech`;
  }

  if (normalizedEndpoint.endsWith("/v1/")) {
    return `${absoluteEndpoint}audio/speech`;
  }

  return absoluteEndpoint;
}

export async function resolveAiModeConfig(
  modeKey:
    | "coding"
    | "writing"
    | "painting"
    | "video"
    | "speech"
    | "transcribe"
    | "promptOptimize"
    | typeof PROFILE_BIO_MODERATION_MODE_KEY,
): Promise<ResolvedAiModeConfig> {
  const fallback = modeFallbacks[modeKey];

  try {
    const dbConfig = await getAiModeConfig(modeKey);

    if (!dbConfig) {
      return {
        modeKey,
        ...fallback,
      };
    }

    return {
      modeKey,
      endpointUrl:
        modeKey === "painting"
          ? resolvePaintingEndpoint(dbConfig.endpoint_url)
          : modeKey === "video"
            ? resolveVideoSubmitEndpoint(dbConfig.endpoint_url)
          : modeKey === "speech"
            ? resolveSpeechEndpoint(dbConfig.endpoint_url)
          : modeKey === "transcribe"
            ? resolveTranscribeEndpoint(dbConfig.endpoint_url)
            : ensureAbsoluteEndpoint(dbConfig.endpoint_url, fallback.endpointUrl),
      apiKeyEnv: dbConfig.api_key_env,
      model: dbConfig.model,
      systemPrompt: dbConfig.system_prompt,
      isEnabled: dbConfig.is_enabled,
      extraPayload: {
        ...fallback.extraPayload,
        ...(dbConfig.extra_payload ?? {}),
      },
    };
  } catch {
    return {
      modeKey,
      ...fallback,
    };
  }
}

export function resolveModeCreditPolicy(extraPayload: Record<string, unknown>) {
  const creditEnabled = extraPayload.creditEnabled === true;
  const creditCost =
    typeof extraPayload.creditCost === "number"
      ? Math.max(0, extraPayload.creditCost)
      : 0;

  return {
    creditEnabled,
    creditCost,
  };
}
