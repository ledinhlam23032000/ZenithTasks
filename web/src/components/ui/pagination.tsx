import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Thanh chuyển trang dùng chung — ẩn hẳn nếu chỉ có 1 trang. */
export function Pagination({
  page,
  totalPages,
  makeHref,
}: {
  page: number;
  totalPages: number;
  makeHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;
  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
      <Link
        href={makeHref(Math.max(1, page - 1))}
        aria-disabled={prevDisabled}
        tabIndex={prevDisabled ? -1 : undefined}
        className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium ${
          prevDisabled ? "pointer-events-none text-slate-300" : "text-slate-600 hover:bg-slate-100"
        }`}
      >
        <ChevronLeft className="h-4 w-4" /> Trước
      </Link>
      <span className="text-sm text-slate-500">
        Trang {page}/{totalPages}
      </span>
      <Link
        href={makeHref(Math.min(totalPages, page + 1))}
        aria-disabled={nextDisabled}
        tabIndex={nextDisabled ? -1 : undefined}
        className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium ${
          nextDisabled ? "pointer-events-none text-slate-300" : "text-slate-600 hover:bg-slate-100"
        }`}
      >
        Sau <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
