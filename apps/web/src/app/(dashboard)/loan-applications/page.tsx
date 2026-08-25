import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { serverFetch } from "@/lib/server-fetch";

interface LoanApplicationRow {
  id: string;
  status: string;
  requiredLevel: string;
  currentLevel: string | null;
  requestedPrincipal: string;
  client: { firstName: string; lastName: string; clientNumber: string };
  product: { name: string; currency: string };
}

export default async function LoanApplicationsPage() {
  const applications = await serverFetch<LoanApplicationRow[]>("/loan-applications");

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Loan Applications</h1>
        <Link
          href="/loan-applications/new"
          className="flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          <PlusCircle size={16} />
          New Application
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Principal</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Pending at</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {applications.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/loan-applications/${a.id}`} className="text-slate-900 underline underline-offset-2">
                    {a.client.firstName} {a.client.lastName}
                  </Link>
                </td>
                <td className="px-4 py-3">{a.product.name}</td>
                <td className="px-4 py-3">
                  {a.requestedPrincipal} {a.product.currency}
                </td>
                <td className="px-4 py-3">{a.status}</td>
                <td className="px-4 py-3">{a.currentLevel ?? "—"}</td>
              </tr>
            ))}
            {applications.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  No loan applications yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
