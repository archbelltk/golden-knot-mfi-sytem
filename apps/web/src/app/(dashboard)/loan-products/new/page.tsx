"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createLoanProductSchema,
  Currency,
  InterestType,
  RepaymentFrequency,
  type CreateLoanProductInput,
} from "@golden-knot/shared";
import { apiFetch, ClientApiError } from "@/lib/api";

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500";

export default function NewLoanProductPage() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [feeLabel, setFeeLabel] = useState("Origination fee");
  const [feeType, setFeeType] = useState<"FLAT" | "PERCENT_OF_PRINCIPAL">("PERCENT_OF_PRINCIPAL");
  const [feeAmount, setFeeAmount] = useState("2");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateLoanProductInput>({
    resolver: zodResolver(createLoanProductSchema),
    defaultValues: {
      currency: Currency.ZIG,
      interestType: InterestType.REDUCING_BALANCE,
      repaymentFrequency: RepaymentFrequency.MONTHLY,
      gracePeriodDays: 0,
      feeSchedule: [],
    },
  });

  const onSubmit = async (values: CreateLoanProductInput) => {
    setSubmitError(null);
    const feeSchedule = feeAmount
      ? [{ label: feeLabel, type: feeType, amount: Number(feeAmount) }]
      : [];
    try {
      await apiFetch("/loan-products", {
        method: "POST",
        body: JSON.stringify({ ...values, feeSchedule }),
      });
      router.push("/loan-products");
    } catch (err) {
      setSubmitError(err instanceof ClientApiError ? err.message : "Failed to create loan product");
    }
  };

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-slate-900">New Loan Product</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Name</label>
          <input className={inputClass} {...register("name")} />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Code</label>
          <input className={inputClass} {...register("code")} />
          {errors.code && <p className="mt-1 text-xs text-red-600">{errors.code.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
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
          <div className="mt-3 grid grid-cols-3 gap-4">
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

        {submitError && <p className="text-sm text-red-600">{submitError}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {isSubmitting ? "Creating…" : "Create Product"}
        </button>
      </form>
    </div>
  );
}
