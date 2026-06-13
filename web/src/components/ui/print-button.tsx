"use client";

import { Printer } from "lucide-react";

/** In trang hiện tại (trình duyệt có thể "Lưu thành PDF"). Thanh điều hướng tự ẩn khi in. */
export function PrintButton({ label = "In / Lưu PDF" }: { label?: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="print-hide inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
    >
      <Printer className="h-4 w-4" /> {label}
    </button>
  );
}
