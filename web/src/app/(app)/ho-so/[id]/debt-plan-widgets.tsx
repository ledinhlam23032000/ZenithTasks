"use client";

import { useState } from "react";
import { CalendarClock, LoaderCircle, Pencil, AlertTriangle, Trash2, CheckCircle2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { useFormAction } from "@/lib/use-form-action";
import { saveDebtPlan, deleteDebtPlan } from "../../cong-no/actions";

export type DebtPlanFormValues = { dayOfMonth: number; monthlyAmount: number; startDate: string; note: string };
export type DebtPlanSummary = { nextDue: string; monthly: string; monthsLeft: string; behind: string | null };

export function DebtPlanCard({
  caseId,
  canManage,
  plan,
  summary,
  settled = false,
  defaultDay,
  todayLocal,
}: {
  caseId: string;
  canManage: boolean;
  plan: DebtPlanFormValues | null;
  summary: DebtPlanSummary | null;
  settled?: boolean; // có kế hoạch nhưng nợ đã về 0 → hoàn thành
  defaultDay: number; // ngày trong tháng hôm nay (gợi ý mặc định)
  todayLocal: string; // yyyy-MM-dd
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useFormAction(saveDebtPlan, () => setOpen(false));

  if (settled) {
    return (
      <div className="mt-3 border-t border-slate-100 pt-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Hẹn nợ (trả góp)</p>
        <div className="mt-2 flex items-center justify-between rounded-lg bg-emerald-50 p-2.5 text-sm">
          <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> Đã tất toán — hoàn thành kế hoạch trả nợ
          </span>
          {canManage && (
            <ConfirmButton
              action={deleteDebtPlan}
              fields={{ caseId }}
              confirmText="Gỡ kế hoạch hẹn nợ đã hoàn thành?"
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-rose-500"
            >
              <Trash2 className="h-3.5 w-3.5" /> Gỡ
            </ConfirmButton>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Hẹn nợ (trả góp)</p>
        {canManage && (
          <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
            {plan ? <Pencil className="h-3.5 w-3.5" /> : <CalendarClock className="h-3.5 w-3.5" />}
            {plan ? "Sửa hẹn nợ" : "Lập hẹn nợ"}
          </button>
        )}
      </div>

      {plan && summary ? (
        <div className="mt-2 space-y-1.5 rounded-lg bg-slate-50 p-2.5 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Mỗi tháng</span>
            <span className="font-semibold text-slate-800">{summary.monthly}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Ngày trả</span>
            <span className="font-medium text-slate-700">Ngày {plan.dayOfMonth} hằng tháng</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Kỳ tới</span>
            <span className="font-medium text-slate-700">{summary.nextDue}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Dự kiến hết nợ</span>
            <span className="font-medium text-slate-700">{summary.monthsLeft}</span>
          </div>
          {summary.behind && (
            <div className="mt-1 inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-1 text-xs font-medium text-rose-600">
              <AlertTriangle className="h-3.5 w-3.5" /> Đang chậm so với hẹn: {summary.behind}
            </div>
          )}
          {canManage && (
            <div className="pt-1">
              <ConfirmButton
                action={deleteDebtPlan}
                fields={{ caseId }}
                confirmText="Hủy kế hoạch hẹn nợ này?"
                className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-rose-500"
              >
                <Trash2 className="h-3.5 w-3.5" /> Hủy hẹn nợ
              </ConfirmButton>
            </div>
          )}
        </div>
      ) : (
        <p className="mt-2 text-sm text-slate-400">{canManage ? "Chưa có hẹn nợ — bấm \"Lập hẹn nợ\" để đặt lịch trả góp." : "Chưa có hẹn nợ."}</p>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={plan ? "Sửa hẹn nợ" : "Lập hẹn nợ (trả góp)"}>
        <form action={action} className="space-y-4">
          <input type="hidden" name="caseId" value={caseId} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="dp-day">Ngày trả hằng tháng *</Label>
              <Input id="dp-day" name="dayOfMonth" type="number" min={1} max={31} defaultValue={plan?.dayOfMonth ?? defaultDay} required />
              <p className="mt-1 text-xs text-slate-400">1–31 · tháng thiếu ngày tự lùi về cuối tháng</p>
            </div>
            <div>
              <Label htmlFor="dp-amount">Mỗi tháng trả (VND) *</Label>
              <MoneyInput id="dp-amount" name="monthlyAmount" defaultValue={plan?.monthlyAmount ?? 0} required />
            </div>
          </div>
          <div>
            <Label htmlFor="dp-start">Bắt đầu từ</Label>
            <Input id="dp-start" name="startDate" type="date" defaultValue={plan?.startDate ?? todayLocal} />
          </div>
          <div>
            <Label htmlFor="dp-note">Ghi chú</Label>
            <Input id="dp-note" name="note" defaultValue={plan?.note ?? ""} placeholder="VD: khách cam kết trả sau lương…" />
          </div>
          {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Hủy</Button>
            <button type="submit" disabled={pending} className={buttonVariants()}>
              {pending && <LoaderCircle className="h-4 w-4 animate-spin" />} Lưu hẹn nợ
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
