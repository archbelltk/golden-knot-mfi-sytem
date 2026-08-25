"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createApprovalThresholdSchema,
  ApprovalLevel,
  Currency,
  type CreateApprovalThresholdInput,
} from "@golden-knot/shared";
import { apiFetch, ClientApiError } from "@/lib/api";
import { formatRole } from "@/lib/format";

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

interface LoanProduct {
  id: string;
  name: string;
}

export function ApprovalThresholdForm({ products }: { products: LoanProduct[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateApprovalThresholdInput>({
    resolver: zodResolver(createApprovalThresholdSchema),
    defaultValues: { requiredLevel: ApprovalLevel.BRANCH_MANAGER },
  });

  const onSubmit = async (values: CreateApprovalThresholdInput) => {
    setError(null);
    try {
      await apiFetch("/approval-thresholds", {
        method: "POST",
        body: JSON.stringify({
          ...values,
          productId: values.productId || null,
          currency: values.currency || null,
          maxAmount: values.maxAmount || null,
        }),
      });
      reset({ requiredLevel: values.requiredLevel, minAmount: undefined, maxAmount: undefined, productId: "" as never, currency: undefined });
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Failed to add threshold");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900">Add Approval Level Rule</h2>
      <p className="mt-1 text-xs text-slate-500">
        The highest-matching rule for a loan&apos;s product/currency/amount sets the approval level
        it must clear before disbursement. Leave product or currency as &quot;Any&quot; for a global rule.
      </p>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600">Product</label>
          <select className={inputClass} {...register("productId")}>
            <option value="">Any</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Currency</label>
          <select className={inputClass} {...register("currency")}>
            <option value="">Any</option>
            {Object.values(Currency).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Min amount</label>
          <input type="number" step="0.01" className={inputClass} {...register("minAmount")} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Max amount</label>
          <input type="number" step="0.01" placeholder="No limit" className={inputClass} {...register("maxAmount")} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Required level</label>
          <select className={inputClass} {...register("requiredLevel")}>
            {Object.values(ApprovalLevel).map((v) => (
              <option key={v} value={v}>
                {formatRole(v)}
              </option>
            ))}
          </select>
        </div>
      </div>
      {errors.minAmount && <p className="mt-1 text-xs text-red-600">{errors.minAmount.message}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-3 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
      >
        {isSubmitting ? "Adding…" : "Add Rule"}
      </button>
    </form>
  );
}
