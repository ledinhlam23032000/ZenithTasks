"use client";

import type { ReactNode } from "react";

/** Nút submit có hộp thoại xác nhận. `action` là server action; `fields` là các input ẩn kèm theo. */
export function ConfirmButton({
  action,
  fields,
  confirmText,
  className,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  fields: Record<string, string>;
  confirmText: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
    >
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button type="submit" className={className}>
        {children}
      </button>
    </form>
  );
}
