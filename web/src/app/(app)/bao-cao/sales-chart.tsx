"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { formatVND } from "@/lib/money";
import { MultiChart } from "@/components/ui/multi-chart";
import type { SalesPoint } from "@/lib/reports";

type Range = "thisWeek" | "weeksOfMonth" | "d7" | "m12" | "y5";
const TABS: { key: Range; label: string }[] = [
  { key: "thisWeek", label: "Tuần này" },
  { key: "weeksOfMonth", label: "Tuần / tháng" },
  { key: "d7", label: "7 ngày" },
  { key: "m12", label: "12 tháng" },
  { key: "y5", label: "5 năm" },
];

export function SalesChart({
  d7,
  thisWeek,
  weeksOfMonth,
  m12,
  y5,
}: {
  d7: SalesPoint[];
  thisWeek: SalesPoint[];
  weeksOfMonth: SalesPoint[];
  m12: SalesPoint[];
  y5: SalesPoint[];
}) {
  const [range, setRange] = useState<Range>("weeksOfMonth");
  const series: Record<Range, SalesPoint[]> = { thisWeek, weeksOfMonth, d7, m12, y5 };
  const data = series[range];

  const total = data.reduce((s, p) => s + p.value, 0);
  const last = data[data.length - 1]?.value ?? 0;
  const prev = data[data.length - 2]?.value ?? 0;
  const up = last >= prev;
  const pct = prev > 0 ? Math.round(((last - prev) / prev) * 100) : last > 0 ? 100 : 0;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">Tổng doanh số {TABS.find((t) => t.key === range)?.label.toLowerCase()}</p>
          <p className="text-xl font-bold text-slate-900">{formatVND(total)}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${up ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
            {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {up ? "+" : ""}
            {pct}% kỳ cuối
          </span>
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setRange(t.key)}
                className={`rounded-md px-3 py-1 ${range === t.key ? "bg-white text-brand-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <MultiChart data={data} valueLabel="Doanh số" trend defaultType="bar" />
    </div>
  );
}
