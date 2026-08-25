import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE } from "@/lib/env";

export function proxy(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Excludes API routes, Next.js internals, the public auth pages, and any
  // public static asset (matched by file extension) — those must load
  // without auth.
  matcher: [
    "/((?!login|forgot-password|reset-password|api|_next/static|_next/image|.*\\.\\w+$).*)",
  ],
};
