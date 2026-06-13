import { startOfDay, endOfDay, addDays, isToday, format } from "date-fns";
import { vi } from "date-fns/locale";
import { CalendarDays, Clock } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isManagerial, ROLE_SHORT } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lịch làm việc" };

export default async function SchedulePage() {
  const user = await requireUser();
  const managerial = isManagerial(user.role);
  const from = startOfDay(new Date());
  const to = endOfDay(addDays(new Date(), 6));

  const shifts = await prisma.shift.findMany({
    where: { date: { gte: from, lte: to }, ...(managerial ? {} : { userId: user.id }) },
    include: { user: { select: { fullName: true, role: true } } },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  // Gom theo ngày
  const byDay = new Map<string, typeof shifts>();
  for (let i = 0; i < 7; i++) {
    byDay.set(format(addDays(from, i), "yyyy-MM-dd"), []);
  }
  for (const s of shifts) {
    const key = format(s.date, "yyyy-MM-dd");
    if (byDay.has(key)) byDay.get(key)!.push(s);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lịch làm việc"
        description={managerial ? "Lịch làm việc của toàn bộ nhân viên trong tuần." : "Lịch làm việc của bạn trong tuần này."}
        icon={<CalendarDays className="h-5 w-5" />}
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[...byDay.entries()].map(([key, list]) => {
          const date = new Date(key);
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
                  list.map((s) => (
                    <div key={s.id} className="flex items-center gap-2.5 rounded-lg bg-slate-50 p-2">
                      <Avatar name={s.user.fullName} className="h-7 w-7 text-[10px]" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-slate-700">{s.user.fullName}</p>
                        <p className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                          <Clock className="h-3 w-3" /> {s.startTime}–{s.endTime}
                        </p>
                      </div>
                      <Badge tone="slate">{ROLE_SHORT[s.user.role]}</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {shifts.length === 0 && <EmptyState icon={<CalendarDays className="h-6 w-6" />} title="Chưa có lịch làm việc tuần này" />}
    </div>
  );
}
