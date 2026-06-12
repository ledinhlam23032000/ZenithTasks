import * as React from "react";
import { cn } from "@/lib/cn";

export type Tone = "brand" | "green" | "amber" | "red" | "slate" | "blue" | "purple" | "pink";

const tones: Record<Tone, string> = {
  brand: "bg-brand-50 text-brand-700 ring-brand-600/15",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/15",
  red: "bg-rose-50 text-rose-700 ring-rose-600/15",
  slate: "bg-slate-100 text-slate-600 ring-slate-500/15",
  blue: "bg-sky-50 text-sky-700 ring-sky-600/15",
  purple: "bg-violet-50 text-violet-700 ring-violet-600/15",
  pink: "bg-pink-50 text-pink-700 ring-pink-600/15",
};

export function Badge({
  tone = "slate",
  className,
  dot = false,
  children,
}: {
  tone?: Tone;
  className?: string;
  dot?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        tones[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  );
}
