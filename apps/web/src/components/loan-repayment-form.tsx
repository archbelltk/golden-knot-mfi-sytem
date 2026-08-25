"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { recordRepaymentSchema, Channel, type RecordRepaymentInput } from "@golden-knot/shared";
import { apiFetch, ClientApiError } from "@/lib/api";

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

export function LoanRepaymentForm({ loanAccountId }: { loanAccountId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<RecordRepaymentInput>({
    resolver: zodResolver(recordRepaymentSchema),
    defaultValues: { channel: Channel.CASH, paidAt: new Date() as never },
  });

  const onSubmit = async (values: RecordRepaymentInput) => {
    setError(null);
    try {
      await apiFetch(`/loan-accounts/${loanAccountId}/repayments`, {
        method: "POST",
        body: JSON.stringify(values),
      });
      reset({ channel: values.channel, paidAt: new Date() as never });
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Repayment failed");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900">Record Repayment</h2>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600">Amount</label>
          <input type="number" step="0.01" className={inputClass} {...register("amount")} />
        </div>
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
          <label className="block text-xs font-medium text-slate-600">Paid at</label>
          <input type="date" className={inputClass} {...register("paidAt")} />
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-3 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
      >
        {isSubmitting ? "Recording…" : "Record Repayment"}
      </button>
    </form>
  );
}
