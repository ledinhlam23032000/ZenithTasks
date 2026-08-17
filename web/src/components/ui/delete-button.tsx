"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, LoaderCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

/**
 * Nút xóa: mở hộp thoại xác nhận trong app, rồi GỌI server action TRỰC TIẾP
 * (không qua <form action> để tránh treo trong bản production), sau đó làm mới trang.
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
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onConfirm() {
    setErr(null);
    const fd = new FormData();
    fd.append("id", id);
    startTransition(async () => {
      try {
        await action(fd);
        router.refresh();
        setOpen(false);
      } catch {
        setErr("Không xóa được, vui lòng thử lại.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        aria-label={label || "Xóa"}
        className={
          className ??
          "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-rose-500 hover:bg-rose-50"
        }
      >
        <Trash2 className="h-3.5 w-3.5" /> {label}
      </button>

      <Modal open={open} onClose={() => !pending && setOpen(false)} title="Xác nhận xóa" size="sm">
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
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60"
          >
            {pending && <LoaderCircle className="h-4 w-4 animate-spin" />} Xóa
          </button>
        </div>
      </Modal>
    </>
  );
}
