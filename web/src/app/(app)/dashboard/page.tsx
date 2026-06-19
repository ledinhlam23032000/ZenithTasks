import Link from "next/link";
import {
  CalendarClock,
  Stethoscope,
  RefreshCw,
  XCircle,
  TrendingUp,
  Target,
  UserPlus,
  MessageCircleHeart,
  ArrowRight,
  BarChart3,
} from "lucide-react";
import { requireCap } from "@/lib/auth";
import { isManagerial, ROLE_LABELS } from "@/lib/rbac";
import { getAdminDashboard, getStaffSnapshot } from "@/lib/dashboard";
import { fmtRelative, fmtTime } from "@/lib/format";
import { maskPhone } from "@/lib/phone";
import { formatVND, formatVNDShort } from "@/lib/money";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { BarList } from "@/components/charts/charts";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { CARE_CHANNEL, APPT_STATUS } from "@/lib/status";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tổng quan" };

export default async function DashboardPage() {
  const user = await requireCap("mod:dashboard");
  const greeting = getGreeting();

  if (!isManagerial(user.role)) {
    return <StaffDashboard user={user} greeting={greeting} />;
  }

  const d = await getAdminDashboard();
  const maxConsultRev = Math.max(1, ...d.consultants.map((c) => c.revenue));
  const statusBars = Object.entries(d.today.byStatus)
    .map(([k, v]) => ({ label: APPT_STATUS[k as keyof typeof APPT_STATUS]?.label ?? k, value: v }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting}, ${shortName(user.fullName)} 👋`}
        description="Bức tranh toàn cảnh hoạt động phòng khám hôm nay và tháng này."
        icon={<TrendingUp className="h-5 w-5" />}
      />

      {/* KPI hôm nay */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link href="/lich-hen" className="block transition hover:-translate-y-0.5">
          <StatCard
            label="Lịch hẹn hôm nay"
            value={d.today.total}
            sub={`${d.today.byStatus["ARRIVED"] ?? 0} đã đến · ${d.today.byStatus["BOOKED"] ?? 0} chờ đến`}
            icon={<CalendarClock className="h-5 w-5" />}
            tone="blue"
          />
        </Link>
        <Link href="/ho-so" className="block transition hover:-translate-y-0.5">
          <StatCard
            label="Khách làm dịch vụ"
            value={d.today.serviced}
            sub="Chốt dịch vụ hôm nay"
            icon={<Stethoscope className="h-5 w-5" />}
            tone="green"
          />
        </Link>
        <Link href="/lich-hen" className="block transition hover:-translate-y-0.5">
          <StatCard
            label="Tái khám hôm nay"
            value={d.today.followups}
            sub="Lịch tái khám đã hẹn"
            icon={<RefreshCw className="h-5 w-5" />}
            tone="purple"
          />
        </Link>
        <Link href="/lich-hen" className="block transition hover:-translate-y-0.5">
          <StatCard
            label="Hủy / Không đến"
            value={d.today.cancelled}
            sub="Lịch hôm nay bị hủy"
            icon={<XCircle className="h-5 w-5" />}
            tone="red"
          />
        </Link>
      </div>

      {/* Doanh thu & tỉ lệ chốt */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Link href="/bao-cao" className="block transition hover:-translate-y-0.5">
          <StatCard
            label="Doanh thu tháng này"
            value={formatVNDShort(d.revenue.thisMonth)}
            icon={<TrendingUp className="h-5 w-5" />}
            tone="brand"
            trend={{ value: d.revenue.growth, label: `Tháng trước: ${formatVND(d.revenue.lastMonth)}` }}
          />
        </Link>
        <Link href="/bao-cao" className="block transition hover:-translate-y-0.5">
          <StatCard
            label="Tỉ lệ chốt tư vấn"
            value={`${d.consultRate.rate}%`}
            sub={`${d.consultRate.agreed}/${d.consultRate.total} ca tư vấn chốt dịch vụ`}
            icon={<Target className="h-5 w-5" />}
            tone="amber"
          />
        </Link>
        <Link href="/khach-hang" className="block transition hover:-translate-y-0.5">
          <StatCard
            label="Khách hàng mới"
            value={d.customers.thisMonth}
            icon={<UserPlus className="h-5 w-5" />}
            tone="pink"
            trend={{ value: d.customers.growth, label: "So với tháng trước" }}
          />
        </Link>
      </div>

      {/* Biểu đồ: doanh thu 6 tháng + cơ cấu lịch hôm nay */}
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-brand-500" /> Doanh thu
            </CardTitle>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                d.revenue.growth >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
              }`}
            >
              {d.revenue.growth >= 0 ? "▲" : "▼"} {Math.abs(d.revenue.growth)}% so tháng trước
            </span>
          </CardHeader>
          <CardContent className="pt-0">
            <RevenueChart series={d.revenueSeries} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-brand-500" /> Cơ cấu lịch hôm nay
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <BarList data={statusBars} />
          </CardContent>
        </Card>
      </div>

      {/* Lịch hẹn hôm nay */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-brand-500" /> Lịch hẹn hôm nay
          </CardTitle>
          <Link href="/lich-hen" className="text-sm font-medium text-brand-600 hover:text-brand-700">
            Xem tất cả
          </Link>
        </CardHeader>
        <CardContent className="pt-0">
          {d.todaySchedule.length === 0 ? (
            <EmptyState icon={<CalendarClock className="h-6 w-6" />} title="Hôm nay chưa có lịch hẹn" />
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {d.todaySchedule.map((a) => {
                const name = a.customer?.fullName ?? a.guestName ?? "Khách";
                const last5 = a.customer?.phoneLast5 ?? a.phoneLast5;
                const st = APPT_STATUS[a.status];
                return (
                  <li key={a.id} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2">
                    <span className="w-12 shrink-0 text-sm font-semibold text-slate-700">{fmtTime(a.scheduledAt)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">{name}</p>
                      <p className="truncate text-xs text-slate-400">
                        {maskPhone(last5)}
                        {a.serviceInterest ? ` · ${a.serviceInterest}` : ""}
                      </p>
                    </div>
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Hiệu suất tư vấn */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Hiệu suất tư vấn (tháng này)</CardTitle>
            <Link href="/bao-cao" className="text-sm font-medium text-brand-600 hover:text-brand-700">
              Xem báo cáo
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            {d.consultants.length === 0 ? (
              <EmptyState title="Chưa có dữ liệu tư vấn tháng này" />
            ) : (
              <ul className="space-y-4">
                {d.consultants.map((c) => (
                  <li key={c.id}>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={c.name} className="h-8 w-8" />
                      <span className="min-w-0 flex-1 truncate font-medium text-slate-800">{c.name}</span>
                      <Badge tone={c.rate >= 60 ? "green" : c.rate >= 40 ? "amber" : "red"}>{c.rate}% chốt</Badge>
                      <span className="w-20 shrink-0 text-right text-sm font-semibold tabular-nums text-slate-800">
                        {formatVNDShort(c.revenue)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-400"
                        style={{ width: `${Math.max(3, Math.round((c.revenue / maxConsultRev) * 100))}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {c.consults} ca tư vấn · {c.agreed} chốt
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* CSKH gần đây */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Chăm sóc khách hàng</CardTitle>
            <Link href="/cham-soc" className="text-sm font-medium text-brand-600 hover:text-brand-700">
              Tất cả
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            {d.recentCare.length === 0 ? (
              <EmptyState title="Chưa có tin nhắn chăm sóc nào" />
            ) : (
              <ul className="space-y-3">
                {d.recentCare.map((m) => {
                  const ch = CARE_CHANNEL[m.channel];
                  return (
                    <li key={m.id} className="flex gap-3">
                      <span className="mt-0.5">
                        <MessageCircleHeart className="h-4 w-4 text-accent-500" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-slate-800">{m.customer.fullName}</span>
                          <Badge tone={ch.tone}>{ch.label}</Badge>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">{m.content}</p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {m.createdBy?.fullName ?? "Hệ thống"} · {fmtRelative(m.createdAt)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

async function StaffDashboard({
  user,
  greeting,
}: {
  user: { id: string; fullName: string; role: import("@/generated/prisma/client").Role };
  greeting: string;
}) {
  const s = await getStaffSnapshot(user.id, user.role);

  const quickLinks: { href: string; label: string; desc: string; icon: React.ReactNode }[] = [
    { href: "/lich-hen", label: "Lịch hẹn", desc: "Xem & đặt lịch khách", icon: <CalendarClock className="h-5 w-5" /> },
    { href: "/tiep-nhan", label: "Tiếp nhận khách", desc: "Tra cứu & lập hồ sơ", icon: <UserPlus className="h-5 w-5" /> },
    { href: "/khach-hang", label: "Khách hàng", desc: "Danh sách & hồ sơ", icon: <MessageCircleHeart className="h-5 w-5" /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting}, ${shortName(user.fullName)} 👋`}
        description={`Vai trò của bạn: ${ROLE_LABELS[user.role]}. Chúc một ngày làm việc hiệu quả!`}
        icon={<TrendingUp className="h-5 w-5" />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Lịch hẹn hôm nay" value={s.todayAppts} icon={<CalendarClock className="h-5 w-5" />} tone="blue" />
        {(user.role === "CONSULTANT" || user.role === "DOCTOR") && (
          <>
            <StatCard label="Hồ sơ đang xử lý" value={s.openCases} icon={<Stethoscope className="h-5 w-5" />} tone="amber" />
            <StatCard label="Số ca của tôi (tháng)" value={s.myConsultsMonth} icon={<Target className="h-5 w-5" />} tone="brand" />
            <StatCard label="Tỉ lệ chốt của tôi" value={`${s.myRate}%`} icon={<TrendingUp className="h-5 w-5" />} tone="green" />
          </>
        )}
        {user.role === "CARE" && (
          <StatCard label="Tin chăm sóc hôm nay" value={s.todayCare} icon={<MessageCircleHeart className="h-5 w-5" />} tone="pink" />
        )}
        {(user.role === "RECEPTION" || user.role === "TELESALE") && (
          <StatCard label="Hồ sơ đang mở" value={s.openCases} icon={<Stethoscope className="h-5 w-5" />} tone="amber" />
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lối tắt công việc</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {quickLinks.map((q) => (
              <Link
                key={q.href}
                href={q.href}
                className="group flex items-center gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-brand-300 hover:bg-brand-50/40"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  {q.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800">{q.label}</p>
                  <p className="truncate text-xs text-slate-500">{q.desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 11) return "Chào buổi sáng";
  if (h < 14) return "Chào buổi trưa";
  if (h < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

function shortName(full: string): string {
  const parts = full.trim().split(/\s+/);
  return parts[parts.length - 1];
}
