import Link from "next/link";
import { format } from "date-fns";
import { Contact, Power, KeyRound } from "lucide-react";
import { requireCap } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ROLE_LABELS } from "@/lib/rbac";
import { permCatalog, effectiveKeys } from "@/lib/permissions";
import { toNum } from "@/lib/money";
import { fmtDate } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { DeleteButton } from "@/components/ui/delete-button";
import { NewStaffButton } from "./new-staff";
import { ResetPasswordButton } from "./reset-password";
import { PermissionEditorButton } from "./permission-editor";
import { EditStaffButton, type EditableStaff } from "./[id]/staff-edit";
import { toggleStaffActive, deleteStaff, adminDisable2FA } from "./actions";

const ymd = (d: Date | null) => (d ? format(new Date(d), "yyyy-MM-dd") : "");

export const dynamic = "force-dynamic";
export const metadata = { title: "Nhân sự" };

export default async function StaffPage() {
  const me = await requireCap("mod:nhan-su");
  const users = await prisma.user.findMany({
    orderBy: [{ active: "desc" }, { role: "asc" }, { fullName: "asc" }],
  });
  const catalog = permCatalog();

  const editableOf = (u: (typeof users)[number]): EditableStaff => ({
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
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nhân sự"
        description={`${users.length} tài khoản nhân viên. Phân quyền theo vai trò.`}
        icon={<Contact className="h-5 w-5" />}
        actions={<NewStaffButton />}
      />

      <Card>
        <CardContent className="pt-5">
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>Nhân viên</TH>
                <TH>Mã</TH>
                <TH>Tài khoản</TH>
                <TH>Vai trò</TH>
                <TH>Trạng thái</TH>
                <TH>Ngày tạo</TH>
                <TH />
              </TR>
            </THead>
            <tbody>
              {users.map((u) => (
                <TR key={u.id}>
                  <TD>
                    <Link href={`/nhan-su/${u.id}`} className="flex items-center gap-2.5 group">
                      <Avatar name={u.fullName} src={u.avatarUrl} className="h-8 w-8" />
                      <span className="font-medium text-slate-800 group-hover:text-brand-600 group-hover:underline">
                        {u.fullName}
                      </span>
                    </Link>
                  </TD>
                  <TD><Badge tone="slate">{u.code ?? "—"}</Badge></TD>
                  <TD className="font-mono text-xs text-slate-500">@{u.username}</TD>
                  <TD className="text-slate-600">{ROLE_LABELS[u.role]}</TD>
                  <TD>
                    {u.active ? <Badge tone="green" dot>Đang hoạt động</Badge> : <Badge tone="red" dot>Đã khóa</Badge>}
                  </TD>
                  <TD className="text-slate-500">{fmtDate(u.createdAt)}</TD>
                  <TD className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <EditStaffButton staff={editableOf(u)} />
                      {u.id !== me.id && (
                        <PermissionEditorButton
                          userId={u.id}
                          name={u.fullName}
                          granted={effectiveKeys({ role: u.role, permissions: u.permissions })}
                          catalog={catalog}
                        />
                      )}
                      {u.totpEnabled && (
                        <form action={adminDisable2FA}>
                          <input type="hidden" name="id" value={u.id} />
                          <button
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-amber-600 hover:bg-amber-50"
                            title="Tắt xác thực 2 lớp cho nhân sự này"
                          >
                            <KeyRound className="h-3.5 w-3.5" /> Tắt 2FA
                          </button>
                        </form>
                      )}
                      <ResetPasswordButton userId={u.id} name={u.fullName} />
                      {u.id !== me.id && (
                        <form action={toggleStaffActive}>
                          <input type="hidden" name="id" value={u.id} />
                          <button
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
                            title={u.active ? "Khóa tài khoản" : "Mở khóa"}
                          >
                            <Power className="h-3.5 w-3.5" /> {u.active ? "Khóa" : "Mở"}
                          </button>
                        </form>
                      )}
                      {u.id !== me.id && (
                        <DeleteButton
                          action={deleteStaff}
                          id={u.id}
                          confirmText={`Xóa nhân sự "${u.fullName}"? Hành động này không thể hoàn tác.`}
                        />
                      )}
                    </div>
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
