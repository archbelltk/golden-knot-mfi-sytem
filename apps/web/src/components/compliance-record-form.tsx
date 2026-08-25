"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheck } from "lucide-react";
import { complianceRecordSchema, ScreeningType, ScreeningResult, type ComplianceRecordInput } from "@golden-knot/shared";
import { apiFetch, ClientApiError } from "@/lib/api";

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

export function ComplianceRecordForm({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<ComplianceRecordInput>({
    resolver: zodResolver(complianceRecordSchema),
    defaultValues: { screeningType: ScreeningType.PEP, result: ScreeningResult.CLEAR },
  });

  const onSubmit = async (values: ComplianceRecordInput) => {
    setError(null);
    try {
      await apiFetch(`/clients/${clientId}/compliance-records`, {
        method: "POST",
        body: JSON.stringify(values),
      });
      reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Failed to record screening");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-wrap items-end gap-3">
      <div>
        <label className="block text-xs font-medium text-slate-600">Screening type</label>
        <select className={inputClass} {...register("screeningType")}>
          {Object.values(ScreeningType).map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600">Result</label>
        <select className={inputClass} {...register("result")}>
          {Object.values(ScreeningResult).map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <div className="flex-1 min-w-[160px]">
        <label className="block text-xs font-medium text-slate-600">Notes</label>
        <input className={inputClass} {...register("notes")} />
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
      >
        <ShieldCheck size={14} />
        Record
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </form>
  );
}
