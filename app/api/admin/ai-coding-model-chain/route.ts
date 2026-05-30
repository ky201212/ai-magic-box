import { NextResponse } from "next/server";
import {
  clearAiModelCooldown,
  getAiModelChainStats,
} from "@/lib/admin-data";
import {
  requireAdminContext,
  requireAiSecretManagerPermission,
  requirePermission,
} from "@/lib/admin";
import { getAiSecret } from "@/lib/ai-secrets";

function resolveHealthCheckEndpoint(endpointUrl: string) {
  const trimmed = endpointUrl.trim();
  const normalized = trimmed.toLowerCase();

  if (!trimmed) {
    return "";
  }

  if (normalized.endsWith("/chat/completions")) {
    return trimmed;
  }

  if (normalized.endsWith("/v1")) {
    return `${trimmed}/chat/completions`;
  }

  if (normalized.endsWith("/v1/")) {
    return `${trimmed}chat/completions`;
  }

  return trimmed;
}

export async function GET() {
  const { error, adminContext } = await requireAdminContext();

  if (error || !adminContext) {
    return error;
  }

  const permissionError = requirePermission(adminContext, "ai_configs");

  if (permissionError) {
    return permissionError;
  }

  try {
    const stats = await getAiModelChainStats("coding");
    return NextResponse.json({ stats });
  } catch (requestError) {
    console.error("【AI 编程模型接力统计读取失败】:", requestError);

    return NextResponse.json(
      { error: "AI 编程模型接力统计读取失败，请稍后再试。" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const { error, adminContext } = await requireAdminContext();

  if (error || !adminContext) {
    return error;
  }

  const permissionError = requirePermission(adminContext, "ai_configs");

  if (permissionError) {
    return permissionError;
  }

  const secretPermissionError = requireAiSecretManagerPermission(adminContext);

  if (secretPermissionError) {
    return secretPermissionError;
  }

  try {
    const body = (await request.json()) as
      | {
          action?: "clearCooldown";
          modeKey?: string;
          slot?: "A" | "B" | "C";
        }
      | {
          action?: "healthCheck";
          modeKey?: string;
          candidates?: Array<{
            slot: "A" | "B" | "C";
            label: string;
            provider?: string;
            endpointUrl: string;
            apiKeyEnv: string;
            model: string;
          }>;
        };

    if (body.action === "clearCooldown") {
      const modeKey =
        typeof body.modeKey === "string" && body.modeKey.trim()
          ? body.modeKey.trim()
          : "coding";

      if (body.slot !== "A" && body.slot !== "B" && body.slot !== "C") {
        return NextResponse.json(
          { error: "缺少要解除熔断的模型档位。" },
          { status: 400 },
        );
      }

      const stats = await clearAiModelCooldown(modeKey, body.slot);
      return NextResponse.json({ success: true, stats });
    }

    if (body.action === "healthCheck") {
      const candidates = Array.isArray(body.candidates) ? body.candidates : [];

      if (!candidates.length) {
        return NextResponse.json(
          { error: "没有收到要体检的模型列表。" },
          { status: 400 },
        );
      }

      const results = await Promise.all(
        candidates.map(async (candidate) => {
          const apiKey = await getAiSecret(candidate.apiKeyEnv.trim());

          if (!apiKey) {
            return {
              slot: candidate.slot,
              label: candidate.label,
              model: candidate.model,
              ok: false,
              message: `缺少 ${candidate.apiKeyEnv} 密钥。`,
            };
          }

          const endpoint = resolveHealthCheckEndpoint(candidate.endpointUrl);

          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            const response = await fetch(endpoint, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: candidate.model,
                messages: [
                  {
                    role: "system",
                    content: "请返回 OK",
                  },
                  {
                    role: "user",
                    content: "ping",
                  },
                ],
                max_tokens: 1,
              }),
              cache: "no-store",
              signal: controller.signal,
            });
            clearTimeout(timeoutId);

            const rawText = await response.text();

            return {
              slot: candidate.slot,
              label: candidate.label,
              model: candidate.model,
              ok: response.ok,
              status: response.status,
              message: response.ok
                ? "连通正常"
                : rawText.slice(0, 180) || `HTTP ${response.status}`,
            };
          } catch (healthError) {
            return {
              slot: candidate.slot,
              label: candidate.label,
              model: candidate.model,
              ok: false,
              message:
                healthError instanceof Error
                  ? healthError.message
                  : "连通性检测失败",
            };
          }
        }),
      );

      return NextResponse.json({ results });
    }

    return NextResponse.json(
      { error: "不支持的操作类型。" },
      { status: 400 },
    );
  } catch (requestError) {
    console.error("【AI 编程模型接力管理失败】:", requestError);

    return NextResponse.json(
      { error: "AI 编程模型接力管理失败，请稍后再试。" },
      { status: 500 },
    );
  }
}
