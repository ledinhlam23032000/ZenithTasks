"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, LoaderCircle, Pencil, ShieldCheck } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Label, Select, Textarea, FieldHint } from "@/components/ui/field";
import { useFormAction } from "@/lib/use-form-action";
import { useToast } from "@/components/ui/toast";
import { SOURCE_LABEL } from "@/lib/status";
import { LEAD_STATUSES, LEAD_STATUS_LABEL } from "@/lib/leads";
import { createLead, updateLead, setLeadStatus } from "./actions";

export type LeadValues = {
  id: string;
  fullName: string;
  phone: string; // luôn rỗng khi sửa (SĐT đã mã hoá, không hiển thị lại)
  source: string;
  sourceDetail: string;
  serviceInterest: string;
  note: string;
  status: string;
  hasPhone: boolean;
};

export function AddLeadButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" /> Thêm khách tham khảo
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Thêm khách tham khảo" description="Khách từ nguồn giới thiệu, chưa hẹn / chưa đến." size="lg">
        <LeadForm mode="create" onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}

export function EditLeadButton({ lead }: { lead: LeadValues }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title="Sửa" className="text-slate-400 hover:text-brand-600">
        <Pencil className="h-4 w-4" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Sửa khách tham khảo" size="lg">
        <LeadForm mode="edit" lead={lead} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}

function LeadForm({ mode, lead, onDone }: { mode: "create" | "edit"; lead?: LeadValues; onDone: () => void }) {
  const [state, action, pending] = useFormAction(mode === "create" ? createLead : updateLead, onDone);

  return (
    <form action={action} className="space-y-4">
      {mode === "edit" && lead && <input type="hidden" name="id" value={lead.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="l-name">Họ và tên *</Label>
          <Input id="l-name" name="fullName" defaultValue={lead?.fullName ?? ""} placeholder="Nguyễn Thị A" required autoFocus />
        </div>
        <div>
          <Label htmlFor="l-phone">Số điện thoại {mode === "edit" && lead?.hasPhone ? "(đã có — để trống nếu giữ nguyên)" : "(nếu có)"}</Label>
          <Input id="l-phone" name="phone" inputMode="tel" placeholder="09xx xxx xxx" />
          <FieldHint>
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Mã hoá AES-256; cần SĐT để chuyển thành khách.
            </span>
          </FieldHint>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="l-source">Nguồn giới thiệu</Label>
          <Select id="l-source" name="source" defaultValue={lead?.source ?? "REFERRAL"}>
            {Object.entries(SOURCE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="l-source-detail">Chi tiết nguồn</Label>
          <Input id="l-source-detail" name="sourceDetail" defaultValue={lead?.sourceDetail ?? ""} placeholder="VD: CTV Ngọc Hân, page FB…" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="l-service">Dịch vụ quan tâm</Label>
          <Input id="l-service" name="serviceInterest" defaultValue={lead?.serviceInterest ?? ""} placeholder="VD: nâng mũi, tiêm filler…" />
        </div>
        {mode === "edit" && (
          <div>
            <Label htmlFor="l-status">Trạng thái</Label>
            <Select id="l-status" name="status" defaultValue={lead?.status ?? "NEW"}>
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>{LEAD_STATUS_LABEL[s]}</option>
              ))}
            </Select>
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="l-note">Ghi chú</Label>
        <Textarea id="l-note" name="note" defaultValue={lead?.note ?? ""} placeholder="Mong muốn, ngân sách, lý do tham khảo…" />
      </div>

      {state.error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 ring-1 ring-rose-600/10">{state.error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onDone}>Hủy</Button>
        <button type="submit" disabled={pending} className={buttonVariants()}>
          {pending && <LoaderCircle className="h-4 w-4 animate-spin" />} {pending ? "Đang lưu…" : "Lưu"}
        </button>
      </div>
    </form>
  );
}

/** Đổi nhanh trạng thái ngay trên danh sách (tự gửi khi chọn). */
export function LeadStatusSelect({ id, status }: { id: string; status: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function onChange(next: string) {
    const fd = new FormData();
    fd.append("id", id);
    fd.append("status", next);
    startTransition(async () => {
      try {
        await setLeadStatus(fd);
        toast("Đã lưu");
        router.refresh();
      } catch {
        toast("Lỗi mạng, thử lại", "error");
      }
    });
  }

  return (
    <select
      name="status"
      defaultValue={status}
      disabled={pending}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs focus:border-brand-400 focus:outline-none disabled:opacity-60"
    >
      {LEAD_STATUSES.map((s) => (
        <option key={s} value={s}>{LEAD_STATUS_LABEL[s]}</option>
      ))}
    </select>
  );
}
