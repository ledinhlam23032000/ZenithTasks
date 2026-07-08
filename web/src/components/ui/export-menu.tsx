"use client";

import { useState } from "react";
import { Download, Printer, FileSpreadsheet, FileText, FileDown, ChevronDown } from "lucide-react";

/**
 * Nút "Xuất file" gộp: In/Lưu PDF (trình duyệt), Excel (.xlsx), Word (.doc), CSV (tuỳ chọn).
 * excelHref/wordHref/csvHref trỏ tới route /…/export?format=xlsx|doc|csv.
 */
export function ExportMenu({ excelHref, wordHref, csvHref }: { excelHref: string; wordHref: string; csvHref?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="print-hide relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
      >
        <Download className="h-4 w-4" /> Xuất file <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
            <button
              onClick={() => {
                setOpen(false);
                setTimeout(() => window.print(), 50);
              }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <Printer className="h-4 w-4 text-rose-500" /> In / Lưu PDF
            </button>
            <a
              href={excelHref}
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Excel (.xlsx)
            </a>
            <a
              href={wordHref}
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <FileText className="h-4 w-4 text-sky-600" /> Word (.doc)
            </a>
            {csvHref && (
              <a
                href={csvHref}
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <FileDown className="h-4 w-4 text-slate-500" /> CSV
              </a>
            )}
          </div>
        </>
      )}
    </div>
  );
}
