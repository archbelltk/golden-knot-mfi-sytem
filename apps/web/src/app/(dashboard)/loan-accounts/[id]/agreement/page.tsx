import { ApiError, serverFetch } from "@/lib/server-fetch";
import { formatDate } from "@/lib/format";
import { ForbiddenNotice } from "@/components/forbidden-notice";
import { PrintButton } from "@/components/print-button";

interface ScheduleLine {
  id: string;
  installmentNumber: number;
  dueDate: string;
  principalDue: string;
  interestDue: string;
  feesDue: string;
}

interface LoanAccountDetail {
  id: string;
  status: string;
  principal: string;
  currency: string;
  interestRate: string;
  interestType: string;
  tenorMonths: number;
  repaymentFrequency: string;
  disbursementDate: string | null;
  maturityDate: string | null;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    clientNumber: string;
    phone: string;
  };
  product: { name: string };
  scheduleLines: ScheduleLine[];
}

export default async function LoanAgreementPage({ params }: { params: Promise<{ id: string }> }) {
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

  const totalPrincipal = account.scheduleLines.reduce((s, l) => s + Number(l.principalDue), 0);
  const totalInterest = account.scheduleLines.reduce((s, l) => s + Number(l.interestDue), 0);
  const totalFees = account.scheduleLines.reduce((s, l) => s + Number(l.feesDue), 0);
  const totalRepayable = totalPrincipal + totalInterest + totalFees;
  const nominalAnnualRate = Number(account.interestRate) * 12 * 100;

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <h1 className="text-2xl font-semibold text-slate-900">Loan Agreement & Disclosure</h1>
        <PrintButton />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-8 print:border-none print:p-0">
        <h2 className="text-lg font-semibold text-slate-900">Golden Knot Financial Services</h2>
        <p className="text-sm text-slate-500">Loan Agreement: {account.product.name}</p>

        <dl className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-slate-500">Borrower</dt>
            <dd className="font-medium text-slate-900">
              {account.client.firstName} {account.client.lastName} ({account.client.clientNumber})
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Phone</dt>
            <dd className="font-medium text-slate-900">{account.client.phone}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Principal</dt>
            <dd className="font-medium text-slate-900">
              {account.principal} {account.currency}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Tenor</dt>
            <dd className="font-medium text-slate-900">{account.tenorMonths} months, {account.repaymentFrequency.toLowerCase()}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Interest</dt>
            <dd className="font-medium text-slate-900">
              {account.interestType} @ {(Number(account.interestRate) * 100).toFixed(2)}%/month (nominal annual{" "}
              {nominalAnnualRate.toFixed(2)}%)
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Disbursement date</dt>
            <dd className="font-medium text-slate-900">
              {account.disbursementDate ? formatDate(account.disbursementDate) : "Not yet disbursed"}
            </dd>
          </div>
        </dl>

        <div className="mt-6 rounded-md bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-slate-900">Mandatory Disclosure — Total Cost of Credit</h3>
          <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-slate-500">Principal</dt>
              <dd className="font-medium text-slate-900">{totalPrincipal.toFixed(2)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Total interest</dt>
              <dd className="font-medium text-slate-900">{totalInterest.toFixed(2)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Total fees</dt>
              <dd className="font-medium text-slate-900">{totalFees.toFixed(2)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Total repayable</dt>
              <dd className="font-semibold text-slate-900">{totalRepayable.toFixed(2)}</dd>
            </div>
          </dl>
        </div>

        <h3 className="mt-6 text-sm font-semibold text-slate-900">Repayment Schedule</h3>
        <div className="overflow-x-auto">
        <table className="mt-2 w-full text-sm">
          <thead className="text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="py-1">#</th>
              <th className="py-1">Due date</th>
              <th className="py-1 text-right">Principal</th>
              <th className="py-1 text-right">Interest</th>
              <th className="py-1 text-right">Fees</th>
              <th className="py-1 text-right">Installment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {account.scheduleLines.map((line) => (
              <tr key={line.id}>
                <td className="py-1">{line.installmentNumber}</td>
                <td className="py-1">{formatDate(line.dueDate)}</td>
                <td className="py-1 text-right">{Number(line.principalDue).toFixed(2)}</td>
                <td className="py-1 text-right">{Number(line.interestDue).toFixed(2)}</td>
                <td className="py-1 text-right">{Number(line.feesDue).toFixed(2)}</td>
                <td className="py-1 text-right font-medium">
                  {(Number(line.principalDue) + Number(line.interestDue) + Number(line.feesDue)).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        <p className="mt-8 text-xs text-slate-500">
          This disclosure was acknowledged by the client at the time of application, prior to
          submission for approval, as required under the Microfinance Act [Chapter 24:29].
        </p>
      </div>
    </div>
  );
}
