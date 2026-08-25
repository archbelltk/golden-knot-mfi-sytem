import { ShieldAlert } from "lucide-react";

export function ForbiddenNotice({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <ShieldAlert size={16} />
      {message}
    </div>
  );
}
