"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { apiFetch, ClientApiError } from "@/lib/api";

export function JournalEntryApproveButton({ entryId }: { entryId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approve = async () => {
    setPending(true);
    setError(null);
    try {
      await apiFetch(`/journal-entries/${entryId}/approve`, { method: "POST" });
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Failed to approve");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-red-600">{error}</span>}
      <button
        onClick={approve}
        disabled={pending}
        className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        <CheckCircle2 size={14} />
        {pending ? "Approving…" : "Approve"}
      </button>
    </div>
  );
}
