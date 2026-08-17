"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, LoaderCircle, Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { formatVND } from "@/lib/money";
import { savePayroll } from "./actions";

type Row = {
  id: string;
  name: string;
  role: string;
  baseFull: number;
  commission: number;
  commissionOverride: number;
  bonus: number;
  adjustment: number;
  hasEntry: boolean;
  prevCommission: number;
  prevBonus: number;
  prevAdjustment: number;
};

export function PayrollEditButton({
  row,
  month,
  suggested = 0,
  suggestedNote = "",
}: {
  row: Row;
  month: string;
  /** Hoa hồng hệ thống TỰ TÍNH theo tiền thực thu — chỉ hiển thị, không ghi đè bằng tay. */
  suggested?: number;
  suggestedNote?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  // Chưa có PayrollEntry tháng này → mang số tháng trước sang làm mốc để sửa, thay vì gõ từ 0.
  const carried = !row.hasEntry && (row.prevCommission > 0 || row.prevBonus > 0 || row.prevAdjustment !== 0);
  const commissionDefault = row.hasEntry ? row.commissionOverride : 0;
  const bonusDefault = row.hasEntry ? row.bonus : row.prevBonus;
  const adjustmentDefault = row.hasEntry ? row.adjustment : row.prevAdjustment;
  const [commissionOverride, setCommissionOverride] = useState(commissionDefault);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      await savePayroll(fd);
      router.refresh();
      setOpen(false);
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50"
      >
        <Pencil className="h-3.5 w-3.5" /> Sửa
      </button>
      <Modal open={open} onClose={() => !pending && setOpen(false)} title={`Lương — ${row.name}`} size="sm">
        <form onSubmit={onSubmit} className="space-y-4">
          <input type="hidden" name="id" value={row.id} />
          <input type="hidden" name="month" value={month} />
          <div>
            <Label htmlFor="baseSalary">Lương cứng (VND / tháng)</Label>
            <MoneyInput id="baseSalary" name="baseSalary" defaultValue={row.baseFull} />
          </div>
          {carried && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 ring-1 ring-amber-600/10">
              Chưa nhập lương tháng này — đã tự điền số của tháng trước làm mốc, sửa lại nếu cần.
            </p>
          )}
          <div className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700 ring-1 ring-brand-600/10">
            <span className="inline-flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" /> Hoa hồng tự động theo thực thu: <strong>{formatVND(suggested)}</strong></span>
            {suggestedNote && <p className="mt-1 text-[11px] text-brand-600">{suggestedNote}</p>}
          </div>
          <div>
            <Label htmlFor="commissionOverride">Điều chỉnh hoa hồng ngoài công thức</Label>
            <MoneyInput id="commissionOverride" name="commissionOverride" value={commissionOverride} onValueChange={setCommissionOverride} />
            <p className="mt-1 text-[11px] text-slate-500">Chỉ nhập khoản cộng thêm đặc biệt; không nhập lại số tự động ở trên.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="bonus">Thưởng nóng</Label>
              <MoneyInput id="bonus" name="bonus" defaultValue={bonusDefault} />
            </div>
            <div>
              <Label htmlFor="adjustment">Điều chỉnh (+/-)</Label>
              <Input id="adjustment" name="adjustment" type="number" step={50000} defaultValue={adjustmentDefault} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Hủy
            </Button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {pending && <LoaderCircle className="h-4 w-4 animate-spin" />} Lưu
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
