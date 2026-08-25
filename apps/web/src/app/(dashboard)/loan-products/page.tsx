import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { serverFetch } from "@/lib/server-fetch";

interface LoanProductRow {
  id: string;
  name: string;
  code: string;
  currency: string;
  interestType: string;
  interestRate: string;
  minTenorMonths: number;
  maxTenorMonths: number;
  repaymentFrequency: string;
}

export default async function LoanProductsPage() {
  const products = await serverFetch<LoanProductRow[]>("/loan-products");

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Loan Products</h1>
        <Link
          href="/loan-products/new"
          className="flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          <PlusCircle size={16} />
          New Product
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        {products.map((p) => (
          <div key={p.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">{p.name}</h2>
              <span className="text-xs text-slate-400">{p.code}</span>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              {p.currency} · {p.interestType} · {(Number(p.interestRate) * 100).toFixed(2)}%/month
            </p>
            <p className="text-sm text-slate-600">
              Tenor {p.minTenorMonths}–{p.maxTenorMonths} months · {p.repaymentFrequency}
            </p>
          </div>
        ))}
        {products.length === 0 && <p className="text-sm text-slate-400">No loan products configured yet.</p>}
      </div>
    </div>
  );
}
