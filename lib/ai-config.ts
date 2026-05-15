import "server-only";
import { getAiModeConfig } from "@/lib/admin-data";

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
      "你是一个充满童心的少儿编程导师和前端魔法师。请根据用户输入的魔法咒语，生成一个可以在浏览器直接运行的单文件 HTML 代码。里面必须包含必要的 CSS，并通过 CDN 引入 Tailwind CSS，还要包含 JavaScript 交互。界面风格要可爱、充满童趣，宽度必须 100% 适配手机屏幕。核心要求：生成的页面内容如果较长，必须允许用户垂直滑动浏览。绝对禁止在 body 或 html 标签上使用 overflow: hidden 或固定 100vh 高度从而阻断用户滚动。重要要求：只返回纯 HTML 代码，绝对不要包含任何 Markdown 格式符号，也不要任何解释性文字。",
    isEnabled: true,
    extraPayload: {},
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
    extraPayload: {},
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
    },
  },
  transcribe: {
    endpointUrl: "https://api.siliconflow.cn/v1/audio/transcriptions",
    apiKeyEnv: "SILICONFLOW_API_KEY",
    model: "FunAudioLLM/SenseVoiceSmall",
    systemPrompt: "请将儿童语音内容准确识别为简体中文文本。",
    isEnabled: true,
    extraPayload: {},
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

export async function resolveAiModeConfig(
  modeKey: "coding" | "writing" | "painting" | "transcribe",
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
          : modeKey === "transcribe"
            ? resolveTranscribeEndpoint(dbConfig.endpoint_url)
            : ensureAbsoluteEndpoint(dbConfig.endpoint_url, fallback.endpointUrl),
      apiKeyEnv: dbConfig.api_key_env,
      model: dbConfig.model,
      systemPrompt: dbConfig.system_prompt,
      isEnabled: dbConfig.is_enabled,
      extraPayload: dbConfig.extra_payload ?? {},
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
