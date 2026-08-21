"use client";

import { useState } from "react";
import { Edit3, LoaderCircle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useFormAction } from "@/lib/use-form-action";
import { saveConsultationPrintOverrides, type CaseActionState } from "../actions";

type Draft = {
  fullName: string;
  address: string;
  phoneLast5: string;
  wants: string;
  currentCondition: string;
  expectedResult: string;
  doctorIndication: string;
  extraNote: string;
};

export function ConsultationPrintEditor({ caseId, initial }: { caseId: string; initial: Draft }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(initial);
  const [state, run, pending] = useFormAction<CaseActionState>(saveConsultationPrintOverrides, () => { setOpen(false); window.location.reload(); });
  const set = (key: keyof Draft, value: string) => setDraft((current) => ({ ...current, [key]: value }));

  return (
    <>
      <button type="button" onClick={() => { setDraft(initial); setOpen(true); }} className={buttonVariants({ variant: "secondary", size: "sm" })}>
        <Edit3 className="h-4 w-4" /> Sửa nội dung phiếu
      </button>
      <Modal open={open} onClose={() => !pending && setOpen(false)} title="Sửa nội dung Phiếu tư vấn" size="lg">
        <form action={run} className="space-y-4">
          <input type="hidden" name="caseId" value={caseId} />
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
            Đây là phần chỉnh sửa riêng cho bản in. Bạn có thể gõ thêm, xóa hoặc sửa chữ. Checklist tiền sử, sinh hiệu và dịch vụ được chỉnh ở hồ sơ; dữ liệu nguồn không bị xóa.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label htmlFor={`consult-print-name-${caseId}`}>Họ và tên hiển thị</Label><Input id={`consult-print-name-${caseId}`} name="fullName" value={draft.fullName} onChange={(event) => set("fullName", event.target.value)} required maxLength={200} /></div>
            <div><Label htmlFor={`consult-print-phone-${caseId}`}>SĐT (5 số cuối)</Label><Input id={`consult-print-phone-${caseId}`} name="phoneLast5" inputMode="numeric" maxLength={5} value={draft.phoneLast5} onChange={(event) => set("phoneLast5", event.target.value.replace(/\D/g, "").slice(0, 5))} required /></div>
          </div>
          <div><Label htmlFor={`consult-print-address-${caseId}`}>Địa chỉ hiển thị</Label><Input id={`consult-print-address-${caseId}`} name="address" value={draft.address} onChange={(event) => set("address", event.target.value)} maxLength={300} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label htmlFor={`consult-print-wants-${caseId}`}>Mong muốn của khách</Label><Textarea id={`consult-print-wants-${caseId}`} name="wants" rows={4} value={draft.wants} onChange={(event) => set("wants", event.target.value)} maxLength={3000} /></div>
            <div><Label htmlFor={`consult-print-condition-${caseId}`}>Tình trạng hiện tại</Label><Textarea id={`consult-print-condition-${caseId}`} name="currentCondition" rows={4} value={draft.currentCondition} onChange={(event) => set("currentCondition", event.target.value)} maxLength={3000} /></div>
            <div><Label htmlFor={`consult-print-result-${caseId}`}>Kết quả dự tính</Label><Textarea id={`consult-print-result-${caseId}`} name="expectedResult" rows={4} value={draft.expectedResult} onChange={(event) => set("expectedResult", event.target.value)} maxLength={3000} /></div>
            <div><Label htmlFor={`consult-print-indication-${caseId}`}>Chỉ định của bác sĩ</Label><Textarea id={`consult-print-indication-${caseId}`} name="doctorIndication" rows={4} value={draft.doctorIndication} onChange={(event) => set("doctorIndication", event.target.value)} maxLength={3000} /></div>
          </div>
          <div><Label htmlFor={`consult-print-extra-${caseId}`}>Ghi chú bổ sung</Label><Textarea id={`consult-print-extra-${caseId}`} name="extraNote" rows={4} value={draft.extraNote} onChange={(event) => set("extraNote", event.target.value)} maxLength={3000} placeholder="Có thể gõ thêm nội dung cần in trên phiếu…" /></div>
          {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={pending}>Hủy</Button><button type="submit" disabled={pending} className={buttonVariants()}>{pending && <LoaderCircle className="h-4 w-4 animate-spin" />} Lưu nội dung phiếu</button></div>
        </form>
      </Modal>
    </>
  );
}
