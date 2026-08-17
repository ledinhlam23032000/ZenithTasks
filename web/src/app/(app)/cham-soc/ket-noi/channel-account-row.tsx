"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, LoaderCircle, RefreshCw, Unplug, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { testChannelConnection, disconnectChannelAccount, reconnectChannelAccount, extendFacebookToken } from "./actions";
import type { ChannelKind } from "@/generated/prisma/client";

export function ChannelAccountRow({
  id,
  kind,
  label,
  active,
  tokenExpiresLabel,
  connectedByName,
}: {
  id: string;
  kind: ChannelKind;
  label: string;
  active: boolean;
  tokenExpiresLabel?: string | null;
  connectedByName?: string | null;
}) {
  const [pending, start] = useTransition();
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [extendPending, startExtend] = useTransition();

  function runTest() {
    setTestResult(null);
    const fd = new FormData();
    fd.append("id", id);
    start(async () => {
      const r = await testChannelConnection({}, fd);
      setTestResult(r.ok ? { ok: true, msg: `Kết nối tốt — "${r.label}"` } : { ok: false, msg: r.error ?? "Kiểm tra thất bại." });
    });
  }

  function runExtend() {
    const fd = new FormData();
    fd.append("id", id);
    startExtend(async () => {
      await extendFacebookToken(fd);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 p-3.5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-slate-800">{label}</span>
          <Badge tone={active ? "green" : "slate"}>{active ? "Đang hoạt động" : "Đã ngắt"}</Badge>
        </div>
        <p className="mt-0.5 text-xs text-slate-400">
          {connectedByName && <>Kết nối bởi {connectedByName}</>}
          {kind === "ZALO_OA" && tokenExpiresLabel && <> · Token hết hạn {tokenExpiresLabel} (tự làm mới)</>}
        </p>
        {testResult && (
          <p className={`mt-1 text-xs ${testResult.ok ? "text-emerald-600" : "text-rose-600"}`}>
            {testResult.ok && <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />}
            {testResult.msg}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={runTest}
          disabled={pending}
          className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
        >
          {pending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Kiểm tra
        </button>
        {kind === "FACEBOOK" && (
          <button
            type="button"
            onClick={runExtend}
            disabled={extendPending}
            title="Đổi sang token dài hạn (~60 ngày) nếu đang dùng token ngắn hạn từ Graph API Explorer"
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            {extendPending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
            Gia hạn token
          </button>
        )}
        {active ? (
          <ConfirmButton
            action={disconnectChannelAccount}
            fields={{ id }}
            confirmText={`Ngắt kết nối "${label}"? Tin nhắn cũ vẫn còn trong hộp thư, chỉ ngừng nhận/gửi tin mới.`}
            confirmLabel="Ngắt kết nối"
            className="inline-flex items-center gap-1 rounded-md border border-rose-200 px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
          >
            <Unplug className="h-3.5 w-3.5" /> Ngắt kết nối
          </ConfirmButton>
        ) : (
          <ConfirmButton
            action={reconnectChannelAccount}
            fields={{ id }}
            confirmText={`Kết nối lại "${label}"?`}
            confirmLabel="Kết nối lại"
            danger={false}
            className="inline-flex items-center gap-1 rounded-md border border-brand-200 px-2.5 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Kết nối lại
          </ConfirmButton>
        )}
      </div>
    </div>
  );
}
