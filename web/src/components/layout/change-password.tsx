"use client";

import { useActionState, useEffect } from "react";
import { LoaderCircle, CheckCircle2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { changePassword, type PasswordState } from "@/lib/account-actions";

export function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [state, action, pending] = useActionState<PasswordState, FormData>(changePassword, {});

  // Tự đóng sau khi đổi thành công
  useEffect(() => {
    if (!state.ok) return;
    const t = setTimeout(onClose, 1200);
    return () => clearTimeout(t);
  }, [state.ok, onClose]);

  return (
    <Modal open={open} onClose={onClose} title="Đổi mật khẩu">
      {state.ok ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          <p className="font-medium text-slate-800">Đã đổi mật khẩu thành công</p>
        </div>
      ) : (
        <form action={action} className="space-y-4">
          <div>
            <Label htmlFor="cp-current">Mật khẩu hiện tại</Label>
            <Input id="cp-current" name="current" type="password" autoComplete="current-password" required autoFocus />
          </div>
          <div>
            <Label htmlFor="cp-next">Mật khẩu mới</Label>
            <Input id="cp-next" name="next" type="password" autoComplete="new-password" placeholder="Tối thiểu 12 ký tự" required />
          </div>
          <div>
            <Label htmlFor="cp-confirm">Xác nhận mật khẩu mới</Label>
            <Input id="cp-confirm" name="confirm" type="password" autoComplete="new-password" required />
          </div>
          {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>Hủy</Button>
            <button type="submit" disabled={pending} className={buttonVariants()}>
              {pending && <LoaderCircle className="h-4 w-4 animate-spin" />} Đổi mật khẩu
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
