import { NextResponse } from "next/server";
import { API_URL } from "@/lib/env";
import { setSessionCookie } from "@/lib/session-cookie";

export async function POST(request: Request) {
  const body = await request.json();

  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    return new NextResponse(text, { status: res.status, headers: { "content-type": "application/json" } });
  }

  const data = (await res.json()) as
    | { mfaRequired: true; challengeToken: string }
    | { mfaRequired: false; token: string; user: unknown };

  if (data.mfaRequired) {
    return NextResponse.json({ mfaRequired: true, challengeToken: data.challengeToken });
  }

  await setSessionCookie(data.token);
  return NextResponse.json({ mfaRequired: false, user: data.user });
}
