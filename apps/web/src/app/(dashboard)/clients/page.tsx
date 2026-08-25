import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { serverFetch } from "@/lib/server-fetch";

interface ClientRow {
  id: string;
  clientNumber: string;
  firstName: string;
  lastName: string;
  nationalId: string;
  status: string;
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const clients = await serverFetch<ClientRow[]>(
    status ? `/clients?status=${encodeURIComponent(status)}` : "/clients",
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">Clients</h1>
          {status && (
            <Link
              href="/clients"
              className="flex items-center gap-1.5 rounded-full bg-primary-light px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20"
            >
              {status}
              <span aria-hidden>×</span>
            </Link>
          )}
        </div>
        <Link
          href="/clients/new"
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-dark"
        >
          <PlusCircle size={16} />
          New Client
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Client #</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">National ID</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {clients.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/clients/${c.id}`} className="text-slate-900 underline underline-offset-2">
                    {c.clientNumber}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {c.firstName} {c.lastName}
                </td>
                <td className="px-4 py-3">{c.nationalId}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                    {c.status}
                  </span>
                </td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  {status ? `No ${status.toLowerCase()} clients.` : "No clients yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
