import { ScrollText } from "lucide-react";
import { requireCap } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fmtDateTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, type Tone } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nhật ký hệ thống" };

const ACTION: Record<string, { label: string; tone: Tone }> = {
  LOGIN: { label: "Đăng nhập", tone: "slate" },
  LOGOUT: { label: "Đăng xuất", tone: "slate" },
  CHANGE_PASSWORD: { label: "Đổi mật khẩu", tone: "amber" },
  RESET_PASSWORD: { label: "Đặt lại mật khẩu", tone: "amber" },
  CREATE_CUSTOMER: { label: "Tạo khách", tone: "green" },
  UPDATE_CUSTOMER: { label: "Sửa khách", tone: "blue" },
  DELETE_CUSTOMER: { label: "Xóa khách", tone: "red" },
  DELETE_PAYMENT: { label: "Xóa khoản thu", tone: "red" },
  UPDATE_PAYMENT: { label: "Sửa khoản thu", tone: "amber" },
  DELETE_CASE: { label: "Xóa hồ sơ", tone: "red" },
  APPLY_VOUCHER: { label: "Áp voucher", tone: "purple" },
  DELETE_CARE: { label: "Xóa tin chăm sóc", tone: "red" },
  REVEAL_PHONE: { label: "Xem SĐT đầy đủ", tone: "amber" },
};

function metaText(meta: unknown): string {
  if (!meta || typeof meta !== "object") return "";
  const o = meta as Record<string, unknown>;
  const parts: string[] = [];
  if (o.amount != null) parts.push(`Số tiền: ${Number(o.amount).toLocaleString("vi-VN")} đ`);
  if (o.code) parts.push(`Mã: ${String(o.code)}`);
  return parts.join(" · ");
}

export default async function AuditLogPage() {
  await requireCap("mod:nhat-ky");
  const logs = await prisma.auditLog.findMany({
    orderBy: { at: "desc" },
    take: 200,
    include: { actor: { select: { fullName: true } } },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nhật ký hệ thống"
        description="Theo dõi các thao tác quan trọng: đăng nhập, sửa/xóa tiền, xóa hồ sơ, áp voucher, xem số điện thoại…"
        icon={<ScrollText className="h-5 w-5" />}
      />
      <Card>
        <CardContent className="pt-5">
          {logs.length === 0 ? (
            <EmptyState icon={<ScrollText className="h-6 w-6" />} title="Chưa có nhật ký" />
          ) : (
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Thời gian</TH>
                  <TH>Người thực hiện</TH>
                  <TH>Hành động</TH>
                  <TH>Chi tiết</TH>
                  <TH>IP</TH>
                </TR>
              </THead>
              <tbody>
                {logs.map((l) => {
                  const a = ACTION[l.action] ?? { label: l.action, tone: "slate" as Tone };
                  return (
                    <TR key={l.id}>
                      <TD className="whitespace-nowrap text-slate-500">{fmtDateTime(l.at)}</TD>
                      <TD className="font-medium text-slate-800">{l.actor?.fullName ?? "—"}</TD>
                      <TD>
                        <Badge tone={a.tone}>{a.label}</Badge>
                      </TD>
                      <TD className="text-slate-500">{[l.entity, metaText(l.meta)].filter(Boolean).join(" · ") || "—"}</TD>
                      <TD className="text-slate-400">{l.ip ?? "—"}</TD>
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
