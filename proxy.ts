import { NextRequest, NextResponse } from "next/server";
import {
  isProtectedWriteMethod,
  isSameOriginRequest,
} from "@/lib/request-security";

function getRequestHeader(request: NextRequest, name: string) {
  return request.headers.get(name)?.trim() || null;
}

function buildContentSecurityPolicy(input: {
  nonce: string;
  pathname: string;
}) {
  const isDevelopment = process.env.NODE_ENV !== "production";
  const shouldUpgradeInsecureRequests =
    process.env.ENABLE_UPGRADE_INSECURE_REQUESTS === "true";
  const isWorkshopPreviewRoute = input.pathname.startsWith("/workshop");
  const scriptSrc = isWorkshopPreviewRoute
    ? `script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://challenges.cloudflare.com${
        isDevelopment ? " 'unsafe-eval'" : ""
      }`
    : `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com${
        isDevelopment ? " 'unsafe-eval'" : ""
      }`;
  const scriptSrcElem = isWorkshopPreviewRoute
    ? "script-src-elem 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://challenges.cloudflare.com"
    : "script-src-elem 'self' 'unsafe-inline' https://challenges.cloudflare.com";
  const styleSrc = "style-src 'self' 'unsafe-inline' https:";
  const styleSrcElem = "style-src-elem 'self' 'unsafe-inline' https:";

  return [
    "default-src 'self'",
    scriptSrc,
    scriptSrcElem,
    styleSrc,
    styleSrcElem,
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: data: https:",
    "font-src 'self' data: https:",
    "connect-src 'self' https:",
    "frame-src 'self' https://challenges.cloudflare.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    ...(shouldUpgradeInsecureRequests ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

function withCspHeaders(request: NextRequest) {
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const contentSecurityPolicy = buildContentSecurityPolicy({
    nonce,
    pathname: request.nextUrl.pathname,
  });
  const requestHeaders = new Headers(request.headers);

  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  return response;
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (!pathname.startsWith("/api/")) {
    return withCspHeaders(request);
  }

  if (
    pathname.startsWith("/api/payment/notify/") ||
    !isProtectedWriteMethod(request.method)
  ) {
    return NextResponse.next();
  }

  if (!isSameOriginRequest(request)) {
    console.error("[SECURITY_ALERT][same_origin_rejected]", {
      method: request.method,
      path: pathname,
      host: getRequestHeader(request, "host"),
      origin: getRequestHeader(request, "origin"),
      referer: getRequestHeader(request, "referer"),
      forwardedHost: getRequestHeader(request, "x-forwarded-host"),
      ip:
        getRequestHeader(request, "x-forwarded-for") ||
        getRequestHeader(request, "x-real-ip") ||
        getRequestHeader(request, "cf-connecting-ip"),
    });
    return NextResponse.json(
      { error: "请求来源不安全，已拒绝。" },
      { status: 403 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/:path*",
    {
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
