import { ListChecks, Package, Power } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatVND } from "@/lib/money";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { NewServiceButton, NewMaterialButton } from "./catalog-forms";
import { toggleService, toggleMaterial } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Danh mục dịch vụ" };

export default async function CatalogPage() {
  await requireUser(["ADMIN", "MANAGER"]);
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
                      <form action={toggleService}>
                        <input type="hidden" name="id" value={s.id} />
                        <button className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100" title={s.active ? "Ẩn" : "Hiện"}>
                          <Power className="h-3.5 w-3.5" />
                        </button>
                      </form>
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
                  <TH>Trạng thái</TH>
                  <TH />
                </TR>
              </THead>
              <tbody>
                {materials.map((m) => (
                  <TR key={m.id} className={m.active ? "" : "opacity-50"}>
                    <TD className="font-medium text-slate-800">{m.name}</TD>
                    <TD className="text-slate-500">{m.unit}</TD>
                    <TD>{m.active ? <Badge tone="green">Đang dùng</Badge> : <Badge tone="slate">Ẩn</Badge>}</TD>
                    <TD className="text-right">
                      <form action={toggleMaterial}>
                        <input type="hidden" name="id" value={m.id} />
                        <button className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100" title={m.active ? "Ẩn" : "Hiện"}>
                          <Power className="h-3.5 w-3.5" />
                        </button>
                      </form>
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
