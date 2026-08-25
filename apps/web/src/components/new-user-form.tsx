"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserSchema, Role, type CreateUserInput } from "@golden-knot/shared";
import { apiFetch, ClientApiError } from "@/lib/api";
import { formatRole } from "@/lib/format";
import { PasswordInput } from "@/components/password-input";

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

interface Branch {
  id: string;
  name: string;
}

export function NewUserForm({ branches }: { branches: Branch[] }) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: Role.LOAN_OFFICER, branchId: branches[0]?.id },
  });

  const onSubmit = async (values: CreateUserInput) => {
    setSubmitError(null);
    try {
      await apiFetch("/users", { method: "POST", body: JSON.stringify(values) });
      router.push("/users");
    } catch (err) {
      setSubmitError(err instanceof ClientApiError ? err.message : "Failed to create user");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-6 max-w-xl space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700">Full name</label>
        <input className={inputClass} {...register("fullName")} />
        {errors.fullName && <p className="mt-1 text-xs text-red-600">{errors.fullName.message}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Email</label>
        <input type="email" className={inputClass} {...register("email")} />
        {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Temporary password</label>
        <PasswordInput className={inputClass} {...register("password")} />
        {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Role</label>
          <select className={inputClass} {...register("role")}>
            {Object.values(Role).map((v) => (
              <option key={v} value={v}>
                {formatRole(v)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Branch</label>
          <select className={inputClass} {...register("branchId")}>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {submitError && <p className="text-sm text-red-600">{submitError}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
      >
        {isSubmitting ? "Creating…" : "Create User"}
      </button>
    </form>
  );
}
