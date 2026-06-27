"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PackagePlus, Plus, Trash2, LoaderCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { Combobox } from "@/components/ui/combobox";
import { stockInBatch } from "./actions";

type MaterialOpt = { id: string; name: string; unit: string };

/**
 * Phiếu NHẬP KHO NHIỀU DÒNG (B5): thêm nhiều vật tư + SL + đơn giá trong một lần, gửi
 * trong 1 giao dịch. Dùng onSubmit + preventDefault (KHÔNG dùng prop `action`) để form
 * không bị React 19 reset khi gặp lỗi → giữ nguyên các dòng đã nhập.
 */
export function StockInBatchButton({ materials }: { materials: MaterialOpt[] }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<number[]>([0, 1]);
  const [seq, setSeq] = useState(2);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const options = materials.map((m) => ({ value: m.id, label: m.name, hint: m.unit }));

  function addRow() {
    setRows((r) => [...r, seq]);
    setSeq((s) => s + 1);
  }
  function removeRow(k: number) {
    setRows((r) => (r.length > 1 ? r.filter((x) => x !== k) : r));
  }
  function reset() {
    setRows([0, 1]);
    setSeq(2);
    setError(null);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await stockInBatch(fd);
      if (res?.error) setError(res.error);
      else {
        setOpen(false);
        reset();
        router.refresh();
      }
    });
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <PackagePlus className="h-4 w-4" /> Nhập kho
      </Button>
      <Modal open={open} onClose={() => !pending && setOpen(false)} title="Phiếu nhập kho" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="hidden grid-cols-[1fr_5rem_8rem_2rem] gap-2 px-1 text-xs font-medium text-slate-400 sm:grid">
              <span>Vật tư</span>
              <span className="text-right">Số lượng</span>
              <span className="text-right">Đơn giá nhập</span>
              <span />
            </div>
            {rows.map((k) => (
              <div key={k} className="grid grid-cols-[1fr_5rem_8rem_2rem] items-center gap-2">
                <Combobox name="materialId" options={options} placeholder="— Chọn vật tư —" />
                <Input name="quantity" type="number" min={0} step="any" placeholder="SL" className="text-right" />
                <Input name="unitCost" type="number" min={0} step="any" placeholder="VND/đơn vị" className="text-right" />
                <button
                  type="button"
                  onClick={() => removeRow(k)}
                  className="flex h-9 items-center justify-center rounded-md text-slate-300 hover:bg-rose-50 hover:text-rose-500"
                  title="Xóa dòng"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <button type="button" onClick={addRow} className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700">
            <Plus className="h-4 w-4" /> Thêm dòng
          </button>

          <div>
            <Label htmlFor="si-note">Ghi chú / nhà cung cấp (cho cả phiếu)</Label>
            <Input id="si-note" name="note" placeholder="VD: NCC ABC, hóa đơn 12/06…" />
          </div>

          <p className="text-xs text-slate-400">
            Để trống đơn giá nếu không cập nhật giá vốn. Giá vốn bình quân sẽ được tính lại theo từng dòng có khai báo giá.
          </p>

          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 ring-1 ring-rose-600/10">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Hủy
            </Button>
            <button type="submit" disabled={pending} className={buttonVariants()}>
              {pending && <LoaderCircle className="h-4 w-4 animate-spin" />} Nhập kho
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
