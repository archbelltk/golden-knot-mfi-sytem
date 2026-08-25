import { requireUser } from "@/lib/session";

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Welcome, {user.email}</h1>
      <p className="mt-2 text-sm text-slate-500">
        Use the sidebar to onboard clients, configure loan products, process applications,
        record disbursements and repayments, and review the ledger.
      </p>
    </div>
  );
}
