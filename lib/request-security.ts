import { NextResponse } from "next/server";
import { consumeRateLimit, getRequestIp } from "@/lib/rate-limit";

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function getPrimaryHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim().toLowerCase() ?? "";
}

function getExpectedHost(request: Request) {
  return (
    getPrimaryHeaderValue(request.headers.get("x-forwarded-host")) ||
    getPrimaryHeaderValue(request.headers.get("host"))
  );
}

function getSourceHost(request: Request) {
  const origin = request.headers.get("origin");

  if (origin) {
    try {
      return new URL(origin).host.toLowerCase();
    } catch {
      return "";
    }
  }

  const referer = request.headers.get("referer");

  if (!referer) {
    return "";
  }

  try {
    return new URL(referer).host.toLowerCase();
  } catch {
    return "";
  }
}

export function isProtectedWriteMethod(method: string) {
  return WRITE_METHODS.has(method.toUpperCase());
}

export function isSameOriginRequest(request: Request) {
  const expectedHost = getExpectedHost(request);
  const sourceHost = getSourceHost(request);

  if (!expectedHost || !sourceHost) {
    return false;
  }

  return expectedHost === sourceHost;
}

export function rejectUnsafeWriteOrigin(
  request: Request,
  errorMessage = "请求来源不安全，已拒绝。",
) {
  if (!isProtectedWriteMethod(request.method)) {
    return null;
  }

  if (isSameOriginRequest(request)) {
    return null;
  }

  return NextResponse.json({ error: errorMessage }, { status: 403 });
}

export function rejectWhenRateLimited(input: {
  request: Request;
  scope: string;
  limit: number;
  windowMs: number;
  userId?: string | null;
  message?: string;
}) {
  const { request, scope, limit, windowMs, userId, message } = input;
  const ip = getRequestIp(request);
  const keys = [];

  if (userId?.trim()) {
    keys.push(`rate-limit:${scope}:user:${userId.trim()}`);
  }

  if (ip && ip !== "unknown") {
    keys.push(`rate-limit:${scope}:ip:${ip}`);
  }

  if (!keys.length) {
    keys.push(`rate-limit:${scope}:fallback:unknown`);
  }

  for (const key of keys) {
    const result = consumeRateLimit({
      key,
      limit,
      windowMs,
    });

    if (!result.allowed) {
      return NextResponse.json(
        {
          error:
            message ??
            `请求过于频繁，请 ${result.retryAfterSeconds} 秒后再试。`,
        },
        { status: 429 },
      );
    }
  }

  return null;
}
