"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

/**
 * Nút có xác nhận trong app; GỌI server action TRỰC TIẾP rồi làm mới trang.
 * Dùng cho xóa thanh toán/tái khám/hồ sơ, khóa hồ sơ…
 */
export function ConfirmButton({
  action,
  fields,
  confirmText,
  className,
  children,
  confirmLabel = "Xác nhận",
  danger = true,
}: {
  action: (formData: FormData) => void | Promise<void>;
  fields: Record<string, string>;
  confirmText: string;
  className?: string;
  children: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onConfirm() {
    setErr(null);
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.append(k, v);
    startTransition(async () => {
      try {
        await action(fd);
        router.refresh();
        setOpen(false);
      } catch {
        setErr("Thao tác chưa thành công, vui lòng thử lại.");
      }
    });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>

      <Modal open={open} onClose={() => !pending && setOpen(false)} title="Xác nhận" size="sm">
        <p className="text-sm text-slate-600">{confirmText}</p>
        {err && <p className="mt-2 text-sm text-rose-600">{err}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
            Hủy
          </Button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium text-white disabled:opacity-60 ${
              danger ? "bg-rose-600 hover:bg-rose-700" : "bg-brand-600 hover:bg-brand-700"
            }`}
          >
            {pending && <LoaderCircle className="h-4 w-4 animate-spin" />} {confirmLabel}
          </button>
        </div>
      </Modal>
    </>
  );
}
