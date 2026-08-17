"use client";

import { useState } from "react";
import { FilePlus2, LoaderCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";
import { Combobox } from "@/components/ui/combobox";
import { useFormAction } from "@/lib/use-form-action";
import { fillConsentTemplate } from "@/lib/consent";
import { addConsent } from "../consent-actions";

type Template = { id: string; title: string; body: string };

export function AddConsentButton({
  caseId,
  customerName,
  caseCode,
  services,
  templates,
  todayLocal,
}: {
  caseId: string;
  customerName: string;
  caseCode: string;
  services: string;
  templates: Template[];
  todayLocal: string; // yyyy-MM-dd
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useFormAction(addConsent, () => setOpen(false));
  const [templateId, setTemplateId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const todayDisplay = todayLocal.split("-").reverse().join("/"); // dd/MM/yyyy

  function choose(id: string) {
    setTemplateId(id);
    const t = templates.find((x) => x.id === id);
    if (t) {
      setTitle(t.title);
      setBody(fillConsentTemplate(t.body, { customerName, date: todayDisplay, services, caseCode }));
    }
  }

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <FilePlus2 className="h-4 w-4" /> Ghi nhận đồng ý
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Ghi nhận phiếu đồng ý" size="lg">
        <form action={action} className="space-y-4">
          <input type="hidden" name="caseId" value={caseId} />
          <input type="hidden" name="templateId" value={templateId} />

          <div>
            <Label>Chọn mẫu phiếu</Label>
            <Combobox
              value={templateId}
              onChange={choose}
              options={templates.map((t) => ({ value: t.id, label: t.title }))}
              placeholder={templates.length ? "— Chọn mẫu để điền nhanh —" : "Chưa có mẫu phiếu (vào Mẫu phiếu đồng ý để tạo)"}
            />
          </div>

          <div>
            <Label htmlFor="c-title">Tên phiếu *</Label>
            <Input id="c-title" name="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="c-body">Nội dung *</Label>
            <Textarea id="c-body" name="body" value={body} onChange={(e) => setBody(e.target.value)} rows={8} required />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="c-signer">Người ký *</Label>
              <Input id="c-signer" name="signerName" defaultValue={customerName} required />
            </div>
            <div>
              <Label htmlFor="c-rel">Quan hệ (nếu giám hộ)</Label>
              <Input id="c-rel" name="relationship" placeholder="VD: Mẹ, Vợ…" />
            </div>
            <div>
              <Label htmlFor="c-date">Ngày ký</Label>
              <Input id="c-date" name="signedAt" type="date" defaultValue={todayLocal} />
            </div>
          </div>
          <div>
            <Label htmlFor="c-note">Ghi chú</Label>
            <Input id="c-note" name="note" placeholder="VD: đã ký bản giấy, lưu hồ sơ…" />
          </div>

          {state.error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 ring-1 ring-rose-600/10">{state.error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Hủy</Button>
            <button type="submit" disabled={pending} className={buttonVariants()}>
              {pending && <LoaderCircle className="h-4 w-4 animate-spin" />} Lưu phiếu
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
