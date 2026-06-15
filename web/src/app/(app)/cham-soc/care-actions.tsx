"use client";

import { useActionState, useEffect, useState } from "react";
import { Pencil, LoaderCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label, Select, Textarea } from "@/components/ui/field";
import { CARE_CHANNEL } from "@/lib/status";
import { updateCareMessage, type CareFormState } from "./actions";

export type EditableCareMessage = {
  id: string;
  channel: string;
  direction: string;
  content: string;
};

export function EditCareButton({ message }: { message: EditableCareMessage }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<CareFormState, FormData>(updateCareMessage, {});
  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state.ok, state.nonce]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Sửa tin chăm sóc"
        title="Sửa"
        className="rounded-md p-1.5 text-slate-300 hover:bg-brand-50 hover:text-brand-600"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Sửa tin chăm sóc">
        <form action={action} className="space-y-4">
          <input type="hidden" name="id" value={message.id} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor={`ch-${message.id}`}>Kênh</Label>
              <Select id={`ch-${message.id}`} name="channel" defaultValue={message.channel}>
                {Object.entries(CARE_CHANNEL).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor={`dir-${message.id}`}>Chiều</Label>
              <Select id={`dir-${message.id}`} name="direction" defaultValue={message.direction}>
                <option value="OUT">Gửi tới khách</option>
                <option value="IN">Khách phản hồi</option>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor={`content-${message.id}`}>Nội dung *</Label>
            <Textarea id={`content-${message.id}`} name="content" defaultValue={message.content} required className="min-h-[90px]" autoFocus />
          </div>
          {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Hủy</Button>
            <button type="submit" disabled={pending} className={buttonVariants()}>
              {pending && <LoaderCircle className="h-4 w-4 animate-spin" />} Lưu thay đổi
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
