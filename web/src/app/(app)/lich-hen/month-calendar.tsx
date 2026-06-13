import Link from "next/link";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
} from "date-fns";

const DOW = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

/** Lưới lịch theo tháng; mỗi ô là 1 ngày, hiển thị số lịch hẹn, bấm vào xem ngày đó. */
export function MonthCalendar({
  monthDate,
  countByDay,
}: {
  monthDate: Date;
  countByDay: Record<string, number>;
}) {
  const gridStart = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 pb-2 text-center text-xs font-medium text-slate-400">
        {DOW.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          const count = countByDay[key] ?? 0;
          const inMonth = isSameMonth(d, monthDate);
          const today = isToday(d);
          return (
            <Link
              key={key}
              href={`/lich-hen?date=${key}`}
              className={`flex min-h-[68px] flex-col rounded-lg border p-1.5 transition hover:border-brand-300 hover:bg-brand-50/40 ${
                inMonth ? "border-slate-100 bg-white" : "border-transparent bg-slate-50/40"
              } ${today ? "ring-1 ring-brand-400" : ""}`}
            >
              <span
                className={`text-xs font-semibold ${
                  today ? "text-brand-600" : inMonth ? "text-slate-600" : "text-slate-300"
                }`}
              >
                {format(d, "d")}
              </span>
              {count > 0 && inMonth && (
                <span className="mt-auto inline-flex items-center self-start rounded-full bg-brand-100 px-1.5 py-0.5 text-[11px] font-medium text-brand-700">
                  {count} lịch
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
