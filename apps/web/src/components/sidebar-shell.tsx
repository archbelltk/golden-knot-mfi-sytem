"use client";

import { useSidebar } from "./sidebar-context";

export function SidebarShell({ children }: { children: React.ReactNode }) {
  const { open, close } = useSidebar();

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-slate-900/30 lg:hidden" onClick={close} aria-hidden />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-full w-64 shrink-0 -translate-x-full flex-col border-r border-slate-200 bg-white px-4 py-5 transition-transform duration-200 lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : ""
        }`}
      >
        {children}
      </aside>
    </>
  );
}
