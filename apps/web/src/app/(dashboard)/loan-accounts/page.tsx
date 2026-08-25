import Link from "next/link";
import { serverFetch } from "@/lib/server-fetch";
import { LoanAccountStatusFilter } from "@/components/loan-account-status-filter";

interface LoanAccountRow {
  id: string;
  status: string;
  principal: string;
  currency: string;
  parBucket: string;
  daysInArrears: number;
  client: { firstName: string; lastName: string; clientNumber: string };
  product: { name: string };
}

export default async function LoanAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const accounts = await serverFetch<LoanAccountRow[]>(
    status ? `/loan-accounts?status=${encodeURIComponent(status)}` : "/loan-accounts",
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Loan Accounts</h1>
        <LoanAccountStatusFilter value={status} />
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Principal</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">PAR Bucket</th>
              <th className="px-4 py-3">Days in arrears</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {accounts.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/loan-accounts/${a.id}`} className="text-slate-900 underline underline-offset-2">
                    {a.client.firstName} {a.client.lastName}
                  </Link>
                </td>
                <td className="px-4 py-3">{a.product.name}</td>
                <td className="px-4 py-3">
                  {a.principal} {a.currency}
                </td>
                <td className="px-4 py-3">{a.status}</td>
                <td className="px-4 py-3">{a.parBucket}</td>
                <td className="px-4 py-3">{a.daysInArrears}</td>
              </tr>
            ))}
            {accounts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  {status ? `No ${status.replace(/_/g, " ").toLowerCase()} loan accounts.` : "No loan accounts yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
