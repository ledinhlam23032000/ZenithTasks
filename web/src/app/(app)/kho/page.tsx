import { Boxes, ArrowUpFromLine, PackageX } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toNum } from "@/lib/money";
import { fmtDateTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kho vật tư" };

const MOVE = {
  IN: { label: "Nhập", tone: "green" as const },
  OUT: { label: "Xuất", tone: "red" as const },
  ADJUST: { label: "Điều chỉnh", tone: "amber" as const },
};

export default async function KhoPage() {
  await requireUser(["ADMIN", "MANAGER"]);
  const [materials, movements] = await Promise.all([
    prisma.material.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.stockMovement.findMany({
      orderBy: { createdAt: "desc" },
      take: 60,
      include: { material: { select: { name: true, unit: true } }, createdBy: { select: { fullName: true } } },
    }),
  ]);
  const outOfStock = materials.filter((m) => toNum(m.stock) <= 0).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kho vật tư"
        description="Theo dõi tồn kho, lịch sử nhập và xuất vật tư."
        icon={<Boxes className="h-5 w-5" />}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Số mặt hàng" value={materials.length} icon={<Boxes className="h-5 w-5" />} tone="brand" />
        <StatCard label="Đang hết hàng" value={outOfStock} icon={<PackageX className="h-5 w-5" />} tone={outOfStock > 0 ? "red" : "slate"} />
        <StatCard label="Giao dịch gần đây" value={movements.length} icon={<ArrowUpFromLine className="h-5 w-5" />} tone="blue" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tồn kho hiện tại</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {materials.length === 0 ? (
              <EmptyState title="Chưa có vật tư" description="Thêm vật tư trong Danh mục." />
            ) : (
              <Table>
                <THead>
                  <TR className="hover:bg-transparent">
                    <TH>Vật tư</TH>
                    <TH>Đơn vị</TH>
                    <TH className="text-right">Tồn</TH>
                  </TR>
                </THead>
                <tbody>
                  {materials.map((m) => (
                    <TR key={m.id}>
                      <TD className="font-medium text-slate-800">{m.name}</TD>
                      <TD className="text-slate-500">{m.unit}</TD>
                      <TD className={`text-right font-semibold tabular-nums ${toNum(m.stock) <= 0 ? "text-rose-500" : "text-slate-800"}`}>
                        {toNum(m.stock)}
                      </TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            )}
            <p className="mt-3 text-xs text-slate-400">Nhập kho tại trang “Danh mục dịch vụ &amp; vật tư”.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lịch sử nhập / xuất</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {movements.length === 0 ? (
              <EmptyState title="Chưa có giao dịch kho" />
            ) : (
              <Table>
                <THead>
                  <TR className="hover:bg-transparent">
                    <TH>Loại</TH>
                    <TH>Vật tư</TH>
                    <TH className="text-right">Số lượng</TH>
                    <TH>Thời gian</TH>
                  </TR>
                </THead>
                <tbody>
                  {movements.map((mv) => {
                    const t = MOVE[mv.type];
                    return (
                      <TR key={mv.id}>
                        <TD>
                          <Badge tone={t.tone}>{t.label}</Badge>
                        </TD>
                        <TD className="font-medium text-slate-800">
                          {mv.material.name}
                          {mv.note ? <span className="ml-1 text-xs text-slate-400">· {mv.note}</span> : null}
                        </TD>
                        <TD className="text-right tabular-nums">
                          {toNum(mv.quantity)} {mv.material.unit}
                        </TD>
                        <TD className="text-slate-500">{fmtDateTime(mv.createdAt)}</TD>
                      </TR>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
