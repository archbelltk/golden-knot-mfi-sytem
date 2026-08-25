"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ChevronDown, User, LogOut } from "lucide-react";
import { formatRole, initials } from "@/lib/format";
import { GlobalSearch } from "./global-search";
import { NotificationsMenu, type NotificationItem } from "./notifications-menu";
import { MobileMenuButton } from "./mobile-menu-button";

interface NavItem {
  href: string;
  label: string;
}

export function TopBar({
  nav,
  email,
  role,
  notifications,
}: {
  nav: NavItem[];
  email: string;
  role: string;
  notifications: NotificationItem[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const current = [...nav]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  const crumb = current && current.href !== "/dashboard" ? current.label : null;

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-2">
        <MobileMenuButton />
        <nav className="flex min-w-0 items-center gap-2 text-sm">
          <Link href="/dashboard" className="shrink-0 font-medium text-slate-900 hover:text-primary">
            Dashboard
          </Link>
          {crumb && (
            <>
              <span className="text-slate-300">/</span>
              <span className="truncate font-medium text-slate-900">{crumb}</span>
            </>
          )}
        </nav>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <GlobalSearch />
        <NotificationsMenu items={notifications} />

        <div ref={menuRef} className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-slate-50 sm:pr-3"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
              {initials(role)}
            </div>
            <div className="hidden text-left leading-tight sm:block">
              <p className="text-sm font-medium text-slate-900">{formatRole(role)}</p>
              <p className="text-xs text-slate-500">{email}</p>
            </div>
            <ChevronDown size={16} className={`ml-1 hidden text-slate-400 transition-transform sm:block ${open ? "rotate-180" : ""}`} />
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              <Link
                href="/security"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <User size={14} />
                Profile
              </Link>
              <button
                onClick={logout}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut size={14} />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
