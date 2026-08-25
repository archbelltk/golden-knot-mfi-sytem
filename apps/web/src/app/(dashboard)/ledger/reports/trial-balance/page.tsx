import { CheckCircle2, TriangleAlert } from "lucide-react";
import { serverFetch } from "@/lib/server-fetch";

interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  accountType: string;
  debit: number;
  credit: number;
  balance: number;
}
interface TrialBalanceResponse {
  period: string;
  rows: TrialBalanceRow[];
  totals: { debit: number; credit: number };
  balanced: boolean;
}

export default async function TrialBalancePage() {
  const report = await serverFetch<TrialBalanceResponse>("/reports/trial-balance");

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Trial Balance</h1>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
            report.balanced ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
          }`}
        >
          {report.balanced ? <CheckCircle2 size={14} /> : <TriangleAlert size={14} />}
          {report.balanced ? "Balanced" : "Out of balance"}
        </span>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Account</th>
              <th className="px-4 py-3 text-right">Debit</th>
              <th className="px-4 py-3 text-right">Credit</th>
              <th className="px-4 py-3 text-right">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {report.rows.map((r) => (
              <tr key={r.accountCode}>
                <td className="px-4 py-3 font-mono">{r.accountCode}</td>
                <td className="px-4 py-3">{r.accountName}</td>
                <td className="px-4 py-3 text-right">{r.debit.toFixed(2)}</td>
                <td className="px-4 py-3 text-right">{r.credit.toFixed(2)}</td>
                <td className="px-4 py-3 text-right">{r.balance.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-slate-300 font-medium">
            <tr>
              <td className="px-4 py-3" colSpan={2}>
                Total
              </td>
              <td className="px-4 py-3 text-right">{report.totals.debit.toFixed(2)}</td>
              <td className="px-4 py-3 text-right">{report.totals.credit.toFixed(2)}</td>
              <td className="px-4 py-3" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
