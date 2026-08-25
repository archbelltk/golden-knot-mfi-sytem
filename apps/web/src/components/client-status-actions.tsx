"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { CLIENT_STATUS_TRANSITIONS, type ClientStatus } from "@golden-knot/shared";
import { apiFetch, ClientApiError } from "@/lib/api";

export function ClientStatusActions({ clientId, status }: { clientId: string; status: ClientStatus }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allowed = CLIENT_STATUS_TRANSITIONS[status] ?? [];
  if (allowed.length === 0) return null;

  const changeStatus = async (next: string) => {
    setPending(next);
    setError(null);
    try {
      await apiFetch(`/clients/${clientId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Failed to change status");
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {allowed.map((next) => (
        <button
          key={next}
          onClick={() => changeStatus(next)}
          disabled={pending !== null}
          className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <ArrowRight size={14} />
          {pending === next ? "Updating…" : `Move to ${next}`}
        </button>
      ))}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
