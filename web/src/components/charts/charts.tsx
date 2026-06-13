// Biểu đồ nhẹ, thuần CSS/SVG (server component, không cần JS phía client).

type Point = { label: string; value: number };

/** Biểu đồ cột dọc — dùng cho xu hướng doanh thu theo tháng. */
export function ColumnChart({
  data,
  formatValue,
}: {
  data: Point[];
  formatValue?: (n: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex gap-2 sm:gap-3" style={{ height: 184 }}>
      {data.map((d, i) => {
        const pct = Math.max(2, Math.round((d.value / max) * 100));
        const isLast = i === data.length - 1;
        return (
          <div key={i} className="flex flex-1 flex-col items-center">
            <div className="flex w-full flex-1 items-end">
              <div
                className={`mx-auto w-full max-w-[44px] rounded-t-md transition-all ${
                  isLast
                    ? "bg-gradient-to-t from-accent-500 to-accent-400"
                    : "bg-gradient-to-t from-brand-500 to-brand-300"
                }`}
                style={{ height: `${pct}%` }}
                title={`${d.label}: ${formatValue ? formatValue(d.value) : d.value}`}
              />
            </div>
            <span className="mt-2 text-[11px] text-slate-500">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Danh sách thanh ngang — dùng cho cơ cấu/so sánh (trạng thái lịch, nguồn khách...). */
export function BarList({
  data,
  formatValue,
}: {
  data: { label: string; value: number; hint?: string }[];
  formatValue?: (n: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (data.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">Chưa có dữ liệu</p>;
  }
  return (
    <ul className="space-y-3.5">
      {data.map((d, i) => (
        <li key={i}>
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-sm font-medium text-slate-700">{d.label}</span>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-800">
              {formatValue ? formatValue(d.value) : d.value}
              {d.hint ? <span className="ml-1 text-xs font-normal text-slate-400">{d.hint}</span> : null}
            </span>
          </div>
          <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-400"
              style={{ width: `${Math.max(3, Math.round((d.value / max) * 100))}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
