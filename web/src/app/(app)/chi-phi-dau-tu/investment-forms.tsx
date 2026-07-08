"use client";

import { useState } from "react";
import { Plus, Pencil, LoaderCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { PAYMENT_LABEL } from "@/lib/status";
import { useFormAction } from "@/lib/use-form-action";
import { createCashTransaction, updateCashTransaction } from "../thu-chi/actions";

export type InvestmentTx = {
  id: string;
  amount: number;
  occurredAt: string; // yyyy-MM-dd
  method: string;
  vendor: string;
  note: string;
};

/** Form riêng cho Chi phí đầu tư — khoá sẵn type=EXPENSE + category=INVESTMENT (dùng chung action với Sổ thu chi). */
function InvestmentForm({ tx, defaultDate, onDone }: { tx?: InvestmentTx; defaultDate: string; onDone: () => void }) {
  const isEdit = !!tx;
  const [state, action, pending] = useFormAction(isEdit ? updateCashTransaction : createCashTransaction, onDone);

  return (
    <form action={action} className="space-y-4">
      {isEdit && <input type="hidden" name="id" value={tx.id} />}
      <input type="hidden" name="type" value="EXPENSE" />
      <input type="hidden" name="category" value="INVESTMENT" />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="inv-amount">Số tiền (VND) *</Label>
          <MoneyInput id="inv-amount" name="amount" defaultValue={tx?.amount ?? 0} required autoFocus />
        </div>
        <div>
          <Label htmlFor="inv-date">Ngày *</Label>
          <Input id="inv-date" name="occurredAt" type="date" defaultValue={tx?.occurredAt ?? defaultDate} required />
        </div>
      </div>

      <div>
        <Label htmlFor="inv-vendor">Khoản đầu tư / nhà cung cấp</Label>
        <Input id="inv-vendor" name="vendor" defaultValue={tx?.vendor ?? ""} placeholder="VD: Máy laser CO2, cải tạo phòng mổ 2…" />
      </div>

      <div>
        <Label htmlFor="inv-method">Hình thức</Label>
        <Select id="inv-method" name="method" defaultValue={tx?.method ?? "TRANSFER"}>
          {Object.entries(PAYMENT_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="inv-note">Ghi chú</Label>
        <Textarea id="inv-note" name="note" defaultValue={tx?.note ?? ""} placeholder="Lý do đầu tư, thời hạn bảo hành, ghi chú khác…" />
      </div>

      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onDone}>Hủy</Button>
        <button type="submit" disabled={pending} className={buttonVariants()}>
          {pending && <LoaderCircle className="h-4 w-4 animate-spin" />} {isEdit ? "Lưu thay đổi" : "Lưu"}
        </button>
      </div>
    </form>
  );
}

export function NewInvestmentButton({ defaultDate }: { defaultDate: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Thêm khoản đầu tư
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Ghi nhận chi phí đầu tư" size="lg">
        <InvestmentForm defaultDate={defaultDate} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}

export function EditInvestmentButton({ tx }: { tx: InvestmentTx }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded-md p-1.5 text-slate-300 hover:bg-brand-50 hover:text-brand-600" title="Sửa">
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Sửa khoản đầu tư" size="lg">
        <InvestmentForm tx={tx} defaultDate={tx.occurredAt} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}
