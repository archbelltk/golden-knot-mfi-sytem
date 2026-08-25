import Image from "next/image";
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  Wallet,
  Banknote,
  BookOpen,
  ScrollText,
  Scale,
  Landmark,
  History,
  CalendarClock,
  UserCog,
  GitBranch,
  Settings,
} from "lucide-react";
import { requireUser } from "@/lib/session";
import { serverFetch } from "@/lib/server-fetch";
import { NavLink } from "@/components/nav-link";
import { LogoutButton } from "@/components/logout-button";
import { TopBar } from "@/components/top-bar";
import type { NotificationItem } from "@/components/notifications-menu";
import { SidebarProvider } from "@/components/sidebar-context";
import { SidebarShell } from "@/components/sidebar-shell";

const PENDING_APPLICATION_STATUSES = [
  "PENDING_LOAN_OFFICER",
  "PENDING_BRANCH_MANAGER",
  "PENDING_CREDIT_COMMITTEE",
];

// `roles` mirrors the NestJS @Roles() guard on the underlying endpoint — omit
// it for pages backed by an endpoint any authenticated user can read.
const NAV_GROUPS = [
  {
    label: "Main menu",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/clients", label: "Clients", icon: Users },
      { href: "/loan-applications", label: "Loan Applications", icon: FileText },
      { href: "/disbursements", label: "Disbursements", icon: Banknote },
      { href: "/loan-accounts", label: "Loan Accounts", icon: Wallet },
    ],
  },
  {
    label: "Management",
    items: [
      { href: "/loan-products", label: "Loan Products", icon: Package },
      { href: "/approval-levels", label: "Approval Levels", icon: GitBranch },
      { href: "/ledger/chart-of-accounts", label: "Chart of Accounts", icon: BookOpen },
      { href: "/ledger/journal-entries", label: "Journal Entries", icon: ScrollText },
      { href: "/ledger/reports/trial-balance", label: "Trial Balance", icon: Scale },
      { href: "/accounting-periods", label: "Accounting Periods", icon: CalendarClock, roles: ["ADMIN"] },
      { href: "/regulatory-params", label: "Regulatory Params", icon: Landmark },
      { href: "/users", label: "Users", icon: UserCog, roles: ["ADMIN"] },
      { href: "/audit-log", label: "Audit Log", icon: History, roles: ["ADMIN", "BACK_OFFICE"] },
    ],
  },
];

// Rendered separately in the sidebar footer, next to Sign out — kept out of
// `flatNav`'s render loop but still included there so the TopBar breadcrumb
// resolves correctly when this page is open.
const SETTINGS_ITEM = { href: "/security", label: "Settings" };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.roles || item.roles.includes(user.role)),
  }));
  // TopBar is a Client Component — only pass plain serializable fields across
  // the boundary, not the Lucide icon component references.
  const flatNav = [
    ...visibleGroups.flatMap((g) => g.items.map((item) => ({ href: item.href, label: item.label }))),
    SETTINGS_ITEM,
  ];

  const [loanAccounts, loanApplications] = await Promise.all([
    serverFetch<
      { id: string; status: string; daysInArrears: number; client: { firstName: string; lastName: string }; product: { name: string } }[]
    >("/loan-accounts"),
    serverFetch<{ id: string; status: string }[]>("/loan-applications"),
  ]);
  const notifications: NotificationItem[] = [
    ...loanAccounts
      .filter((a) => a.status === "ARREARS")
      .sort((a, b) => b.daysInArrears - a.daysInArrears)
      .slice(0, 5)
      .map((a) => ({
        id: a.id,
        title: `${a.client.firstName} ${a.client.lastName} — ${a.daysInArrears} days overdue`,
        subtitle: a.product.name,
        href: `/loan-accounts/${a.id}`,
        kind: "arrears" as const,
      })),
    ...(loanApplications.some((a) => PENDING_APPLICATION_STATUSES.includes(a.status))
      ? [
          {
            id: "pending-applications",
            title: `${loanApplications.filter((a) => PENDING_APPLICATION_STATUSES.includes(a.status)).length} applications awaiting a decision`,
            subtitle: "Loan Applications",
            href: "/loan-applications",
            kind: "pending" as const,
          },
        ]
      : []),
  ];

  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-slate-50">
      <SidebarShell>
        <div className="mb-6 border-b border-slate-100 px-2 pb-5">
          <Image src="/gk-logo.png" alt="Golden Knot" width={1884} height={1558} className="h-20 w-auto" priority />
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto">
          {visibleGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 text-xs font-medium uppercase tracking-wide text-slate-400">
                {group.label}
              </p>
              <div className="mt-2 space-y-1">
                {group.items.map((item) => (
                  <NavLink key={item.href} href={item.href} icon={<item.icon size={16} />}>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-4 space-y-1 border-t border-slate-100 pt-4">
          <NavLink href={SETTINGS_ITEM.href} icon={<Settings size={16} />}>
            {SETTINGS_ITEM.label}
          </NavLink>
          <div className="px-3 py-2">
            <LogoutButton />
          </div>
        </div>
      </SidebarShell>

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar nav={flatNav} email={user.email} role={user.role} notifications={notifications} />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
