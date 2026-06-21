"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
import { formatVND, formatVNDShort } from "@/lib/money";
import type { SalesPoint } from "@/lib/reports";

type Range = "d7" | "m12" | "y5";
const TABS: { key: Range; label: string }[] = [
  { key: "d7", label: "7 ngày" },
  { key: "m12", label: "12 tháng" },
  { key: "y5", label: "5 năm" },
];

export function SalesChart({ d7, m12, y5 }: { d7: SalesPoint[]; m12: SalesPoint[]; y5: SalesPoint[] }) {
  const [range, setRange] = useState<Range>("m12");
  const data = range === "d7" ? d7 : range === "m12" ? m12 : y5;

  const total = data.reduce((s, p) => s + p.value, 0);
  // Xu hướng: so kỳ cuối với kỳ trước đó (tăng/giảm).
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
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
              up ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
            }`}
          >
            {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {up ? "+" : ""}
            {pct}% kỳ cuối
          </span>
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setRange(t.key)}
                className={`rounded-md px-3 py-1 ${
                  range === t.key ? "bg-white text-brand-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tickFormatter={(v) => formatVNDShort(v)} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={48} />
            <Tooltip
              cursor={{ fill: "#f1f5f9" }}
              formatter={(v) => [formatVND(Number(v) || 0), "Doanh số"]}
              contentStyle={{ borderRadius: 12, border: "1px solid #e7ebf0", fontSize: 13 }}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={40} fill="#fca5a5" />
            <Line type="monotone" dataKey="value" stroke="#dc2626" strokeWidth={2.5} dot={{ r: 3, fill: "#dc2626" }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
