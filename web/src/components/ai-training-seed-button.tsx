"use client";

import { useEffect } from "react";
import { Database, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFormAction } from "@/lib/use-form-action";
import { seedAiTrainingDemoAction } from "@/lib/ai-training-actions";

export function AiTrainingSeedButton() {
  const router = useRouter();
  const [state, action, pending] = useFormAction(seedAiTrainingDemoAction, () => router.refresh());
  useEffect(() => { if (state.ok) router.refresh(); }, [router, state.ok]);
  return <div className="space-y-2"><form action={action}><button type="submit" disabled={pending} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-violet-600 px-3.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />} {pending ? "Đang tạo demo…" : "Tạo bộ demo an toàn"}</button></form>{state.message && <p role="status" className="text-sm text-emerald-700">{state.message}</p>}{state.error && <p role="alert" className="text-sm text-rose-700">{state.error}</p>}</div>;
}
