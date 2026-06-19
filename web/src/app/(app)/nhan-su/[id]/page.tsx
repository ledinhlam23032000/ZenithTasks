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
} from "lucide-react";
import { format } from "date-fns";
import { requireCap } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ROLE_LABELS } from "@/lib/rbac";
import { GENDER_LABEL } from "@/lib/status";
import { toNum, formatVND } from "@/lib/money";
import { fmtDate } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { EditStaffButton, type EditableStaff } from "./staff-edit";

export const dynamic = "force-dynamic";

function ymd(d: Date | null): string {
  return d ? format(new Date(d), "yyyy-MM-dd") : "";
}

export default async function StaffDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireCap("mod:nhan-su");
  const { id } = await params;

  const u = await prisma.user.findUnique({ where: { id } });
  if (!u) notFound();

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
    commissionRate: toNum(u.commissionRate),
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
            <EditStaffButton staff={editable} />
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
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
              <Row label="Hoa hồng" value={toNum(u.commissionRate) > 0 ? `${toNum(u.commissionRate)}%` : null} />
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
