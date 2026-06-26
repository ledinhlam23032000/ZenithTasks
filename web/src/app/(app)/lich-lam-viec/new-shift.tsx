"use client";

import { useState } from "react";
import { CalendarPlus, LoaderCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import { useFormAction } from "@/lib/use-form-action";
import { createShift } from "./actions";

export function NewShiftButton({
  staff,
  defaultDate,
}: {
  staff: { id: string; fullName: string }[];
  defaultDate: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useFormAction(createShift, () => setOpen(false));

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <CalendarPlus className="h-4 w-4" /> Xếp ca làm việc
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Xếp ca làm việc">
        <form action={action} className="space-y-4">
          <div>
            <Label htmlFor="userId">Nhân viên *</Label>
            <Select id="userId" name="userId" required defaultValue="">
              <option value="" disabled>— Chọn nhân viên —</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>{s.fullName}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="date">Ngày *</Label>
            <Input id="date" name="date" type="date" defaultValue={defaultDate} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startTime">Giờ bắt đầu *</Label>
              <Input id="startTime" name="startTime" type="time" defaultValue="08:00" required />
            </div>
            <div>
              <Label htmlFor="endTime">Giờ kết thúc *</Label>
              <Input id="endTime" name="endTime" type="time" defaultValue="12:00" required />
            </div>
          </div>
          <div>
            <Label htmlFor="note">Ghi chú</Label>
            <Input id="note" name="note" placeholder="VD: ca trực, hỗ trợ phòng mổ…" />
          </div>
          {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Hủy</Button>
            <button type="submit" disabled={pending} className={buttonVariants()}>
              {pending && <LoaderCircle className="h-4 w-4 animate-spin" />} Lưu ca
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
