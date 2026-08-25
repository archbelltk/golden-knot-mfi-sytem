"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { apiFetch, ClientApiError } from "@/lib/api";

export function KycVerifyButtons({ clientId, documentId }: { clientId: string; documentId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const review = async (status: "VERIFIED" | "REJECTED") => {
    setPending(status);
    setError(null);
    try {
      await apiFetch(`/clients/${clientId}/kyc-documents/${documentId}/verify`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Review failed");
    } finally {
      setPending(null);
    }
  };

  return (
    <span className="inline-flex items-center gap-2">
      <button
        onClick={() => review("VERIFIED")}
        disabled={pending !== null}
        className="flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        <CheckCircle2 size={12} />
        Verify
      </button>
      <button
        onClick={() => review("REJECTED")}
        disabled={pending !== null}
        className="flex items-center gap-1 rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
      >
        <XCircle size={12} />
        Reject
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
