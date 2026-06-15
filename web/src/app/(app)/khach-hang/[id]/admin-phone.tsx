"use client";

import { useState } from "react";
import { Phone, Copy, Check, MessageCircle } from "lucide-react";

/**
 * Hiển thị số điện thoại ĐẦY ĐỦ cho Quản trị viên, kèm nút gọi / nhắn Zalo / sao chép.
 * Component này chỉ được render khi máy chủ đã xác thực vai trò ADMIN.
 */
export function AdminPhone({ phone }: { phone: string }) {
  const [copied, setCopied] = useState(false);
  const zalo = `https://zalo.me/${phone}`;

  function copy() {
    navigator.clipboard?.writeText(phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span className="font-medium text-slate-800" title="Số đầy đủ — chỉ quản trị viên xem được">
        {phone}
      </span>
      <button type="button" onClick={copy} className="text-slate-400 hover:text-slate-600" title="Sao chép">
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
      <a href={`tel:${phone}`} className="text-slate-400 hover:text-brand-600" title="Gọi điện">
        <Phone className="h-3.5 w-3.5" />
      </a>
      <a href={zalo} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-sky-600" title="Nhắn Zalo">
        <MessageCircle className="h-3.5 w-3.5" />
      </a>
    </span>
  );
}
