"use client";

import { useActionState } from "react";
import { Eye, EyeOff, Lock, User2, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { loginAction, type LoginState } from "./actions";
import { Input, Label } from "@/components/ui/field";
import { buttonVariants } from "@/components/ui/button";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});
  const [show, setShow] = useState(false);

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="username">Tên đăng nhập</Label>
        <div className="relative">
          <User2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input id="username" name="username" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoFocus placeholder="vd: letan" className="pl-9" required />
        </div>
      </div>

      <div>
        <Label htmlFor="password">Mật khẩu</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            className="pl-9 pr-10"
            required
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600"
            aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {state.error?.includes("2 lớp") && (
        <div>
          <Label htmlFor="code">Mã xác thực 2 lớp</Label>
          <Input id="code" name="code" inputMode="numeric" maxLength={6} placeholder="6 số từ ứng dụng xác thực" autoFocus />
        </div>
      )}

      {state.error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 ring-1 ring-rose-600/10">{state.error}</p>
      )}

      <button type="submit" disabled={pending} className={buttonVariants({ size: "lg", className: "w-full" })}>
        {pending && <LoaderCircle className="h-4 w-4 animate-spin" />}
        {pending ? "Đang đăng nhập…" : "Đăng nhập"}
      </button>
    </form>
  );
}
