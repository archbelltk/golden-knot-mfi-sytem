"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, TriangleAlert, FileClock } from "lucide-react";

export interface NotificationItem {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  kind: "arrears" | "pending";
}

export function NotificationsMenu({ items }: { items: NotificationItem[] }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
      >
        <Bell size={16} />
        {items.length > 0 && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-10 mt-2 w-80 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          <p className="px-4 py-2 text-xs font-medium uppercase tracking-wide text-slate-400">
            Notifications
          </p>
          {items.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-400">Nothing needs your attention.</p>
          ) : (
            items.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-start gap-2.5 px-4 py-2.5 hover:bg-slate-50"
              >
                {item.kind === "arrears" ? (
                  <TriangleAlert size={14} className="mt-0.5 shrink-0 text-red-600" />
                ) : (
                  <FileClock size={14} className="mt-0.5 shrink-0 text-secondary" />
                )}
                <span>
                  <span className="block text-sm font-medium text-slate-900">{item.title}</span>
                  <span className="block text-xs text-slate-500">{item.subtitle}</span>
                </span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
