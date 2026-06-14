"use client";

import { useState, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

/**
 * Nút submit kèm xác nhận TRONG APP (không dùng window.confirm). `action` là
 * server action; `fields` là các input ẩn gửi kèm. Dùng cho xóa thanh toán,
 * tái khám, khóa hồ sơ…
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
  const [pending, setPending] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Xác nhận" size="sm">
        <p className="text-sm text-slate-600">{confirmText}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            Hủy
          </Button>
          <form action={action} onSubmit={() => setPending(true)}>
            {Object.entries(fields).map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}
            <button
              type="submit"
              disabled={pending}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium text-white disabled:opacity-60 ${
                danger ? "bg-rose-600 hover:bg-rose-700" : "bg-brand-600 hover:bg-brand-700"
              }`}
            >
              {pending && <LoaderCircle className="h-4 w-4 animate-spin" />} {confirmLabel}
            </button>
          </form>
        </div>
      </Modal>
    </>
  );
}
