"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { apiFetch, ClientApiError } from "@/lib/api";

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-primary";

export function MfaSettings({ mfaEnabled }: { mfaEnabled: boolean }) {
  const router = useRouter();
  const [setupData, setSetupData] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const beginSetup = async () => {
    setError(null);
    try {
      const data = await apiFetch<{ secret: string; otpauthUrl: string }>("/auth/mfa/setup");
      setSetupData(data);
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Failed to start MFA setup");
    }
  };

  const enable = async () => {
    setPending(true);
    setError(null);
    try {
      await apiFetch("/auth/mfa/enable", { method: "POST", body: JSON.stringify({ code }) });
      setSetupData(null);
      setCode("");
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Invalid code");
    } finally {
      setPending(false);
    }
  };

  const disable = async () => {
    setPending(true);
    setError(null);
    try {
      await apiFetch("/auth/mfa/disable", { method: "POST", body: JSON.stringify({ code }) });
      setCode("");
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Invalid code");
    } finally {
      setPending(false);
    }
  };

  if (mfaEnabled) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
        <p className="flex items-center gap-2 text-sm font-medium text-emerald-900">
          <ShieldCheck size={16} />
          Two-factor authentication is enabled
        </p>
        <p className="mt-2 text-xs text-emerald-800">
          Enter a current code from your authenticator app to disable it.
        </p>
        <div className="mt-3 flex max-w-xs items-center gap-2">
          <input
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className={inputClass}
          />
          <button
            onClick={disable}
            disabled={pending || code.length !== 6}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            <ShieldOff size={14} />
            Disable
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-sm font-medium text-slate-900">Two-factor authentication is not enabled</p>
      <p className="mt-1 text-xs text-slate-500">
        Required for Admin and Back Office accounts. Scan the secret into any TOTP authenticator app
        (Google Authenticator, Authy, 1Password).
      </p>

      {!setupData ? (
        <button
          onClick={beginSetup}
          className="mt-3 flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-dark"
        >
          <ShieldCheck size={14} />
          Set up two-factor authentication
        </button>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="rounded-md bg-slate-50 p-3 text-xs">
            <p className="font-medium text-slate-700">Secret key (manual entry)</p>
            <p className="mt-1 break-all font-mono text-slate-900">{setupData.secret}</p>
            <p className="mt-2 font-medium text-slate-700">otpauth:// URI</p>
            <p className="mt-1 break-all font-mono text-slate-500">{setupData.otpauthUrl}</p>
          </div>
          <div className="flex max-w-xs items-center gap-2">
            <input
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={inputClass}
            />
            <button
              onClick={enable}
              disabled={pending || code.length !== 6}
              className="whitespace-nowrap rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
            >
              Confirm
            </button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
