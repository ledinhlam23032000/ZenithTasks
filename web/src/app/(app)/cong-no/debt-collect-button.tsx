"use client";

import { useState } from "react";
import { HandCoins, LoaderCircle, CheckCircle2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { useFormAction } from "@/lib/use-form-action";
import { formatVND } from "@/lib/money";
import { PAYMENT_LABEL } from "@/lib/status";
import { addPayment } from "../ho-so/actions";

/**
 * Thu nợ ngay tại Sổ công nợ — không phải mở hồ sơ.
 * Mặc định điền đủ số nợ còn lại: bấm xác nhận là TẤT TOÁN (nợ về 0, hồ sơ rời khỏi sổ).
 * Có thể sửa số tiền để thu một phần (trả góp theo hẹn nợ).
 */
export function DebtCollectButton({
  caseId,
  caseCode,
  customerName,
  debt,
}: {
  caseId: string;
  caseCode: string;
  customerName: string;
  debt: number;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(debt);
  const [state, action, pending] = useFormAction(addPayment, () => setOpen(false));
  const isFull = amount >= debt;

  return (
    <>
      <Button size="sm" variant="subtle" onClick={() => { setAmount(debt); setOpen(true); }}>
        <HandCoins className="h-4 w-4" /> Thu nợ
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Thu nợ — ${caseCode} · ${customerName}`}>
        <form action={action} className="space-y-4">
          <input type="hidden" name="caseId" value={caseId} />
          <div>
            <Label htmlFor="debt-amount">Số tiền thu (VND) *</Label>
            <MoneyInput id="debt-amount" name="amount" value={amount} onValueChange={setAmount} required autoFocus />
            <p className="mt-1 text-xs text-slate-400">Công nợ còn lại: {formatVND(debt)}</p>
            {isFull ? (
              <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> Thu đủ — hồ sơ sẽ TẤT TOÁN (hết nợ)
              </p>
            ) : (
              <p className="mt-1 text-xs text-amber-600">Thu một phần — còn lại {formatVND(Math.max(debt - amount, 0))}</p>
            )}
          </div>
          <div>
            <Label htmlFor="debt-method">Hình thức</Label>
            <Select id="debt-method" name="method" defaultValue="CASH">
              {Object.entries(PAYMENT_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="debt-note">Ghi chú</Label>
            <Input id="debt-note" name="note" placeholder="VD: khách trả nợ kỳ tháng này…" />
          </div>
          {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Hủy</Button>
            <button type="submit" disabled={pending || amount <= 0} className={buttonVariants()}>
              {pending && <LoaderCircle className="h-4 w-4 animate-spin" />} {isFull ? "Thu đủ & tất toán" : "Xác nhận thu"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
