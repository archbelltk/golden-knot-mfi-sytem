"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { disburseLoanSchema, Channel, type DisburseLoanInput } from "@golden-knot/shared";
import { apiFetch, ClientApiError } from "@/lib/api";

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

export function LoanDisburseForm({ loanAccountId }: { loanAccountId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<DisburseLoanInput>({
    resolver: zodResolver(disburseLoanSchema),
    defaultValues: { channel: Channel.BANK, disbursementDate: new Date() as never },
  });

  const onSubmit = async (values: DisburseLoanInput) => {
    setError(null);
    try {
      await apiFetch(`/loan-accounts/${loanAccountId}/disburse`, {
        method: "POST",
        body: JSON.stringify(values),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Disbursement failed");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900">Disburse Loan</h2>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600">Channel</label>
          <select className={inputClass} {...register("channel")}>
            {Object.values(Channel).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Reference</label>
          <input className={inputClass} {...register("reference")} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Disbursement date</label>
          <input type="date" className={inputClass} {...register("disbursementDate")} />
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-3 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
      >
        {isSubmitting ? "Disbursing…" : "Disburse"}
      </button>
    </form>
  );
}
