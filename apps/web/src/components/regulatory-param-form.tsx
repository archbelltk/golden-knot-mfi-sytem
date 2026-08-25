"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createRegulatoryParameterSchema, Currency, type CreateRegulatoryParameterInput } from "@golden-knot/shared";
import { apiFetch, ClientApiError } from "@/lib/api";

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

export function RegulatoryParamForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateRegulatoryParameterInput>({
    resolver: zodResolver(createRegulatoryParameterSchema),
    defaultValues: { effectiveFrom: new Date() as never },
  });

  const onSubmit = async (values: CreateRegulatoryParameterInput) => {
    setError(null);
    try {
      await apiFetch("/regulatory-params", {
        method: "POST",
        body: JSON.stringify({ ...values, value: Number(values.value) }),
      });
      reset({ key: "", currency: values.currency, effectiveFrom: new Date() as never, value: undefined });
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Failed to record parameter");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900">Record New Parameter Value</h2>
      <p className="mt-1 text-xs text-slate-500">
        This always inserts a new, effective-dated row — regulatory parameters are never overwritten,
        so the full history stays auditable.
      </p>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600">Key</label>
          <input placeholder="MAX_INTEREST_RATE" className={inputClass} {...register("key")} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Value</label>
          <input type="number" step="0.0001" className={inputClass} {...register("value")} />
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
          <label className="block text-xs font-medium text-slate-600">Effective from</label>
          <input type="date" className={inputClass} {...register("effectiveFrom")} />
        </div>
      </div>
      {errors.key && <p className="mt-1 text-xs text-red-600">{errors.key.message}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-3 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
      >
        {isSubmitting ? "Recording…" : "Record Parameter"}
      </button>
    </form>
  );
}
