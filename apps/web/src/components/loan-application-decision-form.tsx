"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Undo2, XCircle } from "lucide-react";
import { ApprovalDecision, type ApprovalLevel } from "@golden-knot/shared";
import { apiFetch, ClientApiError } from "@/lib/api";

export function LoanApplicationDecisionForm({
  applicationId,
  level,
}: {
  applicationId: string;
  level: ApprovalLevel;
}) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const decide = async (decision: string) => {
    setPending(decision);
    setError(null);
    try {
      await apiFetch(`/loan-applications/${applicationId}/decision`, {
        method: "POST",
        body: JSON.stringify({ level, decision, comment: comment || undefined }),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Failed to record decision");
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-medium text-amber-900">Pending your decision at {level} level</p>
      <textarea
        placeholder="Comment (optional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        rows={2}
      />
      <div className="mt-2 flex gap-2">
        <button
          onClick={() => decide(ApprovalDecision.APPROVED)}
          disabled={pending !== null}
          className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          <CheckCircle2 size={14} />
          Approve
        </button>
        <button
          onClick={() => decide(ApprovalDecision.RETURNED)}
          disabled={pending !== null}
          className="flex items-center gap-1.5 rounded-md bg-slate-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-600 disabled:opacity-50"
        >
          <Undo2 size={14} />
          Return for revision
        </button>
        <button
          onClick={() => decide(ApprovalDecision.REJECTED)}
          disabled={pending !== null}
          className="flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          <XCircle size={14} />
          Reject
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
