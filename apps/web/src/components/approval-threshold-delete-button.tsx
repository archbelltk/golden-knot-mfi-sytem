"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { apiFetch, ClientApiError } from "@/lib/api";

export function ApprovalThresholdDeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    setPending(true);
    setError(null);
    try {
      await apiFetch(`/approval-thresholds/${id}`, { method: "DELETE" });
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Failed to remove rule");
      setPending(false);
    }
  };

  return (
    <div className="flex items-center justify-end gap-2">
      {error && <span className="text-xs text-red-600">{error}</span>}
      <button
        onClick={remove}
        disabled={pending}
        className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
        title="Remove rule"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
