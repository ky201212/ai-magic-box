import "server-only";

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
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

export function consumeRateLimit(input: {
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

export function getRequestIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
