"use client";

import { Trash2 } from "lucide-react";

/**
 * Nút xóa có hỏi xác nhận. `action` là server action (truyền từ server component).
 * Hiển thị cho vai trò được phép — việc kiểm soát quyền do phía gọi quyết định.
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
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        aria-label={label}
        className={
          className ??
          "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-rose-500 hover:bg-rose-50"
        }
      >
        <Trash2 className="h-3.5 w-3.5" /> {label}
      </button>
    </form>
  );
}
