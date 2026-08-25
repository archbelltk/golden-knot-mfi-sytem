import { serverFetch } from "@/lib/server-fetch";
import { NewUserForm } from "@/components/new-user-form";

interface Branch {
  id: string;
  name: string;
}

export default async function NewUserPage() {
  const branches = await serverFetch<Branch[]>("/branches");

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">New User</h1>
      <NewUserForm branches={branches} />
    </div>
  );
}
