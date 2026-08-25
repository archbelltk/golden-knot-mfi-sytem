"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@golden-knot/shared";

export default function ForgotPasswordPage() {
  const [result, setResult] = useState<{ message: string; resetLink?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = async (values: ForgotPasswordInput) => {
    setError(null);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    const text = await res.text();
    if (!res.ok) {
      try {
        setError(JSON.parse(text).message ?? "Something went wrong");
      } catch {
        setError("Something went wrong");
      }
      return;
    }

    setResult(JSON.parse(text) as { message: string; resetLink?: string });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm bg-white rounded-lg shadow-sm border border-slate-200 p-8">
        <div className="flex flex-col items-center text-center">
          <Image src="/gk-logo.png" alt="Golden Knot" width={1884} height={1558} className="h-20 w-auto" priority />
          <p className="mt-3 text-sm text-slate-500">
            Enter your email and we&apos;ll generate a link to reset your password.
          </p>
        </div>

        {result ? (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-slate-700">{result.message}</p>
            {result.resetLink && (
              <div className="rounded-md border border-secondary/30 bg-secondary-light p-3">
                <p className="text-xs font-medium text-slate-600">
                  Local dev build — no email is sent, so here&apos;s the link directly:
                </p>
                <Link href={result.resetLink} className="mt-1 block break-all text-xs text-primary hover:underline">
                  {result.resetLink}
                </Link>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                autoFocus
                {...register("email")}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
            >
              {isSubmitting ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}

        <Link
          href="/login"
          className="mt-6 flex items-center justify-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft size={14} />
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
