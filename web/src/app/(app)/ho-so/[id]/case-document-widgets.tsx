"use client";

import { useState, type ReactNode } from "react";
import { FileUp, LoaderCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { useFormAction } from "@/lib/use-form-action";
import { uploadCaseDocument } from "../actions";

/**
 * Tải FILE giấy tờ hành chính lên hồ sơ (PDF/ảnh/Word/Excel) — thay cho gõ tay.
 * Sau khi tải xong xem lại bằng nút "Xem" (mở /media/<tệp>, có kiểm đăng nhập).
 */
export function UploadDocumentButton({ caseId, trigger }: { caseId: string; trigger?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useFormAction(uploadCaseDocument, () => setOpen(false));
  return (
    <>
      {trigger ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
        >
          {trigger}
        </button>
      ) : (
        <Button size="sm" variant="subtle" onClick={() => setOpen(true)}>
          <FileUp className="h-4 w-4" /> Tải giấy tờ lên
        </Button>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Tải tài liệu vào Hồ sơ dịch vụ thẩm mỹ">
        <form action={action} className="space-y-4">
          <input type="hidden" name="caseId" value={caseId} />
          <div>
            <Label htmlFor="doc-title">Tên giấy tờ *</Label>
            <Input id="doc-title" name="title" placeholder="VD: Kết quả xét nghiệm, CMND/CCCD, giấy đồng ý…" required autoFocus />
          </div>
          <div>
            <Label htmlFor="doc-file">Chọn tệp *</Label>
            <input
              id="doc-file"
              name="file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,application/pdf,image/*"
              required
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
            />
            <p className="mt-1 text-xs text-slate-400">Hỗ trợ PDF, ảnh (JPG/PNG), Word, Excel — tối đa 15MB. Tải tài liệu đã soạn/đã ký sẵn vào hồ sơ.</p>
          </div>
          {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Hủy</Button>
            <button type="submit" disabled={pending} className={buttonVariants()}>
              {pending && <LoaderCircle className="h-4 w-4 animate-spin" />} {pending ? "Đang tải…" : "Tải lên"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
