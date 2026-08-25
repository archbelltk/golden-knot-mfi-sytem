import { ApiError, serverFetch } from "@/lib/server-fetch";
import { ForbiddenNotice } from "@/components/forbidden-notice";

interface AuditLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId: string;
  actorRole: string;
  createdAt: string;
}

export default async function AuditLogPage() {
  let logs: AuditLogEntry[];
  try {
    logs = await serverFetch<AuditLogEntry[]>("/audit-logs");
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) {
      return (
        <ForbiddenNotice message="Your role does not have access to the audit log — this is restricted to Admin and Back Office staff." />
      );
    }
    throw err;
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Audit Log</h1>
      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Actor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-3">{new Date(l.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3">
                  {l.entityType} <span className="text-slate-400">{l.entityId.slice(0, 8)}</span>
                </td>
                <td className="px-4 py-3">{l.action}</td>
                <td className="px-4 py-3">{l.actorRole}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  No audit events yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
