import Link from "next/link";
import { CalendarClock, ChevronRight, Handshake, ShieldCheck, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatVND } from "@/lib/money";
import type { Customer360Snapshot } from "@/lib/customer-360";

function fmtDateTime(value: Date): string {
  return value.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

export function Customer360MiniCard({ snapshot, compact = false }: { snapshot: Customer360Snapshot; compact?: boolean }) {
  const debt = snapshot.latestCase?.debtAmount ?? 0;
  return (
    <Card className="border-brand-100 bg-brand-50/20">
      <CardContent className={compact ? "space-y-2.5 p-3" : "space-y-3 p-4"}>
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-sm font-bold text-brand-700">
            {snapshot.fullName.trim().slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <Link href={`/khach-hang/${snapshot.id}`} className="truncate font-semibold text-slate-900 hover:text-brand-700 hover:underline">
                {snapshot.fullName}
              </Link>
              <Badge tone="slate">{snapshot.code}</Badge>
            </div>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
              <ShieldCheck className="h-3 w-3 text-brand-500" /> •••{snapshot.phoneLast5}
              {snapshot.collaborator && <><span>·</span><Handshake className="h-3 w-3 text-violet-500" /> {snapshot.collaborator.name}</>}
            </p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {snapshot.latestCase && (
            <div className="rounded-lg border border-slate-100 bg-white px-2.5 py-2 text-xs">
              <p className="text-slate-400">Hồ sơ gần nhất</p>
              <Link href={`/ho-so/${snapshot.latestCase.id}`} className="mt-0.5 inline-flex items-center gap-1 font-semibold text-slate-700 hover:text-brand-700">
                {snapshot.latestCase.code} · {snapshot.latestCase.status}
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          )}
          <div className="rounded-lg border border-slate-100 bg-white px-2.5 py-2 text-xs">
            <p className="text-slate-400">Trạng thái tiếp theo</p>
            <p className="mt-0.5 font-semibold text-brand-700">{snapshot.nextAction.reason}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          {snapshot.nextAppointment && (
            <span className="inline-flex items-center gap-1.5"><CalendarClock className="h-3.5 w-3.5 text-brand-500" /> {fmtDateTime(snapshot.nextAppointment.scheduledAt)}</span>
          )}
          {snapshot.visibility.canSeeFinance && snapshot.latestCase && (
            <span className={debt > 0 ? "inline-flex items-center gap-1.5 font-semibold text-rose-600" : "inline-flex items-center gap-1.5 text-emerald-600"}>
              <Wallet className="h-3.5 w-3.5" /> {debt > 0 ? `Nợ ${formatVND(debt)}` : "Đã đủ thanh toán"}
            </span>
          )}
          {snapshot.unreadConversationCount > 0 && <span className="font-semibold text-violet-600">{snapshot.unreadConversationCount} hội thoại chưa đọc</span>}
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href={snapshot.nextAction.href} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-700">
            {snapshot.nextAction.label} <ChevronRight className="h-3.5 w-3.5" />
          </Link>
          <Link href={`/khach-hang/${snapshot.id}`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
            Mở Customer 360
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
