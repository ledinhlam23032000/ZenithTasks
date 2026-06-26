"use client";

import { useRef } from "react";
import { APPT_STATUS } from "@/lib/status";
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
  const formRef = useRef<HTMLFormElement>(null);
  const tone = APPT_STATUS[status].tone;
  return (
    <form ref={formRef} action={updateAppointmentStatus}>
      <input type="hidden" name="id" value={id} />
      <select
        name="status"
        defaultValue={status}
        onChange={() => formRef.current?.requestSubmit()}
        className={`cursor-pointer rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset outline-none ${toneClass[tone]}`}
      >
        {Object.entries(APPT_STATUS).map(([k, v]) => (
          <option key={k} value={k} className="bg-white text-slate-700">
            {v.label}
          </option>
        ))}
      </select>
    </form>
  );
}
