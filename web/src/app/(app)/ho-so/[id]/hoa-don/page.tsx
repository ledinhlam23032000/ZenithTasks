import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileWarning } from "lucide-react";
import { requireCap } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toNum, formatVND } from "@/lib/money";
import { summarizeCase } from "@/lib/financial-summary";
import { maskPhone } from "@/lib/phone";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { PAYMENT_LABEL } from "@/lib/status";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { PrintButton } from "@/components/ui/print-button";
import { canAccessCase } from "@/lib/case-access";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hóa đơn" };

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireCap("mod:ho-so");
  const { id } = await params;

  const record = await prisma.caseRecord.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, fullName: true, code: true, phoneLast5: true } },
      services: { orderBy: { createdAt: "asc" } },
      payments: { orderBy: { paidAt: "asc" } },
    },
  });
  if (!record) notFound();
  if (!canAccessCase(user, record, "read")) notFound();

  // Hồ sơ chưa có dịch vụ nào thì không có gì để in hóa đơn (tránh in ra tờ toàn số 0).
  if (record.services.length === 0) {
    return (
      <div className="mx-auto max-w-[820px] space-y-5">
        <Link href={`/ho-so/${record.id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> Quay lại hồ sơ
        </Link>
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
          <FileWarning className="h-10 w-10 text-amber-500" />
          <p className="font-semibold text-amber-800">Hồ sơ chưa có dịch vụ nào</p>
          <p className="text-sm text-amber-700/90">Vui lòng thêm dịch vụ vào hồ sơ trước khi in hóa đơn.</p>
        </div>
      </div>
    );
  }

  const financial = summarizeCase({ services: record.services, payments: record.payments, voucherAmount: record.voucherAmount, snapshot: record });
  const grossTotal = financial.gross;
  const voucher = financial.voucher;
  const totalSavings = grossTotal - financial.subtotal + voucher;
  const net = financial.total;
  const paid = financial.paid;
  const debt = financial.debt;

  return (
    <div className="invoice-sheet mx-auto max-w-[820px] space-y-5">
      {/* Thanh thao tác (ẩn khi in) */}
      <div className="print-hide flex items-center justify-between">
        <Link href={`/ho-so/${record.id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> Quay lại hồ sơ
        </Link>
        <PrintButton label="In hóa đơn" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <p className="text-lg font-bold text-brand-700">Trung tâm Phẫu thuật Tạo hình Thẩm mỹ</p>
            <p className="text-sm text-slate-500">Bệnh viện Đa khoa Hồng Phúc</p>
            <p className="mt-1 text-xs text-slate-400">Hotline: 0941 567 496</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold uppercase text-slate-800">Hóa đơn</p>
            <p className="text-sm text-slate-500">Số: {record.code}</p>
            <p className="text-xs text-slate-400">Ngày in: {fmtDate(new Date())}</p>
          </div>
        </div>

        {/* Khách hàng */}
        <div className="grid gap-1 py-4 text-sm">
          <p>
            <span className="text-slate-500">Khách hàng: </span>
            <b className="text-slate-800">{record.customer.fullName}</b>{" "}
            <span className="text-slate-400">({record.customer.code})</span>
          </p>
          <p>
            <span className="text-slate-500">Điện thoại: </span>
            {maskPhone(record.customer.phoneLast5)}
          </p>
        </div>

        {/* Bảng dịch vụ */}
        <Table>
          <THead>
            <TR className="hover:bg-transparent">
              <TH>Dịch vụ</TH>
              <TH className="text-center">SL</TH>
              <TH className="text-right">Giá gốc</TH>
              <TH className="text-right">Ưu đãi</TH>
              <TH className="text-right">Thành tiền</TH>
            </TR>
          </THead>
          <tbody>
            {record.services.map((s) => {
              const list = toNum(s.listPrice);
              const unit = toNum(s.unitPrice);
              return (
                <TR key={s.id}>
                  <TD className="font-medium text-slate-800">{s.name}</TD>
                  <TD className="text-center">{s.quantity}</TD>
                  <TD className="text-right text-slate-400">
                    {list > unit ? <span className="line-through">{formatVND(list)}</span> : formatVND(list)}
                  </TD>
                  <TD className="text-right">{formatVND(unit)}</TD>
                  <TD className="text-right font-semibold text-slate-800">{formatVND(s.finalPrice)}</TD>
                </TR>
              );
            })}
          </tbody>
        </Table>

        {/* Tổng kết */}
        <div className="ml-auto mt-5 max-w-xs space-y-1.5 text-sm">
          <SumRow label="Tổng giá gốc" value={formatVND(grossTotal)} />
          {totalSavings > 0 && <SumRow label="Tổng tiết kiệm" value={`-${formatVND(totalSavings)}`} cls="font-medium text-emerald-600" />}
          {voucher > 0 && (
            <SumRow label={`Voucher${record.voucherCode ? ` (${record.voucherCode})` : ""}`} value={`-${formatVND(voucher)}`} cls="text-violet-600" />
          )}
          <div className="my-1 h-px bg-slate-200" />
          <SumRow label="Thành tiền" value={formatVND(net)} cls="font-semibold text-slate-900" />
          <SumRow label="Đã thanh toán" value={formatVND(paid)} cls="text-emerald-600" />
          <div className="flex items-center justify-between border-t border-slate-200 pt-2">
            <span className="font-semibold text-slate-700">Còn nợ</span>
            <span className={`text-lg font-bold ${debt > 0 ? "text-rose-600" : "text-emerald-600"}`}>{formatVND(debt)}</span>
          </div>
        </div>

        {/* Lịch sử thanh toán */}
        {record.payments.length > 0 && (
          <div className="mt-5 border-t border-slate-100 pt-3 text-xs text-slate-500">
            <p className="mb-1 font-semibold uppercase tracking-wide text-slate-400">Lịch sử thanh toán</p>
            {record.payments.map((p) => (
              <div key={p.id} className="flex justify-between">
                <span>{fmtDateTime(p.paidAt)} · {PAYMENT_LABEL[p.method]}</span>
                <span>{formatVND(p.amount)}</span>
              </div>
            ))}
          </div>
        )}

        <p className="mt-6 text-center text-sm text-slate-500">Cảm ơn Quý khách đã tin tưởng dịch vụ của chúng tôi! 💗</p>
      </div>
    </div>
  );
}

function SumRow({ label, value, cls = "text-slate-700" }: { label: string; value: string; cls?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={cls}>{value}</span>
    </div>
  );
}
