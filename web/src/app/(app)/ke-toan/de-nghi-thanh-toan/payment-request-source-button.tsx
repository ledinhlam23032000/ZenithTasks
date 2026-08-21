"use client";

import { useState } from "react";
import { FilePlus2, LoaderCircle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useFormAction } from "@/lib/use-form-action";
import { formatVND } from "@/lib/money";
import { createPaymentRequest, type PaymentRequestState } from "./actions";

type SourceType = "SALARY" | "COLLABORATOR" | "EXPENSE";

export function CreateSourcePaymentRequestButton({
  type,
  payeeName,
  payeeUserId,
  payeeCollaboratorId,
  amount,
  reason,
  month,
  category = "OTHER_EXP",
  label = "Tạo đề nghị",
  enabled = true,
}: {
  type: SourceType;
  payeeName: string;
  payeeUserId?: string | null;
  payeeCollaboratorId?: string | null;
  amount: number;
  reason: string;
  month?: string;
  category?: string;
  label?: string;
  enabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, run, pending] = useFormAction<PaymentRequestState>(createPaymentRequest, () => setOpen(false));
  if (!enabled || amount <= 0) return null;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50" title="Tạo chứng từ từ số liệu đang hiển thị">
        <FilePlus2 className="h-3.5 w-3.5" /> {label}
      </button>
      <Modal open={open} onClose={() => !pending && setOpen(false)} title="Tạo đề nghị thanh toán từ số liệu" size="sm">
        <form action={run} className="space-y-4">
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="payeeName" value={payeeName} />
          <input type="hidden" name="payeeUserId" value={payeeUserId ?? ""} />
          <input type="hidden" name="payeeCollaboratorId" value={payeeCollaboratorId ?? ""} />
          <input type="hidden" name="amount" value={amount} />
          <input type="hidden" name="reason" value={reason} />
          <input type="hidden" name="month" value={month ?? ""} />
          <input type="hidden" name="category" value={category} />
          <p className="text-sm text-slate-700">Tạo chứng từ cho <strong>{payeeName}</strong> với số tiền <strong>{formatVND(amount)}</strong>?</p>
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">Hệ thống chỉ tạo trạng thái PENDING để ADMIN duyệt; chưa ghi dòng tiền và không tự tính lại số tiền nguồn.</p>
          {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={pending}>Hủy</Button><button type="submit" disabled={pending} className={buttonVariants()}>{pending && <LoaderCircle className="h-4 w-4 animate-spin" />} Tạo chứng từ</button></div>
        </form>
      </Modal>
    </>
  );
}
