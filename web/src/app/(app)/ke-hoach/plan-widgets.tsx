"use client";

import { useState } from "react";
import { Plus, Pencil, LoaderCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";
import { useFormAction } from "@/lib/use-form-action";
import { createPlan, updatePlan } from "./actions";

export type PlanValues = { id: string; title: string; note: string };

function PlanForm({ plan, onDone }: { plan?: PlanValues; onDone: () => void }) {
  const isEdit = !!plan;
  const [state, action, pending] = useFormAction(isEdit ? updatePlan : createPlan, onDone);

  return (
    <form action={action} className="space-y-4">
      {isEdit && <input type="hidden" name="id" value={plan.id} />}
      <div>
        <Label htmlFor="plan-title">Tên kế hoạch *</Label>
        <Input id="plan-title" name="title" defaultValue={plan?.title ?? ""} placeholder="VD: Chuẩn bị khai trương chi nhánh 2" required autoFocus />
      </div>
      <div>
        <Label htmlFor="plan-note">Ghi chú tổng quan</Label>
        <Textarea id="plan-note" name="note" defaultValue={plan?.note ?? ""} placeholder="Mục tiêu, bối cảnh, lưu ý chung cho cả kế hoạch…" />
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

export function AddPlanButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Kế hoạch mới
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Kế hoạch mới">
        <PlanForm onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}

export function EditPlanButton({ plan }: { plan: PlanValues }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
      >
        <Pencil className="h-3.5 w-3.5" /> Sửa
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Sửa kế hoạch">
        <PlanForm plan={plan} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}
