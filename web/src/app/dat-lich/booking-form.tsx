"use client";

import { useActionState } from "react";
import { CalendarCheck, LoaderCircle, CheckCircle2 } from "lucide-react";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { buttonVariants } from "@/components/ui/button";
import { createPublicAppointment, type BookingState } from "./actions";

export function BookingForm({
  services,
  defaultDateTime,
}: {
  services: { id: string; name: string }[];
  defaultDateTime: string;
}) {
  const [state, action, pending] = useActionState<BookingState, FormData>(createPublicAppointment, {});

  if (state.ok) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircle2 className="h-12 w-12 text-emerald-500" />
        <p className="text-lg font-semibold text-slate-800">Đã gửi yêu cầu đặt lịch!</p>
        <p className="text-sm text-slate-500">
          Trung tâm sẽ liên hệ xác nhận với Quý khách trong thời gian sớm nhất. Cảm ơn Quý khách! 💗
        </p>
        <a href="/dat-lich" className={buttonVariants({ variant: "secondary", size: "sm" })}>
          Đặt thêm lịch khác
        </a>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {/* Honeypot chống bot — người dùng thật không thấy */}
      <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

      <div>
        <Label htmlFor="b-name">Họ và tên *</Label>
        <Input id="b-name" name="guestName" defaultValue={state.values?.guestName ?? ""} placeholder="Nguyễn Thị A" required autoFocus />
      </div>
      <div>
        <Label htmlFor="b-phone">Số điện thoại *</Label>
        <Input id="b-phone" name="phone" defaultValue={state.values?.phone ?? ""} inputMode="tel" placeholder="09xx xxx xxx" required />
      </div>
      <div>
        <Label htmlFor="b-service">Dịch vụ quan tâm</Label>
        <Select id="b-service" name="serviceInterest" defaultValue={state.values?.serviceInterest ?? ""}>
          <option value="">— Chưa xác định —</option>
          {services.map((s) => (
            <option key={s.id} value={s.name}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="b-time">Ngày giờ mong muốn *</Label>
        <Input id="b-time" name="scheduledAt" type="datetime-local" defaultValue={state.values?.scheduledAt || defaultDateTime} required />
      </div>
      <div>
        <Label htmlFor="b-note">Ghi chú</Label>
        <Textarea id="b-note" name="note" defaultValue={state.values?.note ?? ""} placeholder="Nhu cầu, câu hỏi của Quý khách…" />
      </div>

      {state.error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 ring-1 ring-rose-600/10">{state.error}</p>
      )}

      <button type="submit" disabled={pending} className={buttonVariants({ size: "lg" }) + " w-full justify-center"}>
        {pending ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <CalendarCheck className="h-5 w-5" />}
        {pending ? "Đang gửi…" : "Gửi yêu cầu đặt lịch"}
      </button>
      <p className="text-center text-xs text-slate-400">Số điện thoại của Quý khách được bảo mật.</p>
    </form>
  );
}
