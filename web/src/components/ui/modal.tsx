"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

const sizes = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: keyof typeof sizes;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  // Portal ra <body>: nếu chỉ render tại chỗ, modal có thể bị các ancestor `position:sticky`
  // (vd thanh tab trong trang hồ sơ điều trị) đè lên bất kể z-index cao hơn — cùng nguyên nhân
  // đã gặp ở dropdown (xem `dropdown-portal.tsx` + cạm bẫy #16, mục 13 BAN-GIAO.md).
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto sm:items-start sm:p-6">
      <div className="animate-fade-in fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        className={cn(
          "animate-slide-up-in relative flex max-h-[92dvh] w-full flex-col rounded-t-[1.75rem] bg-white shadow-2xl ring-1 ring-slate-200 sm:my-6 sm:block sm:max-h-none sm:animate-scale-in sm:rounded-2xl",
          sizes[size],
        )}
      >
        <div className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-slate-200 sm:hidden" />
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="-mr-1 inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 active:bg-slate-200 sm:h-auto sm:w-auto sm:rounded-lg sm:bg-transparent sm:p-1.5 sm:hover:bg-slate-100 sm:hover:text-slate-600"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:overflow-visible sm:px-5 sm:pb-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
