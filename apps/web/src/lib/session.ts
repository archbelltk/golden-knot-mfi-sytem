import "server-only";
import { redirect } from "next/navigation";
import type { CurrentUser } from "@golden-knot/shared";
import { ApiError, serverFetch } from "./server-fetch";

export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    return await serverFetch<CurrentUser>("/auth/me");
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
