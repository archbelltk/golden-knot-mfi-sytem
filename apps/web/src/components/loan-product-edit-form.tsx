"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  updateLoanProductSchema,
  Currency,
  InterestType,
  RepaymentFrequency,
  type UpdateLoanProductInput,
} from "@golden-knot/shared";
import { apiFetch, ClientApiError } from "@/lib/api";

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

interface LoanProductForEdit {
  id: string;
  name: string;
  code: string;
  currency: string;
  interestType: string;
  interestRate: string;
  feeSchedule: { label: string; type: "FLAT" | "PERCENT_OF_PRINCIPAL"; amount: number }[];
  minTenorMonths: number;
  maxTenorMonths: number;
  repaymentFrequency: string;
  gracePeriodDays: number;
  isActive: boolean;
}

export function LoanProductEditForm({ product }: { product: LoanProductForEdit }) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const firstFee = product.feeSchedule[0];
  const [feeLabel, setFeeLabel] = useState(firstFee?.label ?? "Origination fee");
  const [feeType, setFeeType] = useState<"FLAT" | "PERCENT_OF_PRINCIPAL">(firstFee?.type ?? "PERCENT_OF_PRINCIPAL");
  const [feeAmount, setFeeAmount] = useState(firstFee ? String(firstFee.amount) : "");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdateLoanProductInput>({
    resolver: zodResolver(updateLoanProductSchema),
    defaultValues: {
      name: product.name,
      currency: product.currency as Currency,
      interestType: product.interestType as InterestType,
      interestRate: Number(product.interestRate),
      minTenorMonths: product.minTenorMonths,
      maxTenorMonths: product.maxTenorMonths,
      repaymentFrequency: product.repaymentFrequency as RepaymentFrequency,
      gracePeriodDays: product.gracePeriodDays,
      isActive: product.isActive,
    },
  });

  const onSubmit = async (values: UpdateLoanProductInput) => {
    setSubmitError(null);
    const feeSchedule = feeAmount ? [{ label: feeLabel, type: feeType, amount: Number(feeAmount) }] : [];
    try {
      await apiFetch(`/loan-products/${product.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ...values, feeSchedule }),
      });
      router.push("/loan-products");
      router.refresh();
    } catch (err) {
      setSubmitError(err instanceof ClientApiError ? err.message : "Failed to update loan product");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700">Name</label>
        <input className={inputClass} {...register("name")} />
        {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Code</label>
        <input className={inputClass} value={product.code} disabled />
        <p className="mt-1 text-xs text-slate-400">Code is immutable once a product exists.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Currency</label>
          <select className={inputClass} {...register("currency")}>
            {Object.values(Currency).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Interest type</label>
          <select className={inputClass} {...register("interestType")}>
            {Object.values(InterestType).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Monthly interest rate (e.g. 0.05 = 5%)</label>
          <input type="number" step="0.0001" className={inputClass} {...register("interestRate")} />
          {errors.interestRate && <p className="mt-1 text-xs text-red-600">{errors.interestRate.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Repayment frequency</label>
          <select className={inputClass} {...register("repaymentFrequency")}>
            {Object.values(RepaymentFrequency).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Min tenor (months)</label>
          <input type="number" className={inputClass} {...register("minTenorMonths")} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Max tenor (months)</label>
          <input type="number" className={inputClass} {...register("maxTenorMonths")} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Grace period (days)</label>
          <input type="number" className={inputClass} {...register("gracePeriodDays")} />
        </div>
      </div>

      <fieldset className="border-t border-slate-200 pt-4">
        <legend className="text-sm font-semibold text-slate-900">Fee (optional, one line)</legend>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600">Label</label>
            <input className={inputClass} value={feeLabel} onChange={(e) => setFeeLabel(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Type</label>
            <select className={inputClass} value={feeType} onChange={(e) => setFeeType(e.target.value as "FLAT" | "PERCENT_OF_PRINCIPAL")}>
              <option value="PERCENT_OF_PRINCIPAL">% of principal</option>
              <option value="FLAT">Flat amount</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Amount</label>
            <input type="number" step="0.01" className={inputClass} value={feeAmount} onChange={(e) => setFeeAmount(e.target.value)} />
          </div>
        </div>
      </fieldset>

      <div className="flex items-center gap-2 border-t border-slate-200 pt-4">
        <input id="isActive" type="checkbox" className="h-4 w-4" {...register("isActive")} />
        <label htmlFor="isActive" className="text-sm font-medium text-slate-700">
          Active (visible for new loan applications)
        </label>
      </div>

      {submitError && <p className="text-sm text-red-600">{submitError}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
      >
        {isSubmitting ? "Saving…" : "Save Changes"}
      </button>
    </form>
  );
}
