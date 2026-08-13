"use client";

import { useActionState, useId, useState } from "react";
import { CalendarCheck, LoaderCircle, CheckCircle2, Clock3 } from "lucide-react";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { buttonVariants } from "@/components/ui/button";
import { BOOKING_HOUR_MIN, BOOKING_HOUR_MAX } from "@/lib/booking-hours";
import { createPublicAppointment, type BookingState } from "./actions";

export function BookingForm({
  services,
  defaultDateTime,
  minDate,
}: {
  services: { id: string; name: string }[];
  defaultDateTime: string;
  minDate: string;
}) {
  const [state, action, pending] = useActionState<BookingState, FormData>(createPublicAppointment, {});
  const [date, setDate] = useState(defaultDateTime.slice(0, 10));
  const [time, setTime] = useState(defaultDateTime.slice(11, 16) || "09:00");
  // useId() is stable across hydration, while the fixed prefix keeps the
  // nonce above the server-side minimum length used by the idempotency check.
  const clientNonce = `booking-form-${useId().replace(/[^a-zA-Z0-9]/g, "")}-nonce`;

  if (state.ok) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircle2 className="h-12 w-12 text-emerald-500" />
        <p className="text-lg font-semibold text-slate-800">Đã gửi yêu cầu đặt lịch!</p>
        <div className="w-full rounded-xl bg-emerald-50 px-4 py-3 text-left text-sm text-emerald-800">
          <p><span className="font-semibold">Mã yêu cầu:</span> {state.reference ?? "—"}</p>
          <p><span className="font-semibold">Thời gian mong muốn:</span> {state.requestedAt ?? "—"}</p>
        </div>
        <p className="text-sm text-slate-500">
          Trung tâm sẽ gọi xác nhận trong giờ làm việc. Nếu cần đổi hoặc hủy, vui lòng cung cấp mã yêu cầu khi liên hệ hotline.
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
      <input type="hidden" name="clientNonce" value={clientNonce} />

      <div>
        <Label htmlFor="b-name">Họ và tên *</Label>
        <Input id="b-name" name="guestName" placeholder="Nguyễn Thị A" required autoFocus />
      </div>
      <div>
        <Label htmlFor="b-phone">Số điện thoại *</Label>
        <Input id="b-phone" name="phone" inputMode="tel" placeholder="09xx xxx xxx" required />
      </div>
      <div>
        <Label htmlFor="b-service">Dịch vụ quan tâm</Label>
        <Select id="b-service" name="serviceInterest" defaultValue="">
          <option value="">— Chưa xác định —</option>
          {services.map((s) => (
            <option key={s.id} value={s.name}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-3">
        <input type="hidden" name="scheduledAt" value={`${date}T${time}`} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="b-date">Ngày mong muốn *</Label>
            <Input id="b-date" type="date" value={date} min={minDate} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="b-time">Giờ mong muốn *</Label>
            <div className="relative">
              <Clock3 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="b-time"
                type="time"
                value={time}
                step={1800}
                min={BOOKING_HOUR_MIN}
                max={BOOKING_HOUR_MAX}
                onChange={(e) => setTime(e.target.value)}
                onInvalid={(e) => {
                  if (e.currentTarget.validity.rangeUnderflow || e.currentTarget.validity.rangeOverflow) {
                    e.currentTarget.setCustomValidity(`Vui lòng chọn giờ trong khung ${BOOKING_HOUR_MIN}–${BOOKING_HOUR_MAX}.`);
                  }
                }}
                className="pl-9"
                required
              />
            </div>
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-slate-500">Chọn nhanh khung giờ</p>
          <div className="grid grid-cols-4 gap-2">
            {["08:00", "09:00", "10:00", "11:00", "13:30", "14:30", "15:30", "16:30"].map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => setTime(slot)}
                className={`h-9 rounded-md border text-sm font-medium transition ${time === slot ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-200 bg-white text-slate-600 hover:border-brand-300"}`}
              >
                {slot}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Đây là thời gian mong muốn (khung giờ làm việc {BOOKING_HOUR_MIN}–{BOOKING_HOUR_MAX}). Trung tâm sẽ liên hệ xác nhận lại.
          </p>
        </div>
      </div>
      <div>
        <Label htmlFor="b-note">Ghi chú</Label>
        <Textarea id="b-note" name="note" placeholder="Nhu cầu, câu hỏi của Quý khách…" />
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
