"use client";

import { useMemo, useState } from "react";
import { LoaderCircle, Plus, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useFormAction } from "@/lib/use-form-action";
import { saveCaseRevenueAllocations } from "../actions";
import { formatVND } from "@/lib/money";

type Person = { id: string; fullName: string };
type Allocation = { userId: string; role: "CONSULTANT" | "DOCTOR" | "NURSE" | "OTHER"; shareBps: number; note?: string | null };

const ROLE_LABEL: Record<Allocation["role"], string> = { CONSULTANT: "Tư vấn", DOCTOR: "Bác sĩ", NURSE: "Điều dưỡng", OTHER: "Phối hợp khác" };

export function RevenueAllocationEditor({ caseId, people, totalRevenue, initial }: { caseId: string; people: Person[]; totalRevenue: number; initial: Allocation[] }) {
  const [rows, setRows] = useState<Allocation[]>(initial);
  const [state, action, pending] = useFormAction(saveCaseRevenueAllocations);
  const totalBps = useMemo(() => rows.reduce((sum, row) => sum + Math.max(0, Math.round(row.shareBps)), 0), [rows]);
  const totalPercent = totalBps / 100;

  function addRow() {
    const first = people.find((person) => !rows.some((row) => row.userId === person.id));
    if (!first) return;
    setRows((current) => [...current, { userId: first.id, role: "CONSULTANT", shareBps: Math.max(0, 10_000 - totalBps) }]);
  }

  function updateRow(index: number, patch: Partial<Allocation>) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeRow(index: number) {
    setRows((current) => current.filter((_, i) => i !== index));
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="caseId" value={caseId} />
      <input type="hidden" name="allocations" value={JSON.stringify(rows)} />
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><p className="text-sm font-semibold text-slate-800">Phân bổ doanh số phối hợp</p><p className="text-xs text-slate-500">Doanh thu hồ sơ: <b>{formatVND(totalRevenue)}</b> · tổng tỷ lệ phải đủ 100%</p></div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${totalBps === 10_000 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{totalPercent.toFixed(2)}%</span>
        </div>
        <div className="mt-3 space-y-2">
          {rows.length === 0 && <p className="rounded-lg border border-dashed border-slate-200 bg-white p-3 text-xs text-slate-500">Chưa có cấu hình phối hợp. Thêm người để chia doanh số; nếu không thêm, hệ thống dùng quy tắc cũ.</p>}
          {rows.map((row, index) => (
            <div key={`${row.userId}-${row.role}-${index}`} className="grid gap-2 rounded-lg border border-slate-200 bg-white p-2 sm:grid-cols-[minmax(0,1fr)_8rem_7rem_auto]">
              <select value={row.userId} onChange={(event) => updateRow(index, { userId: event.target.value })} className="h-9 min-w-0 rounded-md border border-slate-200 px-2 text-sm outline-none focus:border-brand-500">
                {people.map((person) => <option key={person.id} value={person.id}>{person.fullName}</option>)}
              </select>
              <select value={row.role} onChange={(event) => updateRow(index, { role: event.target.value as Allocation["role"] })} className="h-9 rounded-md border border-slate-200 px-2 text-sm outline-none focus:border-brand-500">
                {Object.entries(ROLE_LABEL).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
              <div className="relative"><input type="number" min={0.01} max={100} step={0.01} value={row.shareBps / 100} onChange={(event) => updateRow(index, { shareBps: Math.round(Number(event.target.value || 0) * 100) })} className="h-9 w-full rounded-md border border-slate-200 px-2 pr-7 text-right text-sm outline-none focus:border-brand-500" /><span className="pointer-events-none absolute right-2 top-2 text-xs text-slate-400">%</span></div>
              <button type="button" onClick={() => removeRow(index)} className="inline-flex h-9 items-center justify-center rounded-md px-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Xóa người phối hợp"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <button type="button" onClick={addRow} disabled={people.length <= rows.length} className={buttonVariants({ variant: "secondary", size: "sm" })}><Plus className="h-4 w-4" /> Thêm người phối hợp</button>
          <div className="flex items-center gap-2"><span className="text-xs text-slate-400">Tạm tính phần này: {formatVND(Math.round(totalRevenue * totalBps / 10_000))}</span><Button type="submit" size="sm" disabled={pending || totalBps !== 10_000 || rows.length === 0}>{pending && <LoaderCircle className="h-4 w-4 animate-spin" />} Lưu phân bổ</Button></div>
        </div>
      </div>
      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      {state.nonce && <p className="text-xs font-medium text-emerald-600">Đã lưu phân bổ doanh số.</p>}
    </form>
  );
}
