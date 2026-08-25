import Link from "next/link";
import { FileText } from "lucide-react";
import { ApiError, serverFetch } from "@/lib/server-fetch";
import { ForbiddenNotice } from "@/components/forbidden-notice";
import { LoanDisburseForm } from "@/components/loan-disburse-form";
import { LoanRepaymentForm } from "@/components/loan-repayment-form";
import { LoanWriteOffButton } from "@/components/loan-writeoff-button";

interface ScheduleLine {
  id: string;
  installmentNumber: number;
  dueDate: string;
  principalDue: string;
  interestDue: string;
  feesDue: string;
  principalPaid: string;
  interestPaid: string;
  feesPaid: string;
  status: string;
}

interface LoanAccountDetail {
  id: string;
  status: string;
  principal: string;
  currency: string;
  interestRate: string;
  interestType: string;
  tenorMonths: number;
  parBucket: string;
  daysInArrears: number;
  disbursementDate: string | null;
  maturityDate: string | null;
  client: { id: string; firstName: string; lastName: string; clientNumber: string };
  product: { name: string };
  scheduleLines: ScheduleLine[];
}

export default async function LoanAccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let account: LoanAccountDetail;
  try {
    account = await serverFetch<LoanAccountDetail>(`/loan-accounts/${id}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) {
      return <ForbiddenNotice message="This loan account belongs to a different branch — you don't have access to it." />;
    }
    throw err;
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Loan Account —{" "}
            <Link href={`/clients/${account.client.id}`} className="underline underline-offset-2">
              {account.client.firstName} {account.client.lastName}
            </Link>
          </h1>
          <p className="text-sm text-slate-500">
            {account.product.name} · {account.principal} {account.currency} · {account.tenorMonths} months ·{" "}
            {account.interestType} @ {(Number(account.interestRate) * 100).toFixed(2)}%/month
          </p>
          <p className="mt-1 text-sm font-medium text-slate-700">
            Status: {account.status} · PAR bucket: {account.parBucket} · Days in arrears: {account.daysInArrears}
          </p>
        </div>
        <Link
          href={`/loan-accounts/${account.id}/agreement`}
          className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <FileText size={14} />
          View agreement
        </Link>
      </div>

      {account.status === "PENDING_DISBURSEMENT" && <LoanDisburseForm loanAccountId={account.id} />}
      {(account.status === "ACTIVE" || account.status === "ARREARS") && (
        <>
          <LoanRepaymentForm loanAccountId={account.id} />
          <LoanWriteOffButton loanAccountId={account.id} />
        </>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Repayment Schedule</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="text-left text-xs font-medium uppercase text-slate-500">
              <tr>
                <th className="px-2 py-2">#</th>
                <th className="px-2 py-2">Due date</th>
                <th className="px-2 py-2">Principal</th>
                <th className="px-2 py-2">Interest</th>
                <th className="px-2 py-2">Fees</th>
                <th className="px-2 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {account.scheduleLines.map((line) => (
                <tr key={line.id}>
                  <td className="px-2 py-2">{line.installmentNumber}</td>
                  <td className="px-2 py-2">{new Date(line.dueDate).toLocaleDateString()}</td>
                  <td className="px-2 py-2">
                    {line.principalPaid}/{line.principalDue}
                  </td>
                  <td className="px-2 py-2">
                    {line.interestPaid}/{line.interestDue}
                  </td>
                  <td className="px-2 py-2">
                    {line.feesPaid}/{line.feesDue}
                  </td>
                  <td className="px-2 py-2">{line.status}</td>
                </tr>
              ))}
              {account.scheduleLines.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-2 py-4 text-center text-slate-400">
                    No schedule yet — disburse the loan to generate it.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
