import Link from "next/link";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { requireCap } from "@/lib/auth";
import { userCan } from "@/lib/permissions";
import { canAccessCase } from "@/lib/case-access";
import { prisma } from "@/lib/db";
import { buttonVariants } from "@/components/ui/button";
import { CONSULTATION_PRINT_CSS, consultationPrintDocument, renderConsultationPaper } from "@/lib/consultation-sheet";
import { ConsultationPrintEditor } from "../consultation-print-editor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Phiếu tư vấn dịch vụ thẩm mỹ" };

export default async function ConsultationPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireCap("mod:ho-so");
  const { id } = await params;
  const record = await prisma.caseRecord.findUnique({
    where: { id },
    include: {
      customer: { select: { fullName: true, code: true, phoneLast5: true, gender: true, dob: true, address: true } },
      consultant: { select: { fullName: true } },
      doctor: { select: { fullName: true } },
      consultation: true,
      services: { orderBy: { createdAt: "asc" }, select: { name: true, quantity: true, finalPrice: true } },
    },
  });
  if (!record || !canAccessCase(user, record, "read")) {
    return <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-700">Không tìm thấy hoặc bạn không có quyền xem phiếu tư vấn.</div>;
  }
  if (!record.consultation) {
    return <div className="space-y-4"><Link href={`/ho-so/${record.id}`} className="text-sm text-brand-600 hover:underline">← Quay lại hồ sơ</Link><div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800">Hồ sơ này chưa có Phiếu tư vấn mặc định. Hãy chạy cập nhật ứng dụng để hệ thống backfill tự bổ sung.</div></div>;
  }

  const document = consultationPrintDocument(record);
  const canEdit = userCan(user, "case.clinical") && (!record.locked || user.role === "ADMIN");
  return (
    <div className="-m-4 min-h-screen bg-slate-100 p-4 sm:-m-6 sm:p-6">
      <style dangerouslySetInnerHTML={{ __html: CONSULTATION_PRINT_CSS }} />
      <div className="mx-auto mb-4 flex max-w-[794px] flex-wrap items-center justify-between gap-2 font-sans">
        <Link href={`/ho-so/${record.id}`} className={buttonVariants({ variant: "secondary", size: "sm" })}><ArrowLeft className="h-4 w-4" /> Hồ sơ {record.code}</Link>
        <div className="flex flex-wrap gap-2">
          {canEdit && <ConsultationPrintEditor caseId={record.id} initial={{ fullName: document.fullName, address: document.address, phoneLast5: document.phoneLast5, wants: document.wants, currentCondition: document.currentCondition, expectedResult: document.expectedResult, doctorIndication: document.doctorIndication, extraNote: document.extraNote }} />}
          <a href={`/ho-so/${record.id}/consultation/print`} target="_blank" rel="noreferrer" className={buttonVariants({ size: "sm" })}><Printer className="h-4 w-4" /> Mở bản in</a>
          <a href={`/ho-so/${record.id}/consultation-export`} className={buttonVariants({ variant: "secondary", size: "sm" })}><Download className="h-4 w-4" /> Tải Word</a>
        </div>
      </div>
      <div dangerouslySetInnerHTML={{ __html: renderConsultationPaper(document) }} />
    </div>
  );
}
