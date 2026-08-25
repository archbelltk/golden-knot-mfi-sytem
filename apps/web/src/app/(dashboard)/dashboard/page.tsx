import Link from "next/link";
import { Users, Wallet, FileClock, TriangleAlert } from "lucide-react";
import { serverFetch } from "@/lib/server-fetch";
import { requireUser } from "@/lib/session";
import { formatDate, formatDateTime, formatMoney, formatPeriod } from "@/lib/format";
import { StatCard } from "@/components/stat-card";
import { DonutChart } from "@/components/charts";

interface ClientRow {
  id: string;
  status: string;
}
interface LoanAccountRow {
  id: string;
  status: string;
  principal: string;
  currency: string;
  parBucket: string;
  daysInArrears: number;
  client: { firstName: string; lastName: string };
  product: { name: string };
}
interface LoanApplicationRow {
  id: string;
  status: string;
  requestedPrincipal: string;
  createdAt: string;
  client: { firstName: string; lastName: string };
  product: { name: string };
}
interface GLEntryLine {
  debit: string;
  credit: string;
}
interface GLEntry {
  reference: string;
  period: string;
  lines: GLEntryLine[];
}
interface AuditLogEntry {
  id: string;
  entityType: string;
  action: string;
  actorRole: string;
  createdAt: string;
}

const CLIENT_STATUS_ORDER = ["PROSPECT", "UNDER_REVIEW", "ACTIVE", "DORMANT"];
const ACCOUNT_STATUS_ORDER = ["PENDING_DISBURSEMENT", "ACTIVE", "ARREARS", "WRITTEN_OFF", "CLOSED"];
const APPLICATION_PENDING_STATUSES = [
  "PENDING_LOAN_OFFICER",
  "PENDING_BRANCH_MANAGER",
  "PENDING_CREDIT_COMMITTEE",
];

const STATUS_COLORS: Record<string, string> = {
  PENDING_DISBURSEMENT: "#b2943d",
  ACTIVE: "#2e3193",
  ARREARS: "#dc2626",
  WRITTEN_OFF: "#94a3b8",
  CLOSED: "#cbd5e1",
};

function entryAmount(entry: GLEntry): number {
  return Math.max(...entry.lines.map((l) => Math.max(Number(l.debit), Number(l.credit))), 0);
}

export default async function DashboardPage() {
  const user = await requireUser();
  const canSeeAudit = user.role === "ADMIN" || user.role === "BACK_OFFICE";

  const [clients, loanAccounts, applications, entries, auditLogs] = await Promise.all([
    serverFetch<ClientRow[]>("/clients"),
    serverFetch<LoanAccountRow[]>("/loan-accounts"),
    serverFetch<LoanApplicationRow[]>("/loan-applications"),
    serverFetch<GLEntry[]>("/journal-entries"),
    canSeeAudit ? serverFetch<AuditLogEntry[]>("/audit-logs") : Promise.resolve([]),
  ]);

  // --- Clients -------------------------------------------------------------
  const activeClients = clients.filter((c) => c.status === "ACTIVE").length;
  const clientStatusData = CLIENT_STATUS_ORDER.map(
    (s) => clients.filter((c) => c.status === s).length,
  );

  // --- Loan portfolio --------------------------------------------------------
  const outstandingAccounts = loanAccounts.filter((a) => a.status === "ACTIVE" || a.status === "ARREARS");
  const byCurrency = new Map<string, number>();
  for (const a of outstandingAccounts) {
    byCurrency.set(a.currency, (byCurrency.get(a.currency) ?? 0) + Number(a.principal));
  }
  const [topCurrency, topAmount] = [...byCurrency.entries()].sort((a, b) => b[1] - a[1])[0] ?? ["ZIG", 0];
  const otherCurrencies = [...byCurrency.entries()].filter(([c]) => c !== topCurrency);
  const accountStatusData = ACCOUNT_STATUS_ORDER.map(
    (s) => loanAccounts.filter((a) => a.status === s).length,
  );

  // --- Applications ------------------------------------------------------
  const pendingApplications = applications.filter((a) => APPLICATION_PENDING_STATUSES.includes(a.status));
  const approvedCount = applications.filter((a) => a.status === "APPROVED").length;
  const rejectedCount = applications.filter((a) => a.status === "REJECTED").length;

  // --- GL activity by period ----------------------------------------------
  const disbursedByPeriod = new Map<string, number>();
  const repaidByPeriod = new Map<string, number>();
  for (const e of entries) {
    const amount = entryAmount(e);
    if (e.reference.startsWith("DISB-")) {
      disbursedByPeriod.set(e.period, (disbursedByPeriod.get(e.period) ?? 0) + amount);
    } else if (e.reference.startsWith("RPY-")) {
      repaidByPeriod.set(e.period, (repaidByPeriod.get(e.period) ?? 0) + amount);
    }
  }
  const periods = [...new Set([...disbursedByPeriod.keys(), ...repaidByPeriod.keys()])]
    .sort()
    .slice(-6);
  const maxPeriodAmount = Math.max(
    1,
    ...periods.map((p) => Math.max(disbursedByPeriod.get(p) ?? 0, repaidByPeriod.get(p) ?? 0)),
  );

  // --- Loans needing attention ---------------------------------------------
  const arrearsAccounts = loanAccounts
    .filter((a) => a.status === "ARREARS")
    .sort((a, b) => b.daysInArrears - a.daysInArrears)
    .slice(0, 4);

  const donutSegments = ACCOUNT_STATUS_ORDER.filter(
    (s) => loanAccounts.some((a) => a.status === s),
  ).map((s) => ({
    label: s.replace(/_/g, " "),
    value: loanAccounts.filter((a) => a.status === s).length,
    color: STATUS_COLORS[s],
    href: `/loan-accounts?status=${s}`,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-500">Here&apos;s what&apos;s happening across the portfolio today.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <StatCard
          icon={Users}
          label="Active Clients"
          value={String(activeClients)}
          trendLabel={`of ${clients.length} total clients`}
          data={clientStatusData}
          href="/clients?status=ACTIVE"
        />
        <StatCard
          icon={Wallet}
          label="Loan Portfolio"
          value={formatMoney(topAmount, topCurrency)}
          trendLabel={
            otherCurrencies.length > 0
              ? `+ ${otherCurrencies.map(([c, v]) => formatMoney(v, c)).join(", ")}`
              : `${outstandingAccounts.length} active loans`
          }
          chart="line"
          data={accountStatusData}
          href="/loan-accounts?status=ACTIVE"
        />
        <StatCard
          icon={FileClock}
          label="Applications Pending"
          value={String(pendingApplications.length)}
          trendLabel={`${approvedCount} approved · ${rejectedCount} rejected`}
          data={[applications.length, pendingApplications.length, approvedCount, rejectedCount]}
          href="/loan-applications"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Disbursements vs Repayments</h2>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary" /> Disbursed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-secondary" /> Repaid
              </span>
            </div>
          </div>

          {periods.length === 0 ? (
            <p className="mt-8 text-sm text-slate-400">No GL activity posted yet.</p>
          ) : (
            <div className="mt-6 flex h-48 items-end justify-between gap-4">
              {periods.map((p) => {
                const disbursed = disbursedByPeriod.get(p) ?? 0;
                const repaid = repaidByPeriod.get(p) ?? 0;
                return (
                  <div key={p} className="flex flex-1 flex-col items-center gap-2">
                    <div className="flex h-40 w-full items-end justify-center gap-1.5">
                      <div
                        className="w-full max-w-6 rounded-t-md bg-primary"
                        style={{ height: `${Math.max((disbursed / maxPeriodAmount) * 100, disbursed > 0 ? 4 : 0)}%` }}
                        title={formatMoney(disbursed, "")}
                      />
                      <div
                        className="w-full max-w-6 rounded-t-md bg-secondary"
                        style={{ height: `${Math.max((repaid / maxPeriodAmount) * 100, repaid > 0 ? 4 : 0)}%` }}
                        title={formatMoney(repaid, "")}
                      />
                    </div>
                    <span className="text-xs text-slate-500">{formatPeriod(p)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">
            {canSeeAudit ? "Recent Activity" : "Recent Applications"}
          </h2>
          <div className="mt-4 space-y-4">
            {canSeeAudit
              ? auditLogs.slice(0, 6).map((log) => (
                  <div key={log.id} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                    <p className="text-sm font-medium text-slate-900">
                      {log.action.replace(/_/g, " ")} · {log.entityType}
                    </p>
                    <p className="text-xs text-slate-400">
                      {log.actorRole.replace(/_/g, " ")} · {formatDateTime(log.createdAt)}
                    </p>
                  </div>
                ))
              : applications.slice(0, 6).map((a) => (
                  <div key={a.id} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                    <p className="text-sm font-medium text-slate-900">
                      {a.client.firstName} {a.client.lastName}
                    </p>
                    <p className="text-xs text-slate-400">
                      {a.product.name} · {a.status.replace(/_/g, " ")} · {formatDate(a.createdAt)}
                    </p>
                  </div>
                ))}
            {(canSeeAudit ? auditLogs : applications).length === 0 && (
              <p className="text-sm text-slate-400">Nothing yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">Loan Accounts by Status</h2>
          <div className="mt-5 flex items-center gap-8">
            <DonutChart
              segments={donutSegments}
              centerValue={String(loanAccounts.length)}
              centerLabel="Accounts"
              size={140}
            />
            <div className="flex-1 space-y-1.5 text-sm">
              {donutSegments.map((s) => (
                <Link
                  key={s.label}
                  href={s.href!}
                  className="-mx-2 flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-slate-50"
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-slate-600">{s.label}</span>
                  <span className="ml-auto font-medium text-slate-900">{s.value}</span>
                </Link>
              ))}
              {donutSegments.length === 0 && <p className="text-slate-400">No loan accounts yet.</p>}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <TriangleAlert size={16} className="text-red-600" />
            <h2 className="text-sm font-semibold text-slate-900">Needs Attention</h2>
          </div>
          <div className="mt-4 space-y-3">
            {arrearsAccounts.map((a) => (
              <Link
                key={a.id}
                href={`/loan-accounts/${a.id}`}
                className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50 px-4 py-3 transition-colors hover:bg-red-100"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {a.client.firstName} {a.client.lastName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {a.product.name} · {formatMoney(Number(a.principal), a.currency)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-red-700">{a.daysInArrears} days overdue</p>
                  <p className="text-xs text-slate-400">{a.parBucket.replace(/_/g, " ")}</p>
                </div>
              </Link>
            ))}
            {pendingApplications.length > 0 && (
              <Link
                href="/loan-applications"
                className="flex items-center justify-between rounded-lg border border-secondary/30 bg-secondary-light px-4 py-3 transition-colors hover:bg-secondary/20"
              >
                <p className="text-sm font-medium text-slate-900">Applications awaiting a decision</p>
                <p className="text-sm font-medium text-secondary-dark">{pendingApplications.length}</p>
              </Link>
            )}
            {arrearsAccounts.length === 0 && pendingApplications.length === 0 && (
              <p className="text-sm text-slate-400">Nothing needs attention right now.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
