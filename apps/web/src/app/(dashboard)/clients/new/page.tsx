"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClientSchema, AddressType, type CreateClientInput } from "@golden-knot/shared";
import { apiFetch, ClientApiError } from "@/lib/api";

interface Branch {
  id: string;
  name: string;
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <div className="mt-1">{children}</div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

export default function NewClientPage() {
  const router = useRouter();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateClientInput>({
    resolver: zodResolver(createClientSchema),
    defaultValues: { address: { type: AddressType.RESIDENTIAL } },
  });

  useEffect(() => {
    apiFetch<Branch[]>("/branches").then(setBranches).catch(() => setBranches([]));
  }, []);

  const onSubmit = async (values: CreateClientInput) => {
    setSubmitError(null);
    try {
      const client = await apiFetch<{ id: string }>("/clients", {
        method: "POST",
        body: JSON.stringify(values),
      });
      router.push(`/clients/${client.id}`);
    } catch (err) {
      setSubmitError(err instanceof ClientApiError ? err.message : "Failed to create client");
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-slate-900">New Client</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="First name" error={errors.firstName?.message}>
            <input className={inputClass} {...register("firstName")} />
          </Field>
          <Field label="Last name" error={errors.lastName?.message}>
            <input className={inputClass} {...register("lastName")} />
          </Field>
          <Field label="National ID" error={errors.nationalId?.message}>
            <input className={inputClass} {...register("nationalId")} />
          </Field>
          <Field label="Date of birth" error={errors.dateOfBirth?.message as string | undefined}>
            <input type="date" className={inputClass} {...register("dateOfBirth")} />
          </Field>
          <Field label="Phone" error={errors.phone?.message}>
            <input className={inputClass} {...register("phone")} />
          </Field>
          <Field label="Email (optional)" error={errors.email?.message}>
            <input className={inputClass} {...register("email")} />
          </Field>
          <Field label="Branch" error={errors.branchId?.message}>
            <select className={inputClass} {...register("branchId")}>
              <option value="">Select branch…</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <fieldset className="border-t border-slate-200 pt-4">
          <legend className="text-sm font-semibold text-slate-900">Residential Address</legend>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Address line 1" error={errors.address?.line1?.message}>
              <input className={inputClass} {...register("address.line1")} />
            </Field>
            <Field label="City" error={errors.address?.city?.message}>
              <input className={inputClass} {...register("address.city")} />
            </Field>
            <Field label="Province" error={errors.address?.province?.message}>
              <input className={inputClass} {...register("address.province")} />
            </Field>
          </div>
        </fieldset>

        <fieldset className="border-t border-slate-200 pt-4">
          <legend className="text-sm font-semibold text-slate-900">Next of Kin</legend>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full name" error={errors.nextOfKin?.fullName?.message}>
              <input className={inputClass} {...register("nextOfKin.fullName")} />
            </Field>
            <Field label="Relationship" error={errors.nextOfKin?.relationship?.message}>
              <input className={inputClass} {...register("nextOfKin.relationship")} />
            </Field>
            <Field label="Phone" error={errors.nextOfKin?.phone?.message}>
              <input className={inputClass} {...register("nextOfKin.phone")} />
            </Field>
          </div>
        </fieldset>

        {submitError && <p className="text-sm text-red-600">{submitError}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
        >
          {isSubmitting ? "Creating…" : "Create Client"}
        </button>
      </form>
    </div>
  );
}
