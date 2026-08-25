import { serverFetch } from "@/lib/server-fetch";
import { formatDate, formatDateTime } from "@/lib/format";
import { RegulatoryParamForm } from "@/components/regulatory-param-form";

interface RegulatoryParameter {
  id: string;
  key: string;
  value: unknown;
  currency: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdBy: string;
  createdAt: string;
}

export default async function RegulatoryParamsPage() {
  const params = await serverFetch<RegulatoryParameter[]>("/regulatory-params");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Regulatory Parameters</h1>
      <p className="text-sm text-slate-500">
        RBZ-driven caps and thresholds (e.g. maximum lending rate) are configurable here rather than
        hard-coded, with a full audit trail of every change.
      </p>

      <RegulatoryParamForm />

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Key</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3">Currency</th>
              <th className="px-4 py-3">Effective from</th>
              <th className="px-4 py-3">Recorded</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {params.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3 font-mono">{p.key}</td>
                <td className="px-4 py-3">{JSON.stringify(p.value)}</td>
                <td className="px-4 py-3">{p.currency ?? "Any"}</td>
                <td className="px-4 py-3">{formatDate(p.effectiveFrom)}</td>
                <td className="px-4 py-3">{formatDateTime(p.createdAt)}</td>
              </tr>
            ))}
            {params.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  No regulatory parameters recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
