import { Boxes, ArrowUpFromLine, PackageX, AlertTriangle, CalendarClock } from "lucide-react";
import { requireCap } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toNum } from "@/lib/money";
import { fmtDate, fmtDateTime } from "@/lib/format";
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
  await requireCap("mod:kho");
  const [materials, movements] = await Promise.all([
    prisma.material.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.stockMovement.findMany({
      orderBy: { createdAt: "desc" },
      take: 60,
      include: { material: { select: { name: true, unit: true } }, createdBy: { select: { fullName: true } } },
    }),
  ]);

  const now = new Date();
  const soon = new Date(now.getTime() + 30 * 86400000); // 30 ngày tới

  function status(m: (typeof materials)[number]) {
    const stock = toNum(m.stock);
    const min = toNum(m.minStock);
    const exp = m.expiryDate ? new Date(m.expiryDate) : null;
    return {
      stock,
      min,
      low: stock <= min, // hết hoặc dưới mức tối thiểu
      expired: exp ? exp < now : false,
      expiringSoon: exp ? exp >= now && exp <= soon : false,
    };
  }

  const alerts = materials
    .map((m) => ({ m, s: status(m) }))
    .filter(({ s }) => s.low || s.expired || s.expiringSoon);
  const lowCount = materials.filter((m) => status(m).low).length;
  const expCount = materials.filter((m) => {
    const s = status(m);
    return s.expired || s.expiringSoon;
  }).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kho vật tư"
        description="Theo dõi tồn kho, mức tối thiểu, hạn dùng và lịch sử nhập/xuất."
        icon={<Boxes className="h-5 w-5" />}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Số mặt hàng" value={materials.length} icon={<Boxes className="h-5 w-5" />} tone="brand" />
        <StatCard label="Cần nhập (tồn thấp)" value={lowCount} icon={<PackageX className="h-5 w-5" />} tone={lowCount > 0 ? "red" : "slate"} />
        <StatCard label="Cảnh báo hạn dùng" value={expCount} icon={<CalendarClock className="h-5 w-5" />} tone={expCount > 0 ? "amber" : "slate"} />
      </div>

      {/* Cảnh báo cần xử lý */}
      {alerts.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-4 w-4" /> Cần chú ý ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-2">
              {alerts.map(({ m, s }) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50/60 px-3 py-2">
                  <span className="font-medium text-slate-800">{m.name}</span>
                  <span className="flex flex-wrap items-center gap-1.5">
                    {s.low && <Badge tone="red">{s.stock <= 0 ? "Hết hàng" : `Tồn thấp: ${s.stock}/${s.min} ${m.unit}`}</Badge>}
                    {s.expired && <Badge tone="red">Đã hết hạn {m.expiryDate ? `(${fmtDate(m.expiryDate)})` : ""}</Badge>}
                    {s.expiringSoon && <Badge tone="amber">Sắp hết hạn {m.expiryDate ? `(${fmtDate(m.expiryDate)})` : ""}</Badge>}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-slate-400">Nhập kho & đặt mức tồn tối thiểu / hạn dùng tại trang “Danh mục dịch vụ &amp; vật tư”.</p>
          </CardContent>
        </Card>
      )}

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
                    <TH className="text-right">Tồn / Tối thiểu</TH>
                    <TH>Hạn dùng (lô)</TH>
                  </TR>
                </THead>
                <tbody>
                  {materials.map((m) => {
                    const s = status(m);
                    return (
                      <TR key={m.id}>
                        <TD className="font-medium text-slate-800">{m.name}</TD>
                        <TD className={`text-right font-semibold tabular-nums ${s.low ? "text-rose-500" : "text-slate-800"}`}>
                          {s.stock} {m.unit}
                          {s.min > 0 && <span className="font-normal text-slate-400"> / {s.min}</span>}
                        </TD>
                        <TD>
                          {m.expiryDate ? (
                            <span className={s.expired ? "text-rose-600" : s.expiringSoon ? "text-amber-600" : "text-slate-500"}>
                              {fmtDate(m.expiryDate)}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                          {m.lotNo && <span className="ml-1 text-xs text-slate-400">· {m.lotNo}</span>}
                        </TD>
                      </TR>
                    );
                  })}
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
