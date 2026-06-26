"use client";

import { useState } from "react";
import { MultiChart } from "@/components/ui/multi-chart";

type Point = { label: string; value: number };
export type RevenueSeries = { day: Point[]; week: Point[]; month: Point[]; year: Point[] };

const TABS: [keyof RevenueSeries, string][] = [
  ["day", "Ngày"],
  ["week", "Tuần"],
  ["month", "Tháng"],
  ["year", "Năm"],
];

/** Biểu đồ doanh thu có chuyển đơn vị thời gian: ngày / tuần / tháng / năm. */
export function RevenueChart({ series }: { series: RevenueSeries }) {
  const [tab, setTab] = useState<keyof RevenueSeries>("month");
  return (
    <div>
      <div className="mb-4 inline-flex rounded-lg bg-slate-100 p-0.5">
        {TABS.map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition ${
              tab === k ? "bg-white text-brand-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <MultiChart data={series[tab]} valueLabel="Doanh thu" defaultType="bar" trend />
    </div>
  );
}
