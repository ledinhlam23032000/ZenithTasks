"use client";

import { useState } from "react";
import { Trash2, LoaderCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

/**
 * Nút xóa: bấm mở hộp thoại xác nhận TRONG APP (không dùng window.confirm để
 * tránh bị trình duyệt/PWA chặn), xác nhận thì gọi server action.
 */
export function DeleteButton({
  action,
  id,
  confirmText,
  label = "Xóa",
  className,
}: {
  action: (formData: FormData) => void | Promise<void>;
  id: string;
  confirmText: string;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label || "Xóa"}
        className={
          className ??
          "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-rose-500 hover:bg-rose-50"
        }
      >
        <Trash2 className="h-3.5 w-3.5" /> {label}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Xác nhận xóa" size="sm">
        <p className="text-sm text-slate-600">{confirmText}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            Hủy
          </Button>
          <form action={action} onSubmit={() => setPending(true)}>
            <input type="hidden" name="id" value={id} />
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60"
            >
              {pending && <LoaderCircle className="h-4 w-4 animate-spin" />} Xóa
            </button>
          </form>
        </div>
      </Modal>
    </>
  );
}
