"use client";

import { useState } from "react";
import { Banknote, FileUp, LoaderCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { useFormAction } from "@/lib/use-form-action";
import { deleteCollaboratorDocument, recordCollaboratorPayout, uploadCollaboratorDocument } from "./actions";

export function UploadCollaboratorDocumentButton({ collaboratorId }: { collaboratorId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useFormAction(uploadCollaboratorDocument, () => setOpen(false));

  return (
    <>
      <Button size="sm" variant="subtle" onClick={() => setOpen(true)}>
        <FileUp className="h-4 w-4" /> Tải tài liệu lên
      </Button>
      <Modal open={open} onClose={() => !pending && setOpen(false)} title="Tải tài liệu hồ sơ CTV">
        <form action={action} className="space-y-4">
          <input type="hidden" name="collaboratorId" value={collaboratorId} />
          <div>
            <Label htmlFor="ctv-doc-title">Tên tài liệu *</Label>
            <Input id="ctv-doc-title" name="title" placeholder="VD: Hợp đồng cộng tác, cam kết, ảnh…" required autoFocus />
          </div>
          <div>
            <Label htmlFor="ctv-doc-file">Chọn tệp *</Label>
            <input
              id="ctv-doc-file"
              name="file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,application/pdf,image/*"
              required
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
            />
            <p className="mt-1 text-xs text-slate-400">PDF, ảnh JPG/PNG/WEBP, Word hoặc Excel — tối đa 15MB.</p>
          </div>
          {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={pending}>Hủy</Button>
            <button type="submit" disabled={pending} className={buttonVariants()}>
              {pending && <LoaderCircle className="h-4 w-4 animate-spin" />} {pending ? "Đang tải…" : "Tải lên"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function DeleteCollaboratorDocumentButton({ id, collaboratorId, title }: { id: string; collaboratorId: string; title: string }) {
  return (
    <ConfirmButton
      action={deleteCollaboratorDocument}
      fields={{ id, collaboratorId }}
      confirmText={`Xóa tài liệu “${title}”? File sẽ bị xóa khỏi hồ sơ CTV.`}
      className="rounded-md p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-600"
    >
      <span className="text-xs font-medium">Xóa</span>
    </ConfirmButton>
  );
}

export function RecordCollaboratorPayoutButton({ collaboratorId }: { collaboratorId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useFormAction(recordCollaboratorPayout, () => setOpen(false));
  const [month] = useState(() => new Date().toISOString().slice(0, 7));
  const [paidAt] = useState(() => new Date().toISOString().slice(0, 10));

  return (
    <>
      <Button size="sm" variant="subtle" onClick={() => setOpen(true)}>
        <Banknote className="h-4 w-4" /> Ghi nhận khoản đã chi
      </Button>
      <Modal open={open} onClose={() => !pending && setOpen(false)} title="Ghi nhận chi hoa hồng CTV">
        <form action={action} className="space-y-4">
          <input type="hidden" name="collaboratorId" value={collaboratorId} />
          <div>
            <Label htmlFor="ctv-payout-amount">Số tiền đã chuyển (VNĐ) *</Label>
            <Input id="ctv-payout-amount" name="amount" type="number" min="1" step="1" inputMode="numeric" placeholder="VD: 5000000" required autoFocus />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="ctv-payout-month">Kỳ hoa hồng *</Label>
              <Input id="ctv-payout-month" name="month" type="month" defaultValue={month} required />
            </div>
            <div>
              <Label htmlFor="ctv-payout-paid-at">Ngày chuyển khoản *</Label>
              <Input id="ctv-payout-paid-at" name="paidAt" type="date" defaultValue={paidAt} required />
            </div>
          </div>
          <div>
            <Label htmlFor="ctv-payout-note">Ghi chú</Label>
            <Input id="ctv-payout-note" name="note" placeholder="Ngân hàng, mã giao dịch, nội dung…" />
          </div>
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">Khoản này được lưu đúng số tiền thực chi và không tự tính lại hoa hồng từ hồ sơ.</p>
          {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={pending}>Hủy</Button>
            <button type="submit" disabled={pending} className={buttonVariants()}>
              {pending && <LoaderCircle className="h-4 w-4 animate-spin" />} {pending ? "Đang lưu…" : "Lưu lịch sử chi"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
