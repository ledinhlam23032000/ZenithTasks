"use client";

import { useState } from "react";
import { Edit3, LoaderCircle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useFormAction } from "@/lib/use-form-action";
import { updatePaymentRequestPrintOverrides, type PaymentRequestState } from "./actions";

type PrintDraft = {
  recipient: string;
  requesterName: string;
  requesterAddress: string;
  reason: string;
  location: string;
};

export function PaymentRequestPrintEditor({ id, initial }: { id: string; initial: PrintDraft }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(initial);
  const [state, run, pending] = useFormAction<PaymentRequestState>(updatePaymentRequestPrintOverrides, () => setOpen(false));
  const set = (key: keyof PrintDraft, value: string) => setDraft((current) => ({ ...current, [key]: value }));

  return (
    <>
      <button type="button" onClick={() => { setDraft(initial); setOpen(true); }} className={buttonVariants({ variant: "secondary", size: "sm" })}>
        <Edit3 className="h-4 w-4" /> Sửa nội dung in
      </button>
      <Modal open={open} onClose={() => !pending && setOpen(false)} title="Sửa nội dung Giấy đề nghị thanh toán" size="lg">
        <form action={run} className="space-y-4">
          <input type="hidden" name="id" value={id} />
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
            Chỉ sửa phần chữ hiển thị trên phiếu. Số tiền, ngày giao dịch và dòng Thu chi gốc không thay đổi. Thao tác sẽ được lưu vào nhật ký ADMIN.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label htmlFor={`print-recipient-${id}`}>Kính gửi</Label><Input id={`print-recipient-${id}`} name="recipient" value={draft.recipient} onChange={(event) => set("recipient", event.target.value)} required maxLength={300} /></div>
            <div><Label htmlFor={`print-requester-${id}`}>Họ và tên</Label><Input id={`print-requester-${id}`} name="requesterName" value={draft.requesterName} onChange={(event) => set("requesterName", event.target.value)} required maxLength={200} /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label htmlFor={`print-address-${id}`}>Địa chỉ</Label><Input id={`print-address-${id}`} name="requesterAddress" value={draft.requesterAddress} onChange={(event) => set("requesterAddress", event.target.value)} required maxLength={300} /></div>
            <div><Label htmlFor={`print-location-${id}`}>Địa điểm lập phiếu</Label><Input id={`print-location-${id}`} name="location" value={draft.location} onChange={(event) => set("location", event.target.value)} required maxLength={100} /></div>
          </div>
          <div><Label htmlFor={`print-reason-${id}`}>Lý do / nội dung</Label><Textarea id={`print-reason-${id}`} name="reason" value={draft.reason} onChange={(event) => set("reason", event.target.value)} required minLength={3} maxLength={1000} rows={5} /></div>
          {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={pending}>Hủy</Button>
            <button type="submit" disabled={pending} className={buttonVariants()}>{pending && <LoaderCircle className="h-4 w-4 animate-spin" />} Lưu nội dung in</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
