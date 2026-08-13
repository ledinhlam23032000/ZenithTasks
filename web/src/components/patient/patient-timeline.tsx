import { CalendarClock, CheckCircle2, CircleDot, Receipt, Stethoscope } from "lucide-react";
import { fmtDateTime } from "@/lib/format";

export type PatientTimelineEvent = {
  id: string;
  at: Date;
  label: string;
  detail?: string;
  tone?: "brand" | "green" | "amber" | "purple" | "slate";
};

const icons = { brand: CircleDot, green: CheckCircle2, amber: Receipt, purple: Stethoscope, slate: CalendarClock };

export function PatientTimeline({ events }: { events: PatientTimelineEvent[] }) {
  const sorted = [...events].sort((a, b) => b.at.getTime() - a.at.getTime());
  return (
    <div className="relative space-y-0">
      {sorted.length === 0 ? <p className="text-sm text-slate-400">Chưa có sự kiện trong timeline.</p> : sorted.map((event) => {
        const tone = event.tone ?? "slate";
        const Icon = icons[tone];
        return <div key={event.id} className="relative flex gap-3 pb-4 last:pb-0">
          <div className="relative z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-slate-200"><Icon className={`h-3.5 w-3.5 ${tone === "brand" ? "text-brand-600" : tone === "green" ? "text-emerald-600" : tone === "amber" ? "text-amber-600" : tone === "purple" ? "text-violet-600" : "text-slate-500"}`} /></div>
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5"><p className="text-sm font-medium text-slate-800">{event.label}</p><time className="text-xs text-slate-400">{fmtDateTime(event.at)}</time></div>{event.detail && <p className="mt-0.5 text-xs text-slate-500">{event.detail}</p>}</div>
        </div>;
      })}
      {sorted.length > 1 && <span aria-hidden className="absolute bottom-2 left-3.5 top-2 -z-0 w-px bg-slate-200" />}
    </div>
  );
}
