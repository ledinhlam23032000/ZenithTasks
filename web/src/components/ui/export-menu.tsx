"use client";

import { useRef, useState } from "react";
import { Download, Printer, FileSpreadsheet, FileText, FileDown, ChevronDown, FileStack } from "lucide-react";
import { DropdownPortal } from "@/components/ui/dropdown-portal";

export type ExportMenuExtraItem = { label: string; href: string };

/**
 * Nút "Xuất file" gộp: In/Lưu PDF (trình duyệt), Excel (.xlsx), Word (.doc), CSV (tuỳ chọn).
 * excelHref/wordHref/csvHref trỏ tới route /…/export?format=xlsx|doc|csv.
 * `extra` (tuỳ chọn): các mục xuất file khác — vd bảng lương mẫu kế toán ở /luong.
 */
export function ExportMenu({
  excelHref,
  wordHref,
  csvHref,
  extra,
}: {
  excelHref: string;
  wordHref: string;
  csvHref?: string;
  extra?: ExportMenuExtraItem[];
}) {
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
        className="z-20 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
      >
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
        {extra && extra.length > 0 && (
          <>
            <div className="my-1 border-t border-slate-100" />
            {extra.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <FileStack className="h-4 w-4 text-amber-600" /> {item.label}
              </a>
            ))}
          </>
        )}
      </DropdownPortal>
    </div>
  );
}
