"use client";

import { useActionState, useEffect, useRef } from "react";
import { Send, LoaderCircle } from "lucide-react";
import { Select, Textarea } from "@/components/ui/field";
import { buttonVariants } from "@/components/ui/button";
import { CARE_CHANNEL } from "@/lib/status";
import { addCareMessage, type CareFormState } from "./actions";

export function CareComposer({ customerId, caseId }: { customerId: string; caseId?: string }) {
  const [state, action, pending] = useActionState<CareFormState, FormData>(addCareMessage, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok, state.nonce]);

  return (
    <form ref={formRef} action={action} className="space-y-2.5">
      <input type="hidden" name="customerId" value={customerId} />
      {caseId && <input type="hidden" name="caseId" value={caseId} />}
      <div className="flex items-center gap-2">
        <Select name="channel" defaultValue="ZALO" className="h-9 w-36">
          {Object.entries(CARE_CHANNEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </Select>
        <Select name="direction" defaultValue="OUT" className="h-9 w-40">
          <option value="OUT">Gửi tới khách</option>
          <option value="IN">Khách phản hồi</option>
        </Select>
      </div>
      <Textarea name="content" placeholder="Nội dung tin nhắn / ghi nhận chăm sóc…" required className="min-h-[70px]" />
      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      <div className="flex justify-end">
        <button type="submit" disabled={pending} className={buttonVariants({ size: "sm" })}>
          {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Ghi nhận
        </button>
      </div>
    </form>
  );
}
