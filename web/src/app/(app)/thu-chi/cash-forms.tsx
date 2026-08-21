"use client";

import { useState } from "react";
import { Plus, Pencil, LoaderCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { Combobox } from "@/components/ui/combobox";
import { MoneyInput } from "@/components/ui/money-input";
import { PAYMENT_LABEL } from "@/lib/status";
import { categoriesFor } from "@/lib/finance";
import { useFormAction } from "@/lib/use-form-action";
import { createCashTransaction, updateCashTransaction } from "./actions";

export type CashTx = {
  id: string;
  type: "INCOME" | "EXPENSE";
  category: string;
  amount: number;
  occurredAt: string; // yyyy-MM-dd
  method: string;
  vendor: string;
  note: string;
};

function CashForm({ tx, defaultDate, onDone }: { tx?: CashTx; defaultDate: string; onDone: () => void }) {
  const isEdit = !!tx;
  const [state, action, pending] = useFormAction(
    isEdit ? updateCashTransaction : createCashTransaction,
    onDone,
  );
  const [type, setType] = useState<"INCOME" | "EXPENSE">(tx?.type ?? "EXPENSE");
  const [category, setCategory] = useState(tx?.category ?? "");
  const cats = categoriesFor(type);

  return (
    <form action={action} className="space-y-4">
      {isEdit && <input type="hidden" name="id" value={tx.id} />}
      <input type="hidden" name="type" value={type} />

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => { setType("EXPENSE"); setCategory(""); }}
          className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${type === "EXPENSE" ? "border-rose-300 bg-rose-50 text-rose-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
        >
          − Chi tiền
        </button>
        <button
          type="button"
          onClick={() => { setType("INCOME"); setCategory(""); }}
          className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${type === "INCOME" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
        >
          + Thu tiền
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Hạng mục * (gõ để tìm)</Label>
          <Combobox
            name="category"
            value={category}
            onChange={setCategory}
            placeholder="— Chọn hạng mục —"
            options={cats.map((c) => ({ value: c.code, label: c.label }))}
          />
        </div>
        <div>
          <Label htmlFor="cf-amount">Số tiền (VND) *</Label>
          <MoneyInput id="cf-amount" name="amount" defaultValue={tx?.amount ?? 0} required />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="cf-date">Ngày *</Label>
          <Input id="cf-date" name="occurredAt" type="date" defaultValue={tx?.occurredAt ?? defaultDate} required />
        </div>
        <div>
          <Label htmlFor="cf-method">Hình thức</Label>
          <Select id="cf-method" name="method" defaultValue={tx?.method ?? "CASH"}>
            {Object.entries(PAYMENT_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="cf-vendor">Nhà cung cấp / nguồn</Label>
        <Input id="cf-vendor" name="vendor" defaultValue={tx?.vendor ?? ""} placeholder="VD: Cửa hàng hoa quả, đại lý filler…" />
      </div>
      <div>
        <Label htmlFor="cf-note">Ghi chú</Label>
        <Textarea id="cf-note" name="note" defaultValue={tx?.note ?? ""} placeholder="Diễn giải chi tiết…" />
      </div>

      {!isEdit && type === "EXPENSE" && (
        <div className="rounded-lg border border-brand-200 bg-brand-50/60 px-3 py-2.5 text-sm text-slate-700">
          <p className="font-medium text-brand-800">Tự động tạo Giấy đề nghị thanh toán</p>
          <p className="mt-0.5 text-xs text-slate-600">Sau khi lưu, hệ thống ghi một dòng Chi và sinh ngay phiếu liên kết để Kế toán xem, duyệt và in ký. Bạn không cần nhập lại thông tin.</p>
        </div>
      )}

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

export function NewCashButton({ defaultDate }: { defaultDate: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Thêm thu / chi
      </Button>
        <Modal open={open} onClose={() => setOpen(false)} title="Ghi nhận thu / chi" size="lg">
        <CashForm defaultDate={defaultDate} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}

export function EditCashButton({ tx }: { tx: CashTx }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded-md p-1.5 text-slate-300 hover:bg-brand-50 hover:text-brand-600" title="Sửa">
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Sửa giao dịch" size="lg">
        <CashForm tx={tx} defaultDate={tx.occurredAt} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}
