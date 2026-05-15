import { NextRequest, NextResponse } from "next/server";

const PROTECTED_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function isSameOriginRequest(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (!origin || !host) {
    return true;
  }

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (
    pathname.startsWith("/api/admin") &&
    PROTECTED_METHODS.has(request.method) &&
    !isSameOriginRequest(request)
  ) {
    return NextResponse.json(
      { error: "后台请求来源不安全，已拒绝。" },
      { status: 403 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/admin/:path*"],
};
