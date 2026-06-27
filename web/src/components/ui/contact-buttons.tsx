"use client";

import { useState, useTransition } from "react";
import { Phone, MessageCircle, MessageSquareText, Eye, LoaderCircle } from "lucide-react";
import { revealPhone } from "@/app/(app)/khach-hang/actions";

/**
 * Nút liên hệ nhanh (B2 bậc 1): Gọi / SMS / Zalo qua deep-link, KHÔNG tự gửi —
 * nhân viên bấm rồi gửi thật từ app điện thoại của họ. Số đầy đủ chỉ hiện ra
 * khi bấm "Liên hệ" (gọi server action có kiểm tra quyền `phone.full` + ghi
 * nhật ký REVEAL_PHONE), giống quy ước AdminPhone ở trang khách hàng.
 */
export function ContactButtons({
  customerId,
  last5,
  smsBody,
}: {
  customerId: string;
  last5: string | null | undefined;
  smsBody?: string;
}) {
  const [phone, setPhone] = useState<string | null>(null);
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

  if (!phone) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="text-xs text-slate-400">••• {last5 || "?????"}</span>
        <button
          type="button"
          onClick={reveal}
          disabled={pending}
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-brand-600 hover:bg-brand-50 disabled:opacity-60"
        >
          {pending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />} Liên hệ
        </button>
        {err && <span className="text-xs text-rose-600">{err}</span>}
      </span>
    );
  }

  const smsHref = `sms:${phone}${smsBody ? `?body=${encodeURIComponent(smsBody)}` : ""}`;
  const zaloHref = `https://zalo.me/${phone}`;

  return (
    <span className="inline-flex items-center gap-1.5">
      <a
        href={`tel:${phone}`}
        title="Gọi điện"
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
      >
        <Phone className="h-3.5 w-3.5" /> Gọi
      </a>
      <a
        href={smsHref}
        title="Soạn SMS"
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
      >
        <MessageSquareText className="h-3.5 w-3.5" /> SMS
      </a>
      <a
        href={zaloHref}
        target="_blank"
        rel="noopener noreferrer"
        title="Nhắn Zalo"
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-sky-600 hover:bg-sky-50"
      >
        <MessageCircle className="h-3.5 w-3.5" /> Zalo
      </a>
    </span>
  );
}
