"use client";

import { useState, useTransition } from "react";
import { Phone, MessageCircle, MessageSquareText, Eye, LoaderCircle, Copy, Check } from "lucide-react";

/**
 * Nút liên hệ nhanh (B2 bậc 1): Gọi / SMS / Zalo qua deep-link, KHÔNG tự gửi —
 * nhân viên bấm rồi gửi thật từ app điện thoại của họ. Số đầy đủ chỉ hiện ra
 * khi bấm "Liên hệ" (gọi `reveal` — server action của nơi gọi, có kiểm tra quyền
 * `phone.full` + ghi nhật ký REVEAL_PHONE), giống quy ước AdminPhone ở trang khách
 * hàng. `reveal` nhận vào để component dùng CHUNG được cho nhiều nguồn SĐT mã hoá
 * (Customer, Appointment đặt lịch online…) mà không phải biết trước là loại nào.
 */
export function ContactButtons({
  reveal: revealFn,
  last5,
  smsBody,
}: {
  reveal: () => Promise<{ phone?: string; error?: string }>;
  last5: string | null | undefined;
  smsBody?: string;
}) {
  const [phone, setPhone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  function reveal() {
    setErr(null);
    start(async () => {
      const r = await revealFn();
      if (r.error) setErr(r.error);
      else if (r.phone) setPhone(r.phone);
    });
  }

  async function copyNumber() {
    if (!phone) return;
    try {
      await navigator.clipboard.writeText(phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setErr("Trình duyệt không cho sao chép — hãy bôi đen số để chép tay.");
    }
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
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {/* Số đầy đủ + chép — để bấm gọi tay trên ĐT chăm sóc riêng (deep-link tel: chỉ chạy trên điện thoại). */}
      <button
        type="button"
        onClick={copyNumber}
        title="Bấm để sao chép số"
        className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-slate-700 hover:bg-slate-200"
      >
        {phone}
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
      </button>
      <a
        href={`tel:${phone}`}
        title="Gọi điện (trên điện thoại)"
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
      {copied && <span className="text-xs text-emerald-600">Đã chép</span>}
      {err && <span className="text-xs text-rose-600">{err}</span>}
    </span>
  );
}
