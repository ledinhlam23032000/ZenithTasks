"use client";

import { useEffect } from "react";
import { FlaskConical, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFormAction } from "@/lib/use-form-action";
import { seedV2DemoAction } from "@/lib/v2-demo-actions";

export function V2DemoSeedButton() {
  const router = useRouter();
  const [state, action, pending] = useFormAction(seedV2DemoAction, () => router.refresh());
  useEffect(() => { if (state.ok) router.refresh(); }, [router, state.ok]);
  return <div className="space-y-2"><form action={action}><button type="submit" disabled={pending} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-600 px-3.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />} {pending ? "Đang tạo demo…" : "Tạo dữ liệu V2 demo"}</button></form>{state.message && <p role="status" className="text-sm text-emerald-700">{state.message}</p>}{state.error && <p role="alert" className="text-sm text-rose-700">{state.error}</p>}</div>;
}
