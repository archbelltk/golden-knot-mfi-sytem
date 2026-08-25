import { serverFetch } from "@/lib/server-fetch";
import { LoanProductEditForm } from "@/components/loan-product-edit-form";
import { LoanProductDeleteButton } from "@/components/loan-product-delete-button";

interface LoanProductDetail {
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

export default async function EditLoanProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await serverFetch<LoanProductDetail>(`/loan-products/${id}`);

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-slate-900">Edit Loan Product</h1>
      <LoanProductEditForm product={product} />

      <div className="mt-8 border-t border-slate-200 pt-6">
        <h2 className="text-sm font-semibold text-slate-900">Danger zone</h2>
        <div className="mt-3">
          <LoanProductDeleteButton productId={product.id} />
        </div>
      </div>
    </div>
  );
}
