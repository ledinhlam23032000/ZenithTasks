"use client";

import { useState } from "react";
import { Check, FilePlus2, LoaderCircle, Printer, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useFormAction } from "@/lib/use-form-action";
import { formatVND } from "@/lib/money";
import {
  approvePaymentRequest,
  createPaymentRequest,
  markPaymentRequestPaid,
  rejectPaymentRequest,
  type PaymentRequestState,
} from "./actions";

function ActionButton({ label, action, hidden, variant = "secondary" }: { label: string; action: (prev: PaymentRequestState, fd: FormData) => Promise<PaymentRequestState>; hidden: Record<string, string>; variant?: "secondary" | "danger" }) {
  const [state, run, pending] = useFormAction<PaymentRequestState>(action, () => window.location.reload());
  return (
    <form action={run} className="inline-flex items-center gap-1">
      {Object.entries(hidden).map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
      {state.error && <span className="max-w-48 text-xs text-rose-600">{state.error}</span>}
      <button type="submit" disabled={pending} className={variant === "danger" ? "inline-flex items-center gap-1 rounded-md border border-rose-200 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60" : "inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"}>
        {pending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : variant === "danger" ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
        {label}
      </button>
    </form>
  );
}

export function CreatePaymentRequestForm() {
  const [open, setOpen] = useState(false);
  const [state, run, pending] = useFormAction<PaymentRequestState>(createPaymentRequest, () => { setOpen(false); window.location.reload(); });
  return (
    <>
      <Button onClick={() => setOpen(true)}><FilePlus2 className="h-4 w-4" /> Tạo thủ công</Button>
      <Modal open={open} onClose={() => !pending && setOpen(false)} title="Tạo giấy đề nghị thanh toán" size="lg">
        <form action={run} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label htmlFor="request-type">Loại khoản chi</Label><Select id="request-type" name="type" defaultValue="EXPENSE"><option value="EXPENSE">Chi phí vận hành</option><option value="SALARY">Chi lương nhân sự</option><option value="COLLABORATOR">Hoa hồng cộng tác viên</option><option value="STAFF_OTHER">Khoản chi khác cho nhân sự</option></Select></div>
            <div><Label htmlFor="request-month">Tháng hạch toán</Label><Input id="request-month" name="month" type="month" /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label htmlFor="request-payee">Người/đơn vị nhận tiền</Label><Input id="request-payee" name="payeeName" required placeholder="VD: Nhà cung cấp văn phòng phẩm" /></div>
            <div><Label htmlFor="request-amount">Số tiền (VND)</Label><Input id="request-amount" name="amount" type="number" min={1} step={1000} required /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label htmlFor="request-category">Hạng mục sổ thu chi</Label><Select id="request-category" name="category" defaultValue="OTHER_EXP"><option value="OTHER_EXP">Chi khác</option><option value="OFFICE">Văn phòng phẩm</option><option value="MATERIAL">Vật tư y tế</option><option value="MARKETING">Marketing & quảng cáo</option><option value="UTILITIES">Điện, nước</option><option value="TAX">Thuế & phí</option><option value="TRAINING">Đào tạo nhân sự</option></Select></div>
            <div><Label htmlFor="request-note">Ghi chú</Label><Input id="request-note" name="note" placeholder="Số hóa đơn, cửa hàng, đợt mua…" /></div>
          </div>
          <div><Label htmlFor="request-reason">Lý do và nội dung thanh toán</Label><Textarea id="request-reason" name="reason" required placeholder="VD: Mua 2 hộp tăm phục vụ khu vực tiếp khách ngày…" /></div>
          {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={pending}>Hủy</Button><button type="submit" disabled={pending} className={buttonVariants()}>{pending && <LoaderCircle className="h-4 w-4 animate-spin" />} Lưu và chuyển ADMIN duyệt</button></div>
        </form>
      </Modal>
    </>
  );
}

export function PaymentRequestActions({ id, status, amount, canApprove, canPay, hasCashTransaction = false }: { id: string; status: string; amount: number; canApprove: boolean; canPay: boolean; hasCashTransaction?: boolean }) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [rejectState, rejectRun, rejectPending] = useFormAction<PaymentRequestState>(rejectPaymentRequest, () => { setRejectOpen(false); window.location.reload(); });
  const [payState, payRun, payPending] = useFormAction<PaymentRequestState>(markPaymentRequestPaid, () => { setPayOpen(false); window.location.reload(); });
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      <a href={`/ke-toan/de-nghi-thanh-toan/${id}`} className={buttonVariants({ variant: "secondary", size: "sm" })}><Printer className="h-3.5 w-3.5" /> Xem / In</a>
      {canApprove && status === "PENDING" && <>
        <ActionButton label="Duyệt" action={approvePaymentRequest} hidden={{ id }} />
        <button type="button" onClick={() => setRejectOpen(true)} className="inline-flex items-center gap-1 rounded-md border border-rose-200 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"><X className="h-3.5 w-3.5" /> Từ chối</button>
      </>}
      {canPay && status === "APPROVED" && <button type="button" onClick={() => setPayOpen(true)} className="inline-flex items-center gap-1 rounded-md border border-emerald-200 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"><Check className="h-3.5 w-3.5" /> Đã thanh toán</button>}
      <Modal open={rejectOpen} onClose={() => !rejectPending && setRejectOpen(false)} title="Từ chối chứng từ" size="sm">
        <form action={rejectRun} className="space-y-4"><input type="hidden" name="id" value={id} /><div><Label htmlFor={`reject-${id}`}>Lý do từ chối</Label><Textarea id={`reject-${id}`} name="reason" required minLength={3} /></div>{rejectState.error && <p className="text-sm text-rose-600">{rejectState.error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setRejectOpen(false)}>Hủy</Button><button type="submit" disabled={rejectPending} className={buttonVariants({ variant: "danger" })}>{rejectPending && <LoaderCircle className="h-4 w-4 animate-spin" />} Từ chối</button></div></form>
      </Modal>
      <Modal open={payOpen} onClose={() => !payPending && setPayOpen(false)} title="Ghi sổ đã thanh toán" size="sm">
        <form action={payRun} className="space-y-4"><input type="hidden" name="id" value={id} /><p className="text-sm text-slate-600">Khoản chi: <strong>{formatVND(amount)}</strong>.</p>{hasCashTransaction ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">Dòng chi đã có sẵn trong Sổ thu chi và được liên kết với phiếu này. Hệ thống chỉ cập nhật trạng thái, không tạo thêm dòng mới.</p> : <div className="grid gap-3 sm:grid-cols-2"><div><Label htmlFor={`paid-date-${id}`}>Ngày chi</Label><Input id={`paid-date-${id}`} name="occurredAt" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></div><div><Label htmlFor={`paid-method-${id}`}>Hình thức</Label><Select id={`paid-method-${id}`} name="method" defaultValue="TRANSFER"><option value="TRANSFER">Chuyển khoản</option><option value="CASH">Tiền mặt</option><option value="CARD">Thẻ</option><option value="EWALLET">Ví điện tử</option></Select></div></div>}{payState.error && <p className="text-sm text-rose-600">{payState.error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setPayOpen(false)}>Hủy</Button><button type="submit" disabled={payPending} className={buttonVariants()}>{payPending && <LoaderCircle className="h-4 w-4 animate-spin" />} {hasCashTransaction ? "Xác nhận đã thanh toán" : `Ghi sổ ${formatVND(amount)}`}</button></div></form>
      </Modal>
    </div>
  );
}
