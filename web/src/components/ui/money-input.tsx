"use client";

import { useState } from "react";
import { Input } from "@/components/ui/field";

/**
 * Ô nhập tiền: hiển thị có dấu chấm ngăn cách (15.000.000) trong khi gõ,
 * nhưng gửi đi giá trị SỐ THUẦN qua input ẩn (name) để xử lý phía máy chủ.
 *
 * Hai chế độ:
 *  - Không kiểm soát (uncontrolled): chỉ truyền `defaultValue` — tự giữ state.
 *  - Có kiểm soát (controlled): truyền `value` + `onValueChange` — dùng khi
 *    component cha cần tính toán (VD: thành tiền = đơn giá × SL − giảm giá).
 */
export function MoneyInput({
  name,
  id,
  defaultValue = 0,
  value,
  onValueChange,
  placeholder,
  required,
  autoFocus,
}: {
  name?: string;
  id?: string;
  defaultValue?: number;
  value?: number;
  onValueChange?: (n: number) => void;
  placeholder?: string;
  required?: boolean;
  autoFocus?: boolean;
}) {
  const controlled = value !== undefined;
  const [digits, setDigits] = useState<string>(defaultValue ? String(Math.round(defaultValue)) : "");
  const raw = controlled ? (value ? String(Math.round(value)) : "") : digits;
  const display = raw ? Number(raw).toLocaleString("vi-VN") : "";

  return (
    <>
      {name && <input type="hidden" name={name} value={raw} />}
      <Input
        id={id}
        inputMode="numeric"
        value={display}
        onChange={(e) => {
          const d = e.target.value.replace(/\D/g, "");
          if (controlled) onValueChange?.(d ? Number(d) : 0);
          else setDigits(d);
        }}
        placeholder={placeholder ?? "0"}
        required={required}
        autoFocus={autoFocus}
      />
    </>
  );
}
