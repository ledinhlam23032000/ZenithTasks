import { FileSignature, Power } from "lucide-react";
import { requireCap } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DeleteButton } from "@/components/ui/delete-button";
import { NewTemplateButton, EditTemplateButton } from "./template-forms";
import { toggleTemplate, deleteTemplate } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mẫu phiếu đồng ý" };

export default async function TemplatesPage() {
  await requireCap("mod:mau-phieu");
  const templates = await prisma.consentTemplate.findMany({ orderBy: [{ active: "desc" }, { title: "asc" }] });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mẫu phiếu đồng ý"
        description="Soạn sẵn nội dung phiếu đồng ý / cam kết để ghi nhận & in cho khách ký khi làm dịch vụ."
        icon={<FileSignature className="h-5 w-5" />}
        actions={<NewTemplateButton />}
      />

      {templates.length === 0 ? (
        <EmptyState icon={<FileSignature className="h-6 w-6" />} title="Chưa có mẫu phiếu" description="Thêm mẫu phiếu đồng ý đầu tiên (vd phiếu đồng ý phẫu thuật)." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {templates.map((t) => (
            <Card key={t.id} className={t.active ? "" : "opacity-60"}>
              <CardContent className="space-y-3 py-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-slate-800">{t.title}</h3>
                    <p className="text-xs text-slate-400">Cập nhật {fmtDate(t.updatedAt)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {t.active ? <Badge tone="green">Đang dùng</Badge> : <Badge tone="slate">Ẩn</Badge>}
                    <EditTemplateButton template={{ id: t.id, title: t.title, body: t.body }} />
                    <form action={toggleTemplate}>
                      <input type="hidden" name="id" value={t.id} />
                      <button className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100" title={t.active ? "Ẩn" : "Hiện"}>
                        <Power className="h-3.5 w-3.5" />
                      </button>
                    </form>
                    <DeleteButton
                      action={deleteTemplate}
                      id={t.id}
                      label=""
                      confirmText={`Xóa mẫu phiếu "${t.title}"? (Các phiếu đã ghi nhận vẫn giữ nội dung.)`}
                      className="rounded-md p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500"
                    />
                  </div>
                </div>
                <p className="max-h-40 overflow-hidden whitespace-pre-wrap rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{t.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
