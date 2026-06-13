"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { formatVND, formatVNDShort } from "@/lib/money";

export function RevenueChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tickFormatter={(v) => formatVNDShort(v)} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={48} />
          <Tooltip
            cursor={{ fill: "#f1f5f9" }}
            formatter={(v) => [formatVND(Number(v) || 0), "Doanh thu"]}
            contentStyle={{ borderRadius: 12, border: "1px solid #e7ebf0", fontSize: 13 }}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={36}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.value >= max ? "#0d9488" : "#5eead4"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
