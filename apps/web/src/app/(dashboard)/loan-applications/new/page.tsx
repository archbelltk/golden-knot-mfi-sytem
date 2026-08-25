"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheck } from "lucide-react";
import { createLoanApplicationSchema, type CreateLoanApplicationInput } from "@golden-knot/shared";
import { apiFetch, ClientApiError } from "@/lib/api";

interface ClientOption {
  id: string;
  firstName: string;
  lastName: string;
  clientNumber: string;
}
interface ProductOption {
  id: string;
  name: string;
  currency: string;
  minTenorMonths: number;
  maxTenorMonths: number;
}
interface DisclosurePreview {
  totalInterest: number;
  totalFees: number;
  totalRepayable: number;
  nominalAnnualRatePercent: number;
}

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500";

export default function NewLoanApplicationPage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [preview, setPreview] = useState<DisclosurePreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateLoanApplicationInput>({ resolver: zodResolver(createLoanApplicationSchema) });

  const productId = useWatch({ control, name: "productId" });
  const requestedPrincipal = useWatch({ control, name: "requestedPrincipal" });
  const requestedTenorMonths = useWatch({ control, name: "requestedTenorMonths" });
  const selectedProduct = products.find((p) => p.id === productId);

  useEffect(() => {
    apiFetch<ClientOption[]>("/clients").then(setClients).catch(() => setClients([]));
    apiFetch<ProductOption[]>("/loan-products").then(setProducts).catch(() => setProducts([]));

    const clientId = new URLSearchParams(window.location.search).get("clientId");
    if (clientId) setValue("clientId", clientId);
  }, [setValue]);

  useEffect(() => {
    setPreview(null);
    setPreviewError(null);
    if (!productId || !requestedPrincipal || !requestedTenorMonths) return;

    const timer = setTimeout(() => {
      const params = new URLSearchParams({
        productId,
        principal: String(requestedPrincipal),
        tenorMonths: String(requestedTenorMonths),
      });
      apiFetch<DisclosurePreview>(`/loan-products/disclosure-preview?${params}`)
        .then(setPreview)
        .catch((err) => setPreviewError(err instanceof ClientApiError ? err.message : "Could not compute disclosure"));
    }, 400);
    return () => clearTimeout(timer);
  }, [productId, requestedPrincipal, requestedTenorMonths]);

  const onSubmit = async (values: CreateLoanApplicationInput) => {
    setSubmitError(null);
    try {
      const application = await apiFetch<{ id: string }>("/loan-applications", {
        method: "POST",
        body: JSON.stringify(values),
      });
      router.push(`/loan-applications/${application.id}`);
    } catch (err) {
      setSubmitError(err instanceof ClientApiError ? err.message : "Failed to submit application");
    }
  };

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold text-slate-900">New Loan Application</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Client</label>
          <select className={inputClass} {...register("clientId")}>
            <option value="">Select client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.clientNumber} — {c.firstName} {c.lastName}
              </option>
            ))}
          </select>
          {errors.clientId && <p className="mt-1 text-xs text-red-600">{errors.clientId.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Loan product</label>
          <select className={inputClass} {...register("productId")}>
            <option value="">Select product…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {errors.productId && <p className="mt-1 text-xs text-red-600">{errors.productId.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Requested principal</label>
          <input type="number" step="0.01" className={inputClass} {...register("requestedPrincipal")} />
          {errors.requestedPrincipal && <p className="mt-1 text-xs text-red-600">{errors.requestedPrincipal.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Requested tenor (months)</label>
          <input type="number" className={inputClass} {...register("requestedTenorMonths")} />
          {errors.requestedTenorMonths && <p className="mt-1 text-xs text-red-600">{errors.requestedTenorMonths.message}</p>}
        </div>

        <fieldset className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <legend className="px-1 text-sm font-semibold text-slate-900">
            Mandatory disclosure — total cost of credit
          </legend>
          {!preview && !previewError && (
            <p className="text-xs text-slate-500">
              Select a product, principal, and tenor to compute the disclosure.
            </p>
          )}
          {previewError && <p className="text-xs text-red-600">{previewError}</p>}
          {preview && (
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <p className="text-xs text-slate-500">Total interest</p>
                <p className="font-medium text-slate-900">
                  {preview.totalInterest.toFixed(2)} {selectedProduct?.currency}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Total fees</p>
                <p className="font-medium text-slate-900">
                  {preview.totalFees.toFixed(2)} {selectedProduct?.currency}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Total repayable</p>
                <p className="font-medium text-slate-900">
                  {preview.totalRepayable.toFixed(2)} {selectedProduct?.currency}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Nominal annual rate</p>
                <p className="font-medium text-slate-900">{preview.nominalAnnualRatePercent.toFixed(2)}%</p>
              </div>
            </div>
          )}

          <label className="mt-4 flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              disabled={!preview}
              {...register("acknowledgeDisclosure")}
              className="mt-0.5"
            />
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="shrink-0 text-slate-400" />
              I have disclosed the above effective rate, fees, and total cost of credit to the
              client, and the client acknowledges and accepts these terms.
            </span>
          </label>
          {errors.acknowledgeDisclosure && (
            <p className="mt-1 text-xs text-red-600">{errors.acknowledgeDisclosure.message}</p>
          )}
        </fieldset>

        {submitError && <p className="text-sm text-red-600">{submitError}</p>}

        <button
          type="submit"
          disabled={isSubmitting || !preview}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {isSubmitting ? "Submitting…" : "Submit Application"}
        </button>
      </form>
    </div>
  );
}
