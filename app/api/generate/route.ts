import { NextResponse } from "next/server";

const AI_API_URL =
  process.env.AI_API_URL ??
  "https://token-plan-cn.xiaomimimo.com/v1/chat/completions";

const SYSTEM_PROMPT = `
你是一个充满童心的少儿编程导师和前端魔法师。
请根据用户输入的魔法咒语，生成一个可以在浏览器直接运行的单文件 HTML 代码。
里面必须包含必要的 CSS，并通过 CDN 引入 Tailwind CSS，还要包含 JavaScript 交互。
界面风格要可爱、充满童趣，宽度必须 100% 适配手机屏幕。
核心要求：生成的页面内容如果较长，必须允许用户垂直滑动浏览。绝对禁止在 body 或 html 标签上使用 overflow: hidden 或固定 100vh 高度从而阻断用户滚动。
重要要求：只返回纯 HTML 代码，绝对不要包含任何 Markdown 格式符号（如 \`\`\`html），也不要任何解释性文字。
`;

const WRITING_SYSTEM_PROMPT = `
你是一位充满童心、温柔又专业的少儿写作导师。
请根据用户输入的写作需求，生成适合中小学生阅读和使用的中文写作内容。
要求语言优美、生动、有画面感，同时保持自然、真诚、易懂。
如果用户要童话，就写得温暖有想象力；如果用户要诗歌，就写得有节奏和意境；如果用户要演讲稿，就写得自信、清晰、有感染力。
重要要求：只返回最终的纯文本内容，绝对不要包含 Markdown 代码块、标题符号、解释说明、创作分析或多余前后缀。
`;

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

export async function POST(request: Request) {
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

    if (!process.env.AI_API_KEY) {
      return NextResponse.json(
        { error: "服务端缺少 AI_API_KEY 环境变量。" },
        { status: 500 },
      );
    }

    const resolvedMode = mode === "writing" ? "writing" : "coding";

    const upstreamResponse = await fetch(AI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "mimo-v2.5-pro",
        messages: [
          {
            role: "system",
            content:
              resolvedMode === "writing"
                ? WRITING_SYSTEM_PROMPT
                : SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!upstreamResponse.ok) {
      const errorData = await upstreamResponse.text();
      console.error("【小米API报错详情】:", errorData);

      return NextResponse.json(
        {
          error: errorData || "上游大模型接口请求失败，请稍后再试。",
        },
        { status: upstreamResponse.status },
      );
    }

    const data = (await upstreamResponse.json()) as ChatCompletionResponse;

    const generatedContent = data.choices?.[0]?.message?.content?.trim();

    if (!generatedContent) {
      return NextResponse.json(
        { error: "模型没有返回可用的内容。" },
        { status: 502 },
      );
    }

    return NextResponse.json({ code: generatedContent });
  } catch {
    return NextResponse.json(
      { error: "生成接口暂时出了点小状况，请稍后再试。" },
      { status: 500 },
    );
  }
}
