"use client";

import { useState } from "react";
import { Plus, Pencil, LoaderCircle, ShieldCheck } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Label, Select, Textarea, FieldHint } from "@/components/ui/field";
import { Combobox, type ComboOption } from "@/components/ui/combobox";
import { APPT_TYPE, SOURCE_LABEL } from "@/lib/status";
import { useFormAction } from "@/lib/use-form-action";
import { createAppointment, updateAppointment } from "./actions";

type ServiceOpt = { id: string; name: string };
type ConsultantOpt = { id: string; fullName: string };

export type EditableAppointment = {
  id: string;
  guestName: string;
  phoneLast5: string;
  scheduledAt: string; // datetime-local
  type: string;
  serviceInterest: string;
  source: string;
  sourceDetail: string;
  consultantId: string;
  note: string;
};

export function NewAppointmentButton({
  services,
  consultants,
  defaultDateTime,
}: {
  services: ServiceOpt[];
  consultants: ConsultantOpt[];
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

export function EditAppointmentButton({
  appointment,
  services,
  consultants,
}: {
  appointment: EditableAppointment;
  services: ServiceOpt[];
  consultants: ConsultantOpt[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Sửa lịch hẹn"
        title="Sửa lịch hẹn"
        className="rounded-md p-1.5 text-slate-300 hover:bg-brand-50 hover:text-brand-600"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Sửa lịch hẹn" size="lg">
        <AppointmentForm
          services={services}
          consultants={consultants}
          defaultDateTime={appointment.scheduledAt}
          appointment={appointment}
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
  appointment,
  onSuccess,
}: {
  services: ServiceOpt[];
  consultants: ConsultantOpt[];
  defaultDateTime: string;
  appointment?: EditableAppointment;
  onSuccess: () => void;
}) {
  const isEdit = !!appointment;
  const [state, action, pending] = useFormAction(
    isEdit ? updateAppointment : createAppointment,
    onSuccess,
  );

  return (
    <form action={action} className="space-y-4">
      {isEdit && <input type="hidden" name="id" value={appointment.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="guestName">Tên khách *</Label>
          <Input id="guestName" name="guestName" placeholder="Nguyễn Thị A" defaultValue={appointment?.guestName ?? ""} required />
        </div>
        <div>
          <Label htmlFor="phoneLast5">5 số cuối điện thoại</Label>
          <Input id="phoneLast5" name="phoneLast5" inputMode="numeric" maxLength={5} placeholder="12345" defaultValue={appointment?.phoneLast5 ?? ""} />
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
          <Select id="type" name="type" defaultValue={appointment?.type ?? "NEW"}>
            {Object.entries(APPT_TYPE).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <Label>Dịch vụ khách quan tâm (gõ để tìm)</Label>
        <Combobox
          name="serviceInterest"
          defaultValue={appointment?.serviceInterest ?? ""}
          placeholder="— Chưa xác định —"
          options={[
            { value: "", label: "— Chưa xác định —" },
            ...(appointment?.serviceInterest && !services.some((s) => s.name === appointment.serviceInterest)
              ? [{ value: appointment.serviceInterest, label: appointment.serviceInterest } as ComboOption]
              : []),
            ...services.map((s) => ({ value: s.name, label: s.name })),
          ]}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="source">Nguồn khách</Label>
          <Select id="source" name="source" defaultValue={appointment?.source ?? "MARKETING"}>
            {Object.entries(SOURCE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="sourceDetail">Chi tiết nguồn</Label>
          <Input id="sourceDetail" name="sourceDetail" placeholder="VD: CTV Ngọc Hân, chiến dịch Hè…" defaultValue={appointment?.sourceDetail ?? ""} />
        </div>
      </div>

      <div>
        <Label>Người tư vấn phụ trách (nếu có)</Label>
        <Combobox
          name="consultantId"
          defaultValue={appointment?.consultantId ?? ""}
          placeholder="— Chưa phân công —"
          options={[
            { value: "", label: "— Chưa phân công —" },
            ...consultants.map((c) => ({ value: c.id, label: c.fullName })),
          ]}
        />
      </div>

      <div>
        <Label htmlFor="note">Ghi chú</Label>
        <Textarea id="note" name="note" placeholder="Yêu cầu đặc biệt của khách…" defaultValue={appointment?.note ?? ""} />
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
          {pending ? "Đang lưu…" : isEdit ? "Lưu thay đổi" : "Lưu lịch hẹn"}
        </button>
      </div>
    </form>
  );
}
