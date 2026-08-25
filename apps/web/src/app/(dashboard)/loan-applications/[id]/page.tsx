import Link from "next/link";
import { ApiError, serverFetch } from "@/lib/server-fetch";
import { formatDateTime } from "@/lib/format";
import { ForbiddenNotice } from "@/components/forbidden-notice";
import { LoanApplicationDecisionForm } from "@/components/loan-application-decision-form";
import type { ApprovalLevel } from "@golden-knot/shared";

interface LoanApplicationDetail {
  id: string;
  status: string;
  requiredLevel: ApprovalLevel;
  currentLevel: ApprovalLevel | null;
  requestedPrincipal: string;
  requestedTenorMonths: number;
  client: { id: string; firstName: string; lastName: string; clientNumber: string };
  product: { name: string; currency: string };
  approvals: { id: string; level: string; decision: string; comment: string | null; decidedAt: string }[];
  loanAccount: { id: string } | null;
}

export default async function LoanApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let application: LoanApplicationDetail;
  try {
    application = await serverFetch<LoanApplicationDetail>(`/loan-applications/${id}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) {
      return <ForbiddenNotice message="This loan application belongs to a different branch — you don't have access to it." />;
    }
    throw err;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Loan Application — {application.client.firstName} {application.client.lastName}
        </h1>
        <p className="text-sm text-slate-500">
          <Link href={`/clients/${application.client.id}`} className="underline underline-offset-2">
            {application.client.clientNumber}
          </Link>
          {" · "}
          {application.product.name} · {application.requestedPrincipal} {application.product.currency} ·{" "}
          {application.requestedTenorMonths} months
        </p>
        <p className="mt-1 text-sm font-medium text-slate-700">
          Status: {application.status} (requires up to {application.requiredLevel})
        </p>
      </div>

      {application.currentLevel && (
        <LoanApplicationDecisionForm applicationId={application.id} level={application.currentLevel} />
      )}

      {application.loanAccount && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm text-emerald-900">
            Approved —{" "}
            <Link href={`/loan-accounts/${application.loanAccount.id}`} className="underline underline-offset-2">
              view loan account
            </Link>
          </p>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Approval History</h2>
        <div className="mt-3 space-y-2">
          {application.approvals.map((a) => (
            <p key={a.id} className="text-sm text-slate-600">
              {a.level}: {a.decision} — {formatDateTime(a.decidedAt)}
              {a.comment ? ` — "${a.comment}"` : ""}
            </p>
          ))}
          {application.approvals.length === 0 && <p className="text-sm text-slate-400">No decisions recorded yet.</p>}
        </div>
      </div>
    </div>
  );
}
