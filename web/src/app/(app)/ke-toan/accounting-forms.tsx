"use client";

import { useState, type ReactNode } from "react";
import { Banknote, LoaderCircle, Lock, LockOpen, Undo2, Wallet } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { PAYMENT_LABEL } from "@/lib/status";
import { formatVND } from "@/lib/money";
import { useFormAction } from "@/lib/use-form-action";
import {
  payStaffSalary,
  payAllSalaries,
  undoStaffSalary,
  payCtvCommission,
  undoCtvCommission,
  closePeriod,
  reopenPeriod,
  type AccState,
} from "./actions";

// ---------------------------------------------------------------------------
// Khung dùng chung: nút → hộp thoại xác nhận → gọi server action.
// Dùng `useFormAction` để nút không "xoay mãi" khi mạng chậm (BAN-GIAO §8.1).
// ---------------------------------------------------------------------------

function ActionForm({
  action,
  hidden,
  children,
  submitLabel,
  danger,
  onDone,
}: {
  action: (prev: AccState, formData: FormData) => Promise<AccState>;
  hidden: Record<string, string>;
  children?: ReactNode;
  submitLabel: string;
  danger?: boolean;
  onDone: () => void;
}) {
  const [state, run, pending] = useFormAction<AccState>(action, onDone);
  return (
    <form action={run} className="space-y-4">
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {children}
      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onDone} disabled={pending}>
          Hủy
        </Button>
        <button
          type="submit"
          disabled={pending}
          className={
            danger
              ? "inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60"
              : buttonVariants()
          }
        >
          {pending && <LoaderCircle className="h-4 w-4 animate-spin" />} {submitLabel}
        </button>
      </div>
    </form>
  );
}

/** Ô chọn ngày ghi sổ + hình thức chi (dùng cho mọi thao tác chi tiền). */
function PayFields({ defaultDate, idPrefix }: { defaultDate: string; idPrefix: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <Label htmlFor={`${idPrefix}-date`}>Ngày chi</Label>
        <Input id={`${idPrefix}-date`} name="occurredAt" type="date" defaultValue={defaultDate} />
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-method`}>Hình thức</Label>
        <Select id={`${idPrefix}-method`} name="method" defaultValue="TRANSFER">
          {Object.entries(PAYMENT_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}

// ------------------------------ Chi lương ------------------------------

export function PayAllButton({
  month,
  standardDays,
  defaultDate,
  count,
  amount,
}: {
  month: string;
  standardDays: number;
  defaultDate: string;
  count: number;
  amount: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={count === 0}>
        <Wallet className="h-4 w-4" /> Chi lương cả tháng
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Ghi sổ chi lương cả tháng" size="lg">
        <ActionForm
          action={payAllSalaries}
          hidden={{ month, standardDays: String(standardDays) }}
          submitLabel={`Ghi sổ ${formatVND(amount)}`}
          onDone={() => setOpen(false)}
        >
          <p className="text-sm text-slate-600">
            Tạo <strong>{count}</strong> phiếu chi lương (tổng <strong>{formatVND(amount)}</strong>) vào Sổ thu chi cho
            tháng {month}. Mỗi nhân sự một phiếu riêng, ghi rõ họ tên — người đã được chi rồi sẽ được bỏ qua.
          </p>
          <PayFields defaultDate={defaultDate} idPrefix="payall" />
        </ActionForm>
      </Modal>
    </>
  );
}

export function PayStaffButton({
  userId,
  name,
  month,
  standardDays,
  defaultDate,
  amount,
}: {
  userId: string;
  name: string;
  month: string;
  standardDays: number;
  defaultDate: string;
  amount: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-md border border-brand-200 px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50"
      >
        <Banknote className="h-3.5 w-3.5" /> Chi
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Chi lương — ${name}`} size="lg">
        <ActionForm
          action={payStaffSalary}
          hidden={{ userId, month, standardDays: String(standardDays) }}
          submitLabel={`Ghi sổ ${formatVND(amount)}`}
          onDone={() => setOpen(false)}
        >
          <p className="text-sm text-slate-600">
            Ghi nhận đã trả <strong>{formatVND(amount)}</strong> lương tháng {month} cho <strong>{name}</strong>. Một
            phiếu chi sẽ được thêm vào Sổ thu chi.
          </p>
          <PayFields defaultDate={defaultDate} idPrefix={`pay-${userId}`} />
        </ActionForm>
      </Modal>
    </>
  );
}

export function UndoStaffButton({ userId, name, month }: { userId: string; name: string; month: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Hoàn tác ghi sổ"
        className="rounded-md p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500"
      >
        <Undo2 className="h-3.5 w-3.5" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Hoàn tác chi lương" size="sm">
        <ActionForm
          action={undoStaffSalary}
          hidden={{ userId, month }}
          submitLabel="Hoàn tác"
          danger
          onDone={() => setOpen(false)}
        >
          <p className="text-sm text-slate-600">
            Bỏ đánh dấu đã chi lương tháng {month} của <strong>{name}</strong> và <strong>xóa phiếu chi</strong> tương
            ứng trong Sổ thu chi. Dùng khi bấm nhầm hoặc cần tính lại.
          </p>
        </ActionForm>
      </Modal>
    </>
  );
}

// ------------------------- Hoa hồng cộng tác viên -------------------------

export function PayCtvButton({
  name,
  month,
  standardDays,
  defaultDate,
  amount,
}: {
  name: string;
  month: string;
  standardDays: number;
  defaultDate: string;
  amount: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-md border border-brand-200 px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50"
      >
        <Banknote className="h-3.5 w-3.5" /> Chi
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Chi hoa hồng — ${name}`} size="lg">
        <ActionForm
          action={payCtvCommission}
          hidden={{ name, month, standardDays: String(standardDays) }}
          submitLabel={`Ghi sổ ${formatVND(amount)}`}
          onDone={() => setOpen(false)}
        >
          <p className="text-sm text-slate-600">
            Ghi nhận đã trả <strong>{formatVND(amount)}</strong> hoa hồng tháng {month} cho cộng tác viên{" "}
            <strong>{name}</strong>.
          </p>
          <PayFields defaultDate={defaultDate} idPrefix="payctv" />
        </ActionForm>
      </Modal>
    </>
  );
}

export function UndoCtvButton({ name, month }: { name: string; month: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Hoàn tác ghi sổ"
        className="rounded-md p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500"
      >
        <Undo2 className="h-3.5 w-3.5" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Hoàn tác chi hoa hồng" size="sm">
        <ActionForm action={undoCtvCommission} hidden={{ name, month }} submitLabel="Hoàn tác" danger onDone={() => setOpen(false)}>
          <p className="text-sm text-slate-600">
            Bỏ đánh dấu đã chi hoa hồng tháng {month} của <strong>{name}</strong> và xóa phiếu chi tương ứng trong Sổ
            thu chi.
          </p>
        </ActionForm>
      </Modal>
    </>
  );
}

// ------------------------------ Chốt sổ ------------------------------

export function ClosePeriodButton({
  month,
  standardDays,
  profit,
}: {
  month: string;
  standardDays: number;
  profit: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Lock className="h-4 w-4" /> Chốt sổ tháng
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Chốt sổ tháng ${month}`} size="lg">
        <ActionForm
          action={closePeriod}
          hidden={{ month, standardDays: String(standardDays) }}
          submitLabel="Chốt sổ"
          onDone={() => setOpen(false)}
        >
          <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
            <p>
              Kết quả tháng này: <strong className={profit >= 0 ? "text-emerald-600" : "text-rose-600"}>{formatVND(profit)}</strong>
            </p>
            <p className="mt-2">Sau khi chốt sổ:</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs">
              <li>Số liệu tháng được lưu lại cố định, báo cáo về sau không đổi nữa.</li>
              <li>Không ai thêm/sửa/xóa được giao dịch thu chi của tháng.</li>
              <li>Không sửa được bảng lương của tháng.</li>
            </ul>
            <p className="mt-2 text-xs text-slate-500">Quản trị viên vẫn có thể mở lại sổ khi cần sửa.</p>
          </div>
          <div>
            <Label htmlFor="close-note">Ghi chú (tuỳ chọn)</Label>
            <Textarea id="close-note" name="note" placeholder="VD: đã đối chiếu với sao kê ngân hàng ngày 05/…" />
          </div>
        </ActionForm>
      </Modal>
    </>
  );
}

export function ReopenPeriodButton({ month }: { month: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <LockOpen className="h-4 w-4" /> Mở lại sổ
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Mở lại sổ tháng ${month}`} size="sm">
        <ActionForm action={reopenPeriod} hidden={{ month }} submitLabel="Mở lại sổ" danger onDone={() => setOpen(false)}>
          <p className="text-sm text-slate-600">
            Mở khóa tháng {month} để sửa lại thu chi / lương. Số liệu đã chụp lúc chốt sẽ bị xóa; hãy chốt sổ lại sau
            khi sửa xong. Thao tác này được ghi vào Nhật ký hệ thống.
          </p>
        </ActionForm>
      </Modal>
    </>
  );
}
