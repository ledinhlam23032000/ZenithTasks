"use client";

import { useState } from "react";
import { Plus, Pencil, LoaderCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Label, Textarea, FieldHint } from "@/components/ui/field";
import { useFormAction } from "@/lib/use-form-action";
import { CONSENT_PLACEHOLDERS } from "@/lib/consent";
import { createTemplate, updateTemplate } from "./actions";

const HINT = `Có thể chèn: ${CONSENT_PLACEHOLDERS.join(" ")} (sẽ tự thay tên khách / ngày / dịch vụ / mã hồ sơ khi ghi nhận).`;

function TemplateFields({ initial }: { initial?: { title: string; body: string } }) {
  return (
    <>
      <div>
        <Label htmlFor="t-title">Tên phiếu *</Label>
        <Input id="t-title" name="title" defaultValue={initial?.title ?? ""} placeholder="VD: Phiếu đồng ý phẫu thuật thẩm mỹ" required autoFocus />
      </div>
      <div>
        <Label htmlFor="t-body">Nội dung *</Label>
        <Textarea id="t-body" name="body" defaultValue={initial?.body ?? ""} rows={10} required />
        <FieldHint>{HINT}</FieldHint>
      </div>
    </>
  );
}

export function NewTemplateButton() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useFormAction(createTemplate, () => setOpen(false));
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Thêm mẫu phiếu
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Thêm mẫu phiếu" size="lg">
        <form action={action} className="space-y-4">
          <TemplateFields />
          {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Hủy</Button>
            <button type="submit" disabled={pending} className={buttonVariants()}>
              {pending && <LoaderCircle className="h-4 w-4 animate-spin" />} Lưu
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function EditTemplateButton({ template }: { template: { id: string; title: string; body: string } }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useFormAction(updateTemplate, () => setOpen(false));
  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100" title="Sửa">
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Sửa mẫu phiếu" size="lg">
        <form action={action} className="space-y-4">
          <input type="hidden" name="id" value={template.id} />
          <TemplateFields initial={{ title: template.title, body: template.body }} />
          {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Hủy</Button>
            <button type="submit" disabled={pending} className={buttonVariants()}>
              {pending && <LoaderCircle className="h-4 w-4 animate-spin" />} Lưu
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
