import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
};

type PersistentRateLimitResult = {
  allowed?: boolean;
  retry_after_seconds?: number | string;
  remaining?: number | string;
};

declare global {
  var __magicRateLimitStore__: Map<string, RateLimitBucket> | undefined;
}

function getStore() {
  if (!globalThis.__magicRateLimitStore__) {
    globalThis.__magicRateLimitStore__ = new Map<string, RateLimitBucket>();
  }

  return globalThis.__magicRateLimitStore__;
}

function cleanupExpiredBuckets(store: Map<string, RateLimitBucket>, now: number) {
  for (const [key, bucket] of store.entries()) {
    if (bucket.resetAt <= now) {
      store.delete(key);
    }
  }
}

function consumeMemoryRateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
}): RateLimitResult {
  const now = Date.now();
  const store = getStore();
  cleanupExpiredBuckets(store, now);

  const existingBucket = store.get(input.key);

  if (!existingBucket || existingBucket.resetAt <= now) {
    store.set(input.key, {
      count: 1,
      resetAt: now + input.windowMs,
    });

    return {
      allowed: true,
      retryAfterSeconds: 0,
      remaining: Math.max(0, input.limit - 1),
    };
  }

  if (existingBucket.count >= input.limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((existingBucket.resetAt - now) / 1000),
      ),
      remaining: 0,
    };
  }

  existingBucket.count += 1;
  store.set(input.key, existingBucket);

  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: Math.max(0, input.limit - existingBucket.count),
  };
}

function shouldUsePersistentRateLimit() {
  return Boolean(
    process.env.SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() &&
      process.env.DISABLE_PERSISTENT_RATE_LIMIT !== "true",
  );
}

function isMissingPersistentRateLimit(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code =
    "code" in error && typeof error.code === "string" ? error.code : "";
  const message =
    "message" in error && typeof error.message === "string" ? error.message : "";

  return (
    code === "PGRST202" ||
    code === "PGRST204" ||
    code === "PGRST205" ||
    code === "42P01" ||
    code === "42883" ||
    message.includes("consume_rate_limit_bucket") ||
    message.includes("rate_limit_buckets")
  );
}

export async function consumeRateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
}): Promise<RateLimitResult> {
  if (!shouldUsePersistentRateLimit()) {
    return consumeMemoryRateLimit(input);
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc(
      "consume_rate_limit_bucket" as never,
      {
        bucket_key: input.key,
        bucket_limit: input.limit,
        bucket_window_seconds: Math.max(1, Math.ceil(input.windowMs / 1000)),
      } as never,
    );

    if (error) {
      throw error;
    }

    const typedData = data as PersistentRateLimitResult[] | PersistentRateLimitResult | null;
    const result = Array.isArray(typedData) ? typedData[0] : typedData;

    if (!result) {
      return consumeMemoryRateLimit(input);
    }

    return {
      allowed: Boolean(result.allowed),
      retryAfterSeconds: Math.max(0, Number(result.retry_after_seconds) || 0),
      remaining: Math.max(0, Number(result.remaining) || 0),
    };
  } catch (error) {
    if (!isMissingPersistentRateLimit(error)) {
      console.warn("持久化限流暂不可用，已回退到本机内存限流。", error);
    }

    return consumeMemoryRateLimit(input);
  }
}

export function getRequestIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
