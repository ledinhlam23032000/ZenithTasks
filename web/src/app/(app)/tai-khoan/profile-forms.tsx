"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { LoaderCircle, CheckCircle2, Camera, Save } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Input, Label } from "@/components/ui/field";
import { buttonVariants } from "@/components/ui/button";
import {
  updateMyProfile,
  updateMyAvatar,
  changePassword,
  type ProfileState,
  type PasswordState,
} from "@/lib/account-actions";

function Saved({ nonce, ok }: { nonce?: number; ok?: boolean }) {
  if (!ok && !nonce) return null;
  return (
    <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
      <CheckCircle2 className="h-4 w-4" /> Đã lưu
    </span>
  );
}

export function AvatarUploader({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateMyAvatar, {});
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) setPreview(null);
  }, [state.ok, state.nonce]);

  return (
    <form ref={formRef} action={action} className="flex items-center gap-5">
      <Avatar name={name} src={preview ?? avatarUrl} className="h-20 w-20 text-2xl" />
      <div className="space-y-2">
        <input
          ref={inputRef}
          type="file"
          name="avatar"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setPreview(f ? URL.createObjectURL(f) : null);
          }}
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            <Camera className="h-4 w-4" /> Chọn ảnh
          </button>
          <button type="submit" disabled={pending || !preview} className={buttonVariants({ size: "sm" })}>
            {pending && <LoaderCircle className="h-4 w-4 animate-spin" />} Lưu ảnh
          </button>
          <Saved ok={state.ok} nonce={state.nonce} />
        </div>
        <p className="text-xs text-slate-400">JPG, PNG hoặc WEBP · tối đa 4MB.</p>
        {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      </div>
    </form>
  );
}

export function ProfileInfoForm({ fullName, phone }: { fullName: string; phone: string }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateMyProfile, {});
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="p-fullName">Họ và tên *</Label>
          <Input id="p-fullName" name="fullName" defaultValue={fullName} required />
        </div>
        <div>
          <Label htmlFor="p-phone">Số điện thoại nội bộ</Label>
          <Input id="p-phone" name="phone" inputMode="tel" defaultValue={phone} placeholder="09xx xxx xxx" />
        </div>
      </div>
      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      <div className="flex items-center justify-end gap-3">
        <Saved ok={state.ok} nonce={state.nonce} />
        <button type="submit" disabled={pending} className={buttonVariants()}>
          {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Lưu thông tin
        </button>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<PasswordState, FormData>(changePassword, {});
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="ch-current">Mật khẩu hiện tại</Label>
          <Input id="ch-current" name="current" type="password" autoComplete="current-password" required />
        </div>
        <div>
          <Label htmlFor="ch-next">Mật khẩu mới</Label>
          <Input id="ch-next" name="next" type="password" autoComplete="new-password" placeholder="Tối thiểu 8 ký tự" required />
        </div>
        <div>
          <Label htmlFor="ch-confirm">Xác nhận mật khẩu mới</Label>
          <Input id="ch-confirm" name="confirm" type="password" autoComplete="new-password" required />
        </div>
      </div>
      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      <div className="flex items-center justify-end gap-3">
        {state.ok && (
          <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
            <CheckCircle2 className="h-4 w-4" /> Đã đổi mật khẩu
          </span>
        )}
        <button type="submit" disabled={pending} className={buttonVariants()}>
          {pending && <LoaderCircle className="h-4 w-4 animate-spin" />} Đổi mật khẩu
        </button>
      </div>
    </form>
  );
}
