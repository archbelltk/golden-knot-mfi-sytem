"use client";

import { useRouter } from "next/navigation";
import { LoanAccountStatus } from "@golden-knot/shared";

export function LoanAccountStatusFilter({ value }: { value?: string }) {
  const router = useRouter();

  return (
    <select
      value={value ?? ""}
      onChange={(e) => {
        const status = e.target.value;
        router.push(status ? `/loan-accounts?status=${status}` : "/loan-accounts");
      }}
      className="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
    >
      <option value="">All statuses</option>
      {Object.values(LoanAccountStatus).map((s) => (
        <option key={s} value={s}>
          {s.replace(/_/g, " ")}
        </option>
      ))}
    </select>
  );
}
