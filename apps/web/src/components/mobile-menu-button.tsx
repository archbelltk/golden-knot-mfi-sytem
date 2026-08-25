"use client";

import { Menu } from "lucide-react";
import { useSidebar } from "./sidebar-context";

export function MobileMenuButton() {
  const { toggle } = useSidebar();

  return (
    <button
      onClick={toggle}
      className="rounded-md p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
      aria-label="Toggle menu"
    >
      <Menu size={20} />
    </button>
  );
}
