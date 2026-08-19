"use client";

import Link from "next/link";
import { updateAppointmentStatus } from "../lich-hen/actions";
import type { AppointmentStatus } from "@/generated/prisma/client";

/** Nút bấm 1 lần để chuyển trạng thái lịch hẹn (vd "Đã đến", "Bắt đầu tư vấn"). */
export function QuickStatusButton({
  id,
  status,
  label,
  nextHref,
  nextLabel = "Mở khách",
  className,
}: {
  id: string;
  status: AppointmentStatus;
  label: string;
  nextHref?: string;
  nextLabel?: string;
  className?: string;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {nextHref && (
        <Link href={nextHref} className="rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-brand-700">
          {nextLabel}
        </Link>
      )}
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
    </div>
  );
}
