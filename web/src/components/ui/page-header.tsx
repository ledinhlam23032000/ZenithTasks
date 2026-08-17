import * as React from "react";
import { cn } from "@/lib/cn";

export function PageHeader({
  title,
  description,
  icon,
  actions,
  className,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:gap-4", className)}>
      <div className="flex items-start gap-3">
        {icon && (
          <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-600/10 sm:h-11 sm:w-11">
            {icon}
          </span>
        )}
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">{title}</h1>
          {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex max-w-full items-center gap-2 overflow-x-auto pb-0.5 sm:justify-end">{actions}</div>}
    </div>
  );
}
