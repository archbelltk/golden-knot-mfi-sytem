import { serverFetch } from "@/lib/server-fetch";

interface GLAccount {
  id: string;
  code: string;
  name: string;
  type: string;
}

export default async function ChartOfAccountsPage() {
  const accounts = await serverFetch<GLAccount[]>("/gl-accounts");

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Chart of Accounts</h1>
      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {accounts.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3 font-mono">{a.code}</td>
                <td className="px-4 py-3">{a.name}</td>
                <td className="px-4 py-3">{a.type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
