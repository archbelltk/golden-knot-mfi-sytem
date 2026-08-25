"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, LockOpen } from "lucide-react";
import { apiFetch, ClientApiError } from "@/lib/api";

export function PeriodActions({ period, status }: { period: string; status: "OPEN" | "CLOSED" }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const act = async (action: "close" | "reopen") => {
    setPending(true);
    setError(null);
    try {
      await apiFetch(`/accounting-periods/${period}/${action}`, { method: "POST" });
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Action failed");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {status === "OPEN" ? (
        <button
          onClick={() => act("close")}
          disabled={pending}
          className="flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          <Lock size={14} />
          Close period
        </button>
      ) : (
        <button
          onClick={() => act("reopen")}
          disabled={pending}
          className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <LockOpen size={14} />
          Reopen
        </button>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
