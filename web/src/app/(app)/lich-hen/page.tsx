import Link from "next/link";
import { addDays, addMonths, startOfMonth, endOfMonth, format, isToday, isTomorrow } from "date-fns";
import { vi } from "date-fns/locale";
import { CalendarClock, ChevronLeft, ChevronRight, Sun, CalendarDays } from "lucide-react";
import { requireCap } from "@/lib/auth";
import { AutoRefresh } from "@/components/ui/auto-refresh";
import { prisma } from "@/lib/db";
import { dayRange, todayRange, tomorrowRange } from "@/lib/dates";
import { getActiveServices, getConsultants } from "@/lib/lookups";
import { maskPhone } from "@/lib/phone";
import { fmtTime, fmtDayLabel, toDatetimeLocal } from "@/lib/format";
import { APPT_TYPE, SOURCE_LABEL } from "@/lib/status";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { DeleteButton } from "@/components/ui/delete-button";
import { NewAppointmentButton, EditAppointmentButton } from "./new-appointment";
import { AppointmentStatusControl } from "./appointment-status";
import { deleteAppointment } from "./actions";
import { MonthCalendar } from "./month-calendar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lịch hẹn" };

const CAN_CREATE = ["ADMIN", "MANAGER", "TELESALE", "RECEPTION"];

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string }>;
}) {
  const user = await requireCap("mod:lich-hen");
  const sp = await searchParams;

  const selected = sp.date ? new Date(`${sp.date}T00:00:00`) : new Date();
  const valid = !Number.isNaN(selected.getTime());
  const day = valid ? selected : new Date();
  const dateKey = format(day, "yyyy-MM-dd");
  const view = sp.view === "month" ? "month" : "day";

  const [appts, todayCount, tomorrowCount, services, consultants] = await Promise.all([
    prisma.appointment.findMany({
      where: { scheduledAt: dayRange(day) },
      orderBy: { scheduledAt: "asc" },
      include: {
        customer: { select: { id: true, fullName: true, code: true, phoneLast5: true } },
        createdBy: { select: { fullName: true } },
        consultant: { select: { fullName: true } },
      },
    }),
    prisma.appointment.count({ where: { scheduledAt: todayRange() } }),
    prisma.appointment.count({ where: { scheduledAt: tomorrowRange() } }),
    getActiveServices(),
    getConsultants(),
  ]);

  const monthAppts =
    view === "month"
      ? await prisma.appointment.findMany({
          where: { scheduledAt: { gte: startOfMonth(day), lte: endOfMonth(day) } },
          select: { scheduledAt: true },
        })
      : [];
  const countByDay: Record<string, number> = {};
  for (const a of monthAppts) {
    const k = format(a.scheduledAt, "yyyy-MM-dd");
    countByDay[k] = (countByDay[k] ?? 0) + 1;
  }

  const prevKey = format(view === "month" ? addMonths(day, -1) : addDays(day, -1), "yyyy-MM-dd");
  const nextKey = format(view === "month" ? addMonths(day, 1) : addDays(day, 1), "yyyy-MM-dd");
  const viewParam = view === "month" ? "&view=month" : "";
  const dayTitle =
    view === "month"
      ? `Tháng ${format(day, "MM/yyyy")}`
      : isToday(day)
        ? "Hôm nay"
        : isTomorrow(day)
          ? "Ngày mai"
          : fmtDayLabel(day);

  const arrived = appts.filter((a) => ["ARRIVED", "IN_CONSULT", "IN_SERVICE", "DONE"].includes(a.status)).length;
  const canDelete = ["ADMIN", "MANAGER"].includes(user.role);

  return (
    <div className="space-y-6">
      <AutoRefresh />
      <PageHeader
        title="Lịch hẹn"
        description="Tiếp nhận và quản lý lịch hẹn khách từ telesale, marketing, cộng tác viên…"
        icon={<CalendarClock className="h-5 w-5" />}
        actions={
          CAN_CREATE.includes(user.role) ? (
            <NewAppointmentButton
              services={services.map((s) => ({ id: s.id, name: s.name }))}
              consultants={consultants}
              defaultDateTime={toDatetimeLocal(new Date(new Date().setHours(9, 0, 0, 0)))}
            />
          ) : undefined
        }
      />

      {/* Tóm tắt nhanh hôm nay / ngày mai */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href={`/lich-hen?date=${format(new Date(), "yyyy-MM-dd")}`}>
          <Card className="transition hover:border-brand-300">
            <CardContent className="flex items-center gap-3 py-4">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                <Sun className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm text-slate-500">Hôm nay</p>
                <p className="text-lg font-semibold text-slate-900">{todayCount} lịch hẹn</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/lich-hen?date=${format(addDays(new Date(), 1), "yyyy-MM-dd")}`}>
          <Card className="transition hover:border-brand-300">
            <CardContent className="flex items-center gap-3 py-4">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <CalendarDays className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm text-slate-500">Ngày mai</p>
                <p className="text-lg font-semibold text-slate-900">{tomorrowCount} khách sẽ đến</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CalendarClock className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm text-slate-500">{dayTitle} · đã đến</p>
              <p className="text-lg font-semibold text-slate-900">
                {arrived}/{appts.length} khách
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Thanh điều hướng ngày */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-1.5">
            <Link href={`/lich-hen?date=${prevKey}${viewParam}`} className={buttonVariants({ variant: "secondary", size: "icon" })} aria-label="Trước">
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <div className="px-2 text-center">
              <p className="text-sm font-semibold text-slate-800">{dayTitle}</p>
              <p className="text-xs text-slate-400">{format(day, "EEEE, dd/MM/yyyy", { locale: vi })}</p>
            </div>
            <Link href={`/lich-hen?date=${nextKey}${viewParam}`} className={buttonVariants({ variant: "secondary", size: "icon" })} aria-label="Sau">
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
              <Link
                href={`/lich-hen?date=${dateKey}`}
                className={`rounded-md px-3 py-1 ${view === "day" ? "bg-white text-brand-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                Ngày
              </Link>
              <Link
                href={`/lich-hen?date=${dateKey}&view=month`}
                className={`rounded-md px-3 py-1 ${view === "month" ? "bg-white text-brand-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                Tháng
              </Link>
            </div>
            <form className="flex items-center gap-2" action="/lich-hen">
              <input
                type="date"
                name="date"
                defaultValue={dateKey}
                className="h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
              {view === "month" && <input type="hidden" name="view" value="month" />}
              <button className={buttonVariants({ variant: "secondary", size: "sm" })}>Xem</button>
            </form>
          </div>
        </div>

        <CardContent className="pt-0">
          {view === "month" ? (
            <MonthCalendar monthDate={day} countByDay={countByDay} />
          ) : appts.length === 0 ? (
            <EmptyState
              icon={<CalendarClock className="h-6 w-6" />}
              title={`Không có lịch hẹn ${dayTitle.toLowerCase()}`}
              description="Chưa có khách nào được đặt lịch trong ngày này."
            />
          ) : (
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Giờ</TH>
                  <TH>Khách hàng</TH>
                  <TH>Loại</TH>
                  <TH>Dịch vụ quan tâm</TH>
                  <TH>Nguồn</TH>
                  <TH>Phụ trách</TH>
                  <TH>Trạng thái</TH>
                  {canDelete && <TH />}
                </TR>
              </THead>
              <tbody>
                {appts.map((a) => {
                  const name = a.customer?.fullName ?? a.guestName ?? "Khách";
                  const last5 = a.customer?.phoneLast5 ?? a.phoneLast5;
                  return (
                    <TR key={a.id}>
                      <TD className="font-semibold text-slate-800 whitespace-nowrap">{fmtTime(a.scheduledAt)}</TD>
                      <TD>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={name} className="h-8 w-8" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              {a.customer ? (
                                <Link href={`/khach-hang/${a.customer.id}`} className="font-medium text-slate-800 hover:text-brand-600">
                                  {name}
                                </Link>
                              ) : (
                                <span className="font-medium text-slate-800">{name}</span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400">{maskPhone(last5)}</p>
                          </div>
                        </div>
                      </TD>
                      <TD>
                        <Badge tone={APPT_TYPE[a.type].tone}>{APPT_TYPE[a.type].label}</Badge>
                      </TD>
                      <TD className="text-slate-600">{a.serviceInterest ?? "—"}</TD>
                      <TD>
                        <span className="text-slate-600">{SOURCE_LABEL[a.source]}</span>
                        {a.sourceDetail && <p className="text-xs text-slate-400">{a.sourceDetail}</p>}
                      </TD>
                      <TD className="text-slate-600">{a.consultant?.fullName ?? "—"}</TD>
                      <TD>
                        <AppointmentStatusControl id={a.id} status={a.status} />
                      </TD>
                      {canDelete && (
                        <TD className="text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            <EditAppointmentButton
                              appointment={{
                                id: a.id,
                                guestName: a.guestName ?? a.customer?.fullName ?? "",
                                phoneLast5: a.phoneLast5 ?? a.customer?.phoneLast5 ?? "",
                                scheduledAt: toDatetimeLocal(a.scheduledAt),
                                type: a.type,
                                serviceInterest: a.serviceInterest ?? "",
                                source: a.source,
                                sourceDetail: a.sourceDetail ?? "",
                                consultantId: a.consultantId ?? "",
                                note: a.note ?? "",
                              }}
                              services={services.map((s) => ({ id: s.id, name: s.name }))}
                              consultants={consultants}
                            />
                            <DeleteButton
                              action={deleteAppointment}
                              id={a.id}
                              label=""
                              confirmText={`Xóa lịch hẹn của ${name}? (Lịch thường nên đổi trạng thái "Hủy" thay vì xóa.)`}
                              className="rounded-md p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500"
                            />
                          </div>
                        </TD>
                      )}
                    </TR>
                  );
                })}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
