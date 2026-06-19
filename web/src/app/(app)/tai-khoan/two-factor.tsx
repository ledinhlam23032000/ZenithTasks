"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { ShieldCheck, LoaderCircle, CheckCircle2 } from "lucide-react";
import { Input, Label } from "@/components/ui/field";
import { buttonVariants } from "@/components/ui/button";
import { start2FA, enable2FA, disable2FA, type TwoFAState } from "@/lib/account-actions";

export function TwoFactor({ enabled }: { enabled: boolean }) {
  const [on, setOn] = useState(enabled);
  const [setup, setSetup] = useState<{ secret: string; otpauth: string } | null>(null);
  const [starting, startTransition] = useTransition();
  const [enableState, enableAction, enabling] = useActionState<TwoFAState, FormData>(enable2FA, {});
  const [disableState, disableAction, disabling] = useActionState<TwoFAState, FormData>(disable2FA, {});

  useEffect(() => {
    if (enableState.ok) {
      setOn(true);
      setSetup(null);
    }
  }, [enableState.ok]);
  useEffect(() => {
    if (disableState.ok) setOn(false);
  }, [disableState.ok]);

  if (on) {
    return (
      <div className="space-y-2">
        <p className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600">
          <CheckCircle2 className="h-4 w-4" /> Đang bật xác thực 2 lớp
        </p>
        <form action={disableAction} className="flex max-w-sm items-end gap-2">
          <div className="flex-1">
            <Label htmlFor="tf-off">Nhập mật khẩu để tắt</Label>
            <Input id="tf-off" name="current" type="password" autoComplete="current-password" required />
          </div>
          <button type="submit" disabled={disabling} className={buttonVariants({ variant: "secondary" })}>
            {disabling && <LoaderCircle className="h-4 w-4 animate-spin" />} Tắt
          </button>
        </form>
        {disableState.error && <p className="text-sm text-rose-600">{disableState.error}</p>}
      </div>
    );
  }

  if (!setup) {
    return (
      <div>
        <p className="mb-3 text-sm text-slate-500">
          Tăng bảo mật: khi đăng nhập sẽ cần thêm mã 6 số từ ứng dụng xác thực (Google Authenticator, Authy…).
        </p>
        <button
          type="button"
          disabled={starting}
          onClick={() =>
            startTransition(async () => {
              const r = await start2FA();
              if (r.secret && r.otpauth) setSetup({ secret: r.secret, otpauth: r.otpauth });
            })
          }
          className={buttonVariants()}
        >
          {starting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Bật xác thực 2 lớp
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md space-y-3">
      <p className="text-sm text-slate-600">
        <b>Bước 1:</b> Mở ứng dụng xác thực → “Thêm tài khoản” → “Nhập khoá thủ công”, dán khoá sau:
      </p>
      <code className="block break-all rounded-lg bg-slate-100 px-3 py-2 font-mono text-sm tracking-wider text-slate-800">
        {setup.secret}
      </code>
      <form action={enableAction} className="flex items-end gap-2">
        <div className="flex-1">
          <Label htmlFor="tf-code">
            <b>Bước 2:</b> Nhập mã 6 số để xác nhận
          </Label>
          <Input id="tf-code" name="code" inputMode="numeric" maxLength={6} placeholder="123456" required autoFocus />
        </div>
        <button type="submit" disabled={enabling} className={buttonVariants()}>
          {enabling && <LoaderCircle className="h-4 w-4 animate-spin" />} Xác nhận
        </button>
      </form>
      {enableState.error && <p className="text-sm text-rose-600">{enableState.error}</p>}
    </div>
  );
}
