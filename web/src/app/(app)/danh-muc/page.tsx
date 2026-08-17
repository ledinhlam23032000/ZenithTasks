import Link from "next/link";
import { ListChecks, Package, Power, PackagePlus, Search } from "lucide-react";
import { requireCap } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatVND, toNum } from "@/lib/money";
import { PageHeader } from "@/components/ui/page-header";
import { PageTabs } from "@/components/ui/page-tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { DeleteButton } from "@/components/ui/delete-button";
import { isShareholder } from "@/lib/rbac";
import { catalogTabs } from "@/lib/nav-tabs";
import { NewServiceButton, NewMaterialButton, EditServiceButton, EditMaterialButton, ServiceBomButton } from "./catalog-forms";
import { toggleService, toggleMaterial, deleteService, deleteMaterial, stockIn } from "./actions";
import type { Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Danh mục dịch vụ" };

export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireCap("mod:danh-muc");
  const canManage = !isShareholder(user.role);
  const q = ((await searchParams).q ?? "").trim();

  const svcWhere: Prisma.ServiceWhereInput = q
    ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { category: { contains: q, mode: "insensitive" } }] }
    : {};
  const matWhere: Prisma.MaterialWhereInput = q ? { name: { contains: q, mode: "insensitive" } } : {};

  const [services, materials, pickMaterials] = await Promise.all([
    prisma.service.findMany({
      where: svcWhere,
      orderBy: [{ active: "desc" }, { category: "asc" }, { name: "asc" }],
      // Định mức vật tư (BOM) của từng dịch vụ — để hiện/sửa ngay trên dòng dịch vụ.
      include: { materials: { include: { material: { select: { name: true, unit: true } } }, orderBy: { createdAt: "asc" } } },
    }),
    prisma.material.findMany({ where: matWhere, orderBy: [{ active: "desc" }, { name: "asc" }] }),
    // Vật tư đang dùng — để chọn khi khai báo định mức (không phụ thuộc ô tìm kiếm).
    prisma.material.findMany({ where: { active: true }, select: { id: true, name: true, unit: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Danh mục dịch vụ &amp; vật tư"
        description="Cấu hình các dịch vụ và vật tư sử dụng trong hồ sơ điều trị."
        icon={<ListChecks className="h-5 w-5" />}
      />

      <PageTabs tabs={catalogTabs(user)} />

      <form action="/danh-muc" className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Tìm dịch vụ hoặc vật tư theo tên…"
            className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <button className={buttonVariants({ variant: "secondary" })}>Tìm</button>
        {q && (
          <Link href="/danh-muc" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Xóa lọc
          </Link>
        )}
      </form>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-brand-500" /> Dịch vụ ({services.length})
            </CardTitle>
            {canManage && <NewServiceButton />}
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Tên dịch vụ</TH>
                  <TH>Nhóm</TH>
                  <TH className="text-right">Niêm yết</TH>
                  <TH className="text-right">Ưu đãi</TH>
                  <TH />
                </TR>
              </THead>
              <tbody>
                {services.map((s) => (
                  <TR key={s.id} className={s.active ? "" : "opacity-50"}>
                    <TD className="font-medium text-slate-800">{s.name}</TD>
                    <TD className="text-slate-500">{s.category ?? "—"}</TD>
                    <TD className="text-right tabular-nums text-slate-400">
                      {toNum(s.listPrice) > toNum(s.defaultPrice) ? (
                        <span className="line-through">{formatVND(s.listPrice)}</span>
                      ) : (
                        "—"
                      )}
                    </TD>
                    <TD className="text-right font-semibold tabular-nums text-slate-800">{formatVND(s.defaultPrice)}</TD>
                    <TD className="text-right">
                      {canManage && (
                      <div className="flex items-center justify-end gap-1">
                        <ServiceBomButton
                          service={{
                            id: s.id,
                            name: s.name,
                            lines: s.materials.map((sm) => ({
                              id: sm.id,
                              materialId: sm.materialId,
                              name: sm.material.name,
                              unit: sm.material.unit,
                              quantity: toNum(sm.quantity),
                            })),
                          }}
                          materials={pickMaterials}
                        />
                        <EditServiceButton
                          service={{
                            id: s.id,
                            name: s.name,
                            category: s.category,
                            listPrice: toNum(s.listPrice),
                            defaultPrice: toNum(s.defaultPrice),
                          }}
                        />
                        <form action={toggleService}>
                          <input type="hidden" name="id" value={s.id} />
                          <button className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100" title={s.active ? "Ẩn" : "Hiện"}>
                            <Power className="h-3.5 w-3.5" />
                          </button>
                        </form>
                        <DeleteButton
                          action={deleteService}
                          id={s.id}
                          label=""
                          confirmText={`Xóa dịch vụ "${s.name}" khỏi danh mục?`}
                          className="rounded-md p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500"
                        />
                      </div>
                      )}
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-4 w-4 text-brand-500" /> Vật tư ({materials.length})
            </CardTitle>
            {canManage && <NewMaterialButton />}
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Tên vật tư</TH>
                  <TH>Đơn vị</TH>
                  <TH className="text-right">Tồn kho</TH>
                  <TH>Trạng thái</TH>
                  <TH />
                </TR>
              </THead>
              <tbody>
                {materials.map((m) => (
                  <TR key={m.id} className={m.active ? "" : "opacity-50"}>
                    <TD className="font-medium text-slate-800">{m.name}</TD>
                    <TD className="text-slate-500">{m.unit}</TD>
                    <TD className={`text-right font-semibold tabular-nums ${toNum(m.stock) <= 0 ? "text-rose-500" : "text-slate-800"}`}>
                      {toNum(m.stock)}
                    </TD>
                    <TD>{m.active ? <Badge tone="green">Đang dùng</Badge> : <Badge tone="slate">Ẩn</Badge>}</TD>
                    <TD className="text-right">
                      {canManage && (
                      <div className="flex items-center justify-end gap-1">
                        <EditMaterialButton
                          material={{
                            id: m.id,
                            name: m.name,
                            unit: m.unit,
                            minStock: toNum(m.minStock),
                            lotNo: m.lotNo ?? "",
                            expiryDate: m.expiryDate ? m.expiryDate.toISOString().slice(0, 10) : "",
                          }}
                        />
                        <form action={stockIn} className="flex items-center gap-1">
                          <input type="hidden" name="id" value={m.id} />
                          <input
                            name="quantity"
                            type="number"
                            min={1}
                            step="any"
                            placeholder="SL"
                            className="w-14 rounded-md border border-slate-200 px-1.5 py-1 text-right text-xs focus:border-brand-400 focus:outline-none"
                          />
                          <input
                            name="unitCost"
                            type="number"
                            min={0}
                            step="any"
                            placeholder="Giá vốn"
                            title="Đơn giá nhập (VND/đơn vị). Để trống nếu không cập nhật giá vốn."
                            className="w-20 rounded-md border border-slate-200 px-1.5 py-1 text-right text-xs focus:border-brand-400 focus:outline-none"
                          />
                          <button
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                            title="Nhập kho"
                          >
                            <PackagePlus className="h-3.5 w-3.5" /> Nhập
                          </button>
                        </form>
                        <form action={toggleMaterial}>
                          <input type="hidden" name="id" value={m.id} />
                          <button className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100" title={m.active ? "Ẩn" : "Hiện"}>
                            <Power className="h-3.5 w-3.5" />
                          </button>
                        </form>
                        <DeleteButton
                          action={deleteMaterial}
                          id={m.id}
                          label=""
                          confirmText={`Xóa vật tư "${m.name}" khỏi danh mục (cả lịch sử kho)?`}
                          className="rounded-md p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500"
                        />
                      </div>
                      )}
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
