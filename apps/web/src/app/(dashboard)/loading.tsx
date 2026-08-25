import { Spinner } from "@/components/spinner";

export default function DashboardLoading() {
  return (
    <div className="flex h-full min-h-[60vh] items-center justify-center">
      <Spinner size={48} />
    </div>
  );
}
