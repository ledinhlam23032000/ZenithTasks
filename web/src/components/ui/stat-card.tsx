import * as React from "react";
import { cn } from "@/lib/cn";
import type { Tone } from "./badge";

const toneStyles: Record<Tone, { icon: string }> = {
  brand: { icon: "bg-brand-50 text-brand-600" },
  green: { icon: "bg-emerald-50 text-emerald-600" },
  amber: { icon: "bg-amber-50 text-amber-600" },
  red: { icon: "bg-rose-50 text-rose-600" },
  slate: { icon: "bg-slate-100 text-slate-600" },
  blue: { icon: "bg-sky-50 text-sky-600" },
  purple: { icon: "bg-violet-50 text-violet-600" },
  pink: { icon: "bg-pink-50 text-pink-600" },
};

export function StatCard({
  label,
  value,
  sub,
  icon,
  tone = "brand",
  trend,
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: Tone;
  trend?: { value: number; label?: string };
  className?: string;
}) {
  const up = trend ? trend.value >= 0 : false;
  return (
    <div className={cn("rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/40", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {icon && (
          <span className={cn("inline-flex h-9 w-9 items-center justify-center rounded-lg", toneStyles[tone].icon)}>
            {icon}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-end gap-2">
        <span className="text-2xl font-semibold tracking-tight text-slate-900">{value}</span>
        {trend && (
          <span
            className={cn(
              "mb-1 inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-semibold",
              up ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600",
            )}
          >
            {up ? "▲" : "▼"} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
      {trend?.label && <p className="mt-1 text-xs text-slate-400">{trend.label}</p>}
    </div>
  );
}
