import Link from "next/link";
import { differenceInMinutes } from "date-fns";
import { Sunrise, CalendarClock, Hourglass, ListTodo, ChevronRight, CheckCircle2 } from "lucide-react";
import { requireCap } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { todayRange } from "@/lib/dates";
import { getWorkqueue } from "@/lib/workqueue";
import { maskPhone } from "@/lib/phone";
import { fmtTime } from "@/lib/format";
import { AutoRefresh } from "@/components/ui/auto-refresh";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { QuickStatusButton } from "./quick-status-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Đầu ca lễ tân" };

export default async function ReceptionDeskPage() {
  await requireCap("mod:dau-ca");

  const [notArrived, waiting, workqueue] = await Promise.all([
    prisma.appointment.findMany({
      where: { scheduledAt: todayRange(), status: { in: ["BOOKED", "CONFIRMED"] }, arrivedAt: null },
      orderBy: { scheduledAt: "asc" },
      include: { customer: { select: { id: true, fullName: true, phoneLast5: true } } },
    }),
    prisma.appointment.findMany({
      where: { scheduledAt: todayRange(), status: "ARRIVED" },
      orderBy: { arrivedAt: "asc" },
      include: { customer: { select: { id: true, fullName: true, phoneLast5: true } } },
    }),
    getWorkqueue(),
  ]);

  // Bỏ nhóm "hẹn hôm nay chưa đến" của workqueue vì đã có 2 danh sách riêng, chi tiết hơn ở đây.
  const otherSections = workqueue.sections.filter((s) => s.key !== "today-appt" && s.count > 0);
  const otherTotal = otherSections.reduce((sum, s) => sum + s.count, 0);
  const now = new Date();

  return (
    <div className="space-y-6">
      <AutoRefresh />
      <PageHeader
        title="Đầu ca lễ tân"
        description="Gộp việc cần làm khi bắt đầu ca: khách chưa đến, khách đang chờ, công việc tồn đọng, cảnh báo kho."
        icon={<Sunrise className="h-5 w-5" />}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Chưa đến (hôm nay)" value={String(notArrived.length)} icon={<CalendarClock className="h-5 w-5" />} tone="blue" />
        <StatCard label="Đang chờ tại sảnh" value={String(waiting.length)} icon={<Hourglass className="h-5 w-5" />} tone="purple" />
        <StatCard label="Việc tồn đọng khác" value={String(otherTotal)} icon={<ListTodo className="h-5 w-5" />} tone="amber" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Khách chưa đến — gọi xác nhận / bấm khi khách tới */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-sky-500" /> Khách chưa đến
              <Badge tone="blue">{notArrived.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {notArrived.length === 0 ? (
              <EmptyState icon={<CheckCircle2 className="h-6 w-6 text-emerald-500" />} title="Không còn khách hẹn chưa đến" />
            ) : (
              <ul className="divide-y divide-slate-100">
                {notArrived.map((a) => {
                  const name = a.customer?.fullName ?? a.guestName ?? "Khách";
                  const last5 = a.customer?.phoneLast5 ?? a.phoneLast5;
                  return (
                    <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Avatar name={name} className="h-8 w-8" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-800">{name}</p>
                          <p className="text-xs text-slate-400">{fmtTime(a.scheduledAt)} · {maskPhone(last5)}</p>
                        </div>
                      </div>
                      <QuickStatusButton id={a.id} status="ARRIVED" label="Đã đến" />
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Khách đang chờ — thời gian chờ tính từ lúc check-in */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hourglass className="h-4 w-4 text-violet-500" /> Khách đang chờ
              <Badge tone="purple">{waiting.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {waiting.length === 0 ? (
              <EmptyState icon={<CheckCircle2 className="h-6 w-6 text-emerald-500" />} title="Không có khách đang chờ" />
            ) : (
              <ul className="divide-y divide-slate-100">
                {waiting.map((a) => {
                  const name = a.customer?.fullName ?? a.guestName ?? "Khách";
                  const waitMin = a.arrivedAt ? differenceInMinutes(now, a.arrivedAt) : 0;
                  const long = waitMin >= 20;
                  return (
                    <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Avatar name={name} className="h-8 w-8" />
                        <div className="min-w-0">
                          {a.customer ? (
                            <Link href={`/khach-hang/${a.customer.id}`} className="truncate font-medium text-slate-800 hover:text-brand-600">
                              {name}
                            </Link>
                          ) : (
                            <p className="truncate font-medium text-slate-800">{name}</p>
                          )}
                          <p className={`text-xs ${long ? "font-medium text-rose-500" : "text-slate-400"}`}>Đã chờ {waitMin} phút</p>
                        </div>
                      </div>
                      <QuickStatusButton id={a.id} status="IN_CONSULT" label="Bắt đầu tư vấn" />
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Việc tồn đọng khác (tái khám, công nợ, sinh nhật, khách nguội, kho) — rút gọn, xem đầy đủ ở "Việc cần làm" */}
      {otherSections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListTodo className="h-4 w-4 text-amber-500" /> Việc tồn đọng khác
            </CardTitle>
            <Link href="/viec-hom-nay" className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700">
              Xem đầy đủ <ChevronRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent className="grid gap-4 pt-0 sm:grid-cols-2 lg:grid-cols-3">
            {otherSections.map((s) => (
              <Link
                key={s.key}
                href={`/viec-hom-nay#${s.key}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3 transition hover:border-brand-300 hover:shadow-sm"
              >
                <span className="text-sm font-medium text-slate-700">{s.label}</span>
                <Badge tone={s.tone}>{s.count}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
