import Link from "next/link";
import { FileText, ArrowLeft } from "lucide-react";
import { requireCap } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatVND } from "@/lib/money";
import { fmtDate } from "@/lib/format";
import { paymentRequestStatusLabel, paymentRequestTypeLabel } from "@/lib/payment-request";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { CreatePaymentRequestForm, PaymentRequestActions } from "./request-forms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Đề nghị thanh toán" };

const tone: Record<string, "slate" | "amber" | "green" | "red" | "blue"> = {
  DRAFT: "slate",
  PENDING: "amber",
  APPROVED: "blue",
  REJECTED: "red",
  PAID: "green",
  CANCELLED: "slate",
};

export default async function PaymentRequestsPage() {
  const user = await requireCap("mod:ke-toan");
  const requests = await prisma.paymentRequest.findMany({
    orderBy: { requestedAt: "desc" },
    take: 150,
    include: { requester: { select: { fullName: true } }, approver: { select: { fullName: true } }, cashTransaction: { select: { id: true, occurredAt: true, amount: true } } },
  });
  const canApprove = user.role === "ADMIN";
  const canPay = user.role === "ADMIN";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Giấy đề nghị thanh toán"
        description="Mỗi khoản chi được lập thành chứng từ, ADMIN duyệt rồi mới ghi sổ thanh toán. Có thể in từng phiếu để lưu cùng hồ sơ kế toán."
        icon={<FileText className="h-5 w-5" />}
        actions={<div className="flex flex-wrap gap-2"><Link href="/ke-toan" className={buttonVariants({ variant: "secondary" })}><ArrowLeft className="h-4 w-4" /> Về Kế toán</Link>{canApprove && <CreatePaymentRequestForm />}</div>}
      />

      <Card>
        <CardHeader><CardTitle>Danh sách chứng từ</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto pt-0">
          {requests.length === 0 ? <EmptyState title="Chưa có giấy đề nghị thanh toán" description="Bấm Tạo đề nghị thanh toán để lập cả những khoản nhỏ như mua tăm, văn phòng phẩm hoặc chi phí vận hành." /> : (
            <table className="w-full min-w-[980px] text-sm">
              <thead><tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-400"><th className="px-3 py-3">Số phiếu</th><th className="px-3 py-3">Loại / người nhận</th><th className="px-3 py-3">Lý do</th><th className="px-3 py-3 text-right">Số tiền</th><th className="px-3 py-3">Người lập / ngày</th><th className="px-3 py-3">Trạng thái</th><th className="px-3 py-3">Sổ thu–chi</th><th className="px-3 py-3 text-right">Xử lý</th></tr></thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id} className="border-b border-slate-100 align-top hover:bg-slate-50/70">
                    <td className="px-3 py-3"><a href={`/ke-toan/de-nghi-thanh-toan/${request.id}/export`} className="font-semibold text-brand-700 hover:underline">{request.requestNo}</a><div className="mt-1 text-xs text-slate-400">{request.month ?? "Không gắn tháng"}</div></td>
                    <td className="px-3 py-3"><div className="font-medium text-slate-800">{request.payeeName}</div><div className="mt-1 text-xs text-slate-500">{paymentRequestTypeLabel(request.type)}</div></td>
                    <td className="max-w-[280px] px-3 py-3 text-slate-600"><div className="line-clamp-3">{request.reason}</div>{request.rejectionReason && <div className="mt-1 text-xs text-rose-600">Từ chối: {request.rejectionReason}</div>}</td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums text-slate-900">{formatVND(Number(request.amount))}</td>
                    <td className="px-3 py-3 text-xs text-slate-500">{request.requester.fullName}<div className="mt-1">{fmtDate(request.requestedAt)}</div>{request.approver && <div className="mt-1">Duyệt: {request.approver.fullName}</div>}</td>
                    <td className="px-3 py-3"><Badge tone={tone[request.status] ?? "gray"}>{paymentRequestStatusLabel(request.status)}</Badge>{request.paidAt && <div className="mt-1 text-xs text-emerald-600">{fmtDate(request.paidAt)}</div>}</td>
                    <td className="px-3 py-3">{request.cashTransaction ? <a href={`/thu-chi?month=${request.cashTransaction.occurredAt.toISOString().slice(0, 7)}&type=EXPENSE`} className="text-xs font-medium text-brand-700 hover:underline">Đã ghi sổ<br /><span className="font-normal text-slate-400">{fmtDate(request.cashTransaction.occurredAt)}</span></a> : <span className="text-xs text-slate-400">Chưa ghi sổ</span>}</td>
                    <td className="px-3 py-3"><PaymentRequestActions id={request.id} status={request.status} amount={Number(request.amount)} canApprove={canApprove} canPay={canPay} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
