import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { serverFetch } from "@/lib/server-fetch";
import { requireUser } from "@/lib/session";
import { JournalEntryApproveButton } from "@/components/journal-entry-approve-button";

interface GLEntryLine {
  id: string;
  debit: string;
  credit: string;
  glAccountId: string;
}
interface GLEntry {
  id: string;
  reference: string;
  description: string;
  period: string;
  status: string;
  makerId: string;
  checkerId: string | null;
  lines: GLEntryLine[];
}

export default async function JournalEntriesPage() {
  const [entries, user] = await Promise.all([
    serverFetch<GLEntry[]>("/journal-entries"),
    requireUser(),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Journal Entries</h1>
        <Link
          href="/ledger/journal-entries/new"
          className="flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          <PlusCircle size={16} />
          New Entry
        </Link>
      </div>

      <div className="mt-6 space-y-3">
        {entries.map((e) => (
          <div key={e.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900">{e.description}</p>
                <p className="text-xs text-slate-500">
                  {e.reference} · {e.period} · {e.status}
                </p>
              </div>
              {e.status === "PENDING_APPROVAL" && e.makerId !== user.id && (
                <JournalEntryApproveButton entryId={e.id} />
              )}
              {e.status === "PENDING_APPROVAL" && e.makerId === user.id && (
                <span className="text-xs text-slate-400">Awaiting a different approver</span>
              )}
            </div>
            <table className="mt-3 w-full text-xs">
              <tbody>
                {e.lines.map((l) => (
                  <tr key={l.id} className="border-t border-slate-100">
                    <td className="py-1 text-slate-500">{l.glAccountId}</td>
                    <td className="py-1 text-right">{Number(l.debit) > 0 ? l.debit : ""}</td>
                    <td className="py-1 text-right">{Number(l.credit) > 0 ? l.credit : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        {entries.length === 0 && <p className="text-sm text-slate-400">No journal entries yet.</p>}
      </div>
    </div>
  );
}
