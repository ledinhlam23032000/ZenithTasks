import { ListChecks, Package, Power, PackagePlus } from "lucide-react";
import { requireCap } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatVND, toNum } from "@/lib/money";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { DeleteButton } from "@/components/ui/delete-button";
import { NewServiceButton, NewMaterialButton, EditServiceButton, EditMaterialButton } from "./catalog-forms";
import { toggleService, toggleMaterial, deleteService, deleteMaterial, stockIn } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Danh mục dịch vụ" };

export default async function CatalogPage() {
  await requireCap("mod:danh-muc");
  const [services, materials] = await Promise.all([
    prisma.service.findMany({ orderBy: [{ active: "desc" }, { category: "asc" }, { name: "asc" }] }),
    prisma.material.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Danh mục dịch vụ &amp; vật tư"
        description="Cấu hình các dịch vụ và vật tư sử dụng trong hồ sơ điều trị."
        icon={<ListChecks className="h-5 w-5" />}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-brand-500" /> Dịch vụ ({services.length})
            </CardTitle>
            <NewServiceButton />
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Tên dịch vụ</TH>
                  <TH>Nhóm</TH>
                  <TH className="text-right">Giá</TH>
                  <TH />
                </TR>
              </THead>
              <tbody>
                {services.map((s) => (
                  <TR key={s.id} className={s.active ? "" : "opacity-50"}>
                    <TD className="font-medium text-slate-800">{s.name}</TD>
                    <TD className="text-slate-500">{s.category ?? "—"}</TD>
                    <TD className="text-right font-semibold text-slate-800">{formatVND(s.defaultPrice)}</TD>
                    <TD className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <EditServiceButton service={{ id: s.id, name: s.name, category: s.category, defaultPrice: toNum(s.defaultPrice) }} />
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
            <NewMaterialButton />
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
                      <div className="flex items-center justify-end gap-1">
                        <EditMaterialButton material={{ id: m.id, name: m.name, unit: m.unit }} />
                        <form action={stockIn} className="flex items-center gap-1">
                          <input type="hidden" name="id" value={m.id} />
                          <input
                            name="quantity"
                            type="number"
                            min={1}
                            step="any"
                            placeholder="SL"
                            className="w-16 rounded-md border border-slate-200 px-1.5 py-1 text-right text-xs focus:border-brand-400 focus:outline-none"
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
