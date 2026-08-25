import Link from "next/link";
import { ApiError, serverFetch } from "@/lib/server-fetch";
import { formatDate } from "@/lib/format";
import { ForbiddenNotice } from "@/components/forbidden-notice";
import { ClientStatusActions } from "@/components/client-status-actions";
import { ComplianceRecordForm } from "@/components/compliance-record-form";
import { KycUploadForm } from "@/components/kyc-upload-form";
import { KycVerifyButtons } from "@/components/kyc-verify-buttons";

interface ClientDetail {
  id: string;
  clientNumber: string;
  firstName: string;
  lastName: string;
  nationalId: string;
  phone: string;
  email: string | null;
  status: "PROSPECT" | "UNDER_REVIEW" | "ACTIVE" | "DORMANT" | "BLACKLISTED";
  addresses: { id: string; type: string; line1: string; city: string; province: string }[];
  nextOfKin: { id: string; fullName: string; relationship: string; phone: string }[];
  kycDocuments: { id: string; docType: string; verifiedStatus: string; uploadedAt: string }[];
  complianceRecords: { id: string; screeningType: string; result: string; reviewedAt: string; notes: string | null }[];
  loanApplications: { id: string; status: string; requestedPrincipal: string }[];
  loanAccounts: { id: string; status: string; principal: string; currency: string }[];
}

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let client: ClientDetail;
  try {
    client = await serverFetch<ClientDetail>(`/clients/${id}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) {
      return <ForbiddenNotice message="This client belongs to a different branch — you don't have access to their record." />;
    }
    throw err;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {client.firstName} {client.lastName}
          </h1>
          <p className="text-sm text-slate-500">
            {client.clientNumber} · National ID {client.nationalId} ·{" "}
            <span className="font-medium">{client.status}</span>
          </p>
        </div>
        <ClientStatusActions clientId={client.id} status={client.status} />
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">Contact</h2>
          <p className="mt-2 text-sm text-slate-600">Phone: {client.phone}</p>
          <p className="text-sm text-slate-600">Email: {client.email ?? "—"}</p>
          {client.addresses.map((a) => (
            <p key={a.id} className="mt-1 text-sm text-slate-600">
              {a.type}: {a.line1}, {a.city}, {a.province}
            </p>
          ))}
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">Next of Kin</h2>
          {client.nextOfKin.map((k) => (
            <p key={k.id} className="mt-2 text-sm text-slate-600">
              {k.fullName} ({k.relationship}) — {k.phone}
            </p>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Loan Applications</h2>
        <div className="mt-3 space-y-2">
          {client.loanApplications.length === 0 && <p className="text-sm text-slate-400">None yet.</p>}
          {client.loanApplications.map((a) => (
            <Link
              key={a.id}
              href={`/loan-applications/${a.id}`}
              className="block rounded-md border border-slate-100 px-3 py-2 text-sm hover:bg-slate-50"
            >
              {a.status} — principal {a.requestedPrincipal}
            </Link>
          ))}
        </div>
        <Link
          href={`/loan-applications/new?clientId=${client.id}`}
          className="mt-3 inline-block rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-dark"
        >
          New Loan Application
        </Link>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Loan Accounts</h2>
        <div className="mt-3 space-y-2">
          {client.loanAccounts.length === 0 && <p className="text-sm text-slate-400">None yet.</p>}
          {client.loanAccounts.map((a) => (
            <Link
              key={a.id}
              href={`/loan-accounts/${a.id}`}
              className="block rounded-md border border-slate-100 px-3 py-2 text-sm hover:bg-slate-50"
            >
              {a.status} — {a.principal} {a.currency}
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">KYC Documents</h2>
        <div className="mt-3 space-y-2">
          {client.kycDocuments.map((d) => (
            <div key={d.id} className="flex items-center justify-between text-sm text-slate-600">
              <span>
                {d.docType} — {d.verifiedStatus} — {formatDate(d.uploadedAt)}
              </span>
              {d.verifiedStatus === "PENDING" && <KycVerifyButtons clientId={client.id} documentId={d.id} />}
            </div>
          ))}
          {client.kycDocuments.length === 0 && <p className="text-sm text-slate-400">No documents uploaded.</p>}
        </div>
        <div className="mt-3">
          <KycUploadForm clientId={client.id} />
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Compliance / AML Screening</h2>
        <div className="mt-3 space-y-1">
          {client.complianceRecords.map((r) => (
            <p key={r.id} className="text-sm text-slate-600">
              {r.screeningType} — {r.result} — {formatDate(r.reviewedAt)}
              {r.notes ? ` — ${r.notes}` : ""}
            </p>
          ))}
          {client.complianceRecords.length === 0 && <p className="text-sm text-slate-400">No screenings recorded.</p>}
        </div>
        <div className="mt-3">
          <ComplianceRecordForm clientId={client.id} />
        </div>
      </section>
    </div>
  );
}
