import Link from "next/link";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { vi } from "date-fns/locale";
import { CalendarCheck, ChevronRight } from "lucide-react";
import type { Role } from "@/generated/prisma/client";
import { requireCap } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isManagerial, ROLE_LABELS } from "@/lib/rbac";
import { vnDateOnly } from "@/lib/dates";
import { fmtTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { PageTabs } from "@/components/ui/page-tabs";
import { attendanceTabs } from "@/lib/nav-tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { DeleteButton } from "@/components/ui/delete-button";
import { ExportMenu } from "@/components/ui/export-menu";
import { CheckInWidget } from "./check-in-widget";
import { deleteAttendance } from "./actions";
import {
  AddAttendanceButton,
  EditAttendanceButton,
  type AttendanceRecord,
} from "./attendance-editor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Chấm công" };

type AttRow = { id: string; userId: string; date: Date; checkInAt: Date; checkOutAt: Date | null; note: string | null };

function toRecord(a: AttRow, name: string): AttendanceRecord {
  return {
    userId: a.userId,
    name,
    date: format(new Date(a.date), "yyyy-MM-dd"),
    checkIn: fmtTime(a.checkInAt),
    checkOut: a.checkOutAt ? fmtTime(a.checkOutAt) : "",
    note: a.note ?? "",
  };
}

export default async function ChamCongPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; u?: string }>;
}) {
  const user = await requireCap("mod:cham-cong");
  const sp = await searchParams;
  // Mặc định lấy "tháng hiện tại" theo giờ VN qua vnDateOnly() — KHÔNG dùng
  // new Date() trực tiếp: hàm này tự chốt đúng ngày VN theo giờ tuyệt đối
  // (UTC+7) bất kể máy chủ có đang đặt đúng TZ Asia/Ho_Chi_Minh hay không,
  // tránh trang hiện nhầm sang tháng kế tiếp khi múi giờ máy chủ bị lệch.
  const parsed = sp.m ? new Date(`${sp.m}-01T00:00:00`) : vnDateOnly();
  const monthDate = Number.isNaN(parsed.getTime()) ? vnDateOnly() : parsed;
  const monthValue = format(monthDate, "yyyy-MM");
  // QUAN TRỌNG: gte/lte so với cột Attendance.date (@db.Date) — startOfMonth/endOfMonth
  // tính theo giờ LOCAL của máy chủ rồi quy ra tuyệt đối; với giờ VN (UTC+7), "đầu
  // tháng 8 giờ VN" = 17h ngày 31/7 (UTC). Khi so với cột DATE, Postgres/Prisma cắt
  // tham số về đúng NGÀY theo giờ UTC của phiên (không phụ thuộc code), biến mốc trên
  // thành "31/7" — vô tình khớp luôn ngày cuối tháng trước vào tháng sau (đã xác nhận
  // thực tế: chấm công 31/7 hiện lẫn trong danh sách tháng 8). Bọc lại bằng vnDateOnly()
  // để chốt đúng mốc UTC-midnight theo lịch VN, tránh hẳn kiểu cắt lệch này.
  const gte = vnDateOnly(startOfMonth(monthDate));
  const lte = vnDateOnly(endOfMonth(monthDate));
  const today = vnDateOnly();
  const managerial = isManagerial(user.role);

  const mine = await prisma.attendance.findUnique({ where: { userId_date: { userId: user.id, date: today } } });
  const myRecs = await prisma.attendance.findMany({
    where: { userId: user.id, date: { gte, lte } },
    orderBy: { date: "desc" },
  });
  const myDays = myRecs.length;

  // Quản lý: danh sách nhân sự (cho modal) + tổng hợp ngày công + người đã chấm hôm nay.
  let staffList: { id: string; name: string }[] = [];
  let summary: { id: string; name: string; role: Role; days: number }[] = [];
  let todayList: { id: string; name: string; role: Role; inT: string; outT: string | null }[] = [];
  let detail: AttRow[] = [];
  let detailName = "";
  const selectedId = managerial ? sp.u : undefined;

  if (managerial) {
    const staff = await prisma.user.findMany({
      where: { active: true },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    });
    staffList = staff.map((s) => ({ id: s.id, name: s.fullName }));

    if (selectedId) {
      const sel = await prisma.user.findUnique({ where: { id: selectedId }, select: { fullName: true } });
      detailName = sel?.fullName ?? "Nhân viên";
      detail = await prisma.attendance.findMany({
        where: { userId: selectedId, date: { gte, lte } },
        orderBy: { date: "desc" },
      });
    } else {
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
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chấm công"
        description="Chấm công đi làm hằng ngày · xem lịch sử giờ vào / giờ ra theo từng tháng."
        icon={<CalendarCheck className="h-5 w-5" />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <form method="GET" className="flex items-center gap-2">
              {selectedId && <input type="hidden" name="u" value={selectedId} />}
              <input
                type="month"
                name="m"
                defaultValue={monthValue}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-brand-400 focus:outline-none"
              />
              <button className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700">
                Xem
              </button>
            </form>
            {managerial && (
              <ExportMenu
                excelHref={`/cham-cong/export?format=xlsx&m=${monthValue}`}
                wordHref={`/cham-cong/export?format=doc&m=${monthValue}`}
                csvHref={`/cham-cong/export?format=csv&m=${monthValue}`}
              />
            )}
            {managerial && <AddAttendanceButton staff={staffList} />}
          </div>
        }
      />

      <PageTabs tabs={attendanceTabs(user)} />

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

      {/* Lịch sử cá nhân — mọi người đều xem được công + giờ vào/ra của chính mình */}
      <Card>
        <CardHeader>
          <CardTitle>Lịch sử của tôi — tháng {format(monthDate, "MM/yyyy")}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {myRecs.length === 0 ? (
            <EmptyState title="Tháng này chưa có ngày công nào" />
          ) : (
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Ngày</TH>
                  <TH>Giờ vào</TH>
                  <TH>Giờ ra</TH>
                  <TH>Ghi chú</TH>
                </TR>
              </THead>
              <tbody>
                {myRecs.map((a) => (
                  <TR key={a.id}>
                    <TD className="font-medium text-slate-800">
                      {format(new Date(a.date), "EEEE, dd/MM", { locale: vi })}
                    </TD>
                    <TD className="tabular-nums text-slate-700">{fmtTime(a.checkInAt)}</TD>
                    <TD className="tabular-nums text-slate-700">{a.checkOutAt ? fmtTime(a.checkOutAt) : "—"}</TD>
                    <TD className="text-slate-500">{a.note ?? ""}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Khu vực quản lý */}
      {managerial && selectedId && (
        <Card>
          <CardHeader>
            <CardTitle>
              Chi tiết chấm công — {detailName} · tháng {format(monthDate, "MM/yyyy")} ({detail.length} ngày)
            </CardTitle>
            <Link href={`/cham-cong?m=${monthValue}`} className="text-sm font-medium text-brand-600 hover:underline">
              ← Tất cả nhân viên
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            {detail.length === 0 ? (
              <EmptyState
                title="Tháng này chưa có dữ liệu"
                description='Dùng nút "Thêm / sửa chấm công" để bổ sung công cho nhân viên.'
              />
            ) : (
              <Table>
                <THead>
                  <TR className="hover:bg-transparent">
                    <TH>Ngày</TH>
                    <TH>Giờ vào</TH>
                    <TH>Giờ ra</TH>
                    <TH>Ghi chú</TH>
                    <TH />
                  </TR>
                </THead>
                <tbody>
                  {detail.map((a) => (
                    <TR key={a.id}>
                      <TD className="font-medium text-slate-800">
                        {format(new Date(a.date), "EEEE, dd/MM", { locale: vi })}
                      </TD>
                      <TD className="tabular-nums text-slate-700">{fmtTime(a.checkInAt)}</TD>
                      <TD className="tabular-nums text-slate-700">{a.checkOutAt ? fmtTime(a.checkOutAt) : "—"}</TD>
                      <TD className="text-slate-500">{a.note ?? ""}</TD>
                      <TD className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <EditAttendanceButton record={toRecord(a, detailName)} />
                          <DeleteButton
                            action={deleteAttendance}
                            id={a.id}
                            label=""
                            confirmText={`Xóa chấm công ngày ${format(new Date(a.date), "dd/MM/yyyy")} của ${detailName}?`}
                            className="text-slate-300 hover:text-rose-500"
                          />
                        </div>
                      </TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {managerial && !selectedId && (
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
                      <TH />
                    </TR>
                  </THead>
                  <tbody>
                    {summary.map((s) => (
                      <TR key={s.id}>
                        <TD className="font-medium text-slate-800">{s.name}</TD>
                        <TD className="text-slate-500">{ROLE_LABELS[s.role]}</TD>
                        <TD className="text-right font-semibold tabular-nums text-slate-900">{s.days}</TD>
                        <TD className="text-right">
                          <Link
                            href={`/cham-cong?m=${monthValue}&u=${s.id}`}
                            className="inline-flex items-center gap-0.5 text-xs font-medium text-brand-600 hover:underline"
                          >
                            Chi tiết <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
                        </TD>
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

      {managerial && (
        <Badge tone="slate" className="font-normal">
          Mẹo: bấm “Chi tiết” ở từng nhân viên để xem & sửa giờ vào / giờ ra theo ngày.
        </Badge>
      )}
    </div>
  );
}
