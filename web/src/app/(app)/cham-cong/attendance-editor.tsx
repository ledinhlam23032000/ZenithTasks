"use client";

import { useState } from "react";
import { Pencil, CalendarPlus, LoaderCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { useFormAction } from "@/lib/use-form-action";
import { upsertAttendance } from "./actions";

export type StaffOption = { id: string; name: string };
export type AttendanceRecord = {
  userId: string;
  name: string;
  date: string; // yyyy-MM-dd
  checkIn: string; // HH:mm
  checkOut: string; // HH:mm hoặc ""
  note: string;
};

function Fields({ staff, record }: { staff?: StaffOption[]; record?: AttendanceRecord }) {
  return (
    <>
      <div>
        <Label>Nhân viên</Label>
        {staff ? (
          <Select name="userId" defaultValue={record?.userId ?? ""} required>
            <option value="" disabled>
              — Chọn nhân viên —
            </option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        ) : (
          <>
            <input type="hidden" name="userId" value={record!.userId} />
            <Input value={record!.name} disabled />
          </>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label>Ngày</Label>
          <Input type="date" name="date" defaultValue={record?.date} required readOnly={!!record} />
        </div>
        <div>
          <Label>Giờ vào *</Label>
          <Input type="time" name="checkIn" defaultValue={record?.checkIn ?? "08:00"} required />
        </div>
        <div>
          <Label>Giờ ra</Label>
          <Input type="time" name="checkOut" defaultValue={record?.checkOut ?? ""} />
        </div>
      </div>
      <div>
        <Label>Ghi chú</Label>
        <Textarea name="note" defaultValue={record?.note ?? ""} placeholder="VD: bổ sung công, đi muộn có phép…" />
      </div>
    </>
  );
}

function Footer({ pending, onClose }: { pending: boolean; onClose: () => void }) {
  return (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="secondary" onClick={onClose}>
        Hủy
      </Button>
      <button type="submit" disabled={pending} className={buttonVariants()}>
        {pending && <LoaderCircle className="h-4 w-4 animate-spin" />} Lưu
      </button>
    </div>
  );
}

export function AddAttendanceButton({ staff }: { staff: StaffOption[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useFormAction(upsertAttendance, () => setOpen(false));

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <CalendarPlus className="h-4 w-4" /> Thêm / sửa chấm công
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Thêm / sửa chấm công"
        description="Bổ sung công cho ngày trước khi dùng app, hoặc chỉnh giờ vào / giờ ra."
      >
        <form action={action} className="space-y-4">
          <Fields staff={staff} />
          {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
          <Footer pending={pending} onClose={() => setOpen(false)} />
        </form>
      </Modal>
    </>
  );
}

export function EditAttendanceButton({ record }: { record: AttendanceRecord }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useFormAction(upsertAttendance, () => setOpen(false));

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
        title="Sửa giờ chấm công"
      >
        <Pencil className="h-3.5 w-3.5" /> Sửa
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Sửa chấm công — ${record.name}`} description={record.date}>
        <form action={action} className="space-y-4">
          <Fields record={record} />
          {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
          <Footer pending={pending} onClose={() => setOpen(false)} />
        </form>
      </Modal>
    </>
  );
}
