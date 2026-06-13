import { Contact, Power } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ROLE_LABELS } from "@/lib/rbac";
import { fmtDate } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { NewStaffButton } from "./new-staff";
import { toggleStaffActive } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nhân sự" };

export default async function StaffPage() {
  const me = await requireUser(["ADMIN"]);
  const users = await prisma.user.findMany({
    orderBy: [{ active: "desc" }, { role: "asc" }, { fullName: "asc" }],
    select: { id: true, code: true, fullName: true, username: true, role: true, phone: true, active: true, createdAt: true },
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
                    <div className="flex items-center gap-2.5">
                      <Avatar name={u.fullName} className="h-8 w-8" />
                      <span className="font-medium text-slate-800">{u.fullName}</span>
                    </div>
                  </TD>
                  <TD><Badge tone="slate">{u.code ?? "—"}</Badge></TD>
                  <TD className="font-mono text-xs text-slate-500">@{u.username}</TD>
                  <TD className="text-slate-600">{ROLE_LABELS[u.role]}</TD>
                  <TD>
                    {u.active ? <Badge tone="green" dot>Đang hoạt động</Badge> : <Badge tone="red" dot>Đã khóa</Badge>}
                  </TD>
                  <TD className="text-slate-500">{fmtDate(u.createdAt)}</TD>
                  <TD className="text-right">
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
