import "server-only";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { API_URL, AUTH_COOKIE } from "./env";

/**
 * Forwards a browser request made to /api/backend/* to the NestJS API,
 * translating the httpOnly session cookie into an Authorization header.
 * The JWT never reaches client JS — only this server-side handler reads it.
 */
export async function proxyToApi(request: NextRequest, path: string[]) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;

  const targetUrl = `${API_URL}/${path.join("/")}${request.nextUrl.search}`;
  const isBodyMethod = !["GET", "HEAD"].includes(request.method);
  const contentType = request.headers.get("content-type") ?? undefined;

  const res = await fetch(targetUrl, {
    method: request.method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(contentType ? { "content-type": contentType } : {}),
    },
    body: isBodyMethod ? request.body : undefined,
    // @ts-expect-error -- required by undici when streaming a request body
    duplex: isBodyMethod ? "half" : undefined,
    cache: "no-store",
  });

  const responseBody = await res.arrayBuffer();
  return new NextResponse(responseBody, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/json",
    },
  });
}
