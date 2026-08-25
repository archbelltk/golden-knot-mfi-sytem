import { serverFetch } from "@/lib/server-fetch";
import { requireUser } from "@/lib/session";
import { formatMoney, formatRole } from "@/lib/format";
import { ApprovalThresholdForm } from "@/components/approval-threshold-form";
import { ApprovalThresholdDeleteButton } from "@/components/approval-threshold-delete-button";

interface ApprovalThreshold {
  id: string;
  productId: string | null;
  currency: string | null;
  minAmount: string;
  maxAmount: string | null;
  requiredLevel: string;
}
interface LoanProduct {
  id: string;
  name: string;
}

export default async function ApprovalLevelsPage() {
  const [thresholds, products, user] = await Promise.all([
    serverFetch<ApprovalThreshold[]>("/approval-thresholds"),
    serverFetch<LoanProduct[]>("/loan-products?includeInactive=true"),
    requireUser(),
  ]);
  const productsById = new Map(products.map((p) => [p.id, p.name]));
  const isAdmin = user.role === "ADMIN";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Approval Levels</h1>
        <p className="mt-1 text-sm text-slate-500">
          Loan applications are routed to the highest matching rule below (loan officer → branch
          manager → credit committee) based on product, currency, and requested amount.
        </p>
      </div>

      {isAdmin && <ApprovalThresholdForm products={products} />}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Currency</th>
              <th className="px-4 py-3">Amount range</th>
              <th className="px-4 py-3">Required level</th>
              {isAdmin && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {thresholds.map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-3">{t.productId ? productsById.get(t.productId) ?? t.productId : "Any"}</td>
                <td className="px-4 py-3">{t.currency ?? "Any"}</td>
                <td className="px-4 py-3">
                  {formatMoney(Number(t.minAmount), t.currency ?? "")}
                  {" – "}
                  {t.maxAmount ? formatMoney(Number(t.maxAmount), t.currency ?? "") : "no limit"}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-primary-light px-2 py-1 text-xs font-medium text-primary">
                    {formatRole(t.requiredLevel)}
                  </span>
                </td>
                {isAdmin && (
                  <td className="px-4 py-3">
                    <ApprovalThresholdDeleteButton id={t.id} />
                  </td>
                )}
              </tr>
            ))}
            {thresholds.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 5 : 4} className="px-4 py-6 text-center text-slate-400">
                  No rules configured — every application defaults to loan officer approval only.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
