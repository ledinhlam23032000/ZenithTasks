"use client";

import { useState } from "react";
import { Copy, ExternalLink, QrCode } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { formatVND } from "@/lib/money";

const BANK_BIN = "970440"; // SeABank
const ACCOUNT_NUMBER = "000008939168";
const ACCOUNT_NAME = "CONG TY CP BENH VIEN HONG PHUC";

function vietQrUrl(amount: number, caseCode: string) {
  const params = new URLSearchParams({
    template: "compact2",
    amount: amount > 0 ? String(Math.round(amount)) : "",
    addInfo: caseCode,
    accountName: ACCOUNT_NAME,
  });
  return `https://img.vietqr.io/image/${BANK_BIN}-${ACCOUNT_NUMBER}-compact2.png?${params.toString()}`;
}

export function PaymentQrButton({ caseCode, amount }: { caseCode: string; amount: number }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const safeAmount = Math.max(0, Math.round(amount));
  const qrUrl = vietQrUrl(safeAmount, caseCode);

  async function copyAccount() {
    try {
      await navigator.clipboard.writeText(ACCOUNT_NUMBER);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <Button type="button" size="sm" variant="subtle" onClick={() => setOpen(true)}>
        <QrCode className="h-4 w-4" /> QR chuyển khoản
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="QR chuyển khoản SeABank"
        description="Khách quét mã bằng ứng dụng ngân hàng; số tiền và mã hồ sơ được điền sẵn khi còn công nợ."
        size="sm"
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm">
            {/* QR được tạo từ thông tin tài khoản công ty, không chứa dữ liệu y khoa của khách. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt={`QR chuyển khoản cho hồ sơ ${caseCode}`} className="mx-auto h-auto w-full max-w-[300px]" />
          </div>

          <div className="rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Số tiền đề nghị</span>
              <strong className="text-brand-700">{safeAmount > 0 ? formatVND(safeAmount) : "Nhập theo thỏa thuận"}</strong>
            </div>
            <div className="mt-1 flex items-center justify-between gap-3">
              <span className="text-slate-500">Nội dung</span>
              <strong className="font-mono text-slate-800">{caseCode}</strong>
            </div>
            <div className="mt-1 flex items-center justify-between gap-3">
              <span className="text-slate-500">Thụ hưởng</span>
              <span className="text-right font-medium text-slate-800">{ACCOUNT_NAME}</span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-3">
              <span className="text-slate-500">Ngân hàng</span>
              <span className="font-medium text-slate-800">SeABank</span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-3">
              <span className="text-slate-500">Số tài khoản</span>
              <button type="button" onClick={copyAccount} className="inline-flex items-center gap-1 font-mono font-semibold text-brand-700 hover:underline" title="Sao chép số tài khoản">
                {ACCOUNT_NUMBER} <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
            {copied && <p className="mt-1 text-right text-xs text-emerald-600">Đã sao chép số tài khoản</p>}
          </div>

          <p className="text-xs leading-5 text-slate-500">
            Sau khi khách chuyển khoản, nhân viên vẫn cần kiểm tra giao dịch thành công rồi bấm “Thu tiền” để ghi nhận vào hồ sơ. QR này chưa tự xác nhận tiền về ngân hàng.
          </p>

          <details className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-500">
            <summary className="cursor-pointer font-medium text-slate-700">Mở QR cố định dự phòng</summary>
            <div className="mt-3 text-center">
              {/* QR gốc do chủ tài khoản cung cấp; dùng khi dịch vụ VietQR động không tải được. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/payment-qr.webp" alt="QR SeABank cố định của Công ty Cổ phần Bệnh viện Hồng Phúc" className="mx-auto h-auto w-full max-w-[280px]" />
              <a href={qrUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-brand-700 hover:underline">
                Mở QR động ở tab mới <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </details>
        </div>
      </Modal>
    </>
  );
}
