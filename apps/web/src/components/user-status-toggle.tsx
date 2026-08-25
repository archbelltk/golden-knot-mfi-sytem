"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserCheck, UserX } from "lucide-react";
import { apiFetch, ClientApiError } from "@/lib/api";

export function UserStatusToggle({ userId, isActive }: { userId: string; isActive: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    setPending(true);
    setError(null);
    try {
      await apiFetch(`/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !isActive }),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Action failed");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {isActive ? (
        <button
          onClick={toggle}
          disabled={pending}
          className="flex items-center gap-1.5 rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          <UserX size={14} />
          Deactivate
        </button>
      ) : (
        <button
          onClick={toggle}
          disabled={pending}
          className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <UserCheck size={14} />
          Activate
        </button>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
