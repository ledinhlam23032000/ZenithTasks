"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { Plus, LoaderCircle, ShieldCheck } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Label, Select, Textarea, FieldHint } from "@/components/ui/field";
import { APPT_TYPE, SOURCE_LABEL } from "@/lib/status";
import { createAppointment, type ApptFormState } from "./actions";

type Opt = { id: string; name?: string; fullName?: string };

export function NewAppointmentButton({
  services,
  consultants,
  defaultDateTime,
}: {
  services: { id: string; name: string }[];
  consultants: { id: string; fullName: string }[];
  defaultDateTime: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Đặt lịch hẹn
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Đặt lịch hẹn mới" description="Ghi nhận khách hẹn đến từ các nguồn marketing, CTV, hotline…" size="lg">
        <AppointmentForm
          services={services}
          consultants={consultants}
          defaultDateTime={defaultDateTime}
          onSuccess={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}

function AppointmentForm({
  services,
  consultants,
  defaultDateTime,
  onSuccess,
}: {
  services: { id: string; name: string }[];
  consultants: { id: string; fullName: string }[];
  defaultDateTime: string;
  onSuccess: () => void;
}) {
  const [state, action, pending] = useActionState<ApptFormState, FormData>(createAppointment, {});

  useEffect(() => {
    if (state.ok) onSuccess();
  }, [state.ok, onSuccess]);

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="guestName">Tên khách *</Label>
          <Input id="guestName" name="guestName" placeholder="Nguyễn Thị A" required />
        </div>
        <div>
          <Label htmlFor="phoneLast5">5 số cuối điện thoại</Label>
          <Input id="phoneLast5" name="phoneLast5" inputMode="numeric" maxLength={5} placeholder="12345" />
          <FieldHint>
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Số điện thoại được bảo mật, chỉ lưu 5 số cuối để tra cứu.
            </span>
          </FieldHint>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="scheduledAt">Ngày giờ hẹn *</Label>
          <Input id="scheduledAt" name="scheduledAt" type="datetime-local" defaultValue={defaultDateTime} required />
        </div>
        <div>
          <Label htmlFor="type">Loại lịch</Label>
          <Select id="type" name="type" defaultValue="NEW">
            {Object.entries(APPT_TYPE).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="serviceInterest">Dịch vụ khách quan tâm</Label>
        <Select id="serviceInterest" name="serviceInterest" defaultValue="">
          <option value="">— Chưa xác định —</option>
          {services.map((s) => (
            <option key={s.id} value={s.name}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="source">Nguồn khách</Label>
          <Select id="source" name="source" defaultValue="MARKETING">
            {Object.entries(SOURCE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="sourceDetail">Chi tiết nguồn</Label>
          <Input id="sourceDetail" name="sourceDetail" placeholder="VD: CTV Ngọc Hân, chiến dịch Hè…" />
        </div>
      </div>

      <div>
        <Label htmlFor="consultantId">Tư vấn viên phụ trách (nếu có)</Label>
        <Select id="consultantId" name="consultantId" defaultValue="">
          <option value="">— Chưa phân công —</option>
          {consultants.map((c) => (
            <option key={c.id} value={c.id}>
              {c.fullName}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="note">Ghi chú</Label>
        <Textarea id="note" name="note" placeholder="Yêu cầu đặc biệt của khách…" />
      </div>

      {state.error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 ring-1 ring-rose-600/10">{state.error}</p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onSuccess}>
          Hủy
        </Button>
        <button type="submit" disabled={pending} className={buttonVariants()}>
          {pending && <LoaderCircle className="h-4 w-4 animate-spin" />}
          {pending ? "Đang lưu…" : "Lưu lịch hẹn"}
        </button>
      </div>
    </form>
  );
}
