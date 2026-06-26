"use client";

import { updateAppointmentStatus } from "../lich-hen/actions";
import type { AppointmentStatus } from "@/generated/prisma/client";

/** Nút bấm 1 lần để chuyển trạng thái lịch hẹn (vd "Đã đến", "Bắt đầu tư vấn"). */
export function QuickStatusButton({
  id,
  status,
  label,
  className,
}: {
  id: string;
  status: AppointmentStatus;
  label: string;
  className?: string;
}) {
  return (
    <form action={updateAppointmentStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        className={className ?? "rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100"}
      >
        {label}
      </button>
    </form>
  );
}
