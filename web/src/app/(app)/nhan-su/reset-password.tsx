"use client";

import { useActionState, useEffect, useState } from "react";
import { KeyRound, LoaderCircle, CheckCircle2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { resetStaffPassword, type PasswordState } from "@/lib/account-actions";

export function ResetPasswordButton({ userId, name }: { userId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<PasswordState, FormData>(resetStaffPassword, {});

  useEffect(() => {
    if (!state.ok) return;
    const t = setTimeout(() => setOpen(false), 1200);
    return () => clearTimeout(t);
  }, [state.ok]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
        title="Đặt lại mật khẩu"
      >
        <KeyRound className="h-3.5 w-3.5" /> Mật khẩu
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Đặt lại mật khẩu — ${name}`} size="sm">
        {state.ok ? (
          <div className="flex flex-col items-center gap-2 py-5 text-center">
            <CheckCircle2 className="h-9 w-9 text-emerald-500" />
            <p className="text-sm font-medium text-slate-800">Đã đặt lại mật khẩu</p>
          </div>
        ) : (
          <form action={action} className="space-y-4">
            <input type="hidden" name="userId" value={userId} />
            <div>
              <Label htmlFor={`rp-${userId}`}>Mật khẩu mới</Label>
              <Input id={`rp-${userId}`} name="next" type="text" placeholder="Tối thiểu 6 ký tự" required autoFocus />
            </div>
            {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Hủy</Button>
              <button type="submit" disabled={pending} className={buttonVariants()}>
                {pending && <LoaderCircle className="h-4 w-4 animate-spin" />} Đặt lại
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
