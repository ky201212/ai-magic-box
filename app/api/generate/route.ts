import http from "node:http";
import { randomUUID } from "node:crypto";
import https from "node:https";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { resolveAiModeConfig, resolveModeCreditPolicy } from "@/lib/ai-config";
import { addCredits, consumeCredits } from "@/lib/credits";
import { getAiSecret } from "@/lib/ai-secrets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

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

function buildPromptPreview(input: string) {
  const normalized = input.replace(/\s+/g, " ").trim();
  return normalized.length > 120
    ? `${normalized.slice(0, 120)}...`
    : normalized;
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
    return 240_000;
  }

  return Math.max(10_000, Math.floor(parsedValue));
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
}) {
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= input.retries; attempt += 1) {
    try {
      const response = await requestUpstreamJson({
        endpoint: input.endpoint,
        apiKey: input.apiKey,
        body: input.body,
        timeoutMs: input.timeoutMs,
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

export async function POST(request: Request) {
  const requestId =
    request.headers.get("x-request-id")?.trim() || randomUUID();
  let shouldCharge = false;
  let creditCost = 0;
  let resolvedMode: "coding" | "writing" = "coding";
  let remainingCredits: number | undefined;
  let chargedUserId: string | null = null;
  let requestPrompt = "";
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

    requestPrompt = prompt.trim();
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
      tokenClampApplied:
        configuredMaxCompletionTokens !== null &&
        configuredMaxCompletionTokens !== effectiveMaxCompletionTokens,
    });

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
            max_output_tokens: effectiveMaxCompletionTokens,
            input: [
              {
                role: "system",
                content: aiConfig.systemPrompt,
              },
              {
                role: "user",
                content: requestPrompt,
              },
            ],
          }
        : {
            model: aiConfig.model,
            max_tokens: effectiveMaxCompletionTokens,
            messages: [
              {
                role: "system",
                content: aiConfig.systemPrompt,
              },
              {
                role: "user",
                content: requestPrompt,
              },
            ],
          },
    );
    const upstreamResponse = await requestUpstreamJsonWithRetry({
      endpoint: requestEndpoint,
      apiKey,
      body: upstreamPayload,
      timeoutMs: requestTimeoutMs,
      retries: resolvedMode === "coding" ? 2 : 1,
    });

    traceGenerate("log", "upstream_response", traceContext, {
      upstreamStatus: upstreamResponse.status,
      responseBytes: upstreamResponse.text.length,
    });

    const upstreamText = upstreamResponse.text;
    const upstreamData = parsePossibleJson(upstreamText);

    if (upstreamResponse.status < 200 || upstreamResponse.status >= 300) {
      traceGenerate("error", "upstream_error_status", traceContext, {
        upstreamStatus: upstreamResponse.status,
        upstreamBodyPreview:
          upstreamText.length > 500
            ? `${upstreamText.slice(0, 500)}...`
            : upstreamText,
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

      if (resolvedMode === "coding") {
        traceGenerate("warn", "coding_degraded_upstream_status", traceContext, {
          upstreamStatus: upstreamResponse.status,
          degradedReason: upstreamErrorMessage,
        });

        const response = NextResponse.json({
          code: buildCodingFallbackHtml(requestPrompt),
          remainingCredits,
          degraded: true,
          degradedReason: upstreamErrorMessage,
          requestId,
        });
        response.headers.set("x-ai-request-id", requestId);
        return response;
      }

      const response = NextResponse.json(
        {
          error: upstreamErrorMessage,
          remainingCredits,
          requestId,
        },
        { status: mapUpstreamStatusToGatewayStatus(upstreamResponse.status) },
      );
      response.headers.set("x-ai-request-id", requestId);
      return response;
    }

    if (!upstreamData) {
      traceGenerate("error", "upstream_non_json", traceContext, {
        upstreamBodyPreview:
          upstreamText.length > 500
            ? `${upstreamText.slice(0, 500)}...`
            : upstreamText,
      });

      await refundCredits(
        resolvedMode === "writing"
          ? `AI 写作未返回有效数据，退回 ${creditCost} 个魔法币。`
          : `AI 编程未返回有效数据，退回 ${creditCost} 个魔法币。`,
      );

      if (resolvedMode === "coding") {
        traceGenerate("warn", "coding_degraded_non_json", traceContext, {
          degradedReason: buildNonJsonResponseMessage(aiConfig.endpointUrl),
        });

        const response = NextResponse.json({
          code: buildCodingFallbackHtml(requestPrompt),
          remainingCredits,
          degraded: true,
          degradedReason: buildNonJsonResponseMessage(aiConfig.endpointUrl),
          requestId,
        });
        response.headers.set("x-ai-request-id", requestId);
        return response;
      }

      const response = NextResponse.json(
        {
          error: buildNonJsonResponseMessage(aiConfig.endpointUrl),
          remainingCredits,
          requestId,
        },
        { status: 502 },
      );
      response.headers.set("x-ai-request-id", requestId);
      return response;
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

      if (resolvedMode === "coding") {
        traceGenerate("warn", "coding_degraded_empty_content", traceContext, {
          degradedReason: "模型没有返回可用内容。",
        });

        const response = NextResponse.json({
          code: buildCodingFallbackHtml(requestPrompt),
          remainingCredits,
          degraded: true,
          degradedReason: "模型没有返回可用内容。",
          requestId,
        });
        response.headers.set("x-ai-request-id", requestId);
        return response;
      }

      const response = NextResponse.json(
        { error: "模型没有返回可用的内容。", remainingCredits, requestId },
        { status: 502 },
      );
      response.headers.set("x-ai-request-id", requestId);
      return response;
    }

    traceGenerate("log", "request_succeeded", traceContext, {
      generatedBytes: generatedContent.length,
    });

    const response = NextResponse.json({
      code: generatedContent,
      remainingCredits,
      requestId,
    });
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
          ? "服务器与上游模型连接超时，已自动切换到站内兜底生成。"
          : "生成链路发生异常，已自动切换到站内兜底生成。",
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
