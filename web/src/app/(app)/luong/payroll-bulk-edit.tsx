"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Rows3, LoaderCircle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { useToast } from "@/components/ui/toast";
import { saveBulkPayroll } from "./actions";

type Row = {
  id: string;
  name: string;
  commission: number;
  commissionOverride: number;
  bonus: number;
  adjustment: number;
  hasEntry: boolean;
  prevCommission: number;
  prevBonus: number;
  prevAdjustment: number;
};
type Values = Record<string, { commissionOverride: number; bonus: number; adjustment: number }>;

/** Sửa nhanh hoa hồng/thưởng/điều chỉnh cho cả bảng cùng lúc — lưu 1 lần, không cần mở modal riêng từng người. */
export function PayrollBulkEditor({ rows, month }: { rows: Row[]; month: string }) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Values>({});
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function openEditor() {
    const init: Values = {};
    for (const r of rows) {
      init[r.id] = {
        commissionOverride: r.hasEntry ? r.commissionOverride : 0,
        bonus: r.hasEntry ? r.bonus : r.prevBonus,
        adjustment: r.hasEntry ? r.adjustment : r.prevAdjustment,
      };
    }
    setValues(init);
    setOpen(true);
  }

  function update(id: string, field: keyof Values[string], v: number) {
    setValues((prev) => ({ ...prev, [id]: { ...prev[id], [field]: v } }));
  }

  function save() {
    const payload = rows.map((r) => ({ id: r.id, ...values[r.id] }));
    const fd = new FormData();
    fd.set("month", month);
    fd.set("rows", JSON.stringify(payload));
    start(async () => {
      const r = await saveBulkPayroll({}, fd);
      if (r.error) {
        toast(r.error, "error");
        return;
      }
      toast("Đã lưu lương cả bảng");
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button variant="secondary" onClick={openEditor}>
        <Rows3 className="h-4 w-4" /> Sửa nhanh cả bảng
      </Button>
    );
  }

  return (
    <div className="animate-fade-in rounded-2xl border border-brand-200 bg-brand-50/40 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-700">Sửa nhanh điều chỉnh hoa hồng / thưởng / điều chỉnh — {rows.length} nhân sự</p>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)} disabled={pending}>
            Hủy
          </Button>
          <button type="button" onClick={save} disabled={pending} className={buttonVariants({ size: "sm" })}>
            {pending && <LoaderCircle className="h-4 w-4 animate-spin" />} Lưu tất cả
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
              <th className="pb-2 pr-3">Nhân viên</th>
              <th className="pb-2 pr-3 text-right">ĐC hoa hồng</th>
              <th className="pb-2 pr-3 text-right">Thưởng nóng</th>
              <th className="pb-2 text-right">Điều chỉnh</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const v = values[r.id] ?? { commissionOverride: 0, bonus: 0, adjustment: 0 };
              const carried = !r.hasEntry && (r.prevCommission > 0 || r.prevBonus > 0 || r.prevAdjustment !== 0);
              return (
                <tr key={r.id} className="border-t border-brand-100/80">
                  <td className="py-1.5 pr-3 font-medium text-slate-700">
                    {r.name}
                    {carried && <span className="ml-1.5 text-[10px] font-normal text-amber-600">(mốc tháng trước)</span>}
                  </td>
                  <td className="w-36 py-1.5 pr-3">
                    <MoneyInput value={v.commissionOverride} onValueChange={(n) => update(r.id, "commissionOverride", n)} />
                  </td>
                  <td className="w-36 py-1.5 pr-3">
                    <MoneyInput value={v.bonus} onValueChange={(n) => update(r.id, "bonus", n)} />
                  </td>
                  <td className="w-32 py-1.5">
                    <Input
                      type="number"
                      step={50000}
                      value={v.adjustment}
                      onChange={(e) => update(r.id, "adjustment", Number(e.target.value) || 0)}
                      className="text-right"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
