import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireCap } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { PrintButton } from "@/components/ui/print-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Phiếu đồng ý" };

export default async function ConsentPrintPage({ params }: { params: Promise<{ id: string; consentId: string }> }) {
  await requireCap("mod:ho-so");
  const { id, consentId } = await params;

  const consent = await prisma.caseConsent.findUnique({
    where: { id: consentId },
    include: { case: { select: { id: true, code: true, customer: { select: { fullName: true, code: true } } } } },
  });
  if (!consent || consent.case.id !== id) notFound();

  return (
    <div className="invoice-sheet mx-auto max-w-[820px] space-y-5">
      <div className="print-hide flex items-center justify-between">
        <Link href={`/ho-so/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> Quay lại hồ sơ
        </Link>
        <PrintButton label="In phiếu" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-10">
        {/* Header */}
        <div className="border-b border-slate-200 pb-4 text-center">
          <p className="text-lg font-bold text-brand-700">Trung tâm Phẫu thuật Tạo hình Thẩm mỹ</p>
          <p className="text-sm text-slate-500">Bệnh viện Đa khoa Hồng Phúc</p>
        </div>

        <h1 className="mt-6 text-center text-xl font-bold uppercase text-slate-800">{consent.title}</h1>
        <p className="mt-1 text-center text-xs text-slate-400">
          Khách hàng: {consent.case.customer.fullName} ({consent.case.customer.code}) · Hồ sơ {consent.case.code}
        </p>

        <div className="mt-6 whitespace-pre-wrap text-[15px] leading-relaxed text-slate-800">{consent.body}</div>

        {consent.note && <p className="mt-4 text-sm italic text-slate-500">Ghi chú: {consent.note}</p>}

        {/* Khu vực ký */}
        <div className="mt-12 grid grid-cols-2 gap-8 text-center text-sm">
          <div>
            <p className="font-medium text-slate-700">Đại diện trung tâm</p>
            <p className="text-xs text-slate-400">(Ký, ghi rõ họ tên)</p>
            <div className="h-20" />
          </div>
          <div>
            <p className="font-medium text-slate-700">
              Người đồng ý{consent.relationship ? ` (${consent.relationship})` : ""}
            </p>
            <p className="text-xs text-slate-400">(Ký, ghi rõ họ tên)</p>
            <div className="h-20" />
            <p className="font-semibold text-slate-800">{consent.signerName}</p>
          </div>
        </div>

        <p className="mt-8 text-right text-sm text-slate-500">Ngày {fmtDate(consent.signedAt)}</p>
      </div>
    </div>
  );
}
