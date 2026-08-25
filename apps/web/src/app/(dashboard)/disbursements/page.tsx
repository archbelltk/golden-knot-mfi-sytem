import Link from "next/link";
import { Banknote, ArrowRight } from "lucide-react";
import { serverFetch } from "@/lib/server-fetch";
import { formatDate, formatMoney } from "@/lib/format";

interface LoanAccountRow {
  id: string;
  status: string;
  principal: string;
  currency: string;
  createdAt: string;
  disbursementDate: string | null;
  client: { firstName: string; lastName: string };
  product: { name: string };
}

export default async function DisbursementsPage() {
  const accounts = await serverFetch<LoanAccountRow[]>("/loan-accounts");
  const pending = accounts
    .filter((a) => a.status === "PENDING_DISBURSEMENT")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const history = accounts
    .filter((a) => a.disbursementDate)
    .sort((a, b) => (b.disbursementDate as string).localeCompare(a.disbursementDate as string))
    .slice(0, 20);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Disbursements</h1>
        <p className="mt-1 text-sm text-slate-500">
          Approved loans waiting to be paid out, and a history of recent disbursements.
        </p>
      </div>

      <section>
        <div className="flex items-center gap-2">
          <Banknote size={16} className="text-primary" />
          <h2 className="text-sm font-semibold text-slate-900">Awaiting Disbursement ({pending.length})</h2>
        </div>
        <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Principal</th>
                <th className="px-4 py-3">Approved</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pending.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {a.client.firstName} {a.client.lastName}
                  </td>
                  <td className="px-4 py-3">{a.product.name}</td>
                  <td className="px-4 py-3">{formatMoney(Number(a.principal), a.currency)}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(a.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/loan-accounts/${a.id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      Disburse
                      <ArrowRight size={12} />
                    </Link>
                  </td>
                </tr>
              ))}
              {pending.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    Nothing waiting on disbursement.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-900">Recent Disbursements</h2>
        <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Principal</th>
                <th className="px-4 py-3">Disbursed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/loan-accounts/${a.id}`} className="text-slate-900 underline underline-offset-2">
                      {a.client.firstName} {a.client.lastName}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{a.product.name}</td>
                  <td className="px-4 py-3">{formatMoney(Number(a.principal), a.currency)}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(a.disbursementDate as string)}</td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                    No disbursements recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
