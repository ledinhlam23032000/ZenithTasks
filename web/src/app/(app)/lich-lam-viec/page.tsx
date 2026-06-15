import Link from "next/link";
import {
  startOfDay,
  endOfDay,
  addDays,
  addMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isToday,
  isSameMonth,
  format,
} from "date-fns";
import { vi } from "date-fns/locale";
import { CalendarDays, Clock, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isManagerial, ROLE_SHORT } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { NewShiftButton } from "./new-shift";
import { deleteShift } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lịch làm việc" };

const DOW = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

type ShiftRow = {
  id: string;
  startTime: string;
  endTime: string;
  date: Date;
  user: { fullName: string; role: keyof typeof ROLE_SHORT };
};

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; month?: string }>;
}) {
  const user = await requireUser();
  const managerial = isManagerial(user.role);
  const sp = await searchParams;
  const view = sp.view === "thang" ? "thang" : "tuan";

  const monthRef = sp.month ? new Date(`${sp.month}-01T00:00:00`) : new Date();
  const month = Number.isNaN(monthRef.getTime()) ? new Date() : monthRef;
  const monthKey = format(month, "yyyy-MM");

  let from: Date;
  let to: Date;
  if (view === "thang") {
    from = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    to = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  } else {
    from = startOfDay(new Date());
    to = endOfDay(addDays(new Date(), 6));
  }

  const [shifts, staff] = await Promise.all([
    prisma.shift.findMany({
      where: { date: { gte: from, lte: to }, ...(managerial ? {} : { userId: user.id }) },
      include: { user: { select: { fullName: true, role: true } } },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    }),
    managerial
      ? prisma.user.findMany({ where: { active: true }, orderBy: { fullName: "asc" }, select: { id: true, fullName: true } })
      : Promise.resolve([]),
  ]);

  const byDay = new Map<string, ShiftRow[]>();
  for (const s of shifts as ShiftRow[]) {
    const key = format(s.date, "yyyy-MM-dd");
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(s);
  }

  const prevMonth = format(addMonths(month, -1), "yyyy-MM");
  const nextMonth = format(addMonths(month, 1), "yyyy-MM");

  function ShiftChip({ s, compact = false }: { s: ShiftRow; compact?: boolean }) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-1.5">
        <Avatar name={s.user.fullName} className="h-6 w-6 text-[10px]" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-medium text-slate-700">{s.user.fullName}</p>
          <p className="inline-flex items-center gap-1 text-[10px] text-slate-400">
            <Clock className="h-2.5 w-2.5" /> {s.startTime}–{s.endTime}
          </p>
        </div>
        {!compact && <Badge tone="slate">{ROLE_SHORT[s.user.role]}</Badge>}
        {managerial && (
          <form action={deleteShift}>
            <input type="hidden" name="id" value={s.id} />
            <button className="rounded-md p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-500" aria-label="Xóa ca">
              <Trash2 className="h-3 w-3" />
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lịch làm việc"
        description={managerial ? "Lịch làm việc của toàn bộ nhân viên." : "Lịch làm việc của bạn."}
        icon={<CalendarDays className="h-5 w-5" />}
        actions={managerial ? <NewShiftButton staff={staff} defaultDate={format(new Date(), "yyyy-MM-dd")} /> : undefined}
      />

      {/* Thanh chuyển Tuần / Tháng */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
            <Link href="/lich-lam-viec" className={`rounded-md px-3 py-1 ${view === "tuan" ? "bg-white text-brand-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              Tuần này
            </Link>
            <Link href={`/lich-lam-viec?view=thang&month=${monthKey}`} className={`rounded-md px-3 py-1 ${view === "thang" ? "bg-white text-brand-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              Theo tháng
            </Link>
          </div>

          {view === "thang" && (
            <div className="flex items-center gap-1.5">
              <Link href={`/lich-lam-viec?view=thang&month=${prevMonth}`} className={buttonVariants({ variant: "secondary", size: "icon" })} aria-label="Tháng trước">
                <ChevronLeft className="h-4 w-4" />
              </Link>
              <span className="px-2 text-sm font-semibold capitalize text-slate-800">{format(month, "'Tháng' MM/yyyy", { locale: vi })}</span>
              <Link href={`/lich-lam-viec?view=thang&month=${nextMonth}`} className={buttonVariants({ variant: "secondary", size: "icon" })} aria-label="Tháng sau">
                <ChevronRight className="h-4 w-4" />
              </Link>
              <form action="/lich-lam-viec" className="ml-1">
                <input type="hidden" name="view" value="thang" />
                <input type="month" name="month" defaultValue={monthKey} className="h-9 rounded-lg border border-slate-200 px-2 text-sm text-slate-700 outline-none focus:border-brand-500" />
              </form>
            </div>
          )}
        </div>
      </Card>

      {view === "thang" ? (
        <Card>
          <CardContent className="py-4">
            <div className="grid grid-cols-7 gap-1 pb-2 text-center text-xs font-medium text-slate-400">
              {DOW.map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {eachDayOfInterval({ start: from, end: to }).map((d) => {
                const key = format(d, "yyyy-MM-dd");
                const list = byDay.get(key) ?? [];
                const inMonth = isSameMonth(d, month);
                const today = isToday(d);
                return (
                  <div
                    key={key}
                    className={`flex min-h-[92px] flex-col gap-1 rounded-lg border p-1.5 ${inMonth ? "border-slate-100 bg-white" : "border-transparent bg-slate-50/40"} ${today ? "ring-1 ring-brand-400" : ""}`}
                  >
                    <span className={`text-xs font-semibold ${today ? "text-brand-600" : inMonth ? "text-slate-500" : "text-slate-300"}`}>
                      {format(d, "d")}
                    </span>
                    {list.map((s) => (
                      <ShiftChip key={s.id} s={s} compact />
                    ))}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[...Array(7)].map((_, i) => {
              const date = addDays(from, i);
              const key = format(date, "yyyy-MM-dd");
              const list = byDay.get(key) ?? [];
              return (
                <Card key={key} className={isToday(date) ? "ring-2 ring-brand-200" : ""}>
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="text-sm font-semibold capitalize text-slate-800">{format(date, "EEEE", { locale: vi })}</p>
                    <p className="text-xs text-slate-400">
                      {format(date, "dd/MM")} {isToday(date) && <span className="text-brand-600">· Hôm nay</span>}
                    </p>
                  </div>
                  <CardContent className="space-y-2 py-3">
                    {list.length === 0 ? (
                      <p className="py-2 text-center text-xs text-slate-300">Không có ca</p>
                    ) : (
                      list.map((s) => <ShiftChip key={s.id} s={s} />)
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {shifts.length === 0 && <EmptyState icon={<CalendarDays className="h-6 w-6" />} title="Chưa có lịch làm việc tuần này" />}
        </>
      )}
    </div>
  );
}
