import { format, startOfMonth, endOfMonth } from "date-fns";
import { CalendarCheck } from "lucide-react";
import type { Role } from "@/generated/prisma/client";
import { requireCap } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isManagerial, ROLE_LABELS } from "@/lib/rbac";
import { vnDateOnly } from "@/lib/dates";
import { fmtTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { DeleteButton } from "@/components/ui/delete-button";
import { CheckInWidget } from "./check-in-widget";
import { deleteAttendance } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Chấm công" };

export default async function ChamCongPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const user = await requireCap("mod:cham-cong");
  const sp = await searchParams;
  const parsed = sp.m ? new Date(`${sp.m}-01T00:00:00`) : new Date();
  const monthDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const monthValue = format(monthDate, "yyyy-MM");
  const gte = startOfMonth(monthDate);
  const lte = endOfMonth(monthDate);
  const today = vnDateOnly();

  const mine = await prisma.attendance.findUnique({ where: { userId_date: { userId: user.id, date: today } } });
  const myDays = await prisma.attendance.count({ where: { userId: user.id, date: { gte, lte } } });
  const managerial = isManagerial(user.role);

  let summary: { id: string; name: string; role: Role; days: number }[] = [];
  let todayList: { id: string; name: string; role: Role; inT: string; outT: string | null }[] = [];
  if (managerial) {
    const recs = await prisma.attendance.findMany({
      where: { date: { gte, lte } },
      include: { user: { select: { id: true, fullName: true, role: true } } },
    });
    const map = new Map<string, { id: string; name: string; role: Role; days: number }>();
    for (const r of recs) {
      const e = map.get(r.user.id) ?? { id: r.user.id, name: r.user.fullName, role: r.user.role, days: 0 };
      e.days++;
      map.set(r.user.id, e);
    }
    summary = [...map.values()].sort((a, b) => b.days - a.days);
    const todays = await prisma.attendance.findMany({
      where: { date: today },
      include: { user: { select: { fullName: true, role: true } } },
      orderBy: { checkInAt: "asc" },
    });
    todayList = todays.map((t) => ({
      id: t.id,
      name: t.user.fullName,
      role: t.user.role,
      inT: fmtTime(t.checkInAt),
      outT: t.checkOutAt ? fmtTime(t.checkOutAt) : null,
    }));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chấm công"
        description="Chấm công đi làm hằng ngày — dùng để theo dõi và tính lương theo ngày công."
        icon={<CalendarCheck className="h-5 w-5" />}
        actions={
          managerial ? (
            <form method="GET" className="flex items-center gap-2">
              <input
                type="month"
                name="m"
                defaultValue={monthValue}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-brand-400 focus:outline-none"
              />
              <button className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700">Xem</button>
            </form>
          ) : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <CheckInWidget
          checkedIn={!!mine}
          checkedOut={!!mine?.checkOutAt}
          checkInTime={mine ? fmtTime(mine.checkInAt) : undefined}
          checkOutTime={mine?.checkOutAt ? fmtTime(mine.checkOutAt) : undefined}
        />
        <StatCard
          label={`Ngày công của tôi (${format(monthDate, "MM/yyyy")})`}
          value={`${myDays} ngày`}
          icon={<CalendarCheck className="h-5 w-5" />}
          tone="brand"
        />
      </div>

      {managerial && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Ngày công tháng {format(monthDate, "MM/yyyy")}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {summary.length === 0 ? (
                <EmptyState title="Chưa có dữ liệu chấm công" />
              ) : (
                <Table>
                  <THead>
                    <TR className="hover:bg-transparent">
                      <TH>Nhân viên</TH>
                      <TH>Vai trò</TH>
                      <TH className="text-right">Ngày công</TH>
                    </TR>
                  </THead>
                  <tbody>
                    {summary.map((s) => (
                      <TR key={s.id}>
                        <TD className="font-medium text-slate-800">{s.name}</TD>
                        <TD className="text-slate-500">{ROLE_LABELS[s.role]}</TD>
                        <TD className="text-right font-semibold tabular-nums text-slate-900">{s.days}</TD>
                      </TR>
                    ))}
                  </tbody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Đã chấm công hôm nay ({todayList.length})</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {todayList.length === 0 ? (
                <EmptyState title="Hôm nay chưa ai chấm công" />
              ) : (
                <ul className="space-y-2">
                  {todayList.map((t) => (
                    <li key={t.id} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2">
                      <Avatar name={t.name} className="h-8 w-8" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">{t.name}</p>
                        <p className="text-xs text-slate-400">{ROLE_LABELS[t.role]}</p>
                      </div>
                      <span className="text-xs text-slate-500">
                        Vào {t.inT}
                        {t.outT ? ` · Ra ${t.outT}` : ""}
                      </span>
                      <DeleteButton
                        action={deleteAttendance}
                        id={t.id}
                        label=""
                        confirmText={`Xóa chấm công hôm nay của ${t.name}?`}
                        className="text-slate-300 hover:text-rose-500"
                      />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
