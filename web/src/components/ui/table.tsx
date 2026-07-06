import * as React from "react";
import { cn } from "@/lib/cn";

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="app-table-scroll w-full overflow-x-auto overscroll-x-contain" role="region" aria-label="Bảng dữ liệu có thể vuốt ngang" tabIndex={0}>
      <p className="app-table-hint sticky left-0 mb-2 text-[11px] font-medium text-slate-400 sm:hidden">Vuốt ngang để xem đầy đủ →</p>
      <table className={cn("w-full border-collapse text-sm", className)} {...props} />
    </div>
  );
}

export function THead({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("", className)} {...props} />;
}

export function TH({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "whitespace-nowrap border-b border-slate-200 px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:px-4 sm:text-xs",
        className,
      )}
      {...props}
    />
  );
}

export function TR({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("border-b border-slate-100 last:border-0 transition-colors active:bg-slate-50 sm:hover:bg-slate-50/70", className)} {...props} />;
}

export function TD({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-3 py-3 align-middle text-slate-700 sm:px-4", className)} {...props} />;
}
