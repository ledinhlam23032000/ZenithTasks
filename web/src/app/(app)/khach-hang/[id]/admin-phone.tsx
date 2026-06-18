"use client";

import { useState, useTransition } from "react";
import { Phone, Copy, Check, MessageCircle, Eye, LoaderCircle } from "lucide-react";
import { revealPhone } from "../actions";

/**
 * Hiện số điện thoại đầy đủ KHI BẤM (gọi server action có kiểm tra quyền + ghi nhật ký).
 * Mặc định chỉ thấy 5 số cuối; bấm "Hiện số" mới giải mã.
 */
export function AdminPhone({ customerId, last5 }: { customerId: string; last5: string }) {
  const [phone, setPhone] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function reveal() {
    setErr(null);
    start(async () => {
      const r = await revealPhone(customerId);
      if (r.error) setErr(r.error);
      else if (r.phone) setPhone(r.phone);
    });
  }

  function copy() {
    if (!phone) return;
    navigator.clipboard?.writeText(phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!phone) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="text-slate-500">••• {last5}</span>
        <button
          type="button"
          onClick={reveal}
          disabled={pending}
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-brand-600 hover:bg-brand-50 disabled:opacity-60"
        >
          {pending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />} Hiện số
        </button>
        {err && <span className="text-xs text-rose-600">{err}</span>}
      </span>
    );
  }

  const zalo = `https://zalo.me/${phone}`;
  return (
    <span className="inline-flex items-center gap-2">
      <span className="font-medium text-slate-800" title="Chỉ người có quyền mới xem được">{phone}</span>
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
