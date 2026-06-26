"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogIn, LogOut, CheckCircle2, LoaderCircle, Clock } from "lucide-react";
import { checkIn, checkOut } from "./actions";

export function CheckInWidget({
  checkedIn,
  checkedOut,
  checkInTime,
  checkOutTime,
}: {
  checkedIn: boolean;
  checkedOut: boolean;
  checkInTime?: string;
  checkOutTime?: string;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (fn: () => Promise<void>) =>
    start(async () => {
      await fn();
      router.refresh();
    });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="flex items-center gap-2 text-sm font-medium text-slate-500">
        <Clock className="h-4 w-4 text-brand-500" /> Chấm công hôm nay
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {!checkedIn ? (
          <button
            onClick={() => run(checkIn)}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />} Chấm công VÀO
          </button>
        ) : (
          <>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> Đã vào lúc {checkInTime}
            </span>
            {!checkedOut ? (
              <button
                onClick={() => run(checkOut)}
                disabled={pending}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />} Chấm công RA
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">
                <LogOut className="h-4 w-4" /> Đã ra lúc {checkOutTime}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
