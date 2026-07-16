"use client";

import { useRef, useState } from "react";
import { Download, Printer, FileSpreadsheet, FileText, FileDown, ChevronDown } from "lucide-react";
import { DropdownPortal } from "@/components/ui/dropdown-portal";

export type ExportScope = {
  label: string;
  excelHref: string;
  wordHref: string;
  csvHref?: string;
};

/**
 * Nút "Xuất file" có NHIỀU PHẠM VI (vd tháng này / cả năm / toàn bộ) — dùng cho các sổ
 * cần xuất phục vụ kiểm toán (không chỉ xem/xuất được từng tháng một). Mỗi phạm vi có
 * Excel/Word, CSV tuỳ chọn. Xem `ExportMenu` (đơn giản, 1 phạm vi) cho các trang khác.
 */
export function ScopedExportMenu({ scopes, showPrint = true }: { scopes: ExportScope[]; showPrint?: boolean }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="print-hide">
      <button
        ref={buttonRef}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
      >
        <Download className="h-4 w-4" /> Xuất file <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
      </button>
      <DropdownPortal
        open={open}
        anchorRef={buttonRef}
        onClose={() => setOpen(false)}
        className="z-20 max-h-[75vh] w-64 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
      >
        {showPrint && (
          <button
            onClick={() => {
              setOpen(false);
              setTimeout(() => window.print(), 50);
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            <Printer className="h-4 w-4 text-rose-500" /> In / Lưu PDF (đang xem)
          </button>
        )}
        {scopes.map((s, i) => (
          <div key={i} className="border-t border-slate-100 py-1 first:border-t-0">
            <p className="px-3.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{s.label}</p>
            <a href={s.excelHref} onClick={() => setOpen(false)} className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Excel (.xlsx)
            </a>
            <a href={s.wordHref} onClick={() => setOpen(false)} className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50">
              <FileText className="h-4 w-4 text-sky-600" /> Word (.doc)
            </a>
            {s.csvHref && (
              <a href={s.csvHref} onClick={() => setOpen(false)} className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50">
                <FileDown className="h-4 w-4 text-slate-500" /> CSV
              </a>
            )}
          </div>
        ))}
      </DropdownPortal>
    </div>
  );
}
