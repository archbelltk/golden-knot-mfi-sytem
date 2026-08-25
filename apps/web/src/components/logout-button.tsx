"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const router = useRouter();

  const onClick = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <button onClick={onClick} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
      <LogOut size={14} />
      Sign out
    </button>
  );
}
