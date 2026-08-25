import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  Wallet,
  BookOpen,
  ScrollText,
  Scale,
  Landmark,
  History,
  CalendarClock,
  ShieldCheck,
} from "lucide-react";
import { requireUser } from "@/lib/session";
import { NavLink } from "@/components/nav-link";
import { LogoutButton } from "@/components/logout-button";

// `roles` mirrors the NestJS @Roles() guard on the underlying endpoint — omit
// it for pages backed by an endpoint any authenticated user can read.
const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/loan-products", label: "Loan Products", icon: Package },
  { href: "/loan-applications", label: "Loan Applications", icon: FileText },
  { href: "/loan-accounts", label: "Loan Accounts", icon: Wallet },
  { href: "/ledger/chart-of-accounts", label: "Chart of Accounts", icon: BookOpen },
  { href: "/ledger/journal-entries", label: "Journal Entries", icon: ScrollText },
  { href: "/ledger/reports/trial-balance", label: "Trial Balance", icon: Scale },
  { href: "/accounting-periods", label: "Accounting Periods", icon: CalendarClock, roles: ["ADMIN"] },
  { href: "/regulatory-params", label: "Regulatory Params", icon: Landmark },
  { href: "/audit-log", label: "Audit Log", icon: History, roles: ["ADMIN", "BACK_OFFICE"] },
  { href: "/security", label: "Security", icon: ShieldCheck },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const visibleNav = NAV.filter((item) => !item.roles || item.roles.includes(user.role));

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 shrink-0 border-r border-slate-200 bg-white px-4 py-6">
        <div className="mb-6 px-2">
          <p className="text-sm font-semibold text-slate-900">Golden Knot MFI</p>
          <p className="text-xs text-slate-500">{user.email}</p>
          <p className="text-xs text-slate-400">{user.role}</p>
        </div>
        <nav className="space-y-1">
          {visibleNav.map((item) => (
            <NavLink key={item.href} href={item.href} icon={<item.icon size={16} />}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-6 px-2">
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
