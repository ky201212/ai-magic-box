import "server-only";
import crypto from "node:crypto";
import { getSiteSettingValue } from "@/lib/admin-data";
import { consumeRateLimit } from "@/lib/rate-limit";
import { hashOtpCode } from "@/lib/auth";

export type HumanVerificationProvider = "builtin" | "turnstile" | "disabled";
export type TurnstileWidgetMode = "managed" | "non-interactive" | "invisible";

export type SmsAuthRiskControlSetting = {
  humanVerificationProvider: HumanVerificationProvider;
  captchaLength: number;
  captchaExpiresSeconds: number;
  captchaMaxAttempts: number;
  captchaIssuePerIpWindowSeconds: number;
  captchaIssuePerIpLimit: number;
  turnstileSiteKey: string;
  turnstileWidgetMode: TurnstileWidgetMode;
  otpExpiresMinutes: number;
  resendCooldownSeconds: number;
  maxSendsPerPhonePerHour: number;
  maxSendsPerPhonePerDay: number;
  sendPerIpWindowSeconds: number;
  sendPerIpLimit: number;
  maxVerifyAttemptsPerCode: number;
  verifyPerIpWindowSeconds: number;
  verifyPerIpLimit: number;
};

type CaptchaChallengeRecord = {
  id: string;
  ip: string;
  answerHash: string;
  expiresAt: number;
  failedAttempts: number;
};

type CaptchaIssueResult =
  | {
      allowed: true;
      challengeId: string;
      imageDataUrl: string;
      expiresInSeconds: number;
    }
  | {
      allowed: false;
      retryAfterSeconds: number;
    };

type CaptchaVerifyResult = {
  ok: boolean;
  error?: string;
};

export type SmsHumanVerificationBootstrap =
  | {
      enabled: false;
      provider: "disabled";
    }
  | {
      enabled: true;
      provider: "builtin";
      challengeId: string;
      imageDataUrl: string;
      expiresInSeconds: number;
    }
  | {
      enabled: true;
      provider: "turnstile";
      siteKey: string;
      widgetMode: TurnstileWidgetMode;
    };

declare global {
  var __magicCaptchaStore__:
    | Map<string, CaptchaChallengeRecord>
    | undefined;
}

const SMS_AUTH_RISK_CONTROL_DEFAULTS: SmsAuthRiskControlSetting = {
  humanVerificationProvider: "builtin",
  captchaLength: 4,
  captchaExpiresSeconds: 180,
  captchaMaxAttempts: 5,
  captchaIssuePerIpWindowSeconds: 600,
  captchaIssuePerIpLimit: 30,
  turnstileSiteKey: "",
  turnstileWidgetMode: "managed",
  otpExpiresMinutes: 5,
  resendCooldownSeconds: 60,
  maxSendsPerPhonePerHour: 5,
  maxSendsPerPhonePerDay: 10,
  sendPerIpWindowSeconds: 600,
  sendPerIpLimit: 12,
  maxVerifyAttemptsPerCode: 5,
  verifyPerIpWindowSeconds: 600,
  verifyPerIpLimit: 20,
};

const CAPTCHA_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function clampInteger(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) {
  const normalized = Number(value);

  if (!Number.isFinite(normalized)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(normalized)));
}

function toBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") {
    return value;
  }

  return fallback;
}

function normalizeProvider(value: unknown): HumanVerificationProvider {
  if (value === "turnstile" || value === "builtin" || value === "disabled") {
    return value;
  }

  if (toBoolean(value, true)) {
    return "builtin";
  }

  return "disabled";
}

function normalizeTurnstileWidgetMode(value: unknown): TurnstileWidgetMode {
  if (
    value === "managed" ||
    value === "non-interactive" ||
    value === "invisible"
  ) {
    return value;
  }

  return "managed";
}

function getCaptchaStore() {
  if (!globalThis.__magicCaptchaStore__) {
    globalThis.__magicCaptchaStore__ = new Map<string, CaptchaChallengeRecord>();
  }

  return globalThis.__magicCaptchaStore__;
}

function cleanupCaptchaStore() {
  const store = getCaptchaStore();
  const now = Date.now();

  for (const [challengeId, challenge] of store.entries()) {
    if (challenge.expiresAt <= now) {
      store.delete(challengeId);
    }
  }

  return store;
}

function randomCaptchaText(length: number) {
  const bytes = crypto.randomBytes(length);

  return Array.from(bytes, (byte) => CAPTCHA_CHARSET[byte % CAPTCHA_CHARSET.length])
    .join("")
    .slice(0, length);
}

function createCaptchaSvg(text: string) {
  const width = 160;
  const height = 58;
  const chars = text.split("");
  const lines = Array.from({ length: 6 }, (_, index) => {
    const x1 = (index * 29 + 13) % width;
    const y1 = (index * 17 + 9) % height;
    const x2 = (index * 37 + 41) % width;
    const y2 = (index * 19 + 31) % height;
    const opacity = 0.16 + index * 0.06;

    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(98,92,255,${opacity.toFixed(
      2,
    )})" stroke-width="1.5" />`;
  }).join("");
  const dots = Array.from({ length: 18 }, (_, index) => {
    const cx = (index * 19 + 11) % width;
    const cy = (index * 23 + 7) % height;
    const radius = 1 + (index % 3) * 0.6;
    const fill =
      index % 2 === 0
        ? "rgba(255,132,178,0.26)"
        : "rgba(92,116,189,0.22)";

    return `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${fill}" />`;
  }).join("");
  const labels = chars
    .map((char, index) => {
      const x = 26 + index * 30;
      const y = 37 + (index % 2 === 0 ? -3 : 4);
      const rotate = index % 2 === 0 ? -10 : 8;

      return `<text x="${x}" y="${y}" transform="rotate(${rotate} ${x} ${y})" fill="#18213f" font-size="28" font-family="Verdana, Arial, sans-serif" font-weight="700" letter-spacing="2">${char}</text>`;
    })
    .join("");

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="图形验证码">
      <defs>
        <linearGradient id="captchaBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="100%" stop-color="#eef4ff" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" rx="18" fill="url(#captchaBg)" />
      <rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="17" fill="none" stroke="rgba(188,202,255,0.9)" />
      ${dots}
      ${lines}
      ${labels}
    </svg>
  `.trim();
}

function toImageDataUrl(svg: string) {
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

function normalizeCaptchaAnswer(value: string) {
  return value.trim().toUpperCase();
}

export async function getSmsAuthRiskControlSetting() {
  const setting = await getSiteSettingValue<
    Partial<SmsAuthRiskControlSetting> & { captchaEnabled?: boolean }
  >("auth.sms-risk-control", SMS_AUTH_RISK_CONTROL_DEFAULTS);

  return {
    humanVerificationProvider: normalizeProvider(
      setting.humanVerificationProvider ?? setting.captchaEnabled,
    ),
    captchaLength: clampInteger(
      setting.captchaLength,
      SMS_AUTH_RISK_CONTROL_DEFAULTS.captchaLength,
      4,
      6,
    ),
    captchaExpiresSeconds: clampInteger(
      setting.captchaExpiresSeconds,
      SMS_AUTH_RISK_CONTROL_DEFAULTS.captchaExpiresSeconds,
      60,
      600,
    ),
    captchaMaxAttempts: clampInteger(
      setting.captchaMaxAttempts,
      SMS_AUTH_RISK_CONTROL_DEFAULTS.captchaMaxAttempts,
      1,
      10,
    ),
    captchaIssuePerIpWindowSeconds: clampInteger(
      setting.captchaIssuePerIpWindowSeconds,
      SMS_AUTH_RISK_CONTROL_DEFAULTS.captchaIssuePerIpWindowSeconds,
      60,
      3600,
    ),
    captchaIssuePerIpLimit: clampInteger(
      setting.captchaIssuePerIpLimit,
      SMS_AUTH_RISK_CONTROL_DEFAULTS.captchaIssuePerIpLimit,
      1,
      500,
    ),
    turnstileSiteKey:
      typeof setting.turnstileSiteKey === "string"
        ? setting.turnstileSiteKey.trim()
        : SMS_AUTH_RISK_CONTROL_DEFAULTS.turnstileSiteKey,
    turnstileWidgetMode: normalizeTurnstileWidgetMode(
      setting.turnstileWidgetMode,
    ),
    otpExpiresMinutes: clampInteger(
      setting.otpExpiresMinutes,
      SMS_AUTH_RISK_CONTROL_DEFAULTS.otpExpiresMinutes,
      1,
      30,
    ),
    resendCooldownSeconds: clampInteger(
      setting.resendCooldownSeconds,
      SMS_AUTH_RISK_CONTROL_DEFAULTS.resendCooldownSeconds,
      10,
      600,
    ),
    maxSendsPerPhonePerHour: clampInteger(
      setting.maxSendsPerPhonePerHour,
      SMS_AUTH_RISK_CONTROL_DEFAULTS.maxSendsPerPhonePerHour,
      1,
      50,
    ),
    maxSendsPerPhonePerDay: clampInteger(
      setting.maxSendsPerPhonePerDay,
      SMS_AUTH_RISK_CONTROL_DEFAULTS.maxSendsPerPhonePerDay,
      1,
      200,
    ),
    sendPerIpWindowSeconds: clampInteger(
      setting.sendPerIpWindowSeconds,
      SMS_AUTH_RISK_CONTROL_DEFAULTS.sendPerIpWindowSeconds,
      60,
      3600,
    ),
    sendPerIpLimit: clampInteger(
      setting.sendPerIpLimit,
      SMS_AUTH_RISK_CONTROL_DEFAULTS.sendPerIpLimit,
      1,
      500,
    ),
    maxVerifyAttemptsPerCode: clampInteger(
      setting.maxVerifyAttemptsPerCode,
      SMS_AUTH_RISK_CONTROL_DEFAULTS.maxVerifyAttemptsPerCode,
      1,
      20,
    ),
    verifyPerIpWindowSeconds: clampInteger(
      setting.verifyPerIpWindowSeconds,
      SMS_AUTH_RISK_CONTROL_DEFAULTS.verifyPerIpWindowSeconds,
      60,
      3600,
    ),
    verifyPerIpLimit: clampInteger(
      setting.verifyPerIpLimit,
      SMS_AUTH_RISK_CONTROL_DEFAULTS.verifyPerIpLimit,
      1,
      500,
    ),
  };
}

function getTurnstileSecret() {
  const secret =
    process.env.TURNSTILE_SECRET_KEY ??
    process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;

  return secret?.trim() || "";
}

function getEffectiveVerificationProvider(settings: SmsAuthRiskControlSetting) {
  if (settings.humanVerificationProvider === "disabled") {
    return "disabled" as const;
  }

  if (
    settings.humanVerificationProvider === "turnstile" &&
    settings.turnstileSiteKey
  ) {
    return "turnstile" as const;
  }

  return "builtin" as const;
}

export async function issueSmsCaptchaChallenge(
  ip: string,
  settings: SmsAuthRiskControlSetting,
): Promise<CaptchaIssueResult> {
  const rateLimitResult = consumeRateLimit({
    key: `auth:captcha:issue:${ip}`,
    limit: settings.captchaIssuePerIpLimit,
    windowMs: settings.captchaIssuePerIpWindowSeconds * 1000,
  });

  if (!rateLimitResult.allowed) {
    return {
      allowed: false,
      retryAfterSeconds: rateLimitResult.retryAfterSeconds,
    };
  }

  const code = randomCaptchaText(settings.captchaLength);
  const challengeId = crypto.randomUUID();
  const answerHash = await hashOtpCode(normalizeCaptchaAnswer(code));
  const store = cleanupCaptchaStore();

  store.set(challengeId, {
    id: challengeId,
    ip,
    answerHash,
    expiresAt: Date.now() + settings.captchaExpiresSeconds * 1000,
    failedAttempts: 0,
  });

  return {
    allowed: true,
    challengeId,
    imageDataUrl: toImageDataUrl(createCaptchaSvg(code)),
    expiresInSeconds: settings.captchaExpiresSeconds,
  };
}

async function verifyBuiltinCaptchaChallenge(input: {
  challengeId?: string;
  answer?: string;
  ip: string;
  settings: SmsAuthRiskControlSetting;
}): Promise<CaptchaVerifyResult> {
  const answer = normalizeCaptchaAnswer(input.answer ?? "");

  if (!input.challengeId || !answer) {
    return {
      ok: false,
      error: "请先完成图形验证码，再获取短信验证码。",
    };
  }

  const store = cleanupCaptchaStore();
  const challenge = store.get(input.challengeId);

  if (!challenge) {
    return {
      ok: false,
      error: "图形验证码已失效，请刷新后重试。",
    };
  }

  if (challenge.expiresAt <= Date.now()) {
    store.delete(input.challengeId);
    return {
      ok: false,
      error: "图形验证码已过期，请重新获取。",
    };
  }

  if (challenge.ip !== input.ip) {
    store.delete(input.challengeId);
    return {
      ok: false,
      error: "图形验证码校验环境已变化，请重新获取。",
    };
  }

  if (challenge.failedAttempts >= input.settings.captchaMaxAttempts) {
    store.delete(input.challengeId);
    return {
      ok: false,
      error: "图形验证码尝试次数过多，请刷新后再试。",
    };
  }

  const answerHash = await hashOtpCode(answer);

  if (answerHash !== challenge.answerHash) {
    challenge.failedAttempts += 1;

    if (challenge.failedAttempts >= input.settings.captchaMaxAttempts) {
      store.delete(input.challengeId);
      return {
        ok: false,
        error: "图形验证码尝试次数过多，请刷新后再试。",
      };
    }

    store.set(input.challengeId, challenge);

    return {
      ok: false,
      error: "图形验证码不正确，请重新输入。",
    };
  }

  store.delete(input.challengeId);
  return { ok: true };
}

export async function getSmsHumanVerificationBootstrap(
  ip: string,
  settings: SmsAuthRiskControlSetting,
): Promise<SmsHumanVerificationBootstrap> {
  const provider = getEffectiveVerificationProvider(settings);

  if (provider === "disabled") {
    return {
      enabled: false,
      provider: "disabled",
    };
  }

  if (provider === "turnstile") {
    return {
      enabled: true,
      provider: "turnstile",
      siteKey: settings.turnstileSiteKey,
      widgetMode: settings.turnstileWidgetMode,
    };
  }

  const issueResult = await issueSmsCaptchaChallenge(ip, settings);

  if (!issueResult.allowed) {
    throw new Error(
      `图形验证码刷新太频繁了，请 ${issueResult.retryAfterSeconds} 秒后再试。`,
    );
  }

  return {
    enabled: true,
    provider: "builtin",
    challengeId: issueResult.challengeId,
    imageDataUrl: issueResult.imageDataUrl,
    expiresInSeconds: issueResult.expiresInSeconds,
  };
}

async function verifyTurnstileToken(input: {
  token?: string;
  ip: string;
}): Promise<CaptchaVerifyResult> {
  if (!input.token?.trim()) {
    return {
      ok: false,
      error: "请先完成人机验证，再获取短信验证码。",
    };
  }

  const secret = getTurnstileSecret();

  if (!secret) {
    return {
      ok: false,
      error: "管理员还没有完成 Turnstile 密钥配置，请先补齐 Secret Key。",
    };
  }

  const body = new URLSearchParams({
    secret,
    response: input.token.trim(),
    remoteip: input.ip,
    idempotency_key: crypto.randomUUID(),
  });

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return {
      ok: false,
      error: "人机验证服务暂时不可用，请稍后再试。",
    };
  }

  const result = (await response.json()) as {
    success?: boolean;
    "error-codes"?: string[];
  };

  if (result.success) {
    return { ok: true };
  }

  const errorCode = result["error-codes"]?.[0] ?? "unknown";
  const errorMessageMap: Record<string, string> = {
    "missing-input-response": "请先完成人机验证，再获取短信验证码。",
    "invalid-input-response": "人机验证已失效，请重新勾选验证框。",
    "timeout-or-duplicate": "人机验证已过期或已使用，请重新勾选验证框。",
    "invalid-input-secret": "管理员配置的 Turnstile Secret Key 无效，请检查后台配置。",
    "missing-input-secret": "管理员还没有配置 Turnstile Secret Key。",
  };

  return {
    ok: false,
    error:
      errorMessageMap[errorCode] ??
      "人机验证没有通过，请重新勾选验证框后再试。",
  };
}

export async function verifySmsCaptchaChallenge(input: {
  challengeId?: string;
  answer?: string;
  turnstileToken?: string;
  ip: string;
  settings: SmsAuthRiskControlSetting;
}): Promise<CaptchaVerifyResult> {
  const provider = getEffectiveVerificationProvider(input.settings);

  if (provider === "disabled") {
    return { ok: true };
  }

  if (provider === "turnstile") {
    return verifyTurnstileToken({
      token: input.turnstileToken,
      ip: input.ip,
    });
  }

  return verifyBuiltinCaptchaChallenge(input);
}
