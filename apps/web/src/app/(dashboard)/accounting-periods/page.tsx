import { serverFetch } from "@/lib/server-fetch";
import { PeriodActions } from "@/components/period-actions";

interface AccountingPeriodRow {
  id: string;
  period: string;
  status: "OPEN" | "CLOSED";
  closedBy: string | null;
  closedAt: string | null;
}

function recentPeriods(count: number): string[] {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
}

export default async function AccountingPeriodsPage() {
  const records = await serverFetch<AccountingPeriodRow[]>("/accounting-periods");
  const known = new Map(records.map((r) => [r.period, r]));

  // Periods with no row are implicitly open — surface the last few months so
  // an admin can close them even before any posting has touched them.
  const implicitlyOpen = recentPeriods(6).filter((p) => !known.has(p));
  const rows = [
    ...records,
    ...implicitlyOpen.map((period) => ({ id: period, period, status: "OPEN" as const, closedBy: null, closedAt: null })),
  ].sort((a, b) => b.period.localeCompare(a.period));

  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Accounting Periods</h1>
        <p className="mt-1 text-sm text-slate-500">
          Closing a period blocks any further postings — automated (disbursement, repayment,
          write-off) or manual journal entries — against it.
        </p>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Period</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Closed</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.period}>
                <td className="px-4 py-3 font-mono">{r.period}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      r.status === "CLOSED" ? "bg-slate-200 text-slate-700" : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {r.closedAt ? new Date(r.closedAt).toLocaleString() : "—"}
                </td>
                <td className="px-4 py-3">
                  <PeriodActions period={r.period} status={r.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
