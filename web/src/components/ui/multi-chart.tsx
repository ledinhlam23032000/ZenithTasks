"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  AreaChart,
  PieChart,
  Bar,
  Line,
  Area,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { ChartColumnBig, ChartLine, ChartArea, ChartPie } from "lucide-react";
import { formatVND, formatVNDShort, formatNumber } from "@/lib/money";

export type ChartPoint = { label: string; value: number };
export type ChartType = "bar" | "line" | "area" | "pie";

const PALETTE = ["#dc2626", "#f59e0b", "#0d9488", "#3b82f6", "#8b5cf6", "#ec4899", "#10b981", "#f97316", "#64748b", "#0ea5e9"];

const TYPE_META: { key: ChartType; label: string; Icon: typeof ChartColumnBig }[] = [
  { key: "bar", label: "Cột", Icon: ChartColumnBig },
  { key: "line", label: "Đường", Icon: ChartLine },
  { key: "area", label: "Vùng", Icon: ChartArea },
  { key: "pie", label: "Tròn", Icon: ChartPie },
];

/**
 * Biểu đồ đa kiểu (cột / đường / vùng / tròn) — người dùng tự chọn kiểu.
 * Dùng chung cho mọi nơi cần biểu đồ. `money=true` định dạng VND.
 */
export function MultiChart({
  data,
  types = ["bar", "line", "area", "pie"],
  defaultType = "bar",
  money = true,
  valueLabel = "Giá trị",
  height = 256,
  trend = false,
}: {
  data: ChartPoint[];
  types?: ChartType[];
  defaultType?: ChartType;
  money?: boolean;
  valueLabel?: string;
  height?: number;
  trend?: boolean; // với kiểu cột: vẽ thêm đường xu hướng
}) {
  const [type, setType] = useState<ChartType>(defaultType);
  const fmt = (v: number) => (money ? formatVND(v) : formatNumber(v));
  const fmtShort = (v: number) => (money ? formatVNDShort(v) : formatNumber(v));
  const max = Math.max(...data.map((d) => d.value), 1);

  const axes = (
    <>
      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
      <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={48} />
      <Tooltip cursor={{ fill: "#f8fafc" }} formatter={(v) => [fmt(Number(v) || 0), valueLabel]} contentStyle={{ borderRadius: 12, border: "1px solid #e7ebf0", fontSize: 13 }} />
    </>
  );

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
          {TYPE_META.filter((t) => types.includes(t.key)).map((t) => (
            <button
              key={t.key}
              onClick={() => setType(t.key)}
              title={t.label}
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 ${type === t.key ? "bg-white text-brand-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              <t.Icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ height, minWidth: 1 }} className="relative w-full min-w-[1px] overflow-hidden">
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={1}
          minHeight={height}
          initialDimension={{ width: 640, height }}
          debounce={80}
        >
          {type === "pie" ? (
            <PieChart>
              <Tooltip formatter={(v) => [fmt(Number(v) || 0), valueLabel]} contentStyle={{ borderRadius: 12, border: "1px solid #e7ebf0", fontSize: 13 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={90} innerRadius={40} paddingAngle={1}>
                {data.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
            </PieChart>
          ) : type === "line" ? (
            <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              {axes}
              <Line type="monotone" dataKey="value" stroke="#dc2626" strokeWidth={2.5} dot={{ r: 3, fill: "#dc2626" }} />
            </LineChart>
          ) : type === "area" ? (
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="mc-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#dc2626" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#dc2626" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              {axes}
              <Area type="monotone" dataKey="value" stroke="#dc2626" strokeWidth={2} fill="url(#mc-area)" />
            </AreaChart>
          ) : (
            <ComposedChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              {axes}
              <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={44}>
                {data.map((d, i) => (
                  <Cell key={i} fill={d.value >= max ? "#dc2626" : "#fca5a5"} />
                ))}
              </Bar>
              {trend && <Line type="monotone" dataKey="value" stroke="#b91c1c" strokeWidth={2} dot={false} />}
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
