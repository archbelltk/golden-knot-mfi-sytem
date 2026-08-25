"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2, Plus } from "lucide-react";
import { createJournalEntrySchema, Currency, type CreateJournalEntryInput } from "@golden-knot/shared";
import { apiFetch, ClientApiError } from "@/lib/api";

interface GLAccount {
  id: string;
  code: string;
  name: string;
}

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500";

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function NewJournalEntryPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<GLAccount[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateJournalEntryInput>({
    resolver: zodResolver(createJournalEntrySchema),
    defaultValues: {
      period: currentPeriod(),
      currency: Currency.ZIG,
      lines: [
        { glAccountId: "", debit: 0, credit: 0 },
        { glAccountId: "", debit: 0, credit: 0 },
      ],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "lines" });

  useEffect(() => {
    apiFetch<GLAccount[]>("/gl-accounts").then(setAccounts).catch(() => setAccounts([]));
  }, []);

  const onSubmit = async (values: CreateJournalEntryInput) => {
    setSubmitError(null);
    try {
      await apiFetch("/journal-entries", { method: "POST", body: JSON.stringify(values) });
      router.push("/ledger/journal-entries");
    } catch (err) {
      setSubmitError(err instanceof ClientApiError ? err.message : "Failed to create journal entry");
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-slate-900">New Journal Entry</h1>
      <p className="mt-1 text-sm text-slate-500">
        Maker-checker: this entry stays pending approval until a different user approves it.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Description</label>
          <input className={inputClass} {...register("description")} />
          {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Period (YYYY-MM)</label>
            <input className={inputClass} {...register("period")} />
            {errors.period && <p className="mt-1 text-xs text-red-600">{errors.period.message}</p>}
          </div>
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
        </div>

        <fieldset className="border-t border-slate-200 pt-4">
          <legend className="text-sm font-semibold text-slate-900">Lines</legend>
          <div className="mt-3 space-y-2">
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-[2fr_1fr_1fr_auto] gap-2 items-start">
                <select className={inputClass} {...register(`lines.${index}.glAccountId`)}>
                  <option value="">Account…</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} — {a.name}
                    </option>
                  ))}
                </select>
                <input type="number" step="0.01" placeholder="Debit" className={inputClass} {...register(`lines.${index}.debit`)} />
                <input type="number" step="0.01" placeholder="Credit" className={inputClass} {...register(`lines.${index}.credit`)} />
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="rounded-md border border-slate-300 p-2 text-slate-500 hover:bg-slate-50"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => append({ glAccountId: "", debit: 0, credit: 0 })}
            className="mt-3 flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
          >
            <Plus size={16} />
            Add line
          </button>
          {errors.lines?.root?.message && <p className="mt-2 text-xs text-red-600">{errors.lines.root.message}</p>}
        </fieldset>

        {submitError && <p className="text-sm text-red-600">{submitError}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {isSubmitting ? "Submitting…" : "Submit for Approval"}
        </button>
      </form>
    </div>
  );
}
