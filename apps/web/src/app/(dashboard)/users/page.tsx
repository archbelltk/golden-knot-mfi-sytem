import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { serverFetch } from "@/lib/server-fetch";
import { formatDate, formatRole } from "@/lib/format";
import { UserStatusToggle } from "@/components/user-status-toggle";

interface UserRow {
  id: string;
  email: string;
  fullName: string;
  role: string;
  branchId: string | null;
  isActive: boolean;
  mfaEnabled: boolean;
  createdAt: string;
}

export default async function UsersPage() {
  const users = await serverFetch<UserRow[]>("/users");

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Users</h1>
          <p className="mt-1 text-sm text-slate-500">
            Staff accounts and role assignment. Deactivating a user immediately revokes access,
            including any session already signed in.
          </p>
        </div>
        <Link
          href="/users/new"
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-dark"
        >
          <PlusCircle size={16} />
          New User
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">MFA</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className={u.isActive ? "" : "opacity-60"}>
                <td className="px-4 py-3 font-medium text-slate-900">{u.fullName}</td>
                <td className="px-4 py-3 text-slate-600">{u.email}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-primary-light px-2 py-1 text-xs font-medium text-primary">
                    {formatRole(u.role)}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500">{u.mfaEnabled ? "Enabled" : "—"}</td>
                <td className="px-4 py-3 text-slate-500">{formatDate(u.createdAt)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      u.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {u.isActive ? "Active" : "Deactivated"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <UserStatusToggle userId={u.id} isActive={u.isActive} />
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  No users yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
