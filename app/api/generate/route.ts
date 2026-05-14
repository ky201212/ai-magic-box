import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { resolveAiModeConfig, resolveModeCreditPolicy } from "@/lib/ai-config";
import { addCredits, consumeCredits } from "@/lib/credits";

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

    const resolvedMode = mode === "writing" ? "writing" : "coding";
    const aiConfig = await resolveAiModeConfig(resolvedMode);
    const apiKey = process.env[aiConfig.apiKeyEnv];
    const { creditEnabled, creditCost } = resolveModeCreditPolicy(
      aiConfig.extraPayload,
    );
    const shouldCharge = creditEnabled && creditCost > 0;
    let remainingCredits: number | undefined;
    let chargedUserId: string | null = null;

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

    const upstreamResponse = await fetch(aiConfig.endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: aiConfig.model,
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
      }),
    });

    if (!upstreamResponse.ok) {
      const errorData = await upstreamResponse.text();
      console.error("【小米API报错详情】:", errorData);

      if (shouldCharge && chargedUserId) {
        remainingCredits = await addCredits(chargedUserId, creditCost, {
          reasonCode: resolvedMode === "writing" ? "writing_refund" : "coding_refund",
          reasonLabel:
            resolvedMode === "writing" ? "AI写作失败退回" : "AI编程失败退回",
          note:
            resolvedMode === "writing"
              ? `AI 写作生成失败，退回 ${creditCost} 个魔法币。`
              : `AI 编程生成失败，退回 ${creditCost} 个魔法币。`,
        });
      }

      return NextResponse.json(
        {
          error: errorData || "上游大模型接口请求失败，请稍后再试。",
          remainingCredits,
        },
        { status: upstreamResponse.status },
      );
    }

    const data = (await upstreamResponse.json()) as ChatCompletionResponse;

    const generatedContent = data.choices?.[0]?.message?.content?.trim();

    if (!generatedContent) {
      if (shouldCharge && chargedUserId) {
        remainingCredits = await addCredits(chargedUserId, creditCost, {
          reasonCode: resolvedMode === "writing" ? "writing_refund" : "coding_refund",
          reasonLabel:
            resolvedMode === "writing" ? "AI写作失败退回" : "AI编程失败退回",
          note:
            resolvedMode === "writing"
              ? `AI 写作未返回有效内容，退回 ${creditCost} 个魔法币。`
              : `AI 编程未返回有效内容，退回 ${creditCost} 个魔法币。`,
        });
      }

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
    console.error("【生成接口异常】:", error);
    return NextResponse.json(
      { error: "生成接口暂时出了点小状况，请稍后再试。" },
      { status: 500 },
    );
  }
}
