import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  IdCard,
  Cake,
  MapPin,
  Phone,
  ShieldAlert,
  Landmark,
  Briefcase,
  GraduationCap,
  StickyNote,
  CalendarClock,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";
import { requireCap } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ROLE_LABELS } from "@/lib/rbac";
import { effectiveKeys } from "@/lib/permissions";
import { GENDER_LABEL } from "@/lib/status";
import { toNum, formatVND } from "@/lib/money";
import { fmtDate } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { EditStaffButton, type EditableStaff } from "./staff-edit";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { retireStaff } from "../actions";
import { buildStaffHandoffChecklist, handoffHasBlockers } from "@/lib/staff-handoff";
import { ConvertStaffToCollaboratorButton } from "./staff-lifecycle";

export const dynamic = "force-dynamic";

function ymd(d: Date | null): string {
  return d ? format(new Date(d), "yyyy-MM-dd") : "";
}

export default async function StaffDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireCap("mod:nhan-su");
  const { id } = await params;

  const u = await prisma.user.findUnique({
    where: { id },
    include: {
      collaboratorProfile: { select: { id: true, name: true, active: true, archivedAt: true } },
      _count: {
        select: {
          customersCreated: true,
          appointmentsAssigned: true,
          casesConsulted: true,
          casesAsDoctor: true,
          careMessages: true,
          followUpsCreated: true,
          plansCreated: true,
        },
      },
    },
  });
  if (!u) notFound();

  const permissionCount = effectiveKeys({ role: u.role, permissions: u.permissions }).length;
  const isRetired = u.employmentStatus === "RETIRED";
  const handoffItems = buildStaffHandoffChecklist({
    customers: u._count.customersCreated,
    appointments: u._count.appointmentsAssigned,
    clinicalCases: u._count.casesConsulted + u._count.casesAsDoctor,
    careMessages: u._count.careMessages,
    followUps: u._count.followUpsCreated,
    plans: u._count.plansCreated,
  });
  const hasHandoffBlockers = handoffHasBlockers(handoffItems);
  const editable: EditableStaff = {
    id: u.id,
    fullName: u.fullName,
    role: u.role,
    phone: u.phone ?? "",
    dob: ymd(u.dob),
    gender: u.gender ?? "",
    address: u.address ?? "",
    hometown: u.hometown ?? "",
    nationalId: u.nationalId ?? "",
    bankAccount: u.bankAccount ?? "",
    bankName: u.bankName ?? "",
    bankHolder: u.bankHolder ?? "",
    emergencyName: u.emergencyName ?? "",
    emergencyPhone: u.emergencyPhone ?? "",
    position: u.position ?? "",
    department: u.department ?? "",
    hireDate: ymd(u.hireDate),
    qualification: u.qualification ?? "",
    notes: u.notes ?? "",
    baseSalary: toNum(u.baseSalary),
  };

  return (
    <div className="space-y-6">
      <Link
        href="/nhan-su"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> Danh sách nhân sự
      </Link>

      <PageHeader
        title={u.fullName}
        description={`${ROLE_LABELS[u.role]} · ${u.code ?? "—"} · @${u.username}`}
        icon={<Avatar name={u.fullName} src={u.avatarUrl} className="h-11 w-11 text-base" />}
        actions={
          <>
            {u.active ? (
              <Badge tone="green" dot>Đang hoạt động</Badge>
            ) : (
              <Badge tone="red" dot>Đã khóa</Badge>
            )}
            {u.role !== "ADMIN" && u.role !== "COLLABORATOR" && me.id !== u.id && <ConvertStaffToCollaboratorButton userId={u.id} name={u.fullName} hasProfile={Boolean(u.collaboratorProfile)} />}
            {u.collaboratorProfile && <Link href={`/cong-tac-vien/${u.collaboratorProfile.id}`} className="text-sm font-medium text-brand-600 hover:underline">Mở hồ sơ giới thiệu</Link>}
            <EditStaffButton staff={editable} />
          </>
        }
      />

      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="mr-1 font-semibold text-slate-700">Workspace nhân sự</span>
          <a href="#ho-so" className="rounded-md bg-slate-50 px-2.5 py-1.5 text-slate-600 hover:bg-brand-50 hover:text-brand-700">Hồ sơ</a>
          <a href="#quyen" className="rounded-md bg-slate-50 px-2.5 py-1.5 text-slate-600 hover:bg-brand-50 hover:text-brand-700">Quyền</a>
          <a href="#vong-doi" className="rounded-md bg-slate-50 px-2.5 py-1.5 text-slate-600 hover:bg-brand-50 hover:text-brand-700">Vòng đời</a>
          <a href="#bao-mat" className="rounded-md bg-slate-50 px-2.5 py-1.5 text-slate-600 hover:bg-brand-50 hover:text-brand-700">Bảo mật</a>
        </div>
        <p className="mt-2 text-xs text-slate-400">Các thao tác khóa, nghỉ việc, reset mật khẩu và đổi quyền nằm trong vùng quản trị; không thay đổi chính sách phân quyền hiện tại.</p>
      </div>

      {!isRetired && me.id !== u.id && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Checklist bàn giao trước nghỉ việc</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <p className="text-xs text-slate-500">Nếu còn workload, quản trị viên cần bàn giao khách, lịch, hồ sơ và công việc cho người nhận trước khi khóa tài khoản. Lịch sử cũ vẫn được giữ nguyên.</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {handoffItems.map((item) => (
                <div key={item.key} className={`rounded-lg border px-2.5 py-2 text-xs ${item.count > 0 ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
                  <p className="font-semibold">{item.count > 0 ? <AlertTriangle className="mr-1 inline h-3.5 w-3.5" /> : <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />}{item.label}</p>
                  <p className="mt-0.5">{item.count} mục {item.count > 0 ? "cần rà soát/bàn giao" : "— không có"}</p>
                </div>
              ))}
            </div>
            <ConfirmButton
              action={retireStaff}
              fields={{ id: u.id, handoffConfirmed: "yes" }}
              confirmText={hasHandoffBlockers ? "Tôi đã rà soát và hoàn tất bàn giao các workload đang hiển thị. Chuyển nhân sự sang Đã nghỉ việc và khóa toàn bộ quyền?" : "Chuyển nhân sự sang Đã nghỉ việc và khóa toàn bộ quyền?"}
              confirmLabel="Xác nhận nghỉ việc"
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700"
            >
              <AlertTriangle className="h-4 w-4" /> Nghỉ việc sau khi bàn giao
            </ConfirmButton>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card id="ho-so">
          <CardContent className="pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Hồ sơ</p>
            <p className="mt-2 font-semibold text-slate-800">{u.fullName}</p>
            <p className="mt-1 text-xs text-slate-500">{u.code ?? "Chưa có mã"} · {u.phone ?? "Chưa có SĐT"}</p>
          </CardContent>
        </Card>
        <Card id="quyen">
          <CardContent className="pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Quyền</p>
            <p className="mt-2 font-semibold text-slate-800">{ROLE_LABELS[u.role]}</p>
            <p className="mt-1 text-xs text-slate-500">{permissionCount} quyền hiệu lực · quản trị viên kiểm soát</p>
          </CardContent>
        </Card>
        <Card id="vong-doi">
          <CardContent className="pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Vòng đời</p>
            <p className={`mt-2 font-semibold ${isRetired ? "text-rose-600" : "text-emerald-600"}`}>{isRetired ? "Đã nghỉ việc" : "Đang làm việc"}</p>
            <p className="mt-1 text-xs text-slate-500">Ngày vào làm: {u.hireDate ? fmtDate(u.hireDate) : "Chưa có"}</p>
          </CardContent>
        </Card>
        <Card id="bao-mat">
          <CardContent className="pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Bảo mật</p>
            <p className="mt-2 font-semibold text-slate-800">@{u.username}</p>
            <p className="mt-1 text-xs text-slate-500">2FA: {u.totpEnabled ? "Đã bật" : "Chưa bật"} · {u.active ? "Tài khoản mở" : "Tài khoản khóa"}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid scroll-mt-24 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <IdCard className="h-4 w-4 text-brand-600" /> Thông tin cá nhân
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            <dl className="divide-y divide-slate-100">
              <Row icon={<Cake className="h-4 w-4" />} label="Ngày sinh" value={u.dob ? fmtDate(u.dob) : null} />
              <Row label="Giới tính" value={u.gender ? GENDER_LABEL[u.gender] : null} />
              <Row icon={<IdCard className="h-4 w-4" />} label="CCCD / CMND" value={u.nationalId} />
              <Row icon={<MapPin className="h-4 w-4" />} label="Quê quán" value={u.hometown} />
              <Row icon={<MapPin className="h-4 w-4" />} label="Địa chỉ" value={u.address} />
              <Row icon={<Phone className="h-4 w-4" />} label="SĐT nội bộ" value={u.phone} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-brand-600" /> Liên hệ khẩn cấp
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            <dl className="divide-y divide-slate-100">
              <Row label="Người liên hệ" value={u.emergencyName} />
              <Row icon={<Phone className="h-4 w-4" />} label="SĐT khẩn cấp" value={u.emergencyPhone} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <Landmark className="h-4 w-4 text-brand-600" /> Tài khoản ngân hàng
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            <dl className="divide-y divide-slate-100">
              <Row label="Số tài khoản" value={u.bankAccount} mono />
              <Row label="Ngân hàng" value={u.bankName} />
              <Row label="Chủ tài khoản" value={u.bankHolder} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-brand-600" /> Công việc & lương
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            <dl className="divide-y divide-slate-100">
              <Row icon={<Briefcase className="h-4 w-4" />} label="Chức danh" value={u.position} />
              <Row label="Phòng / bộ phận" value={u.department} />
              <Row icon={<CalendarClock className="h-4 w-4" />} label="Ngày vào làm" value={u.hireDate ? fmtDate(u.hireDate) : null} />
              <Row icon={<GraduationCap className="h-4 w-4" />} label="Bằng cấp / chứng chỉ" value={u.qualification} />
              <Row label="Lương cứng" value={toNum(u.baseSalary) > 0 ? formatVND(u.baseSalary) : null} />
            </dl>
          </CardContent>
        </Card>
      </div>

      {u.notes && (
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <StickyNote className="h-4 w-4 text-brand-600" /> Ghi chú nội bộ
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap pt-1 text-sm text-slate-600">{u.notes}</CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <Link href="/cham-cong" className={buttonVariants({ variant: "secondary" })}>
          <CalendarClock className="h-4 w-4" /> Chấm công
        </Link>
        <Link href="/luong" className={buttonVariants({ variant: "secondary" })}>
          Bảng lương
        </Link>
        <Link href={`/nhan-su/${u.id}/thoa-thuan`} className={buttonVariants({ variant: "secondary" })}>
          Thỏa thuận bảo mật / không cạnh tranh
        </Link>
      </div>
    </div>
  );
}

function Row({
  icon,
  label,
  value,
  mono,
}: {
  icon?: React.ReactNode;
  label: string;
  value?: string | null;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 text-sm">
      <dt className="inline-flex items-center gap-2 text-slate-500">
        {icon && <span className="text-slate-400">{icon}</span>}
        {label}
      </dt>
      <dd className={value ? (mono ? "font-mono text-slate-800" : "font-medium text-slate-800") : "text-slate-300"}>
        {value || "Chưa có"}
      </dd>
    </div>
  );
}
