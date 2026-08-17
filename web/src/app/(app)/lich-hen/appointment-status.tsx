"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { APPT_STATUS } from "@/lib/status";
import { useToast } from "@/components/ui/toast";
import { updateAppointmentStatus } from "./actions";
import type { AppointmentStatus } from "@/generated/prisma/client";

const toneClass: Record<string, string> = {
  blue: "bg-sky-50 text-sky-700 ring-sky-600/20",
  brand: "bg-brand-50 text-brand-700 ring-brand-600/20",
  purple: "bg-violet-50 text-violet-700 ring-violet-600/20",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/20",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  red: "bg-rose-50 text-rose-700 ring-rose-600/20",
  slate: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

export function AppointmentStatusControl({ id, status }: { id: string; status: AppointmentStatus }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const tone = APPT_STATUS[status].tone;

  function onChange(next: string) {
    const fd = new FormData();
    fd.append("id", id);
    fd.append("status", next);
    startTransition(async () => {
      try {
        await updateAppointmentStatus(fd);
        toast("Đã lưu");
        router.refresh();
      } catch {
        toast("Lỗi mạng, thử lại", "error");
      }
    });
  }

  return (
    <select
      name="status"
      defaultValue={status}
      disabled={pending}
      onChange={(e) => onChange(e.target.value)}
      className={`cursor-pointer rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset outline-none disabled:opacity-60 ${toneClass[tone]}`}
    >
      {Object.entries(APPT_STATUS).map(([k, v]) => (
        <option key={k} value={k} className="bg-white text-slate-700">
          {v.label}
        </option>
      ))}
    </select>
  );
}
