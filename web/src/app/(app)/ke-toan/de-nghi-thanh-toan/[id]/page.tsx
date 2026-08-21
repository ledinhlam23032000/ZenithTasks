import Link from "next/link";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { requireCap } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { paymentRequestDocument, PAYMENT_REQUEST_PRINT_CSS, renderPaymentRequestPaper, paymentRequestStatusLabel } from "@/lib/payment-request";
import { buttonVariants } from "@/components/ui/button";
import { PaymentRequestPrintEditor } from "../print-editor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Xem giấy đề nghị thanh toán" };

export default async function PaymentRequestPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireCap("mod:ke-toan");
  const { id } = await params;
  const item = await prisma.paymentRequest.findUnique({
    where: { id },
    include: {
      requester: { select: { fullName: true, address: true } },
      approver: { select: { fullName: true } },
      cashTransaction: { select: { id: true, occurredAt: true, amount: true } },
      payrollEntry: { select: { month: true } },
      commissionPayout: { select: { month: true, collaboratorId: true } },
    },
  });
  if (!item) return <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-700">Không tìm thấy chứng từ.</div>;

  const document = paymentRequestDocument(item);
  return (
    <div className="-m-4 min-h-screen bg-slate-100 p-4 sm:-m-6 sm:p-6">
      <style dangerouslySetInnerHTML={{ __html: PAYMENT_REQUEST_PRINT_CSS }} />
      <div className="mx-auto mb-4 flex max-w-[794px] flex-wrap items-center justify-between gap-2 font-sans">
        <Link href="/ke-toan/de-nghi-thanh-toan" className={buttonVariants({ variant: "secondary", size: "sm" })}><ArrowLeft className="h-4 w-4" /> Danh sách chứng từ</Link>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm">{paymentRequestStatusLabel(item.status)} · {item.requestNo}</span>
          {user.role === "ADMIN" && <PaymentRequestPrintEditor id={item.id} initial={{ recipient: document.recipient, requesterName: document.requesterName, requesterAddress: document.requesterAddress, reason: document.reason, location: document.location }} />}
          <a href={`/ke-toan/de-nghi-thanh-toan/${item.id}/print`} target="_blank" rel="noreferrer" className={buttonVariants({ size: "sm" })}><Printer className="h-4 w-4" /> Mở bản in</a>
          <a href={`/ke-toan/de-nghi-thanh-toan/${item.id}/export`} className={buttonVariants({ variant: "secondary", size: "sm" })}><Download className="h-4 w-4" /> Tải Word</a>
        </div>
      </div>
      <div dangerouslySetInnerHTML={{ __html: renderPaymentRequestPaper(document) }} />
      {(item.cashTransaction || item.payrollEntry || item.commissionPayout) && (
        <div className="mx-auto mt-4 max-w-[794px] rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 font-sans">
          {item.payrollEntry && <>Phiếu này liên kết với bảng lương tháng {item.payrollEntry.month} · <Link className="font-medium text-brand-700 hover:underline" href={`/luong?m=${item.payrollEntry.month}`}>Mở bảng lương</Link></>}
          {item.commissionPayout && <>Phiếu này liên kết với hoa hồng CTV tháng {item.commissionPayout.month} · <Link className="font-medium text-brand-700 hover:underline" href={`/cong-tac-vien/${item.commissionPayout.collaboratorId ?? ""}?range=month`}>Mở CTV</Link></>}
          {item.cashTransaction && <>Phiếu này liên kết với dòng Thu chi ngày {item.cashTransaction.occurredAt.toLocaleDateString("vi-VN")} · <Link className="font-medium text-brand-700 hover:underline" href={`/thu-chi?month=${item.cashTransaction.occurredAt.toISOString().slice(0, 7)}&type=EXPENSE`}>Mở Sổ thu chi</Link></>}
        </div>
      )}
    </div>
  );
}
