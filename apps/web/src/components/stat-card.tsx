import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { BarSparkline, LineSparkline } from "./charts";

export function StatCard({
  icon: Icon,
  label,
  value,
  trendLabel,
  trend = "neutral",
  chart = "bar",
  data,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  trendLabel: string;
  trend?: "up" | "down" | "neutral";
  chart?: "bar" | "line";
  data: number[];
  href?: string;
}) {
  const trendColor =
    trend === "up" ? "text-emerald-600" : trend === "down" ? "text-red-600" : "text-slate-400";

  const content = (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
          <Icon size={16} className="text-primary" />
          {label}
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between gap-4">
        <div>
          <p className="text-2xl font-semibold text-slate-900">{value}</p>
          <p className={`mt-1 flex items-center gap-1 text-xs font-medium ${trendColor}`}>
            {trend === "up" && <ArrowUpRight size={12} />}
            {trend === "down" && <ArrowDownRight size={12} />}
            {trendLabel}
          </p>
        </div>
        {chart === "bar" ? <BarSparkline data={data} /> : <LineSparkline data={data} />}
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-primary/40 hover:bg-slate-50"
      >
        {content}
      </Link>
    );
  }

  return <div className="rounded-xl border border-slate-200 bg-white p-5">{content}</div>;
}
