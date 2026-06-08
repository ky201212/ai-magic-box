import "server-only";
import crypto from "node:crypto";

export type PaymentMethod = "mock" | "wechat_pc" | "alipay_pc";

export type PaymentGatewayOrder = {
  orderId: string;
  amount: number;
  title: string;
  detail?: Record<string, unknown>;
};

export type PaymentGatewayCreateResult = {
  channel: PaymentMethod;
  paymentUrl: string;
  qrText: string;
  expiresInSeconds: number;
  provider?: string;
  requestPayload?: Record<string, unknown>;
  responsePayload?: Record<string, unknown>;
};

export type PaymentNotifyPayload = {
  orderId: string;
  tradeNo: string;
  paidAt: string;
  raw: Record<string, unknown>;
  provider?: string;
  buyerAccount?: string | null;
  buyerId?: string | null;
  status?: string | null;
};

export type PaymentQueryResult = {
  orderId: string;
  tradeNo: string | null;
  status: string;
  paidAt: string | null;
  amount: number | null;
  raw: Record<string, unknown>;
  provider?: string;
  buyerAccount?: string | null;
  buyerId?: string | null;
};

export type PaymentRefundResult = {
  orderId: string;
  tradeNo: string | null;
  refundNo: string | null;
  refundAmount: number;
  success: boolean;
  raw: Record<string, unknown>;
  provider?: string;
};

type PaymentGateway = {
  createPayment: (
    order: PaymentGatewayOrder,
    input: {
      returnUrl?: string;
      notifyUrl?: string;
    },
  ) => Promise<PaymentGatewayCreateResult>;
  parseNotifyPayload: (request: Request) => Promise<PaymentNotifyPayload>;
  queryPayment?: (orderId: string) => Promise<PaymentQueryResult>;
  refundPayment?: (input: {
    orderId: string;
    tradeNo?: string | null;
    amount: number;
    reason: string;
    refundRequestId: string;
  }) => Promise<PaymentRefundResult>;
};

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`缺少 ${name} 环境变量。`);
  }

  return value;
}

function normalizePemKey(input: string, type: "public" | "private") {
  const normalized = input.replace(/\\n/g, "\n").trim();

  if (normalized.includes("BEGIN")) {
    return normalized;
  }

  const compact = normalized.replace(/\s+/g, "");

  if (type === "public") {
    return `-----BEGIN PUBLIC KEY-----\n${compact}\n-----END PUBLIC KEY-----`;
  }

  return `-----BEGIN PRIVATE KEY-----\n${compact}\n-----END PRIVATE KEY-----`;
}

function formatAlipayTimestamp(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function buildSignContent(params: Record<string, string>) {
  return Object.entries(params)
    .filter(([, value]) => value !== "")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
}

function signWithAlipayRsa2(content: string) {
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(content, "utf8");
  signer.end();

  return signer.sign(
    normalizePemKey(getRequiredEnv("ALIPAY_PRIVATE_KEY"), "private"),
    "base64",
  );
}

function verifyAlipayRsa2(content: string, signature: string) {
  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(content, "utf8");
  verifier.end();

  return verifier.verify(
    normalizePemKey(getRequiredEnv("ALIPAY_PUBLIC_KEY"), "public"),
    signature,
    "base64",
  );
}

function resolveAbsoluteUrl(value: string) {
  const trimmed = value.trim();

  const resolved = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : (() => {
        const publicSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

        if (!publicSiteUrl) {
          throw new Error(
            `支付回调地址 ${trimmed} 不是完整 URL，且缺少 NEXT_PUBLIC_SITE_URL 环境变量。`,
          );
        }

        return new URL(trimmed, `${publicSiteUrl.replace(/\/+$/, "")}/`).toString();
      })();

  if (process.env.NODE_ENV === "production" && !resolved.startsWith("https://")) {
    throw new Error("生产环境支付回调、返回和站点 URL 必须使用 HTTPS。");
  }

  return resolved;
}

function getAlipayGatewayUrl() {
  const gatewayUrl =
    process.env.ALIPAY_GATEWAY_URL?.trim() || "https://openapi.alipay.com/gateway.do";

  if (
    process.env.NODE_ENV === "production" &&
    gatewayUrl !== "https://openapi.alipay.com/gateway.do"
  ) {
    throw new Error("生产环境 ALIPAY_GATEWAY_URL 必须使用支付宝官方 HTTPS 网关。");
  }

  return gatewayUrl;
}

function getAlipayNotifyUrl() {
  const configured = process.env.ALIPAY_NOTIFY_URL?.trim();
  return resolveAbsoluteUrl(configured || "/api/payment/notify/alipay_pc");
}

function getAlipayReturnUrl(orderId: string) {
  const configured = process.env.ALIPAY_RETURN_URL?.trim() || "/billing";
  const url = new URL(resolveAbsoluteUrl(configured));
  url.searchParams.set("order_id", orderId);
  url.searchParams.set("channel", "alipay_pc");
  return url.toString();
}

function formatAlipayAmount(amountInCents: number) {
  return (Math.max(0, amountInCents) / 100).toFixed(2);
}

function createAlipayPaymentUrl(order: PaymentGatewayOrder, input: {
  returnUrl?: string;
  notifyUrl?: string;
}) {
  const params: Record<string, string> = {
    app_id: getRequiredEnv("ALIPAY_APP_ID"),
    method: "alipay.trade.page.pay",
    format: "JSON",
    charset: "utf-8",
    sign_type: "RSA2",
    timestamp: formatAlipayTimestamp(),
    version: "1.0",
    notify_url: resolveAbsoluteUrl(input.notifyUrl ?? getAlipayNotifyUrl()),
    return_url: resolveAbsoluteUrl(input.returnUrl ?? getAlipayReturnUrl(order.orderId)),
    biz_content: JSON.stringify({
      out_trade_no: order.orderId,
      product_code: "FAST_INSTANT_TRADE_PAY",
      total_amount: formatAlipayAmount(order.amount),
      subject: order.title.slice(0, 128),
    }),
  };

  const signContent = buildSignContent(params);
  const signature = signWithAlipayRsa2(signContent);
  const query = new URLSearchParams(params);
  query.set("sign", signature);
  return `${getAlipayGatewayUrl()}?${query.toString()}`;
}

async function requestAlipayOpenApi<T extends Record<string, unknown>>(
  method: string,
  bizContent: Record<string, unknown>,
) {
  const params: Record<string, string> = {
    app_id: getRequiredEnv("ALIPAY_APP_ID"),
    method,
    format: "JSON",
    charset: "utf-8",
    sign_type: "RSA2",
    timestamp: formatAlipayTimestamp(),
    version: "1.0",
    biz_content: JSON.stringify(bizContent),
  };
  const signContent = buildSignContent(params);
  const signature = signWithAlipayRsa2(signContent);
  const body = new URLSearchParams(params);
  body.set("sign", signature);

  const response = await fetch(getAlipayGatewayUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
    },
    body,
  });

  const payload = (await response.json().catch(() => ({}))) as T & {
    error_response?: {
      code?: string;
      msg?: string;
      sub_code?: string;
      sub_msg?: string;
    };
  };

  if (!response.ok || payload.error_response) {
    const errorResponse = payload.error_response;
    throw new Error(
      errorResponse?.sub_msg ||
        errorResponse?.msg ||
        `支付宝接口 ${method} 调用失败。`,
    );
  }

  return payload;
}

function parseAlipayPaidAt(input?: string) {
  if (!input) {
    return new Date().toISOString();
  }

  const matched = input.match(
    /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/,
  );

  if (!matched) {
    return new Date(input).toISOString();
  }

  const [, year, month, day, hours, minutes, seconds] = matched;
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+08:00`;
}

const mockGateway: PaymentGateway = {
  async createPayment(order) {
    return {
      channel: "mock",
      paymentUrl: `/billing/mock-pay?order_id=${order.orderId}`,
      qrText: `MOCK_PAY:${order.orderId}`,
      expiresInSeconds: 900,
      provider: "mock",
      requestPayload: {
        orderId: order.orderId,
        amount: order.amount,
        title: order.title,
      },
      responsePayload: {
        paymentUrl: `/billing/mock-pay?order_id=${order.orderId}`,
        qrText: `MOCK_PAY:${order.orderId}`,
      },
    };
  },
  async parseNotifyPayload(request) {
    const body = (await request.json().catch(() => ({}))) as {
      orderId?: string;
      tradeNo?: string;
      paidAt?: string;
    };

    if (!body.orderId) {
      throw new Error("Mock 支付通知缺少订单号。");
    }

    return {
      orderId: body.orderId,
      tradeNo: body.tradeNo ?? `mock_${body.orderId.replaceAll("-", "").slice(0, 18)}`,
      paidAt: body.paidAt ?? new Date().toISOString(),
      raw: body,
      provider: "mock",
      status: "TRADE_SUCCESS",
    };
  },
  async queryPayment(orderId) {
    return {
      orderId,
      tradeNo: null,
      status: "UNKNOWN",
      paidAt: null,
      amount: null,
      raw: {
        orderId,
        message: "Mock 支付不支持真实查单。",
      },
      provider: "mock",
    };
  },
  async refundPayment(input) {
    return {
      orderId: input.orderId,
      tradeNo: input.tradeNo ?? null,
      refundNo: input.refundRequestId,
      refundAmount: input.amount,
      success: true,
      raw: {
        orderId: input.orderId,
        refundRequestId: input.refundRequestId,
        refundAmount: input.amount,
        reason: input.reason,
      },
      provider: "mock",
    };
  },
};

const alipayGateway: PaymentGateway = {
  async createPayment(order, input) {
    const notifyUrl = resolveAbsoluteUrl(input.notifyUrl ?? getAlipayNotifyUrl());
    const returnUrl = resolveAbsoluteUrl(input.returnUrl ?? getAlipayReturnUrl(order.orderId));
    const paymentUrl = createAlipayPaymentUrl(order, {
      notifyUrl,
      returnUrl,
    });

    return {
      channel: "alipay_pc",
      paymentUrl,
      qrText: paymentUrl,
      expiresInSeconds: 900,
      provider: "alipay",
      requestPayload: {
        outTradeNo: order.orderId,
        totalAmount: formatAlipayAmount(order.amount),
        subject: order.title.slice(0, 128),
        notifyUrl,
        returnUrl,
      },
      responsePayload: {
        paymentUrl,
        qrText: paymentUrl,
      },
    };
  },
  async parseNotifyPayload(request) {
    const formData = await request.formData();
    const raw = Array.from(formData.entries()).reduce<Record<string, string>>(
      (accumulator, [key, value]) => {
        if (typeof value === "string") {
          accumulator[key] = value;
        }

        return accumulator;
      },
      {},
    );

    const signature = raw.sign;

    if (!signature) {
      throw new Error("支付宝通知缺少签名。");
    }

    const signType = raw.sign_type ?? "RSA2";

    if (signType !== "RSA2") {
      throw new Error(`暂不支持的支付宝签名类型：${signType}`);
    }

    const { sign, sign_type, ...contentFields } = raw;
    void sign;
    void sign_type;

    const signContent = buildSignContent(contentFields);
    const isValid = verifyAlipayRsa2(signContent, signature);

    if (!isValid) {
      throw new Error("支付宝通知验签失败。");
    }

    if (raw.app_id && raw.app_id !== getRequiredEnv("ALIPAY_APP_ID")) {
      throw new Error("支付宝通知的 APP_ID 与当前配置不一致。");
    }

    const expectedSellerId = process.env.ALIPAY_SELLER_ID?.trim();
    if (expectedSellerId && raw.seller_id !== expectedSellerId) {
      throw new Error("支付宝通知的 seller_id 与当前收款商户不一致。");
    }

    const expectedSellerEmail = process.env.ALIPAY_SELLER_EMAIL?.trim();
    if (expectedSellerEmail && raw.seller_email !== expectedSellerEmail) {
      throw new Error("支付宝通知的 seller_email 与当前收款账号不一致。");
    }

    if (
      raw.trade_status !== "TRADE_SUCCESS" &&
      raw.trade_status !== "TRADE_FINISHED"
    ) {
      throw new Error(`支付宝通知状态未完成支付：${raw.trade_status ?? "unknown"}`);
    }

    if (!raw.out_trade_no || !raw.trade_no) {
      throw new Error("支付宝通知缺少商户订单号或支付宝交易号。");
    }

    return {
      orderId: raw.out_trade_no,
      tradeNo: raw.trade_no,
      paidAt: parseAlipayPaidAt(raw.gmt_payment || raw.notify_time),
      raw,
      provider: "alipay",
      buyerAccount: raw.buyer_logon_id ?? null,
      buyerId: raw.buyer_id ?? null,
      status: raw.trade_status ?? null,
    };
  },
  async queryPayment(orderId) {
    const payload = await requestAlipayOpenApi<{
      alipay_trade_query_response?: Record<string, string>;
    }>("alipay.trade.query", {
      out_trade_no: orderId,
    });
    const response = payload.alipay_trade_query_response ?? {};
    const status = response.trade_status ?? "UNKNOWN";
    const paidAt =
      status === "TRADE_SUCCESS" || status === "TRADE_FINISHED"
        ? parseAlipayPaidAt(response.send_pay_date)
        : null;

    return {
      orderId: response.out_trade_no ?? orderId,
      tradeNo: response.trade_no ?? null,
      status,
      paidAt,
      amount: response.total_amount ? Math.round(Number(response.total_amount) * 100) : null,
      raw: response,
      provider: "alipay",
      buyerAccount: response.buyer_logon_id ?? null,
      buyerId: response.buyer_user_id ?? response.buyer_user_type ?? null,
    };
  },
  async refundPayment(input) {
    const payload = await requestAlipayOpenApi<{
      alipay_trade_refund_response?: Record<string, string>;
    }>("alipay.trade.refund", {
      out_trade_no: input.orderId,
      trade_no: input.tradeNo || undefined,
      refund_amount: formatAlipayAmount(input.amount),
      refund_reason: input.reason,
      out_request_no: input.refundRequestId,
    });
    const response = payload.alipay_trade_refund_response ?? {};
    const fundChange = response.fund_change;

    return {
      orderId: response.out_trade_no ?? input.orderId,
      tradeNo: response.trade_no ?? input.tradeNo ?? null,
      refundNo: input.refundRequestId,
      refundAmount: response.refund_fee
        ? Math.round(Number(response.refund_fee) * 100)
        : input.amount,
      success: fundChange === "Y" || response.code === "10000",
      raw: response,
      provider: "alipay",
    };
  },
};

const placeholderGatewayFactory = (method: "wechat_pc" | "alipay_pc"): PaymentGateway => ({
  async createPayment(order) {
    return {
      channel: method,
      paymentUrl: `/billing/mock-pay?order_id=${order.orderId}&channel=${method}`,
      qrText: `${method.toUpperCase()}:${order.orderId}`,
      expiresInSeconds: 900,
      provider: method === "wechat_pc" ? "wechat" : "alipay",
      requestPayload: {
        orderId: order.orderId,
        amount: order.amount,
        title: order.title,
      },
      responsePayload: {
        paymentUrl: `/billing/mock-pay?order_id=${order.orderId}&channel=${method}`,
        qrText: `${method.toUpperCase()}:${order.orderId}`,
      },
    };
  },
  async parseNotifyPayload(request) {
    const body = (await request.json().catch(() => ({}))) as {
      orderId?: string;
      tradeNo?: string;
      paidAt?: string;
    };

    if (!body.orderId || !body.tradeNo) {
      throw new Error(`${method} 通知缺少订单号或交易号。`);
    }

    return {
      orderId: body.orderId,
      tradeNo: body.tradeNo,
      paidAt: body.paidAt ?? new Date().toISOString(),
      raw: body,
      provider: method === "wechat_pc" ? "wechat" : "alipay",
      status: "TRADE_SUCCESS",
    };
  },
});

const gatewayMap: Record<PaymentMethod, PaymentGateway> = {
  mock: mockGateway,
  wechat_pc: placeholderGatewayFactory("wechat_pc"),
  alipay_pc: alipayGateway,
};

export function getPaymentGateway(method: PaymentMethod) {
  return gatewayMap[method];
}
