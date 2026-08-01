"use client";

import { useState, useSyncExternalStore } from "react";
import { Share2, Copy, Check, RefreshCw, Trash2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { genPortalLink, revokePortalLink } from "../actions";

export function PortalLink({ customerId, token }: { customerId: string; token: string | null }) {
  const origin = useSyncExternalStore(() => () => undefined, () => window.location.origin, () => "");
  const [copied, setCopied] = useState(false);
  const url = token ? `${origin}/khach/${token}` : "";

  if (!token) {
    return (
      <form action={genPortalLink}>
        <input type="hidden" name="customerId" value={customerId} />
        <p className="mb-2 text-sm text-slate-500">
          Tạo link riêng để khách tự xem lịch sử điều trị, ảnh trước/sau, lịch hẹn và công nợ.
        </p>
        <button className={buttonVariants({ variant: "secondary", size: "sm" })}>
          <Share2 className="h-4 w-4" /> Tạo link cổng khách
        </button>
      </form>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
        />
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className={buttonVariants({ variant: "secondary", size: "sm" })}
        >
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />} Chép
        </button>
      </div>
      <div className="flex items-center gap-2">
        <form action={genPortalLink}>
          <input type="hidden" name="customerId" value={customerId} />
          <button className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100">
            <RefreshCw className="h-3.5 w-3.5" /> Đổi link mới
          </button>
        </form>
        <form action={revokePortalLink}>
          <input type="hidden" name="customerId" value={customerId} />
          <button className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-rose-500 hover:bg-rose-50">
            <Trash2 className="h-3.5 w-3.5" /> Thu hồi
          </button>
        </form>
      </div>
      <p className="text-xs text-slate-400">Gửi link cho khách qua Zalo/SMS. Ai có link đều xem được — bấm “Thu hồi” nếu cần.</p>
    </div>
  );
}
