"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, LoaderCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { savePayroll } from "./actions";

type Row = { id: string; name: string; role: string; baseFull: number; bonus: number; adjustment: number; nurseCases: number };

export function PayrollEditButton({ row, month }: { row: Row; month: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

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
            <Input id="baseSalary" name="baseSalary" type="number" min={0} step={100000} defaultValue={row.baseFull} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="bonus">Thưởng nóng</Label>
              <Input id="bonus" name="bonus" type="number" min={0} step={50000} defaultValue={row.bonus} />
            </div>
            <div>
              <Label htmlFor="adjustment">Điều chỉnh (+/-)</Label>
              <Input id="adjustment" name="adjustment" type="number" step={50000} defaultValue={row.adjustment} />
            </div>
          </div>
          {row.role === "NURSE" && (
            <div>
              <Label htmlFor="nurseCases">Số ca dịch vụ (×100k)</Label>
              <Input id="nurseCases" name="nurseCases" type="number" min={0} defaultValue={row.nurseCases} />
            </div>
          )}
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
