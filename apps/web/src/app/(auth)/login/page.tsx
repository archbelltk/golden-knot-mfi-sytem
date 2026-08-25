"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheck } from "lucide-react";
import { loginSchema, type LoginInput } from "@golden-knot/shared";

function goToNext(router: ReturnType<typeof useRouter>) {
  const next = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("next") : null;
  router.push(next || "/dashboard");
  router.refresh();
}

function MfaStep({ challengeToken }: { challengeToken: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/auth/mfa-verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeToken, code }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const text = await res.text();
      try {
        setError(JSON.parse(text).message ?? "Invalid code");
      } catch {
        setError("Invalid code");
      }
      return;
    }
    goToNext(router);
  };

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <ShieldCheck size={16} />
        Enter the 6-digit code from your authenticator app
      </div>
      <input
        autoFocus
        inputMode="numeric"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-primary"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting || code.length !== 6}
        className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
      >
        {submitting ? "Verifying…" : "Verify"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [challengeToken, setChallengeToken] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginInput) => {
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const text = await res.text();
      try {
        setError(JSON.parse(text).message ?? "Invalid credentials");
      } catch {
        setError("Invalid credentials");
      }
      return;
    }

    const data = (await res.json()) as { mfaRequired: boolean; challengeToken?: string };
    if (data.mfaRequired && data.challengeToken) {
      setChallengeToken(data.challengeToken);
      return;
    }

    goToNext(router);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm bg-white rounded-lg shadow-sm border border-slate-200 p-8">
        <div className="flex flex-col items-center text-center">
          <Image src="/gk-logo.png" alt="Golden Knot" width={1884} height={1558} className="h-28 w-auto" priority />
        </div>

        {challengeToken ? (
          <MfaStep challengeToken={challengeToken} />
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                {...register("email")}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                {...register("password")}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
            >
              {isSubmitting ? "Signing in…" : "Sign in"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
