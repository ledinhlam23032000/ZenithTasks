"use client";

import { useState, useTransition } from "react";
import { Check, CalendarClock, LoaderCircle, Send } from "lucide-react";
import { portalConfirmAppointment, portalRequestReschedule } from "./actions";

/**
 * Nút cho khách tự XÁC NHẬN / ĐỀ NGHỊ ĐỔI lịch hẹn (D3) — gọi server action công khai
 * (đã kiểm token + quyền sở hữu lịch). Phản hồi ngay tại chỗ.
 */
export function PortalAppointmentActions({
  token,
  appointmentId,
  status,
}: {
  token: string;
  appointmentId: string;
  status: string;
}) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState<"confirmed" | "reschedule" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showResched, setShowResched] = useState(false);
  const [msg, setMsg] = useState("");

  const confirmed = status === "CONFIRMED" || done === "confirmed";

  function confirm() {
    setErr(null);
    start(async () => {
      const r = await portalConfirmAppointment(token, appointmentId);
      if (r.error) setErr(r.error);
      else setDone("confirmed");
    });
  }
  function sendReschedule() {
    setErr(null);
    start(async () => {
      const r = await portalRequestReschedule(token, appointmentId, msg);
      if (r.error) setErr(r.error);
      else {
        setDone("reschedule");
        setShowResched(false);
      }
    });
  }

  if (done === "reschedule") {
    return <p className="mt-2 text-xs font-medium text-emerald-600">Đã gửi yêu cầu đổi lịch — phòng khám sẽ liên hệ lại với bạn.</p>;
  }

  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {confirmed ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
            <Check className="h-3.5 w-3.5" /> Đã xác nhận
          </span>
        ) : (
          <button
            onClick={confirm}
            disabled={pending}
            className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {pending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Xác nhận sẽ đến
          </button>
        )}
        <button
          onClick={() => setShowResched((s) => !s)}
          disabled={pending}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
        >
          <CalendarClock className="h-3.5 w-3.5" /> Đề nghị đổi lịch
        </button>
      </div>

      {showResched && (
        <div className="space-y-2 rounded-lg bg-slate-50 p-2">
          <textarea
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            rows={2}
            placeholder="Bạn muốn đổi sang khung giờ nào? (không bắt buộc)"
            className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-brand-400"
          />
          <button
            onClick={sendReschedule}
            disabled={pending}
            className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-900 disabled:opacity-60"
          >
            {pending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Gửi yêu cầu
          </button>
        </div>
      )}

      {err && <p className="text-xs text-rose-600">{err}</p>}
    </div>
  );
}
